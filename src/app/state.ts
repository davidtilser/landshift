import { findRegion, isSelectable } from '../regions/regions.ts'
import { findScenario, isPlayableIn } from '../scenarios/scenarios.ts'

/** `regionFocused` is the brief card with the region's scenarios. */
export type LandingState =
  | { screen: 'idle' }
  | { screen: 'explore' }
  | { screen: 'regionFocused'; regionId: string }
  | { screen: 'handoff'; regionId: string; scenarioId: string }

export type LandingEvent =
  | { type: 'explore' }
  | { type: 'selectRegion'; regionId: string }
  | { type: 'back' }
  | { type: 'startGame'; scenarioId: string }
  | { type: 'handoffFailed' }

export type LandingListener = (state: LandingState) => void

export interface LandingStore {
  get(): LandingState
  /** Applies `event`; events that are invalid for the current screen are ignored. */
  dispatch(event: LandingEvent): void
  /** Listeners run only when the state changes. Returns an unsubscribe function. */
  subscribe(listener: LandingListener): () => void
}

function back(state: LandingState): LandingState {
  switch (state.screen) {
    case 'idle':
    case 'handoff':
      return state
    case 'explore':
      return { screen: 'idle' }
    case 'regionFocused':
      return { screen: 'explore' }
  }
}

function canSelect(state: LandingState, regionId: string): boolean {
  const region = findRegion(regionId)
  if (region === undefined || !isSelectable(region)) return false
  switch (state.screen) {
    case 'idle':
    case 'handoff':
      return false
    case 'explore':
      return true
    case 'regionFocused':
      return state.regionId !== regionId
  }
}

function canStart(regionId: string, scenarioId: string): boolean {
  const scenario = findScenario(scenarioId)
  return scenario !== undefined && isPlayableIn(scenario, regionId)
}

/** Returns `state` itself when `event` does not apply. */
export function transition(
  state: LandingState,
  event: LandingEvent,
): LandingState {
  switch (event.type) {
    case 'explore':
      return state.screen === 'idle' ? { screen: 'explore' } : state
    case 'selectRegion':
      return canSelect(state, event.regionId)
        ? { screen: 'regionFocused', regionId: event.regionId }
        : state
    case 'back':
      return back(state)
    case 'startGame':
      return state.screen === 'regionFocused' &&
        canStart(state.regionId, event.scenarioId)
        ? {
            screen: 'handoff',
            regionId: state.regionId,
            scenarioId: event.scenarioId,
          }
        : state
    case 'handoffFailed':
      return state.screen === 'handoff'
        ? { screen: 'regionFocused', regionId: state.regionId }
        : state
  }
}

export function createLandingStore(initial: LandingState): LandingStore {
  let state = initial
  const listeners = new Set<LandingListener>()
  // Listeners may dispatch (a failed handoff reports back mid-render); queue so each sees states in order.
  const queue: LandingEvent[] = []
  let notifying = false

  return {
    get(): LandingState {
      return state
    },
    dispatch(event: LandingEvent): void {
      queue.push(event)
      if (notifying) return
      notifying = true
      try {
        let pending = queue.shift()
        while (pending) {
          const next = transition(state, pending)
          if (next !== state) {
            state = next
            for (const listener of [...listeners]) listener(next)
          }
          pending = queue.shift()
        }
      } finally {
        queue.length = 0
        notifying = false
      }
    },
    subscribe(listener: LandingListener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
