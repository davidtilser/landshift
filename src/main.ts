import './style.css'
import { createLandingStore } from './app/state.ts'
import { mountLanding } from './screens/landing/landing.ts'
import type { LandingGlobe } from './screens/landing/landingGlobe.ts'
import { gameLaunchForScenario } from './scenarios/scenarios.ts'
import { createGameUrl } from './shared/game-launch.ts'

const app = document.querySelector('#app')
if (!(app instanceof HTMLDivElement)) {
  throw new Error('Missing #app container')
}

const store = createLandingStore({ screen: 'idle' })
const globeHost = document.createElement('div')
globeHost.className = 'globe'

interface LiveGlobe extends LandingGlobe {
  destroy(): void
}

let unmountLanding = (): void => {}
let globe: LiveGlobe | undefined
let landingMounted = true

const globeReady = new Promise<LiveGlobe>((resolve, reject) => {
  // A later task lets the headline and Explore paint before the globe bundle parses.
  window.setTimeout(() => {
    void import('./globe/index.ts').then(
      ({ createGlobe }) => {
        try {
          const created = createGlobe(globeHost)
          if (!landingMounted) {
            created.destroy()
            return
          }
          globe = created
          resolve(created)
        } catch (error: unknown) {
          reject(
            error instanceof Error ? error : new Error('Globe failed to load'),
          )
        }
      },
      (error: unknown) => {
        reject(
          error instanceof Error ? error : new Error('Globe failed to load'),
        )
      },
    )
  }, 0)
})

unmountLanding = mountLanding(app, store, {
  globeHost,
  globe: globeReady,
  onHandoff(regionId, scenarioId) {
    const launch = gameLaunchForScenario(regionId, scenarioId)
    if (launch) {
      window.location.assign(createGameUrl(launch, window.location.href).href)
      return
    }
    void import('./screens/game/index.ts').then(
      ({ mountGame }) => {
        landingMounted = false
        unmountLanding()
        globe?.destroy()
        mountGame(app, regionId, scenarioId)
      },
      (error: unknown) => {
        console.error('Could not load the game', error)
        store.dispatch({ type: 'handoffFailed' })
      },
    )
  },
})
