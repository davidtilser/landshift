import Globe from 'globe.gl'
import { Group, MeshPhongMaterial } from 'three'
import { createCameraController } from './camera.ts'
import { createCloudsLayer } from './layers/clouds.ts'
import type { GlobeHandle } from './types.ts'

const TEXTURES_URL = `${import.meta.env.BASE_URL}textures/`
const DAY_TEXTURE_4K_URL = `${TEXTURES_URL}earth-day-4k.webp`
const DAY_TEXTURE_8K_URL = `${TEXTURES_URL}earth-day-8k.webp`
const BUMP_TEXTURE_URL = `${TEXTURES_URL}earth-bump.webp`
const DAY_TEXTURE_8K_SIZE = 8192
const DAY_TEXTURE_8K_MEDIA_QUERY = '(min-width: 1024px) and (pointer: fine)'
const EARTH_RADIUS_KM = 6371
const MIN_ALTITUDE_KM = 1000
const MAX_ALTITUDE_RADII = 4
const INITIAL_ALTITUDE_RADII = 2.5
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function createGlobe(container: HTMLElement): GlobeHandle {
  const globe = new Globe(container, {
    animateIn: false,
    rendererConfig: { alpha: true },
  })
  const renderer = globe.renderer()
  globe
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl(DAY_TEXTURE_4K_URL)
    .bumpImageUrl(BUMP_TEXTURE_URL)
    .showAtmosphere(true)
    .pointOfView({ altitude: INITIAL_ALTITUDE_RADII })

  const globeRadius = globe.getGlobeRadius()
  const controls = globe.controls()
  controls.minDistance = globeRadius * (1 + MIN_ALTITUDE_KM / EARTH_RADIUS_KM)
  controls.maxDistance = globeRadius * (1 + MAX_ALTITUDE_RADII)

  const resize = (): void => {
    globe.width(container.clientWidth).height(container.clientHeight)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  const layerRoot = new Group()
  layerRoot.visible = false
  globe.scene().add(layerRoot)
  const clouds = createCloudsLayer()
  clouds.attach({ parent: layerRoot, globeRadius })

  const camera = createCameraController(globe)

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
  let paused = false
  let destroyed = false
  const applyMotionPreferences = (): void => {
    camera.setReducedMotion(reducedMotion.matches)
    clouds.setDrifting(!paused && !reducedMotion.matches)
  }
  reducedMotion.addEventListener('change', applyMotionPreferences)
  applyMotionPreferences()

  globe.onGlobeReady(() => {
    if (destroyed) {
      return
    }
    layerRoot.visible = true
    if (
      renderer.capabilities.maxTextureSize >= DAY_TEXTURE_8K_SIZE &&
      window.matchMedia(DAY_TEXTURE_8K_MEDIA_QUERY).matches
    ) {
      globe.globeImageUrl(DAY_TEXTURE_8K_URL)
    }
  })

  return {
    flyTo(target, durationMs) {
      if (destroyed) {
        return Promise.resolve()
      }
      return camera.flyTo(target, durationMs)
    },
    setAutoRotate(enabled) {
      if (!destroyed) {
        camera.setAutoRotate(enabled)
      }
    },
    pause() {
      if (destroyed) {
        return
      }
      paused = true
      globe.pauseAnimation()
      applyMotionPreferences()
    },
    resume() {
      if (destroyed) {
        return
      }
      paused = false
      globe.resumeAnimation()
      applyMotionPreferences()
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      resizeObserver.disconnect()
      reducedMotion.removeEventListener('change', applyMotionPreferences)
      camera.destroy()
      clouds.detach()
      layerRoot.removeFromParent()
      // globe.gl's teardown disposes the day map but not the bump map.
      const globeMaterial = globe.globeMaterial()
      if (globeMaterial instanceof MeshPhongMaterial) {
        globeMaterial.bumpMap?.dispose()
      }
      globe._destructor()
      renderer.forceContextLoss()
      container.replaceChildren()
    },
  }
}
