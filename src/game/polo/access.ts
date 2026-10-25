import type { LngLat } from '../geometry.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { poloCoordinate, POLO_LAYOUT } from './scene-geometry.ts'
import { poloGeometryScale } from './size.ts'

// DataSF centerlines 11995000 (MLK Jr Drive) and 9007000 (Middle West Drive),
// in entrance-to-field order, following the user's marked approach.
// Geometry is observed; use as campus access and all traffic are authored concepts.
export const POLO_ACCESS_ROAD: readonly LngLat[] = [
  [-122.500857016, 37.764845907],
  [-122.50035229, 37.76477302],
  [-122.500199244, 37.764759192],
  [-122.499797781, 37.764745472],
  [-122.49955498, 37.76476191],
  [-122.499441615, 37.764780259],
  [-122.499125793, 37.764871852],
  [-122.498615492, 37.765044765],
  [-122.49835415, 37.765141592],
  [-122.498158985, 37.76526403],
  [-122.497659322, 37.765501576],
  [-122.496643644, 37.766092765],
  [-122.496382047, 37.766256779],
  [-122.496144801, 37.766361179],
  [-122.495783093, 37.766421355],
  [-122.495338872, 37.766428876],
  [-122.494516588, 37.766370724],
  [-122.493514517, 37.766261555],
  [-122.492914027, 37.766144395],
]
// OSM track point 4762834072; the spur from the road and campus link are schematic.
export const POLO_ACCESS_FIELD_ENTRY: LngLat = [
  -122.49402344226837, 37.76705518122348,
]
const METRES = 111320
type XY = readonly [number, number]

export function accessDistance(a: LngLat, b: LngLat): number {
  return Math.hypot(
    (b[0] - a[0]) * METRES * Math.cos((a[1] * Math.PI) / 180),
    (b[1] - a[1]) * METRES,
  )
}

/** Route the final link around the campus footprint to its south-side gate. */
export function poloAccessConnector(state: PoloSceneState): LngLat[] {
  const scale = poloGeometryScale(state)
  const w = (POLO_LAYOUT.pad.width * scale) / 2 + 20
  const h = (POLO_LAYOUT.pad.depth * scale) / 2 + 20
  const angle = (state.bearing * Math.PI) / 180
  const east =
    (POLO_ACCESS_FIELD_ENTRY[0] - state.center[0]) *
    METRES *
    Math.cos((state.center[1] * Math.PI) / 180)
  const north = (POLO_ACCESS_FIELD_ENTRY[1] - state.center[1]) * METRES
  const x = east * Math.cos(angle) - north * Math.sin(angle)
  const y = east * Math.sin(angle) + north * Math.cos(angle)
  const clampX = Math.max(-w, Math.min(w, x))
  const clampY = Math.max(-h, Math.min(h, y))
  const candidates: XY[] = [
    [clampX, -h],
    [w, clampY],
    [clampX, h],
    [-w, clampY],
  ]
  const join = candidates.reduce((best, point) =>
    Math.hypot(point[0] - x, point[1] - y) <
    Math.hypot(best[0] - x, best[1] - y)
      ? point
      : best,
  )
  const perimeter = 4 * (w + h)
  const along = ([px, py]: XY): number => {
    if (py === -h) return px + w
    if (px === w) return 2 * w + py + h
    if (py === h) return 3 * w + 2 * h - px
    return 4 * w + 3 * h - py
  }
  const start = along(join)
  const clockwise = (w - start + perimeter) % perimeter
  const direction = clockwise <= perimeter / 2 ? 1 : -1
  const length = Math.min(clockwise, perimeter - clockwise)
  const travel = (point: XY): number =>
    (direction * (along(point) - start) + perimeter) % perimeter
  const corners: XY[] = [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ]
  const local: XY[] = [
    join,
    ...corners
      .filter((point) => travel(point) > 0.01 && travel(point) < length)
      .sort((a, b) => travel(a) - travel(b)),
    [0, -h],
    [0, -43 * scale],
  ]
  const end = POLO_ACCESS_ROAD.at(-1)
  if (!end) throw new Error('Missing access-road endpoint')
  const points: LngLat[] = [
    [...end],
    [...POLO_ACCESS_FIELD_ENTRY],
    ...local.map(([px, py]) =>
      poloCoordinate(px, py, state.center, state.bearing),
    ),
  ]
  return points.filter((point, index, points) => {
    const previous = points[index - 1]
    return !previous || accessDistance(previous, point) > 0.01
  })
}

export interface AccessSample {
  coordinate: LngLat
  distance: number
}

/** Densify by metres, retaining bends and a cumulative distance for uniform speed. */
export function sampleAccessRoute(points: readonly LngLat[]): AccessSample[] {
  const first = points[0]
  if (!first) return []
  const samples: AccessSample[] = [{ coordinate: [...first], distance: 0 }]
  let distance = 0
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1],
      b = points[index]
    if (!a || !b) continue
    const length = accessDistance(a, b)
    if (length < 0.01) continue
    const count = Math.min(1000, Math.ceil(length / 10))
    for (let part = 1; part <= count; part++) {
      const t = part / count
      samples.push({
        coordinate: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        distance: distance + length * t,
      })
    }
    distance += length
  }
  return samples
}

export function accessRoutePosition(
  samples: readonly AccessSample[],
  distance: number,
  reverse = false,
  lane = 1.6,
): { coordinate: LngLat; heading: number; index: number; fraction: number } {
  const first = samples[0],
    last = samples.at(-1)
  if (!first || !last || samples.length < 2)
    throw new Error('An access route needs two distinct points')
  const bounded = Math.max(0, Math.min(last.distance, distance))
  let low = 1,
    high = samples.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if ((samples[middle]?.distance ?? Infinity) < bounded) low = middle + 1
    else high = middle
  }
  const a = samples[low - 1] ?? first,
    b = samples[low] ?? last
  const fraction = (bounded - a.distance) / (b.distance - a.distance)
  const heading =
    Math.atan2(
      (b.coordinate[0] - a.coordinate[0]) *
        Math.cos((a.coordinate[1] * Math.PI) / 180),
      b.coordinate[1] - a.coordinate[1],
    ) + (reverse ? Math.PI : 0)
  const lat = a.coordinate[1] + (b.coordinate[1] - a.coordinate[1]) * fraction
  return {
    coordinate: [
      a.coordinate[0] +
        (b.coordinate[0] - a.coordinate[0]) * fraction +
        (Math.cos(heading) * lane) / (METRES * Math.cos((lat * Math.PI) / 180)),
      lat - (Math.sin(heading) * lane) / METRES,
    ],
    heading,
    index: low - 1,
    fraction,
  }
}

export function accessVehicleKind(
  phase: PoloPhase,
  index: number,
): 'car' | 'van' | 'truck' {
  if (phase === 'M5' || phase === 'M6') return index % 3 === 0 ? 'van' : 'car'
  return 'truck'
}

export function accessVehicleJourney(
  seconds: number,
  index: number,
  length: number,
): { distance: number; reverse: boolean; visible: boolean } {
  const reverse = index % 2 === 1
  const age = seconds - index * 3
  const travelled = (Math.max(0, age) * 12) % (length + 85)
  return {
    distance: reverse ? length - travelled : travelled,
    reverse,
    visible: age >= 0 && travelled <= length,
  }
}
