import type { LngLat } from '../geometry.ts'
import { POLO_CENTER } from './model.ts'
import type { PoloPhase, PoloProposal, PoloSceneState } from './model.ts'

export const POLO_LAYOUT = {
  pad: { width: 320, depth: 125 },
  workBand: { width: 320, depth: 100 },
  developedBand: { width: 320, depth: 87.5 },
  halls: [
    { x: -65, y: 0, width: 100, depth: 60 },
    { x: 65, y: 0, width: 100, depth: 60 },
  ],
  pool: { x: 230, y: 30, width: 60, depth: 36 },
} as const

/** Complete target surface states; work never consumes the retained original turf bands. */
export function poloSurfaceAreas(phase: PoloPhase): {
  turf: number
  stripped_not_graded: number
  bare_graded: number
  roof: number
  other_impervious: number
  landscape: number
} {
  const pad = POLO_LAYOUT.pad.width * POLO_LAYOUT.pad.depth
  const work = POLO_LAYOUT.workBand.width * POLO_LAYOUT.workBand.depth
  const roofs = POLO_LAYOUT.halls.reduce(
    (total, hall) => total + hall.width * hall.depth,
    0,
  )
  const developed =
    POLO_LAYOUT.developedBand.width * POLO_LAYOUT.developedBand.depth
  const areas = {
    turf: pad - work,
    stripped_not_graded: 0,
    bare_graded: 0,
    roof: 0,
    other_impervious: 0,
    landscape: 0,
  }
  if (phase === 'M0') areas.turf = pad
  else if (phase === 'M1') areas.stripped_not_graded = work
  else if (phase === 'M2' || phase === 'M3') areas.bare_graded = work
  else if (phase === 'M4') {
    areas.roof = roofs
    areas.bare_graded = work - roofs
  } else {
    areas.roof = roofs
    areas.other_impervious = developed - roofs
    areas.landscape = work - developed
  }
  return areas
}

export function poloCoordinate(
  x: number,
  y: number,
  center: LngLat = POLO_CENTER,
  bearing = 0,
): LngLat {
  const radians = (bearing * Math.PI) / 180
  const east = x * Math.cos(radians) + y * Math.sin(radians)
  const north = -x * Math.sin(radians) + y * Math.cos(radians)
  return [
    center[0] + east / (111320 * Math.cos((center[1] * Math.PI) / 180)),
    center[1] + north / 111320,
  ]
}

export function activePoloProposal(state: PoloSceneState): PoloProposal | null {
  return state.confirmed && state.phase === 'M6' && state.preview
    ? state.proposal
    : null
}

export function pointOnPath(
  points: readonly (readonly [number, number, number])[],
  phase: number,
): readonly [number, number, number] {
  const bounded = ((phase % 1) + 1) % 1
  const progress = bounded * (points.length - 1)
  const index = Math.floor(progress)
  const start = points[index] ?? points[0] ?? [0, 0, 0]
  const end = points[index + 1] ?? start
  const portion = progress - index
  return [
    start[0] + (end[0] - start[0]) * portion,
    start[1] + (end[1] - start[1]) * portion,
    start[2] + (end[2] - start[2]) * portion,
  ]
}
