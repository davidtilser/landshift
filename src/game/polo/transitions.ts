import type { PoloPhase } from './model.ts'

/** Seconds are authored screen time, never workdays or a measured demand ramp. */
export const POLO_TRANSITION_SECONDS: Record<PoloPhase, number> = {
  M0: 0,
  M1: 6,
  M2: 6,
  M3: 5,
  M4: 9,
  M5: 7,
  M6: 4,
}

/** Visual reveal fractions only. Numerical cards always use the selected endpoint. */
export interface PoloTransitionFrame {
  phase: PoloPhase
  progress: number
  complete: boolean
  caption: string
  turfRemoved: number
  grading: number
  compaction: number
  foundation: number
  frame: number
  roof: number
  cladding: number
  hardstanding: number
  landscaping: number
  commissioning: number
  operation: number
  machineProgress: number
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}
function reveal(progress: number, start = 0, end = 1): number {
  const position = clamp((progress - start) / (end - start))
  return position * position * (3 - 2 * position)
}

/**
 * A phase starts at the preceding phase's complete physical state. Call with
 * animate=false for skip, reduced motion or a comparison jump. Geometry may
 * develop through these fractions; water/fuel/power values must not interpolate.
 */
export function poloTransitionFrame(
  phase: PoloPhase,
  elapsedSeconds: number,
  animate = true,
): PoloTransitionFrame {
  const duration = POLO_TRANSITION_SECONDS[phase]
  const elapsed =
    elapsedSeconds === Infinity
      ? duration
      : Number.isFinite(elapsedSeconds)
        ? Math.max(0, elapsedSeconds)
        : 0
  const progress = duration === 0 ? 0 : animate ? clamp(elapsed / duration) : 1
  const complete = duration === 0 || progress === 1
  const state: PoloTransitionFrame = {
    phase,
    progress,
    complete,
    caption: 'Keep the field in view',
    turfRemoved: 0,
    grading: 0,
    compaction: 0,
    foundation: 0,
    frame: 0,
    roof: 0,
    cladding: 0,
    hardstanding: 0,
    landscaping: 0,
    commissioning: 0,
    operation: 0,
    machineProgress: progress,
  }
  if (phase === 'M0') return state
  state.turfRemoved = phase === 'M1' ? reveal(progress) : 1
  if (phase === 'M1') {
    state.caption = complete
      ? 'Grass lifted; original turf stays around the works'
      : 'Lift the grass inside the work area'
    return state
  }
  state.grading = phase === 'M2' ? reveal(progress) : 1
  if (phase === 'M2') {
    state.caption = complete
      ? 'Ground shaped; the work area stays the same'
      : 'Grade the already stripped ground'
    return state
  }
  state.compaction = phase === 'M3' ? reveal(progress) : 1
  if (phase === 'M3') {
    state.caption = complete
      ? 'Ground firmed; no more turf removed'
      : 'Roll the same prepared ground'
    return state
  }
  if (phase === 'M4') {
    state.foundation = reveal(progress, 0, 0.25)
    state.frame = reveal(progress, 0.25, 0.68)
    state.roof = reveal(progress, 0.68, 1)
    state.caption = complete
      ? 'Structure and roofs in place'
      : progress < 0.25
        ? 'Pour the foundations'
        : progress < 0.68
          ? 'Raise the steel frame'
          : 'Fit the roofs'
    return state
  }
  state.foundation = 1
  state.frame = 1
  state.roof = 1
  if (phase === 'M5') {
    state.cladding = reveal(progress, 0, 0.35)
    state.hardstanding = reveal(progress, 0.35, 0.65)
    state.landscaping = reveal(progress, 0.65, 1)
    state.commissioning = reveal(progress, 0.65, 1)
    state.caption = complete
      ? 'Works finished; equipment checked'
      : progress < 0.35
        ? 'Close the walls'
        : progress < 0.65
          ? 'Lay the hard surfaces'
          : 'Plant and check the equipment'
    return state
  }
  state.cladding = 1
  state.hardstanding = 1
  state.landscaping = 1
  state.commissioning = 1
  state.operation = reveal(progress)
  state.caption = complete
    ? 'Computing and cooling are running'
    : 'Reveal computing, cooling and power paths'
  return state
}
