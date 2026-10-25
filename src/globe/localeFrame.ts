import { PerspectiveCamera, Vector3 } from 'three'
import { RADII_PER_HEIGHT_CODE } from './relief.ts'

const VIEW_MARGIN = 16
const MIN_ALTITUDE = 100 / 6371
const MAX_ALTITUDE = 1.6
const AIM_TOLERANCE_PX = 8
const FILL_SLACK = 0.08
// Keeps the last aim step from landing a fraction of a pixel outside.
const FIT_PAD_PX = 0.5
// Bay outline peaks 13 height codes above sea level; a unit sphere sits inside that relief.
const OUTLINE_RELIEF_CODES = 13
const BORDER_LIFT_RADII = 0.0015
const SAMPLE_RADIUS =
  1 + OUTLINE_RELIEF_CODES * RADII_PER_HEIGHT_CODE + BORDER_LIFT_RADII
const AIM_STEP_PX = 0.25

export interface LocaleExtent {
  south: number
  north: number
  west: number
  east: number
}

export interface ScreenInset {
  left: number
  top: number
  right: number
  bottom: number
}

export interface LocalePose {
  lat: number
  lng: number
  altitude: number
}

interface FrameInput {
  extent: LocaleExtent
  tiltDegrees: number
  fov: number
  width: number
  height: number
  inset: ScreenInset
  pin?: { lat: number; lng: number }
}

interface Box {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

interface Subject {
  lat: number
  lng: number
}

interface ScreenPoint {
  x: number
  y: number
}

interface AimedPose {
  pose: LocalePose
  aimLimited: boolean
  aimError: number
}

function polar(
  lat: number,
  lng: number,
  radius: number,
  out: Vector3,
): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((90 - lng) * Math.PI) / 180
  const phiSin = Math.sin(phi)
  return out.set(
    radius * phiSin * Math.cos(theta),
    radius * Math.cos(phi),
    radius * phiSin * Math.sin(theta),
  )
}

function southOffsetDegrees(altitude: number, tiltDegrees: number): number {
  const tilt = (tiltDegrees * Math.PI) / 180
  const distance = 1 + altitude
  let low = 0
  let high = 80
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2
    const delta = (mid * Math.PI) / 180
    const radial = distance * Math.cos(delta) - 1
    const separation = Math.hypot(distance * Math.sin(delta), radial)
    const cosine = separation === 0 ? 1 : radial / separation
    const incidence = Math.acos(Math.min(1, Math.max(-1, cosine)))
    if (incidence < tilt) low = mid
    else high = mid
  }
  return (low + high) / 2
}

function samplesFor(extent: LocaleExtent): Array<[number, number]> {
  const midLat = (extent.south + extent.north) / 2
  const midLng = (extent.west + extent.east) / 2
  return [
    [extent.south, extent.west],
    [extent.south, extent.east],
    [extent.north, extent.west],
    [extent.north, extent.east],
    [midLat, extent.west],
    [midLat, extent.east],
    [extent.south, midLng],
    [extent.north, midLng],
  ]
}

function projectBox(
  camera: PerspectiveCamera,
  pose: LocalePose,
  samples: Array<[number, number]>,
  width: number,
  height: number,
  point: Vector3,
): Box | null {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  polar(pose.lat, pose.lng, 1 + pose.altitude, camera.position)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [lat, lng] of samples) {
    polar(lat, lng, SAMPLE_RADIUS, point)
    point.project(camera)
    if (point.z > 1) return null
    const x = ((point.x + 1) * width) / 2
    const y = ((1 - point.y) * height) / 2
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { minX, maxX, minY, maxY }
}

function projectPoint(
  camera: PerspectiveCamera,
  pose: LocalePose,
  lat: number,
  lng: number,
  width: number,
  height: number,
  point: Vector3,
): ScreenPoint | null {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  polar(pose.lat, pose.lng, 1 + pose.altitude, camera.position)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  polar(lat, lng, 1, point)
  point.project(camera)
  if (point.z > 1) return null
  return {
    x: ((point.x + 1) * width) / 2,
    y: ((1 - point.y) * height) / 2,
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function freeRectangle(
  width: number,
  height: number,
  inset: ScreenInset,
): Rect {
  const left = inset.left + VIEW_MARGIN
  const top = inset.top + VIEW_MARGIN
  const right = width - inset.right - VIEW_MARGIN
  const bottom = height - inset.bottom - VIEW_MARGIN
  if (right - left < 1 || bottom - top < 1) {
    return {
      left: VIEW_MARGIN,
      top: VIEW_MARGIN,
      right: width - VIEW_MARGIN,
      bottom: height - VIEW_MARGIN,
    }
  }
  return { left, top, right, bottom }
}

function aimPoint(free: Rect, height: number): ScreenPoint {
  return { x: (free.left + free.right) / 2, y: height / 2 }
}

function boxInside(box: Box, free: Rect): boolean {
  return (
    box.minX >= free.left &&
    box.maxX <= free.right &&
    box.minY >= free.top &&
    box.maxY <= free.bottom
  )
}

function tighterFill(box: Box, free: Rect): number {
  const freeWidth = Math.max(1, free.right - free.left)
  const freeHeight = Math.max(1, free.bottom - free.top)
  return Math.max(
    (box.maxX - box.minX) / freeWidth,
    (box.maxY - box.minY) / freeHeight,
  )
}

function limitAxis(
  delta: number,
  slackBefore: number,
  slackAfter: number,
): { delta: number; limited: boolean } {
  if (slackBefore + slackAfter < 0) return { delta, limited: false }
  const next = clamp(delta, -slackBefore, slackAfter)
  return { delta: next, limited: Math.abs(next - delta) > AIM_STEP_PX }
}

function fitSubject(
  altitude: number,
  subject: Subject,
  input: FrameInput,
  camera: PerspectiveCamera,
  point: Vector3,
  samples: Array<[number, number]>,
  free: Rect,
  aim: ScreenPoint,
): AimedPose {
  const south = southOffsetDegrees(altitude, input.tiltDegrees)
  let lat = clamp(subject.lat - south, -85, 85)
  let lng = subject.lng
  let limited = false
  const { width, height } = input

  for (let step = 0; step < 20; step += 1) {
    const pose = { lat, lng, altitude }
    const screen = projectPoint(
      camera,
      pose,
      subject.lat,
      subject.lng,
      width,
      height,
      point,
    )
    if (screen === null) break
    const box = projectBox(camera, pose, samples, width, height, point)
    let dx = aim.x - screen.x
    let dy = aim.y - screen.y
    if (box !== null) {
      const xLimit = limitAxis(
        dx,
        box.minX - free.left - FIT_PAD_PX,
        free.right - FIT_PAD_PX - box.maxX,
      )
      const yLimit = limitAxis(
        dy,
        box.minY - free.top - FIT_PAD_PX,
        free.bottom - FIT_PAD_PX - box.maxY,
      )
      dx = xLimit.delta
      dy = yLimit.delta
      limited = limited || xLimit.limited || yLimit.limited
    }
    if (Math.hypot(dx, dy) < AIM_STEP_PX) break
    const eps = 0.01
    const latScreen = projectPoint(
      camera,
      { lat: lat + eps, lng, altitude },
      subject.lat,
      subject.lng,
      width,
      height,
      point,
    )
    const lngScreen = projectPoint(
      camera,
      { lat, lng: lng + eps, altitude },
      subject.lat,
      subject.lng,
      width,
      height,
      point,
    )
    if (latScreen === null || lngScreen === null) break
    const dLatX = (latScreen.x - screen.x) / eps
    const dLngX = (lngScreen.x - screen.x) / eps
    const dLatY = (latScreen.y - screen.y) / eps
    const dLngY = (lngScreen.y - screen.y) / eps
    const det = dLatX * dLngY - dLngX * dLatY
    if (Math.abs(det) < 1e-8) break
    const stepLat = (dx * dLngY - dLngX * dy) / det
    const stepLng = (dLatX * dy - dx * dLatY) / det
    const magnitude = Math.hypot(stepLat, stepLng)
    const gain = Math.min(1, 4 / Math.max(magnitude, 1e-9))
    lat = clamp(lat + stepLat * gain, -85, 85)
    lng += stepLng * gain
  }

  const pose = { lat, lng, altitude }
  const screen = projectPoint(
    camera,
    pose,
    subject.lat,
    subject.lng,
    width,
    height,
    point,
  )
  const aimError =
    screen === null
      ? Number.POSITIVE_INFINITY
      : Math.hypot(screen.x - aim.x, screen.y - aim.y)
  return {
    pose,
    aimLimited: aimError > AIM_TOLERANCE_PX && limited,
    aimError,
  }
}

function estimateAltitude(
  extent: LocaleExtent,
  fov: number,
  width: number,
  height: number,
  free: Rect,
): number {
  const midLat = ((extent.south + extent.north) / 2) * (Math.PI / 180)
  const latSpan = (extent.north - extent.south) * (Math.PI / 180)
  const lngSpan =
    (extent.east - extent.west) * (Math.PI / 180) * Math.cos(midLat)
  const freeWidth = Math.max(1, free.right - free.left)
  const freeHeight = Math.max(1, free.bottom - free.top)
  const verticalHalf = (fov * Math.PI) / 360
  const horizontalHalf = Math.atan(
    Math.tan(verticalHalf) * (width / Math.max(1, height)),
  )
  const altitudeForLat =
    latSpan / (2 * Math.tan(verticalHalf) * (freeHeight / height))
  const altitudeForLng =
    lngSpan / (2 * Math.tan(horizontalHalf) * (freeWidth / width))
  return clamp(
    Math.max(altitudeForLat, altitudeForLng),
    MIN_ALTITUDE,
    MAX_ALTITUDE,
  )
}

function nextAltitude(
  altitude: number,
  box: Box | null,
  free: Rect,
  contained: boolean,
  fill: number,
  low: number,
  high: number,
): number {
  if (!contained || box === null) {
    const freeWidth = Math.max(1, free.right - free.left)
    const freeHeight = Math.max(1, free.bottom - free.top)
    const scale =
      box === null
        ? 1.5
        : Math.max(
            (box.maxX - box.minX) / freeWidth,
            (box.maxY - box.minY) / freeHeight,
            1.12,
          )
    const guess = Math.min(high, Math.max(altitude * scale, altitude * 1.08))
    const midway = Math.exp((Math.log(altitude) + Math.log(guess)) / 2)
    return clamp(midway, Math.min(high, altitude * 1.03), high)
  }
  if (fill >= 1 - FILL_SLACK) return altitude
  const guess = altitude * (fill / (1 - FILL_SLACK / 2))
  const next =
    guess > low
      ? guess
      : Math.exp((Math.log(low) + Math.log(Math.max(high, low))) / 2)
  return clamp(next, low, altitude)
}

function solveFramed(
  input: FrameInput,
  camera: PerspectiveCamera,
  point: Vector3,
  samples: Array<[number, number]>,
  free: Rect,
  aim: ScreenPoint,
  subject: Subject,
): LocalePose {
  let low = MIN_ALTITUDE
  let high = MAX_ALTITUDE
  let altitude = estimateAltitude(
    input.extent,
    input.fov,
    input.width,
    input.height,
    free,
  )
  let best: LocalePose | null = null
  let bestFill = -1

  for (let round = 0; round < 8; round += 1) {
    const solved = fitSubject(
      altitude,
      subject,
      input,
      camera,
      point,
      samples,
      free,
      aim,
    )
    const box = projectBox(
      camera,
      solved.pose,
      samples,
      input.width,
      input.height,
      point,
    )
    const contained = box !== null && boxInside(box, free)
    const fill = box === null ? 0 : tighterFill(box, free)
    if (contained && fill >= bestFill) {
      best = solved.pose
      bestFill = fill
    }
    if (contained) high = Math.min(high, altitude)
    else low = Math.max(low, altitude)

    const aimOk =
      solved.aimError <= AIM_TOLERANCE_PX || (contained && solved.aimLimited)
    const fillOk = contained && fill >= 1 - FILL_SLACK
    const edgeLimited =
      contained &&
      !fillOk &&
      low > MIN_ALTITUDE * 1.05 &&
      high / low <= 1 + FILL_SLACK
    const boundStopped =
      (contained && altitude <= MIN_ALTITUDE * 1.02) ||
      (!contained && altitude >= MAX_ALTITUDE * 0.98)
    // Aim and zoom correct each other, so the first round never accepts.
    if (round >= 1 && aimOk && (fillOk || edgeLimited || boundStopped)) break

    altitude = clamp(
      nextAltitude(altitude, box, free, contained, fill, low, high),
      MIN_ALTITUDE,
      MAX_ALTITUDE,
    )
  }

  return (
    best ??
    fitSubject(MAX_ALTITUDE, subject, input, camera, point, samples, free, aim)
      .pose
  )
}

/** Locale camera: overview keeps the extent inside the free area. Hover zooms closer anyway. */
export function frameLocale(input: FrameInput): LocalePose {
  const width = Math.max(1, input.width)
  const height = Math.max(1, input.height)
  const sized = { ...input, width, height }
  const camera = new PerspectiveCamera(sized.fov, width / height, 0.1, 10)
  const point = new Vector3()
  const samples = samplesFor(sized.extent)
  const free = freeRectangle(width, height, sized.inset)
  const aim = aimPoint(free, height)
  const center = {
    lat: (sized.extent.south + sized.extent.north) / 2,
    lng: (sized.extent.west + sized.extent.east) / 2,
  }
  const overview = solveFramed(sized, camera, point, samples, free, aim, center)
  const pin = sized.pin
  if (pin === undefined) return overview

  // Hover is 20% closer even when the outline leaves the free area.
  const closerAltitude = Math.max(MIN_ALTITUDE, overview.altitude / 1.2)
  const closer = fitSubject(
    closerAltitude,
    pin,
    sized,
    camera,
    point,
    samples,
    free,
    aim,
  )
  if (Number.isFinite(closer.aimError)) return closer.pose
  return overview
}
