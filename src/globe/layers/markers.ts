import { PerspectiveCamera, Vector3 } from 'three'
import type { GlobeInstance } from 'globe.gl'
import { MAX_TERRAIN_RADIUS_RATIO } from '../relief.ts'
import type { GlobeMarker, LatLngAlt } from '../types.ts'
import '../markers.css'

/** Clears the tallest displaced land, which sits this far above the analytic sphere. */
const MARKER_ALTITUDE = MAX_TERRAIN_RADIUS_RATIO - 1
const RIM_GAP_PX = 14
const CLUSTER_GAP_PX = 8
const VIEW_MARGIN_PX = 8
/** Landing overview. Closer than this pulls labels onto the surface. */
const OVERVIEW_ALTITUDE = 2.5
/** Altitude span below the overview over which that pull eases in. */
const ZOOM_EASE_RADII = 0.3
/** Outer fraction of the projected radius across which a label eases off the surface. */
const LIMB_EASE = 0.3
/** Keeps the label off the dot without stretching the leader out to the rim. */
const SURFACE_GAP_PX = 14
/** Binary-search steps for the altitude where a cluster's members stop overlapping. */
const SPLIT_STEPS = 12
const SVG_NS = 'http://www.w3.org/2000/svg'

interface DragControls {
  enableRotate: boolean
  minDistance: number
}

export interface MarkerOverlay {
  setMarkers(markers: readonly GlobeMarker[]): void
  highlightMarker(id: string | null): void
  onMarkerClick(listener: (id: string) => void): () => void
  setInteractive(enabled: boolean): void
  destroy(): void
}

interface MarkerOverlayOptions {
  container: HTMLElement
  globe: GlobeInstance
  camera: PerspectiveCamera
  controls: DragControls
  globeRadius: number
  flyTo(target: LatLngAlt): Promise<void>
}

interface ScreenPoint {
  x: number
  y: number
  facing: number
}

interface MemberView {
  marker: GlobeMarker
  facing: number
  dotX: number
  dotY: number
  dirX: number
  dirY: number
}

interface PillView {
  members: MemberView[]
  text: string
  enabled: boolean
  width: number
  height: number
  cx: number
  cy: number
  dirX: number
  dirY: number
  opacity: number
}

interface Frame {
  centerX: number
  centerY: number
  silhouette: number
  width: number
  height: number
  altitude: number
  atMinimum: boolean
  project(lat: number, lng: number): ScreenPoint | null
}

interface Size {
  width: number
  height: number
}

function unit(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y)
  if (length < 1) return { x: 0, y: -1 }
  return { x: x / length, y: y / length }
}

function opacityFor(facing: number): number {
  const clamped = Math.min(1, Math.max(0, facing))
  return 0.25 + 0.75 * clamped
}

function pillText(members: readonly MemberView[]): string {
  const first = members[0]
  if (first === undefined) return ''
  if (members.length === 1) {
    return first.marker.enabled
      ? first.marker.label
      : `${first.marker.label} \u00b7 Coming soon`
  }
  const count = String(members.length)
  const shared = members.every(
    (member) => member.marker.group === first.marker.group,
  )
  const label = shared
    ? `${first.marker.group} \u00b7 ${count}`
    : `${count} regions`
  const enabled = members.some((member) => member.marker.enabled)
  return enabled ? label : `${label} \u00b7 Coming soon`
}

function overlaps(a: PillView, b: PillView): boolean {
  return (
    Math.abs(a.cx - b.cx) < (a.width + b.width) / 2 + CLUSTER_GAP_PX &&
    Math.abs(a.cy - b.cy) < (a.height + b.height) / 2 + CLUSTER_GAP_PX
  )
}

function onScreen(pill: PillView, frame: Frame): boolean {
  return (
    pill.cx - pill.width / 2 >= VIEW_MARGIN_PX &&
    pill.cx + pill.width / 2 <= frame.width - VIEW_MARGIN_PX &&
    pill.cy - pill.height / 2 >= VIEW_MARGIN_PX &&
    pill.cy + pill.height / 2 <= frame.height - VIEW_MARGIN_PX
  )
}

function borderPoint(
  pill: PillView,
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const dx = towardX - pill.cx
  const dy = towardY - pill.cy
  const halfWidth = pill.width / 2
  const halfHeight = pill.height / 2
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx)
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY)
  return { x: pill.cx + dx * scale, y: pill.cy + dy * scale }
}

function sharesGroup(a: PillView, b: PillView): boolean {
  const group = a.members[0]?.marker.group
  if (group === undefined) return false
  return (
    a.members.every((member) => member.marker.group === group) &&
    b.members.every((member) => member.marker.group === group)
  )
}

function groupOverlapping(
  items: readonly PillView[],
  canJoin: (a: PillView, b: PillView) => boolean = () => true,
): PillView[][] {
  const unused = new Set(items)
  const groups: PillView[][] = []
  for (const item of items) {
    if (!unused.has(item)) continue
    unused.delete(item)
    const group: PillView[] = []
    const stack = [item]
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) break
      group.push(current)
      for (const other of [...unused]) {
        if (!overlaps(current, other) || !canJoin(current, other)) continue
        unused.delete(other)
        stack.push(other)
      }
    }
    groups.push(group)
  }
  return groups
}

function silhouetteRadius(
  distance: number,
  radius: number,
  fovDegrees: number,
  height: number,
): number {
  if (distance <= radius || height <= 0) return height
  const alpha = Math.asin(Math.min(1, radius / distance))
  const halfFov = (fovDegrees * Math.PI) / 360
  return ((Math.tan(alpha) / Math.tan(halfFov)) * height) / 2
}

export function createMarkerOverlay(
  options: MarkerOverlayOptions,
): MarkerOverlay {
  const { container, globe, camera, controls, globeRadius } = options
  const terrainRadius = globeRadius * MAX_TERRAIN_RADIUS_RATIO
  const point = new Vector3()
  const projected = new Vector3()
  const normal = new Vector3()
  const toCamera = new Vector3()
  const sum = new Vector3()
  const scratch = new PerspectiveCamera()

  const overlay = document.createElement('div')
  overlay.className = 'marker-layer'
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'marker-lines')
  const measurer = document.createElement('span')
  measurer.className = 'marker-pill marker-pill-enabled marker-measure'
  overlay.append(svg, measurer)
  container.append(overlay)

  const sizes = new Map<string, Size>()
  const pillNodes = new Map<string, HTMLButtonElement>()
  const dotNodes = new Map<string, HTMLSpanElement>()
  const viewsByKey = new Map<string, PillView>()
  const listeners = new Set<(id: string) => void>()

  let markers: GlobeMarker[] = []
  let highlighted: string | null = null
  let interactive = true
  let destroyed = false
  let frameId = 0

  const minimumAltitude = (): number => controls.minDistance / globeRadius - 1

  function measure(text: string, enabled: boolean): Size {
    const key = `${enabled ? '1' : '0'}:${text}`
    const cached = sizes.get(key)
    if (cached !== undefined) return cached
    measurer.className = enabled
      ? 'marker-pill marker-pill-enabled marker-measure'
      : 'marker-pill marker-pill-disabled marker-measure'
    measurer.textContent = text
    const size = { width: measurer.offsetWidth, height: measurer.offsetHeight }
    sizes.set(key, size)
    return size
  }

  function readScreen(
    cam: PerspectiveCamera,
    lat: number,
    lng: number,
    width: number,
    height: number,
  ): ScreenPoint | null {
    const coords = globe.getCoords(lat, lng, MARKER_ALTITUDE)
    point.set(coords.x, coords.y, coords.z)
    normal.copy(point).normalize()
    toCamera.copy(cam.position).sub(point)
    if (toCamera.lengthSq() === 0) return null
    const facing = normal.dot(toCamera.normalize())
    if (facing < 0) return null
    projected.copy(point).project(cam)
    return {
      x: ((projected.x + 1) * width) / 2,
      y: ((1 - projected.y) * height) / 2,
      facing,
    }
  }

  function screenCenter(
    cam: PerspectiveCamera,
    width: number,
    height: number,
  ): { x: number; y: number } {
    projected.set(0, 0, 0).project(cam)
    return {
      x: ((projected.x + 1) * width) / 2,
      y: ((1 - projected.y) * height) / 2,
    }
  }

  function makeFrame(cam: PerspectiveCamera, altitude: number): Frame | null {
    const width = globe.width()
    const height = globe.height()
    if (width <= 0 || height <= 0) return null
    cam.updateMatrixWorld()
    const center = screenCenter(cam, width, height)
    const distance = cam.position.length()
    return {
      centerX: center.x,
      centerY: center.y,
      silhouette: silhouetteRadius(distance, terrainRadius, cam.fov, height),
      width,
      height,
      altitude,
      atMinimum: altitude <= minimumAltitude() + 1e-4,
      project(lat, lng) {
        return readScreen(cam, lat, lng, width, height)
      },
    }
  }

  function pose(lat: number, lng: number, altitude: number): void {
    const position = globe.getCoords(lat, lng, altitude)
    scratch.fov = camera.fov
    scratch.aspect = camera.aspect
    scratch.near = camera.near
    scratch.far = camera.far
    scratch.zoom = camera.zoom
    scratch.up.copy(camera.up)
    scratch.position.set(position.x, position.y, position.z)
    scratch.lookAt(0, 0, 0)
    scratch.updateProjectionMatrix()
    scratch.updateMatrixWorld()
  }

  function geographicCentroid(members: readonly GlobeMarker[]): {
    lat: number
    lng: number
  } {
    sum.set(0, 0, 0)
    for (const member of members) {
      const coords = globe.getCoords(member.lat, member.lng, 0)
      sum.x += coords.x
      sum.y += coords.y
      sum.z += coords.z
    }
    const fallback = members[0]
    if (sum.lengthSq() < 1e-6 || fallback === undefined) {
      return { lat: fallback?.lat ?? 0, lng: fallback?.lng ?? 0 }
    }
    const geo = globe.toGeoCoords(sum)
    return { lat: geo.lat, lng: geo.lng }
  }

  function memberViews(
    source: readonly GlobeMarker[],
    frame: Frame,
  ): MemberView[] {
    const views: MemberView[] = []
    for (const marker of source) {
      const screen = frame.project(marker.lat, marker.lng)
      if (screen === null) continue
      const direction = unit(screen.x - frame.centerX, screen.y - frame.centerY)
      views.push({
        marker,
        facing: screen.facing,
        dotX: screen.x,
        dotY: screen.y,
        dirX: direction.x,
        dirY: direction.y,
      })
    }
    return views
  }

  function clusterAnchor(
    members: readonly MemberView[],
    frame: Frame,
  ): { x: number; y: number } {
    const only = members.length === 1 ? members[0] : undefined
    if (only !== undefined) return { x: only.dotX, y: only.dotY }
    if (members.length === 0) return { x: frame.centerX, y: frame.centerY }
    const geo = geographicCentroid(members.map((member) => member.marker))
    const screen = frame.project(geo.lat, geo.lng)
    if (screen !== null) return { x: screen.x, y: screen.y }
    let x = 0
    let y = 0
    for (const member of members) {
      x += member.dotX
      y += member.dotY
    }
    return { x: x / members.length, y: y / members.length }
  }

  function smoothstep(edge0: number, edge1: number, value: number): number {
    const span = edge1 - edge0
    if (span === 0) return value >= edge1 ? 1 : 0
    const t = Math.min(1, Math.max(0, (value - edge0) / span))
    return t * t * (3 - 2 * t)
  }

  function surfaceWeight(
    anchor: { x: number; y: number },
    frame: Frame,
  ): number {
    // A hard cutoff teleports the label from the dot to the rim in one frame.
    const distance = Math.hypot(
      anchor.x - frame.centerX,
      anchor.y - frame.centerY,
    )
    const inset = frame.silhouette > 0 ? 1 - distance / frame.silhouette : 0
    const radial = smoothstep(0, LIMB_EASE, inset)
    const zoom = smoothstep(
      OVERVIEW_ALTITUDE,
      OVERVIEW_ALTITUDE - ZOOM_EASE_RADII,
      frame.altitude,
    )
    return Math.max(radial, zoom)
  }

  function offsetFromDots(
    anchor: { x: number; y: number },
    members: readonly MemberView[],
    outward: { x: number; y: number },
    half: number,
    sign: number,
  ): { x: number; y: number } {
    let extreme = 0
    for (const member of members) {
      const along =
        (member.dotX - anchor.x) * outward.x +
        (member.dotY - anchor.y) * outward.y
      extreme = sign > 0 ? Math.max(extreme, along) : Math.min(extreme, along)
    }
    const along = extreme + sign * (half + SURFACE_GAP_PX)
    return {
      x: anchor.x + outward.x * along,
      y: anchor.y + outward.y * along,
    }
  }

  function placeGroup(members: MemberView[], frame: Frame): PillView {
    const text = pillText(members)
    const enabled = members.some((member) => member.marker.enabled)
    const size = measure(text, enabled)
    const anchor = clusterAnchor(members, frame)
    const outward = unit(anchor.x - frame.centerX, anchor.y - frame.centerY)
    const half =
      Math.abs(outward.x) * (size.width / 2) +
      Math.abs(outward.y) * (size.height / 2)
    const onSurface = offsetFromDots(anchor, members, outward, half, 1)
    const outside = {
      x: frame.centerX + outward.x * (frame.silhouette + RIM_GAP_PX + half),
      y: frame.centerY + outward.y * (frame.silhouette + RIM_GAP_PX + half),
    }
    const weight = surfaceWeight(anchor, frame)
    const center = {
      x: outside.x + (onSurface.x - outside.x) * weight,
      y: outside.y + (onSurface.y - outside.y) * weight,
    }
    let facing = 0
    for (const member of members) facing = Math.max(facing, member.facing)
    return {
      members,
      text,
      enabled,
      width: size.width,
      height: size.height,
      cx: center.x,
      cy: center.y,
      dirX: outward.x,
      dirY: outward.y,
      opacity: opacityFor(facing),
    }
  }

  function clampToView(pill: PillView, frame: Frame): void {
    const minX = pill.width / 2 + VIEW_MARGIN_PX
    const maxX = frame.width - pill.width / 2 - VIEW_MARGIN_PX
    const minY = pill.height / 2 + VIEW_MARGIN_PX
    const maxY = frame.height - pill.height / 2 - VIEW_MARGIN_PX
    pill.cx = Math.min(Math.max(pill.cx, minX), Math.max(minX, maxX))
    pill.cy = Math.min(Math.max(pill.cy, minY), Math.max(minY, maxY))
  }

  function spread(group: readonly PillView[], frame: Frame): void {
    let dirX = 0
    let dirY = 0
    let anchorX = 0
    let anchorY = 0
    for (const pill of group) {
      dirX += pill.dirX
      dirY += pill.dirY
      anchorX += pill.cx
      anchorY += pill.cy
    }
    const count = group.length
    if (count === 0) return
    const tangent = unit(-dirY, dirX)
    const sorted = [...group].sort(
      (a, b) =>
        a.cx * tangent.x +
        a.cy * tangent.y -
        (b.cx * tangent.x + b.cy * tangent.y),
    )
    let total = 0
    for (const pill of sorted) total += pill.width
    total += CLUSTER_GAP_PX * (sorted.length - 1)
    let cursor = -total / 2
    const originX = anchorX / count
    const originY = anchorY / count
    for (const pill of sorted) {
      const along = cursor + pill.width / 2
      pill.cx = originX + tangent.x * along
      pill.cy = originY + tangent.y * along
      cursor += pill.width + CLUSTER_GAP_PX
      clampToView(pill, frame)
    }
  }

  function separateUnrelated(placed: PillView[], frame: Frame): void {
    for (let guard = placed.length; guard > 0; guard -= 1) {
      let moved = false
      for (const component of groupOverlapping(placed)) {
        const first = component[0]
        if (component.length < 2 || first === undefined) continue
        if (component.every((pill) => sharesGroup(first, pill))) continue
        spread(component, frame)
        moved = true
      }
      if (!moved) break
    }
  }

  function arrange(members: readonly MemberView[], frame: Frame): PillView[] {
    let groups = members.map((member) => [member])
    let placed = groups.map((group) => placeGroup(group, frame))
    if (frame.atMinimum) {
      for (const component of groupOverlapping(placed)) {
        if (component.length > 1) spread(component, frame)
      }
    } else {
      for (let guard = members.length; guard > 0; guard -= 1) {
        // Overlap merges a state with itself, not with a neighboring state.
        const components = groupOverlapping(placed, sharesGroup)
        if (components.every((component) => component.length === 1)) break
        groups = components.map((component) =>
          component.flatMap((pill) => pill.members),
        )
        placed = groups.map((group) => placeGroup(group, frame))
      }
      separateUnrelated(placed, frame)
    }
    // Clamp after clustering so a close view stays clickable without merging edge labels.
    for (const pill of placed) clampToView(pill, frame)
    return placed
  }

  function membersAreSeparate(
    members: readonly GlobeMarker[],
    lat: number,
    lng: number,
    altitude: number,
  ): boolean {
    pose(lat, lng, altitude)
    const frame = makeFrame(scratch, altitude)
    if (frame === null) return false
    // Use every marker, or a neighbor could keep two members in one pill.
    const pills = arrange(memberViews(markers, frame), frame)
    const wanted = new Set(members.map((member) => member.id))
    let seen = 0
    for (const pill of pills) {
      const mine = pill.members.filter((member) => wanted.has(member.marker.id))
      if (mine.length === 0) continue
      if (
        mine.length !== 1 ||
        pill.members.length !== 1 ||
        !onScreen(pill, frame)
      ) {
        return false
      }
      seen += 1
    }
    return seen === members.length
  }

  function splitAltitude(members: readonly GlobeMarker[]): number {
    const pov = globe.pointOfView()
    const minimum = minimumAltitude()
    const ceiling = Math.max(minimum, pov.altitude - 0.05)
    const center = geographicCentroid(members)
    if (
      ceiling <= minimum + 1e-4 ||
      !membersAreSeparate(members, center.lat, center.lng, minimum)
    ) {
      return minimum
    }
    let low = minimum
    let high = ceiling
    for (let step = 0; step < SPLIT_STEPS; step += 1) {
      const mid = (low + high) / 2
      if (membersAreSeparate(members, center.lat, center.lng, mid)) low = mid
      else high = mid
    }
    return low
  }

  function pillKey(pill: PillView): string {
    return pill.members
      .map((member) => member.marker.id)
      .sort()
      .join('|')
  }

  function activate(pill: PillView): void {
    if (!interactive) return
    if (pill.members.length > 1) {
      if (!pill.enabled) return
      const group = pill.members.map((member) => member.marker)
      const center = geographicCentroid(group)
      void options.flyTo({
        lat: center.lat,
        lng: center.lng,
        altitude: splitAltitude(group),
      })
      return
    }
    const only = pill.members[0]
    if (only === undefined || !only.marker.enabled) return
    for (const listener of [...listeners]) listener(only.marker.id)
  }

  function pillButton(key: string): HTMLButtonElement {
    const existing = pillNodes.get(key)
    if (existing !== undefined) return existing
    const button = document.createElement('button')
    button.type = 'button'
    button.tabIndex = -1
    button.addEventListener('click', () => {
      const view = viewsByKey.get(key)
      if (view !== undefined) activate(view)
    })
    pillNodes.set(key, button)
    overlay.append(button)
    return button
  }

  function dotNode(id: string): HTMLSpanElement {
    const existing = dotNodes.get(id)
    if (existing !== undefined) return existing
    const dot = document.createElement('span')
    dot.className = 'marker-dot'
    dotNodes.set(id, dot)
    overlay.append(dot)
    return dot
  }

  function render(): void {
    if (destroyed) return
    const width = globe.width()
    const height = globe.height()
    svg.setAttribute('viewBox', `0 0 ${String(width)} ${String(height)}`)
    const altitude = globe.pointOfView().altitude
    const frame = makeFrame(camera, altitude)
    viewsByKey.clear()
    if (frame === null) return
    const pills = arrange(memberViews(markers, frame), frame)
    const seenPills = new Set<string>()
    const seenDots = new Set<string>()
    const lines: SVGLineElement[] = []
    for (const pill of pills) {
      const key = pillKey(pill)
      seenPills.add(key)
      viewsByKey.set(key, pill)
      const button = pillButton(key)
      button.className = pill.enabled
        ? 'marker-pill marker-pill-enabled'
        : 'marker-pill marker-pill-disabled'
      button.textContent = pill.text
      button.style.left = `${pill.cx.toFixed(1)}px`
      button.style.top = `${pill.cy.toFixed(1)}px`
      button.style.opacity = pill.opacity.toFixed(3)
      button.toggleAttribute(
        'data-highlighted',
        pillContains(pill, highlighted),
      )
      if (pill.enabled) button.removeAttribute('aria-disabled')
      else button.setAttribute('aria-disabled', 'true')
      for (const member of pill.members) {
        seenDots.add(member.marker.id)
        const dot = dotNode(member.marker.id)
        dot.style.left = `${member.dotX.toFixed(1)}px`
        dot.style.top = `${member.dotY.toFixed(1)}px`
        dot.style.opacity = opacityFor(member.facing).toFixed(3)
        const edge = borderPoint(pill, member.dotX, member.dotY)
        const line = document.createElementNS(SVG_NS, 'line')
        line.setAttribute('class', 'marker-line')
        line.setAttribute('x1', member.dotX.toFixed(1))
        line.setAttribute('y1', member.dotY.toFixed(1))
        line.setAttribute('x2', edge.x.toFixed(1))
        line.setAttribute('y2', edge.y.toFixed(1))
        line.setAttribute('opacity', opacityFor(member.facing).toFixed(3))
        lines.push(line)
      }
    }
    svg.replaceChildren(...lines)
    for (const [key, button] of pillNodes) {
      if (seenPills.has(key)) continue
      button.remove()
      pillNodes.delete(key)
    }
    for (const [id, dot] of dotNodes) {
      if (seenDots.has(id)) continue
      dot.remove()
      dotNodes.delete(id)
    }
  }

  function loop(): void {
    frameId = requestAnimationFrame(loop)
    render()
  }
  frameId = requestAnimationFrame(loop)

  return {
    setMarkers(next) {
      if (destroyed) return
      markers = next.map((marker) => ({
        id: marker.id,
        lat: marker.lat,
        lng: marker.lng,
        label: marker.label,
        enabled: marker.enabled,
        group: marker.group,
      }))
      render()
    },
    highlightMarker(id) {
      if (destroyed) return
      if (id !== null && !markers.some((marker) => marker.id === id)) return
      highlighted = id
      render()
    },
    onMarkerClick(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setInteractive(enabled) {
      if (destroyed) return
      interactive = enabled
      controls.enableRotate = enabled
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      cancelAnimationFrame(frameId)
      listeners.clear()
      overlay.remove()
    },
  }
}

function pillContains(pill: PillView, id: string | null): boolean {
  if (id === null) return false
  return pill.members.some((member) => member.marker.id === id)
}
