import {
  CallbackPositionProperty,
  CallbackProperty,
  CustomDataSource,
  LabelStyle,
  ShadowMode,
  VerticalOrigin,
} from '@cesium/engine'
import type { CesiumWidget } from '@cesium/engine'
import {
  Cartesian2,
  Cartesian3,
  Color,
  Cartographic,
  DistanceDisplayCondition,
  HeadingPitchRoll,
  NearFarScalar,
  Quaternion,
  FixedFrameTransforms,
} from '@cesium/core'
import type { Position } from 'geojson'
import type { DataPack } from './data.ts'
import type { LngLat } from './geometry.ts'
import type { PlanChoices, SiteContext } from './consequences.ts'
import type { CommunityVoice } from './community.ts'

function bubbleText(voice: CommunityVoice): string {
  const lines: string[] = []
  let line = ''
  for (const word of voice.quote.split(' ')) {
    if (line && line.length + word.length + 1 > 27) {
      lines.push(line)
      line = ''
    }
    line += (line ? ' ' : '') + word
  }
  if (line) lines.push(line)
  return (
    voice.name.toUpperCase() + '\n“' + lines.join('\n') + '”\nTap to chat ↗'
  )
}

interface RoadPath {
  points: LngLat[]
  lengths: number[]
  length: number
  distance: number
}
interface Vehicle {
  route: RoadPath
  phase: number
  speed: number
  body: Cartesian3
  roof: Cartesian3
  orientation: Quaternion
  heading: number
  footing: Footing
}
interface Person {
  index: number
  protester: boolean
  visible: boolean
  body: Cartesian3
  head: Cartesian3
  sprite: Cartesian3
  leftLeg: Cartesian3
  rightLeg: Cartesian3
  board: Cartesian3
  pole: Cartesian3
  orientation: Quaternion
  footing: Footing
}
interface Footing {
  correction: number
  point: LngLat | undefined
  sampledAt: number
}
interface RoadSample {
  point: LngLat
  heading: number
}

function personSprite(
  shirt: string,
  skin: string,
  placard: boolean,
  step: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 88
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#344657'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(20, 52)
  ctx.lineTo(15 + step * 4, 79)
  ctx.moveTo(28, 52)
  ctx.lineTo(33 - step * 4, 79)
  ctx.stroke()
  ctx.fillStyle = shirt
  ctx.strokeStyle = '#243f43'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(14, 27, 21, 29, 6)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = shirt
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(15, 32)
  ctx.lineTo(8, 48 + step * 3)
  ctx.moveTo(33, 32)
  ctx.lineTo(40, placard ? 36 : 49 - step * 3)
  ctx.stroke()
  ctx.fillStyle = skin
  ctx.strokeStyle = '#443c37'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(24, 15, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#514137'
  ctx.beginPath()
  ctx.arc(24, 13, 10, Math.PI, Math.PI * 2)
  ctx.fill()
  if (placard) {
    ctx.strokeStyle = '#806544'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(40, 22)
    ctx.lineTo(40, 52)
    ctx.stroke()
    ctx.fillStyle = '#f8e9ab'
    ctx.strokeStyle = '#947c48'
    ctx.lineWidth = 2
    ctx.fillRect(30, 5, 17, 23)
    ctx.strokeRect(30, 5, 17, 23)
    ctx.strokeStyle = '#73905a'
    ctx.beginPath()
    ctx.moveTo(34, 12)
    ctx.lineTo(42, 12)
    ctx.moveTo(34, 18)
    ctx.lineTo(42, 18)
    ctx.stroke()
  }
  return canvas
}

function vehicleSprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#29363b'
  for (const x of [4, 30]) for (const y of [13, 41]) ctx.fillRect(x, y, 6, 12)
  ctx.fillStyle = color
  ctx.strokeStyle = '#4b5654'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(8, 3, 24, 57, 7)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#375d6d'
  ctx.fillRect(11, 15, 18, 13)
  ctx.fillRect(12, 39, 16, 9)
  ctx.fillStyle = '#fff2bf'
  ctx.fillRect(10, 5, 6, 4)
  ctx.fillRect(24, 5, 6, 4)
  return canvas
}

function localDistance(a: LngLat, b: LngLat): number {
  const east = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180)
  const north = (b[1] - a[1]) * 111320
  return Math.hypot(east, north)
}

function coordinates(values: Position[]): LngLat[] {
  return values.flatMap(([lng, lat]) =>
    lng === undefined || lat === undefined ? [] : [[lng, lat]],
  )
}

function sampleRoad(
  route: RoadPath,
  distance: number,
  reverse: boolean,
): RoadSample {
  let remaining = distance
  for (let index = 1; index < route.points.length; index++) {
    const a = route.points[index - 1]
    const b = route.points[index]
    const length = route.lengths[index - 1]
    if (!a || !b || length === undefined) continue
    if (remaining <= length || index === route.points.length - 1) {
      const fraction = Math.max(0, Math.min(1, remaining / length))
      const east = (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180)
      const north = b[1] - a[1]
      return {
        point: [
          a[0] + (b[0] - a[0]) * fraction,
          a[1] + (b[1] - a[1]) * fraction,
        ],
        heading: Math.atan2(east, north) + (reverse ? Math.PI : 0),
      }
    }
    remaining -= length
  }
  return { point: route.points[0] ?? [0, 0], heading: 0 }
}

/** Authored story cues for fictional characters, not a public-opinion model. */
export function neighborReaction(
  choices: PlanChoices,
  site: SiteContext,
): { count: number; text: string } {
  if (site.water || site.parks)
    return {
      count: 12,
      text: site.water ? 'Protect the river' : 'Keep our park',
    }
  if (site.buildings) return { count: 12, text: 'People use this place' }
  if (choices.cooling === 'evaporative')
    return { count: 9, text: 'Water matters' }
  if (!choices.trees && choices.restoration === 'none')
    return { count: 6, text: 'Make room for nature' }
  if (!choices.training && !choices.access)
    return { count: 4, text: 'What about our neighbors?' }
  // No scripted gathering does not mean real residents approve the proposal.
  return { count: 0, text: '' }
}

/**
 * Authored game characters and traffic, never observations of real people or
 * a prediction of public opinion. Cars follow the downloaded city centerlines.
 */
export class AmbientLife {
  private readonly viewer: CesiumWidget
  private readonly source = new CustomDataSource('imagined-city-life')
  private readonly heightAt: (lng: number, lat: number) => number
  private readonly vehicles: Vehicle[] = []
  private readonly people: Person[] = []
  private readonly motion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  private center: LngLat
  private bearing = 28
  private datumOffset = 0
  private publicWalk = false
  private protestCount = 8
  private speechText = 'NEIGHBOR\n“Could we cool it\nwith less water?”'
  private speaker = 0
  private signPosition = new Cartesian3()
  private elapsed = 0
  private previous = performance.now()
  private timer: number | undefined
  private destroyed = false
  private wasOnline = false
  private pendingGroundRefresh = true
  private lastGroundCheck = Number.NEGATIVE_INFINITY
  private nextFooting = 0
  private readonly removeCameraListener: () => void

  constructor(
    viewer: CesiumWidget,
    pack: DataPack,
    heightAt: (lng: number, lat: number) => number,
  ) {
    this.viewer = viewer
    this.heightAt = heightAt
    this.center = [...pack.manifest.center]
    const roads = this.collectRoads(pack)
    for (let index = 0; index < 12; index++) {
      const route = roads[index % Math.max(1, roads.length)]
      if (!route) break
      const vehicle: Vehicle = {
        route,
        phase: index * 0.137,
        speed: 4.5 + (index % 4) * 0.7,
        heading: 0,
        body: new Cartesian3(),
        roof: new Cartesian3(),
        orientation: new Quaternion(),
        footing: { correction: 0, point: undefined, sampledAt: 0 },
      }
      this.vehicles.push(vehicle)
      this.addVehicle(vehicle, index)
    }
    for (let index = 0; index < 24; index++) {
      const person: Person = {
        index,
        protester: index >= 12,
        visible: true,
        body: new Cartesian3(),
        head: new Cartesian3(),
        sprite: new Cartesian3(),
        leftLeg: new Cartesian3(),
        rightLeg: new Cartesian3(),
        board: new Cartesian3(),
        pole: new Cartesian3(),
        orientation: new Quaternion(),
        footing: { correction: 0, point: undefined, sampledAt: 0 },
      }
      this.people.push(person)
      this.addPerson(person)
    }
    this.source.entities.add({
      id: 'imagined-neighbors-sign',
      position: new CallbackPositionProperty(() => this.signPosition, false),
      label: {
        text: new CallbackProperty(() => this.speechText, false),
        font: '600 13px sans-serif',
        style: LabelStyle.FILL,
        fillColor: Color.fromCssColorString('#294b3d'),
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#fffbed').withAlpha(0.97),
        backgroundPadding: new Cartesian2(12, 10),
        pixelOffset: new Cartesian2(0, -58),
        scaleByDistance: new NearFarScalar(250, 1.1, 1800, 0.7),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    const tail = document.createElement('canvas')
    tail.width = 24
    tail.height = 20
    const pen = tail.getContext('2d')
    if (pen) {
      pen.fillStyle = '#fffbed'
      pen.beginPath()
      pen.moveTo(0, 0)
      pen.lineTo(24, 0)
      pen.lineTo(12, 20)
      pen.fill()
    }
    this.source.entities.add({
      id: 'community-speech-tail',
      position: new CallbackPositionProperty(() => this.signPosition, false),
      billboard: {
        image: tail,
        width: 12,
        height: 10,
        pixelOffset: new Cartesian2(0, -16),
        scaleByDistance: new NearFarScalar(250, 1.1, 1800, 0.7),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    void viewer.dataSources.add(this.source).then(() => {
      if (this.destroyed && !viewer.isDestroyed())
        viewer.dataSources.remove(this.source, true)
    })
    document.addEventListener('visibilitychange', this.onMotionChanged)
    this.motion.addEventListener('change', this.onMotionChanged)
    this.removeCameraListener = viewer.camera.moveEnd.addEventListener(
      this.onCameraStopped,
    )
    this.refresh(0, true)
    this.onMotionChanged()
  }

  update(
    center: LngLat,
    bearing: number,
    ground: number,
    choices: PlanChoices,
    site: SiteContext,
  ): void {
    if (this.destroyed) return
    if (
      localDistance(this.center, center) > 5 ||
      Math.abs(this.datumOffset - (ground - this.heightAt(...center))) > 1 ||
      this.publicWalk !== choices.access
    )
      for (const actor of [...this.vehicles, ...this.people]) {
        actor.footing.correction = 0
        actor.footing.point = undefined
      }
    this.center = [...center]
    this.bearing = bearing
    this.datumOffset = ground - this.heightAt(...center)
    this.publicWalk = choices.access
    const reaction = neighborReaction(choices, site)
    this.protestCount = reaction.count
    this.refresh(0, true)
    this.viewer.scene.requestRender()
  }

  setVoice(voice: CommunityVoice): void {
    const text = bubbleText(voice)
    const speaker = voice.id === 'nature' ? 4 : voice.id === 'student' ? 8 : 0
    if (text === this.speechText && speaker === this.speaker) return
    this.speechText = text
    this.speaker = speaker
    this.refresh(0)
    this.viewer.scene.requestRender()
  }

  private collectRoads(pack: DataPack): RoadPath[] {
    const [west, south, east, north] = pack.manifest.bounds
    const paths: RoadPath[] = []
    for (const feature of pack.layers.roads.features) {
      const parts =
        feature.geometry.type === 'LineString'
          ? [feature.geometry.coordinates]
          : feature.geometry.type === 'MultiLineString'
            ? feature.geometry.coordinates
            : []
      for (const values of parts) {
        let run: LngLat[] = []
        const save = (): void => {
          if (run.length < 2) {
            run = []
            return
          }
          const lengths: number[] = []
          let length = 0
          let distance = Number.POSITIVE_INFINITY
          run.forEach((point, index) => {
            distance = Math.min(distance, localDistance(point, this.center))
            const before = run[index - 1]
            if (before) {
              const segment = localDistance(before, point)
              lengths.push(Math.max(segment, 0.01))
              length += segment
            }
          })
          if (length > 70)
            paths.push({ points: run, lengths, length, distance })
          run = []
        }
        for (const point of coordinates(values)) {
          if (
            point[0] < west ||
            point[0] > east ||
            point[1] < south ||
            point[1] > north
          )
            save()
          else run.push(point)
        }
        save()
      }
    }
    return paths.sort((a, b) => a.distance - b.distance).slice(0, 8)
  }

  private addVehicle(vehicle: Vehicle, index: number): void {
    const colors = ['#f2d28d', '#dbe4dc', '#76a5ba', '#bd715a', '#7d9a72']
    const color = colors[index % colors.length] ?? '#f0ddae'
    this.source.entities.add({
      id: 'game-car-icon-' + String(index),
      position: new CallbackPositionProperty(() => vehicle.body, false),
      billboard: {
        image: vehicleSprite(color).toDataURL('image/png'),
        width: 10,
        height: 16,
        rotation: new CallbackProperty(
          () => this.viewer.camera.heading - vehicle.heading,
          false,
        ),
        scaleByDistance: new NearFarScalar(200, 1, 2400, 0.7),
        distanceDisplayCondition: new DistanceDisplayCondition(180, 4200),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    this.source.entities.add({
      id: 'game-car-' + String(index),
      position: new CallbackPositionProperty(() => vehicle.body, false),
      orientation: new CallbackProperty(() => vehicle.orientation, false),
      box: {
        dimensions: new Cartesian3(3.1, 6.8, 1.8),
        material: Color.fromCssColorString(
          colors[index % colors.length] ?? '#f0ddae',
        ),
        shadows: ShadowMode.DISABLED,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 4500),
      },
    })
    this.source.entities.add({
      id: 'game-car-roof-' + String(index),
      position: new CallbackPositionProperty(() => vehicle.roof, false),
      orientation: new CallbackProperty(() => vehicle.orientation, false),
      box: {
        dimensions: new Cartesian3(2.6, 3.6, 1.35),
        material: Color.fromCssColorString('#3a5961'),
        shadows: ShadowMode.DISABLED,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 4500),
      },
    })
  }

  private addPerson(person: Person): void {
    const colors = ['#5f9aa0', '#cab476', '#82a66e', '#a483b0']
    const shirtColor = person.protester
      ? '#c8815c'
      : (colors[person.index % colors.length] ?? '#7ca384')
    const skinColor =
      person.index % 3 === 0
        ? '#b98c65'
        : person.index % 3 === 1
          ? '#e1b78a'
          : '#8b6248'
    const frames = [
      personSprite(
        shirtColor,
        skinColor,
        person.protester && person.index % 3 === 0,
        -1,
      ),
      personSprite(
        shirtColor,
        skinColor,
        person.protester && person.index % 3 === 0,
        1,
      ),
    ].map((canvas) => canvas.toDataURL('image/png'))
    this.source.entities.add({
      id: 'game-person-icon-' + String(person.index),
      position: new CallbackPositionProperty(() => person.sprite, false),
      billboard: {
        show: new CallbackProperty(() => person.visible, false),
        image: new CallbackProperty(
          () =>
            frames[
              this.motion.matches
                ? 0
                : (Math.floor(this.elapsed * 3) + person.index) % 2
            ] ?? frames[0],
          false,
        ),
        width: 12,
        height: 22,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -1),
        scaleByDistance: new NearFarScalar(200, 1, 1800, 0.75),
        distanceDisplayCondition: new DistanceDisplayCondition(180, 2500),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    const shirt = Color.fromCssColorString(
      person.protester
        ? '#c8815c'
        : (colors[person.index % colors.length] ?? '#7ca384'),
    )
    const visible = new CallbackProperty(() => person.visible, false)
    const orientation = new CallbackProperty(() => person.orientation, false)
    const boxPart = (
      name: string,
      position: () => Cartesian3,
      dimensions: Cartesian3,
      color: Color,
    ): void => {
      this.source.entities.add({
        id: 'game-person-' + String(person.index) + '-' + name,
        position: new CallbackPositionProperty(position, false),
        orientation,
        box: {
          show: visible,
          dimensions,
          material: color,
          shadows: ShadowMode.DISABLED,
          distanceDisplayCondition: new DistanceDisplayCondition(0, 2500),
        },
      })
    }
    boxPart('shirt', () => person.body, new Cartesian3(1.2, 0.85, 1.5), shirt)
    boxPart(
      'left-leg',
      () => person.leftLeg,
      new Cartesian3(0.4, 0.45, 1.2),
      Color.fromCssColorString('#435767'),
    )
    boxPart(
      'right-leg',
      () => person.rightLeg,
      new Cartesian3(0.4, 0.45, 1.2),
      Color.fromCssColorString('#435767'),
    )
    this.source.entities.add({
      id: 'game-person-' + String(person.index) + '-head',
      position: new CallbackPositionProperty(() => person.head, false),
      ellipsoid: {
        show: visible,
        radii: new Cartesian3(0.55, 0.55, 0.6),
        material: Color.fromCssColorString(
          person.index % 3 === 0
            ? '#b98c65'
            : person.index % 3 === 1
              ? '#e1b78a'
              : '#8b6248',
        ),
        stackPartitions: 6,
        slicePartitions: 6,
        shadows: ShadowMode.DISABLED,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2500),
      },
    })
    if (person.protester && person.index % 3 === 0) {
      boxPart(
        'placard',
        () => person.board,
        new Cartesian3(2.2, 0.18, 1.3),
        Color.fromCssColorString('#f5e9bd'),
      )
      boxPart(
        'placard-pole',
        () => person.pole,
        new Cartesian3(0.12, 0.12, 2.5),
        Color.fromCssColorString('#8b7556'),
      )
    }
  }

  private offset(east: number, north: number): LngLat {
    const angle = (this.bearing * Math.PI) / 180
    return [
      this.center[0] +
        (east * Math.cos(angle) + north * Math.sin(angle)) /
          (111320 * Math.cos((this.center[1] * Math.PI) / 180)),
      this.center[1] +
        (-east * Math.sin(angle) + north * Math.cos(angle)) / 111320,
    ]
  }

  private excludedGameObjects(): object[] {
    const excluded = new Set<object>(this.source.entities.values)
    for (let index = 0; index < this.viewer.dataSources.length; index++)
      for (const entity of this.viewer.dataSources.get(index).entities.values)
        excluded.add(entity)
    return [...excluded]
  }

  private actorGround(
    point: LngLat,
    footing: Footing,
    online: boolean,
    sample: boolean,
    force: boolean,
    excluded: object[],
    now: number,
  ): number {
    const fallback = this.heightAt(...point) + this.datumOffset
    if (!online) {
      footing.correction = 0
      return fallback
    }
    if (
      sample &&
      (force ||
        !footing.point ||
        localDistance(footing.point, point) > 3 ||
        now - footing.sampledAt > 3000)
    ) {
      const measured = this.viewer.scene.sampleHeight(
        Cartographic.fromDegrees(...point),
        excluded,
      )
      if (measured !== undefined && Number.isFinite(measured)) {
        const correction = measured - fallback
        // Mapzen orthometric and Google ellipsoid heights can differ by tens
        // of metres. Accept that negative datum gap, reject unloaded hits and
        // tall positive roof/canopy hits in this bounded, flat scene.
        if (correction >= -120 && correction <= 10)
          footing.correction = correction
        else footing.correction = 0
        footing.point = [...point]
        footing.sampledAt = now
      }
    }
    return fallback + footing.correction
  }

  private refresh(delta: number, forceGround = false): void {
    this.elapsed += delta
    const now = performance.now()
    const online =
      !this.viewer.scene.globe.show && this.viewer.scene.sampleHeightSupported
    if (online !== this.wasOnline) {
      this.wasOnline = online
      this.pendingGroundRefresh = true
      for (const actor of [...this.vehicles, ...this.people]) {
        actor.footing.correction = 0
        actor.footing.point = undefined
      }
    }
    if (forceGround) this.pendingGroundRefresh = true
    const sampleSlots = new Set<number>()
    let sampleAll = false
    let excluded: object[] = []
    if (online && now - this.lastGroundCheck >= 250) {
      sampleAll = this.pendingGroundRefresh
      this.pendingGroundRefresh = false
      this.lastGroundCheck = now
      const count = this.vehicles.length + this.people.length
      for (let index = 0; index < (sampleAll ? count : 4); index++)
        sampleSlots.add(sampleAll ? index : (this.nextFooting + index) % count)
      this.nextFooting = (this.nextFooting + 4) % Math.max(1, count)
      excluded = this.excludedGameObjects()
    }
    let actorIndex = 0
    for (const vehicle of this.vehicles) {
      const cycle =
        (vehicle.phase * vehicle.route.length * 2 +
          this.elapsed * vehicle.speed) %
        (vehicle.route.length * 2)
      const reverse = cycle > vehicle.route.length
      const sample = sampleRoad(
        vehicle.route,
        reverse ? vehicle.route.length * 2 - cycle : cycle,
        reverse,
      )
      // Slight lane separation remains tied to the road centerline.
      const lane = 1.6
      const point: LngLat = [
        sample.point[0] +
          (Math.cos(sample.heading) * lane) /
            (111320 * Math.cos((sample.point[1] * Math.PI) / 180)),
        sample.point[1] - (Math.sin(sample.heading) * lane) / 111320,
      ]
      vehicle.heading = sample.heading
      const ground = this.actorGround(
        point,
        vehicle.footing,
        online,
        sampleSlots.has(actorIndex++),
        sampleAll,
        excluded,
        now,
      )
      vehicle.body = Cartesian3.fromDegrees(...point, ground + 1.4)
      vehicle.roof = Cartesian3.fromDegrees(...point, ground + 2.6)
      vehicle.orientation = FixedFrameTransforms.headingPitchRollQuaternion(
        vehicle.body,
        new HeadingPitchRoll(sample.heading, 0, 0),
      )
    }
    for (const person of this.people) {
      const index = person.index % 12
      const phase = this.elapsed * (0.75 + (index % 3) * 0.08) + index * 0.9
      const walk = (Math.sin(phase * 0.1) + 1) / 2
      let east: number, north: number, heading: number
      if (person.protester) {
        person.visible = index < this.protestCount
        east = -29 + (index % 6) * 11 + Math.sin(phase * 0.4) * 0.9
        north = -100 - Math.floor(index / 6) * 7 + Math.cos(phase * 0.5) * 0.8
        heading = (this.bearing * Math.PI) / 180
      } else {
        person.visible = true
        east = this.publicWalk ? -128 : -93 + walk * 186
        north = this.publicWalk ? -65 + walk * 130 : -74 - (index % 3) * 3.2
        heading =
          (this.bearing * Math.PI) / 180 +
          (this.publicWalk ? 0 : Math.PI / 2) +
          (Math.cos(phase * 0.1) < 0 ? Math.PI : 0)
      }
      const point = this.offset(east, north)
      const bob = this.motion.matches ? 0 : Math.sin(phase * 3) * 0.04
      const sampleFooting = person.visible && sampleSlots.has(actorIndex)
      actorIndex++
      const base =
        this.actorGround(
          point,
          person.footing,
          online,
          sampleFooting,
          sampleAll,
          excluded,
          now,
        ) + 0.08
      person.sprite = Cartesian3.fromDegrees(...point, base)
      person.body = Cartesian3.fromDegrees(...point, base + 1.9 + bob)
      person.head = Cartesian3.fromDegrees(...point, base + 3.12 + bob)
      const stride = this.motion.matches ? 0 : Math.sin(phase * 3) * 0.2
      const left = this.offset(east - 0.32, north + stride)
      const right = this.offset(east + 0.32, north - stride)
      person.leftLeg = Cartesian3.fromDegrees(...left, base + 0.6)
      person.rightLeg = Cartesian3.fromDegrees(...right, base + 0.6)
      person.board = Cartesian3.fromDegrees(
        ...this.offset(east + 0.9, north),
        base + 4.25,
      )
      person.pole = Cartesian3.fromDegrees(
        ...this.offset(east + 0.9, north),
        base + 3,
      )
      person.orientation = FixedFrameTransforms.headingPitchRollQuaternion(
        person.body,
        new HeadingPitchRoll(heading, 0, 0),
      )
    }
    const speaker =
      this.people[
        this.speaker === 0 && this.protestCount > 0 ? 12 : this.speaker
      ]
    if (speaker) this.signPosition = speaker.head
  }

  private readonly onCameraStopped = (): void => {
    if (this.destroyed || this.viewer.isDestroyed()) return
    this.refresh(0, true)
    this.viewer.scene.requestRender()
  }

  private readonly frame = (): void => {
    this.timer = undefined
    if (this.destroyed || this.viewer.isDestroyed()) {
      this.destroy()
      return
    }
    if (document.hidden || this.motion.matches) return
    const now = performance.now()
    const delta = Math.min(0.1, (now - this.previous) / 1000)
    this.previous = now
    this.refresh(delta)
    this.viewer.scene.requestRender()
    this.timer = window.setTimeout(this.frame, 1000 / 24)
  }

  private readonly onMotionChanged = (): void => {
    if (this.timer !== undefined) window.clearTimeout(this.timer)
    this.timer = undefined
    if (this.destroyed || this.viewer.isDestroyed()) return
    this.previous = performance.now()
    this.refresh(0)
    this.viewer.scene.requestRender()
    if (!document.hidden && !this.motion.matches)
      this.timer = window.setTimeout(this.frame, 1000 / 24)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    if (this.timer !== undefined) window.clearTimeout(this.timer)
    document.removeEventListener('visibilitychange', this.onMotionChanged)
    this.motion.removeEventListener('change', this.onMotionChanged)
    this.removeCameraListener()
    if (!this.viewer.isDestroyed())
      this.viewer.dataSources.remove(this.source, true)
  }
}
