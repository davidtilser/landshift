import './project-setup.css'
import { usAcres, usAreaNumber } from './us-units.ts'
import {
  POLO_SCENARIO_ID,
  POLO_MIN_AREA_HA,
  POLO_MAX_AREA_HA,
  POLO_AREA_STEP_HA,
  POLO_DEFAULT_AREA_HA,
} from './model.ts'

export const POLO_LOCATION_CHOICES = [
  { id: 'mission-bay', label: 'Mission Bay', available: false },
  {
    id: POLO_SCENARIO_ID,
    label: 'Golden Gate Park',
    available: true,
  },
  { id: 'presidio', label: 'Presidio', available: false },
  { id: 'treasure-island', label: 'Treasure Island', available: false },
] as const

/** Size is an explicit parameter of the teaching model. */
export function setupPoloProjectIntro(
  root: HTMLElement,
  startFlight: (areaHa: number, arrived: () => void) => void,
  quickView: (areaHa: number) => void,
): { open: () => void; dismiss: () => void; destroy: () => void } {
  const dialog = document.createElement('dialog')
  dialog.className = 'polo-project-setup'
  dialog.setAttribute('aria-labelledby', 'polo-setup-title')
  dialog.innerHTML = `
    <form>
      <div class="polo-setup-guide"><img src="/avatars/maya.png" alt="" width="48" height="48"><h1 id="polo-setup-title">Let’s build a data center.</h1></div>
      <div class="polo-setup-size"><label for="polo-setup-size">Campus size</label><div><output id="polo-setup-size-value" for="polo-setup-size"></output><span>acres</span></div><input id="polo-setup-size" name="size" type="range"><div class="polo-size-limits"><span></span><span></span></div></div>
      <label for="polo-setup-location">Location</label>
      <select id="polo-setup-location" name="location"></select>
      <button type="submit">Explore this location →</button>
      <button type="button" class="polo-setup-quick-view" title="Temporary testing shortcut">Quick view: Today ↗</button>
    </form>
  `
  const form = dialog.querySelector('form')
  const size = dialog.querySelector('input')
  const sizeValue = dialog.querySelector('output')
  const location = dialog.querySelector('select')
  if (!form || !size || !sizeValue || !location)
    throw new Error('Project setup is incomplete')
  size.min = String(POLO_MIN_AREA_HA)
  size.max = String(POLO_MAX_AREA_HA)
  size.step = String(POLO_AREA_STEP_HA)
  const updateSize = (): void => {
    sizeValue.value = usAreaNumber(Number(size.value) * 10000)
    size.setAttribute('aria-valuetext', usAcres(Number(size.value) * 10000))
    size.style.setProperty(
      '--polo-size-fill',
      String(
        ((Number(size.value) - POLO_MIN_AREA_HA) /
          (POLO_MAX_AREA_HA - POLO_MIN_AREA_HA)) *
          100,
      ) + '%',
    )
  }
  size.value = String(POLO_DEFAULT_AREA_HA)
  updateSize()
  size.addEventListener('input', updateSize)
  const limits = dialog.querySelectorAll('.polo-size-limits span')
  if (limits[0]) limits[0].textContent = usAcres(POLO_MIN_AREA_HA * 10000)
  if (limits[1]) limits[1].textContent = usAcres(POLO_MAX_AREA_HA * 10000)
  for (const choice of POLO_LOCATION_CHOICES) {
    const option = document.createElement('option')
    option.value = choice.id
    option.textContent =
      choice.label + (choice.available ? '' : ' · Coming soon')
    option.disabled = !choice.available
    option.selected = choice.id === POLO_SCENARIO_ID
    location.append(option)
  }
  const status = document.createElement('div')
  status.className = 'polo-site-flight'
  status.setAttribute('role', 'status')
  status.hidden = true
  status.innerHTML =
    '<span aria-hidden="true">◉</span> Heading to Golden Gate Park…'
  const city = document.createElement('div')
  city.className = 'polo-city-label'
  city.textContent = 'San Francisco'
  const studio = root.querySelector('.polo-studio') ?? root
  studio.append(city, status, dialog)
  let disposed = false
  let flightVersion = 0
  const dismiss = (): void => {
    flightVersion++
    dialog.close()
    status.hidden = true
    root.dataset['poloSetup'] = 'placement'
  }
  dialog
    .querySelector('.polo-setup-quick-view')
    ?.addEventListener('click', () => {
      if (disposed || location.value !== POLO_SCENARIO_ID) return
      const areaHa = Number(size.value)
      dismiss()
      quickView(areaHa)
    })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
  })
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (disposed || root.dataset['poloSetup'] !== 'intro') return
    if (location.value !== POLO_SCENARIO_ID) return
    root.dataset['poloSetup'] = 'flying'
    dialog.close()
    status.hidden = false
    const version = ++flightVersion
    startFlight(Number(size.value), () => {
      if (disposed || version !== flightVersion) return
      status.hidden = true
      root.dataset['poloSetup'] = 'placement'
    })
  })
  return {
    open: () => {
      if (disposed) return
      flightVersion++
      root.dataset['poloSetup'] = 'intro'
      status.hidden = true
      size.value = String(POLO_DEFAULT_AREA_HA)
      updateSize()
      if (!dialog.open) dialog.showModal()
      location.focus()
    },
    dismiss,
    destroy: () => {
      disposed = true
      dialog.close()
      dialog.remove()
      status.remove()
      city.remove()
    },
  }
}
