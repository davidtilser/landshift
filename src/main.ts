import './style.css'
import { renderCredits } from './credits/credits.ts'
import { createGlobe } from './globe/index.ts'

const SF_BAY_AREA = { lat: 37.8, lng: -122.3, altitude: 0.35 }
const GLOBE_VIEW = { lat: 20, lng: -122.3, altitude: 2.5 }

const app = document.querySelector('#app')
if (!(app instanceof HTMLDivElement)) {
  throw new Error('Missing #app container')
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

const globeContainer = document.createElement('div')
globeContainer.className = 'globe'

const harnessControls = document.createElement('div')
harnessControls.className = 'harness-controls'

const footer = document.createElement('footer')
footer.className = 'credits'
renderCredits(footer)

app.replaceChildren(globeContainer, harnessControls, footer)

const globe = createGlobe(globeContainer)

let focused = false
const focusButton = createButton('Fly to SF Bay Area', () => {
  focused = !focused
  focusButton.textContent = focused ? 'Return to globe' : 'Fly to SF Bay Area'
  if (focused) {
    void globe.flyTo(SF_BAY_AREA)
    return
  }
  void globe.flyTo(GLOBE_VIEW).then(() => {
    // A newer click may have focused again while the flight was underway.
    if (!focused) {
      globe.setAutoRotate(true)
    }
  })
})

harnessControls.append(focusButton)
