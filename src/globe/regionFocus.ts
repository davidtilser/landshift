import {
  LinearFilter,
  NoColorSpace,
  PerspectiveCamera,
  SRGBColorSpace,
  Texture,
} from 'three'
import type { Camera, Scene } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  CLOUD_RADIUS_RATIO,
  EARTH_RADIUS_M,
  MAX_TERRAIN_RADIUS_RATIO,
} from './relief.ts'
import { createTerrainBorder } from './regionBorder.ts'
import type { TerrainBorder } from './regionBorder.ts'
import { createTerrainPatch } from './regionPatch.ts'
import type { PatchBounds, TerrainPatch } from './regionPatch.ts'

const SF_BAY_AREA = 'sf-bay-area'
/** 1,487 km: 50% closer than 2,230 km, rounded to a whole kilometer. */
const FOCUS_ALTITUDE = 1487 / 6371
/** Fully visible once the camera has come in to a state-sized view. */
const REGIONAL_ALTITUDE = 1
const FADE_SPAN = 0.25
const MIN_FOCUS_ALTITUDE = 100_000 / EARTH_RADIUS_M
// Matches the cloud shell's outward displacement so the near plane stays in front of the puffs.
const CLOUD_OUTER_RADII = CLOUD_RADIUS_RATIO + 0.005
const PACK_URL = `${import.meta.env.BASE_URL}regions/sf-bay-area.geojson`
const DAY_URL = `${import.meta.env.BASE_URL}textures/sf-bay-area-day.webp`
const HEIGHT_URL = `${import.meta.env.BASE_URL}textures/sf-bay-area-height.png`
const NORMAL_URL = `${import.meta.env.BASE_URL}textures/sf-bay-area-normal.webp`

export interface RegionFocusOptions {
  scene: Scene
  camera: Camera
  controls: OrbitControls
  globeRadius: number
  displacementScale: number
  displacementBias: number
}

export interface RegionFocus {
  focusRegion(regionId: string | null): void
  /** Starts the Bay pack during a cluster fly and shows it once the view is regional. Zoom stays off. */
  preload(): void
  dispose(): void
}

interface LoadedPack {
  patch: TerrainPatch
  border: TerrainBorder
  textures: Texture[]
}

interface PackFile {
  bounds: PatchBounds
  lines: [number, number][][]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`SF Bay pack ${key} is not a number`)
  }
  return value
}

function readPack(value: unknown): PackFile {
  if (
    !isRecord(value) ||
    !isRecord(value['properties']) ||
    !isRecord(value['geometry'])
  ) {
    throw new Error('SF Bay pack is missing its bounds or outline')
  }
  const properties = value['properties']
  const west = readNumber(properties, 'west')
  const south = readNumber(properties, 'south')
  const east = readNumber(properties, 'east')
  const north = readNumber(properties, 'north')
  if (!(west < east) || !(south < north)) {
    throw new Error('SF Bay pack bounds are empty')
  }
  const geometry = value['geometry']
  const coordinates = geometry['coordinates']
  if (geometry['type'] !== 'MultiLineString' || !isUnknownArray(coordinates)) {
    throw new Error('SF Bay outline is not a MultiLineString')
  }
  const lines: [number, number][][] = []
  for (const line of coordinates) {
    if (!isUnknownArray(line)) {
      throw new Error('SF Bay outline line is not an array')
    }
    const points: [number, number][] = []
    for (const point of line) {
      if (!isUnknownArray(point) || point.length < 2) {
        throw new Error('SF Bay outline point is not a coordinate')
      }
      const lng = point[0]
      const lat = point[1]
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('SF Bay outline point is not numeric')
      }
      points.push([lng, lat])
    }
    lines.push(points)
  }
  return { bounds: { west, south, east, north }, lines }
}

function focusOpacity(altitude: number): number {
  const start = REGIONAL_ALTITUDE + FADE_SPAN
  if (altitude <= REGIONAL_ALTITUDE) {
    return 1
  }
  if (altitude >= start) {
    return 0
  }
  const t = (altitude - REGIONAL_ALTITUDE) / FADE_SPAN
  return 1 - t * t * (3 - 2 * t)
}

async function loadImageTexture(
  url: string,
  colorSpace: Texture['colorSpace'],
): Promise<Texture> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`)
  }
  // Decode off the main thread. The old loader decoded the 8k image on the click that showed it.
  const bitmap = await createImageBitmap(await response.blob())
  const texture = new Texture(bitmap)
  texture.flipY = false
  texture.colorSpace = colorSpace
  texture.needsUpdate = true
  return texture
}

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

export function createRegionFocus({
  scene,
  camera,
  controls,
  globeRadius,
  displacementScale,
  displacementBias,
}: RegionFocusOptions): RegionFocus {
  const restingMinDistance = controls.minDistance
  const restingNear = camera instanceof PerspectiveCamera ? camera.near : 5
  let frame = 0
  let generation = 0
  let active = false
  let pack: LoadedPack | undefined
  let loading: Promise<void> | undefined

  const hidePack = (): void => {
    pack?.patch.setOpacity(0, false)
    pack?.border.setOpacity(0)
  }

  const disposePack = (): void => {
    if (pack === undefined) {
      return
    }
    pack.patch.dispose()
    pack.border.dispose()
    for (const texture of pack.textures) {
      texture.dispose()
    }
    pack = undefined
  }

  const disableZoom = (): void => {
    controls.enableZoom = false
    controls.minDistance = restingMinDistance
    if (camera instanceof PerspectiveCamera && camera.near !== restingNear) {
      camera.near = restingNear
      camera.updateProjectionMatrix()
    }
  }

  const fitNearPlane = (distance: number): void => {
    if (!(camera instanceof PerspectiveCamera)) {
      return
    }
    const cloudGap = distance - globeRadius * CLOUD_OUTER_RADII
    const terrainGap = distance - globeRadius * MAX_TERRAIN_RADIUS_RATIO
    const gap = cloudGap > 0.25 ? Math.min(cloudGap, terrainGap) : terrainGap
    const nextNear = Math.min(restingNear, Math.max(0.05, gap * 0.45))
    if (Math.abs(camera.near - nextNear) > 0.0005) {
      camera.near = nextNear
      camera.updateProjectionMatrix()
    }
  }

  const syncFrame = (renderCamera: Camera): void => {
    if (!active) {
      hidePack()
      return
    }
    const distance = renderCamera.position.length()
    fitNearPlane(distance)
    const opacity = focusOpacity(distance / globeRadius - 1)
    const coversView = distance / globeRadius - 1 <= FOCUS_ALTITUDE + 0.005
    pack?.patch.setOpacity(opacity, coversView)
    pack?.border.setOpacity(opacity)
  }

  const stopFrame = (): void => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  const tick = (): void => {
    frame = requestAnimationFrame(tick)
    syncFrame(camera)
  }

  const startFrame = (): void => {
    if (frame === 0) {
      frame = requestAnimationFrame(tick)
    }
  }

  const loadPack = async (token: number): Promise<void> => {
    const response = await fetch(PACK_URL)
    if (!response.ok) {
      throw new Error(`SF Bay pack responded ${String(response.status)}`)
    }
    const file: unknown = await response.json()
    const parsed = readPack(file)
    const [day, height, normal] = await Promise.all([
      loadImageTexture(DAY_URL, SRGBColorSpace),
      loadImageTexture(HEIGHT_URL, NoColorSpace),
      loadImageTexture(NORMAL_URL, NoColorSpace),
    ])
    height.generateMipmaps = false
    height.minFilter = LinearFilter
    height.magFilter = LinearFilter
    normal.generateMipmaps = false
    normal.minFilter = LinearFilter
    normal.magFilter = LinearFilter
    // Let the camera flight paint before the relief grid is built.
    await yieldToPaint()
    const loaded: LoadedPack = {
      patch: createTerrainPatch(
        day,
        height,
        normal,
        parsed.bounds,
        globeRadius,
        displacementScale,
        displacementBias,
      ),
      border: createTerrainBorder(
        parsed.lines,
        height,
        parsed.bounds,
        globeRadius,
        displacementScale,
        displacementBias,
      ),
      textures: [day, height, normal],
    }
    if (token !== generation) {
      loaded.patch.dispose()
      loaded.border.dispose()
      for (const texture of loaded.textures) {
        texture.dispose()
      }
      return
    }
    loaded.patch.setOpacity(0, false)
    loaded.border.setOpacity(0)
    scene.add(loaded.patch.mesh)
    scene.add(loaded.border.mesh)
    pack = loaded
  }

  const ensureLoaded = (): Promise<void> => {
    if (pack !== undefined) return Promise.resolve()
    if (loading !== undefined) return loading
    const token = generation
    const pending = loadPack(token).finally(() => {
      if (loading === pending) loading = undefined
    })
    loading = pending
    return pending
  }

  const reportLoadFailure = (token: number, error: unknown): void => {
    if (token === generation) {
      active = false
      stopFrame()
      disableZoom()
    }
    console.error('SF Bay Area terrain pack failed to load', error)
  }

  return {
    preload() {
      active = true
      startFrame()
      const token = generation
      void ensureLoaded().catch((error: unknown) => {
        reportLoadFailure(token, error)
      })
    },
    focusRegion(regionId) {
      if (regionId === SF_BAY_AREA) {
        active = true
        controls.enableZoom = true
        controls.minDistance = globeRadius * (1 + MIN_FOCUS_ALTITUDE)
        startFrame()
        const token = generation
        void ensureLoaded().catch((error: unknown) => {
          reportLoadFailure(token, error)
        })
        return
      }
      active = false
      stopFrame()
      hidePack()
      disableZoom()
    },
    dispose() {
      generation += 1
      active = false
      stopFrame()
      disposePack()
      disableZoom()
    },
  }
}
