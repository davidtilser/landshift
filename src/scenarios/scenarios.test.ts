import { describe, expect, it } from 'vitest'
import { createGameUrl, readGameLaunch } from '../shared/game-launch.ts'
import { gameLaunchForScenario } from './scenarios.ts'
import { createLandingStore } from '../app/state.ts'

describe('onboarding handoff to the playable game', () => {
  it('maps the SF Bay datacenter card to Polo Fields through the landing flow', () => {
    const store = createLandingStore({ screen: 'idle' })
    store.dispatch({ type: 'explore' })
    store.dispatch({ type: 'selectRegion', regionId: 'sf-bay-area' })
    store.dispatch({ type: 'startGame', scenarioId: 'datacenter-build' })
    const state = store.get()
    expect(state.screen).toBe('handoff')
    if (state.screen !== 'handoff') throw new Error('Missing game handoff')
    const launch = gameLaunchForScenario(state.regionId, state.scenarioId)
    expect(launch).toEqual({ scenarioId: 'golden-gate-polo' })
    if (!launch) throw new Error('Missing playable game')
    for (const [base, target] of [
      [
        'http://localhost:5173/',
        'http://localhost:5173/game.html?scenario=golden-gate-polo',
      ],
      [
        'http://127.0.0.1:4175/index.html',
        'http://127.0.0.1:4175/game.html?scenario=golden-gate-polo',
      ],
      [
        'https://example.com/demo/index.html?old=value#explore',
        'https://example.com/demo/game.html?scenario=golden-gate-polo',
      ],
    ]) {
      if (!base || !target) throw new Error('Missing URL fixture')
      const url = createGameUrl(launch, base)
      expect(url.href).toBe(target)
      expect(readGameLaunch(url)).toEqual(launch)
    }
  })
  it('does not redirect unrelated, locked or mismatched selections into Polo Fields', () => {
    expect(
      gameLaunchForScenario('los-angeles-basin', 'datacenter-build'),
    ).toBeNull()
    expect(gameLaunchForScenario('sf-bay-area', 'hillside-housing')).toBeNull()
    expect(gameLaunchForScenario('los-angeles-basin', 'la-sample-1')).toBeNull()
    expect(gameLaunchForScenario('sf-bay-area', 'unknown')).toBeNull()
  })
})
