import Globe from 'globe.gl'
import {
  Group,
  LinearFilter,
  Mesh,
  MeshPhongMaterial,
  NoColorSpace,
  PerspectiveCamera,
  RepeatWrapping,
  Sphere,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from 'three'
import type { Object3D, Texture } from 'three'
import { createCameraController } from './camera.ts'
import { createCompositor } from './compositor.ts'
import { createCloudsLayer } from './layers/clouds.ts'
import { createMarkerOverlay } from './layers/markers.ts'
import { createOceanLayer } from './layers/ocean.ts'
import { RENDER_ORDER } from './layers/shells.ts'
import type { GlobeLayer } from './layers/types.ts'
import { applySunLighting } from './lighting.ts'
import {
  MAX_HEIGHT_CODE,
  RADII_PER_HEIGHT_CODE,
  SEA_LEVEL_CODE,
} from './relief.ts'
import { createStarfield } from './stars.ts'
import { openingView } from './openingView.ts'
import type { GlobeHandle } from './types.ts'

const TEXTURES_URL = `${import.meta.env.BASE_URL}textures/`
const DAY_TEXTURE_4K_URL = `${TEXTURES_URL}earth-day-4k.webp`
const DAY_TEXTURE_8K_URL = `${TEXTURES_URL}earth-day-8k.webp`
const HEIGHT_TEXTURE_URL = `${TEXTURES_URL}earth-height.png`
const NORMAL_TEXTURE_URL = `${TEXTURES_URL}earth-normal.webp`
const DAY_TEXTURE_8K_SIZE = 8192
const HIGH_DETAIL_MEDIA_QUERY = '(min-width: 1024px) and (pointer: fine)'
const HIGH_DETAIL_CURVATURE_DEGREES = 0.5
const STANDARD_CURVATURE_DEGREES = 1
const EARTH_RADIUS_KM = 6371
const MIN_ALTITUDE_KM = 1000
const MAX_ALTITUDE_RADII = 4
// globe.gl's 0.05 near plane cannot resolve the 0.025-unit gap between the ocean shell and the lowest land.
const CAMERA_NEAR = 5
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

interface ReliefMaps {
  height: Texture
  normal: Texture
}

async function loadReliefMaps(): Promise<ReliefMaps> {
  const loader = new TextureLoader()
  const [height, normal] = await Promise.all([
    loader.loadAsync(HEIGHT_TEXTURE_URL),
    loader.loadAsync(NORMAL_TEXTURE_URL),
  ])
  height.colorSpace = NoColorSpace
  height.generateMipmaps = false
  height.minFilter = LinearFilter
  // Wrapping lets both seam columns sample the same blended height, so the mesh does not crack at the antimeridian.
  height.wrapS = RepeatWrapping
  normal.wrapS = RepeatWrapping
  return { height, normal }
}

function isAtmosphere(object: Object3D): boolean {
  return '__globeObjType' in object && object.__globeObjType === 'atmosphere'
}

/** Replaces triangle picking with one analytic hit, so the globe still occludes and takes clicks at O(1) cost. */
function pickAsSphere(mesh: Mesh, radius: number): void {
  const sphere = new Sphere(new Vector3(), radius)
  mesh.raycast = (raycaster, intersects) => {
    sphere.center.setFromMatrixPosition(mesh.matrixWorld)
    const point = raycaster.ray.intersectSphere(sphere, new Vector3())
    if (point === null) {
      return
    }
    const distance = raycaster.ray.origin.distanceTo(point)
    if (distance >= raycaster.near && distance <= raycaster.far) {
      intersects.push({ distance, point, object: mesh })
    }
  }
}

/** Resolves true once three-globe has swapped in the requested sphere, or false if cancelled first. */
async function untilWidthSegments(
  mesh: Mesh,
  widthSegments: number,
  cancelled: () => boolean,
): Promise<boolean> {
  while (!cancelled()) {
    if (
      mesh.geometry instanceof SphereGeometry &&
      mesh.geometry.parameters.widthSegments === widthSegments
    ) {
      return true
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  }
  return false
}

export function createGlobe(container: HTMLElement): GlobeHandle {
  const globe = new Globe(container, {
    animateIn: false,
    // Only the stars and the final composite draw to the canvas; the globe gets MSAA in its own render target.
    rendererConfig: { alpha: true, antialias: false },
  })
  const renderer = globe.renderer()
  const globeRadius = globe.getGlobeRadius()
  const unitsPerCode = RADII_PER_HEIGHT_CODE * globeRadius
  const reliefMaterial = new MeshPhongMaterial({
    displacementScale: MAX_HEIGHT_CODE * unitsPerCode,
    displacementBias: -SEA_LEVEL_CODE * unitsPerCode,
  })
  globe
    .globeMaterial(reliefMaterial)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl(DAY_TEXTURE_4K_URL)
    .showGlobe(false)
    .showAtmosphere(false)
    .pointOfView(openingView)
  applySunLighting(globe.lights())

  const camera = globe.camera()
  if (!(camera instanceof PerspectiveCamera)) {
    throw new Error('Expected a perspective camera')
  }
  camera.near = CAMERA_NEAR
  camera.updateProjectionMatrix()
  const controls = globe.controls()
  controls.enableZoom = false
  controls.enablePan = false
  controls.minDistance = globeRadius * (1 + MIN_ALTITUDE_KM / EARTH_RADIUS_KM)
  controls.maxDistance = globeRadius * (1 + MAX_ALTITUDE_RADII)

  const resize = (): void => {
    globe.width(container.clientWidth).height(container.clientHeight)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  const starfield = createStarfield()
  const compositor = createCompositor({
    composer: globe.postProcessingComposer(),
    globeScene: globe.scene(),
    starScene: starfield.scene,
    camera,
  })

  const layerRoot = new Group()
  layerRoot.visible = false
  globe.scene().add(layerRoot)
  const clouds = createCloudsLayer()
  clouds.attach({ parent: layerRoot, globeRadius })
  let ocean: GlobeLayer | undefined

  const cameraController = createCameraController(globe)
  const markers = createMarkerOverlay({
    container,
    globe,
    camera,
    controls,
    globeRadius,
    flyTo: (target) => cameraController.flyTo(target),
  })

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
  let paused = false
  let destroyed = false
  const applyMotionPreferences = (): void => {
    const animating = !paused && !reducedMotion.matches
    cameraController.setReducedMotion(reducedMotion.matches)
    clouds.setDrifting(animating)
    starfield.setTwinkling(animating)
  }
  reducedMotion.addEventListener('change', applyMotionPreferences)
  applyMotionPreferences()

  const highDetail = window.matchMedia(HIGH_DETAIL_MEDIA_QUERY).matches
  const curvatureDegrees = highDetail
    ? HIGH_DETAIL_CURVATURE_DEGREES
    : STANDARD_CURVATURE_DEGREES
  const globeMeshReady = new Promise<Mesh>((resolve, reject) => {
    globe.onGlobeReady(() => {
      if (destroyed) {
        return
      }
      let globeMesh: Mesh | undefined
      globe.scene().traverse((object) => {
        if (object instanceof Mesh && object.material === reliefMaterial) {
          globeMesh = object
        } else if (isAtmosphere(object)) {
          object.renderOrder = RENDER_ORDER.atmosphere
        }
      })
      if (globeMesh === undefined) {
        reject(new Error('three-globe did not expose its globe mesh'))
        return
      }
      pickAsSphere(globeMesh, globeRadius)
      // Set after ready so the atmosphere keeps the coarse sphere it cloned from the default resolution.
      globe.globeCurvatureResolution(curvatureDegrees)
      if (
        highDetail &&
        renderer.capabilities.maxTextureSize >= DAY_TEXTURE_8K_SIZE
      ) {
        globe.globeImageUrl(DAY_TEXTURE_8K_URL)
      }
      resolve(globeMesh)
    })
  })

  const reveal = async (): Promise<void> => {
    const [globeMesh, maps] = await Promise.all([
      globeMeshReady,
      loadReliefMaps(),
    ])
    if (destroyed) {
      maps.height.dispose()
      maps.normal.dispose()
      return
    }
    reliefMaterial.displacementMap = maps.height
    reliefMaterial.normalMap = maps.normal
    reliefMaterial.needsUpdate = true
    ocean = createOceanLayer(maps.height)
    ocean.attach({ parent: layerRoot, globeRadius })
    const meshReady = await untilWidthSegments(
      globeMesh,
      Math.round(360 / curvatureDegrees),
      () => destroyed,
    )
    if (!meshReady) {
      return
    }
    globe.showGlobe(true).showAtmosphere(true)
    layerRoot.visible = true
  }
  reveal().catch((error: unknown) => {
    console.error('Globe stays hidden because its assets failed to load', error)
  })

  return {
    flyTo(target, durationMs) {
      if (destroyed) {
        return Promise.resolve()
      }
      return cameraController.flyTo(target, durationMs)
    },
    setAutoRotate(enabled) {
      if (!destroyed) {
        cameraController.setAutoRotate(enabled)
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
    setMarkers(next) {
      if (!destroyed) markers.setMarkers(next)
    },
    highlightMarker(id) {
      if (!destroyed) markers.highlightMarker(id)
    },
    onMarkerClick(listener) {
      return markers.onMarkerClick(listener)
    },
    setInteractive(enabled) {
      if (!destroyed) markers.setInteractive(enabled)
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      markers.destroy()
      resizeObserver.disconnect()
      reducedMotion.removeEventListener('change', applyMotionPreferences)
      cameraController.destroy()
      clouds.detach()
      ocean?.detach()
      layerRoot.removeFromParent()
      compositor.dispose()
      starfield.dispose()
      // globe.gl's teardown disposes the day map but not the relief maps.
      reliefMaterial.normalMap?.dispose()
      reliefMaterial.displacementMap?.dispose()
      globe._destructor()
      renderer.forceContextLoss()
      container.replaceChildren()
    },
  }
}
