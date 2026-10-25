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
const LOS_ANGELES_BASIN = 'los-angeles-basin'
const NEW_YORK_CITY = 'new-york-city'
/** 1,487 km: 50% closer than 2,230 km, rounded to a whole kilometer. */
const FOCUS_ALTITUDE = 1487 / 6371
/** Fully visible once the camera has left the whole-Earth view for a state. */
const REGIONAL_ALTITUDE = 1.6
const FADE_SPAN = 0.35
const MIN_FOCUS_ALTITUDE = 100_000 / EARTH_RADIUS_M
// Matches the cloud shell's outward displacement so the near plane stays in front of the puffs.
const CLOUD_OUTER_RADII = CLOUD_RADIUS_RATIO + 0.005
const LOCALE_PATCH_RENDER_ORDER = 1

interface PackSource {
  label: string
  packUrl: string
  dayUrl: string
  heightUrl: string
  normalUrl: string
  /** SF Bay and Los Angeles stay over the wide California image. New York City hides it. */
  keepWide: boolean
}

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}

function packSource(
  label: string,
  regionFile: string,
  dayFile: string,
  heightFile: string,
  normalFile: string,
  keepWide: boolean,
): PackSource {
  return {
    label,
    packUrl: assetUrl(`regions/${regionFile}`),
    dayUrl: assetUrl(`textures/${dayFile}`),
    heightUrl: assetUrl(`textures/${heightFile}`),
    normalUrl: assetUrl(`textures/${normalFile}`),
    keepWide,
  }
}

const WIDE_SOURCE = packSource(
  'California',
  'sf-bay-area.geojson',
  'sf-bay-area-day.webp',
  'sf-bay-area-height.png',
  'sf-bay-area-normal.webp',
  true,
)

const LOCALE_SOURCES: Readonly<Record<string, PackSource>> = {
  [SF_BAY_AREA]: packSource(
    'SF Bay Area',
    'sf-bay-area-locale.geojson',
    'sf-bay-area-locale-day.webp',
    'sf-bay-area-locale-height.png',
    'sf-bay-area-locale-normal.webp',
    true,
  ),
  [LOS_ANGELES_BASIN]: packSource(
    'Los Angeles Basin',
    'los-angeles-basin.geojson',
    'los-angeles-basin-day.webp',
    'los-angeles-basin-height.png',
    'los-angeles-basin-normal.webp',
    true,
  ),
  [NEW_YORK_CITY]: packSource(
    'New York City',
    'new-york-city.geojson',
    'new-york-city-day.webp',
    'new-york-city-height.png',
    'new-york-city-normal.webp',
    false,
  ),
}

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
  /** Fetches the wide California pack. Imagery on, outline off, zoom off. */
  preload(): void
  dispose(): void
}

interface LoadedPack {
  patch: TerrainPatch
  border: TerrainBorder | null
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

function readNumber(
  source: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} pack ${key} is not a number`)
  }
  return value
}

function readPack(value: unknown, label: string): PackFile {
  if (
    !isRecord(value) ||
    !isRecord(value['properties']) ||
    !isRecord(value['geometry'])
  ) {
    throw new Error(`${label} pack is missing its bounds or outline`)
  }
  const properties = value['properties']
  const west = readNumber(properties, 'west', label)
  const south = readNumber(properties, 'south', label)
  const east = readNumber(properties, 'east', label)
  const north = readNumber(properties, 'north', label)
  if (!(west < east) || !(south < north)) {
    throw new Error(`${label} pack bounds are empty`)
  }
  const geometry = value['geometry']
  const coordinates = geometry['coordinates']
  if (geometry['type'] !== 'MultiLineString' || !isUnknownArray(coordinates)) {
    throw new Error(`${label} outline is not a MultiLineString`)
  }
  const lines: [number, number][][] = []
  for (const line of coordinates) {
    if (!isUnknownArray(line)) {
      throw new Error(`${label} outline line is not an array`)
    }
    const points: [number, number][] = []
    for (const point of line) {
      if (!isUnknownArray(point) || point.length < 2) {
        throw new Error(`${label} outline point is not a coordinate`)
      }
      const lng = point[0]
      const lat = point[1]
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error(`${label} outline point is not numeric`)
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

async function loadPackTextures(
  source: PackSource,
): Promise<[Texture, Texture, Texture]> {
  const [day, height, normal] = await Promise.all([
    loadImageTexture(source.dayUrl, SRGBColorSpace),
    loadImageTexture(source.heightUrl, NoColorSpace),
    loadImageTexture(source.normalUrl, NoColorSpace),
  ])
  day.anisotropy = 8
  day.needsUpdate = true
  for (const texture of [height, normal]) {
    texture.generateMipmaps = false
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
  }
  return [day, height, normal]
}

function releasePack(loaded: LoadedPack): void {
  loaded.patch.dispose()
  loaded.border?.dispose()
  for (const texture of loaded.textures) {
    texture.dispose()
  }
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
  let wideOn = false
  let activeLocale: string | null = null
  let widePack: LoadedPack | undefined
  let wideLoading: Promise<void> | undefined
  const localePacks = new Map<string, LoadedPack>()
  const localeLoading = new Map<string, Promise<void>>()

  const hideLocales = (): void => {
    for (const loaded of localePacks.values()) {
      loaded.patch.setOpacity(0, false)
      loaded.border?.setOpacity(0)
    }
  }

  const disableZoom = (): void => {
    controls.enableZoom = false
    controls.minDistance = restingMinDistance
    if (camera instanceof PerspectiveCamera && camera.near !== restingNear) {
      camera.near = restingNear
      camera.updateProjectionMatrix()
    }
  }

  const enableZoom = (): void => {
    controls.enableZoom = true
    controls.minDistance = globeRadius * (1 + MIN_FOCUS_ALTITUDE)
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
    const distance = renderCamera.position.length()
    const altitude = distance / globeRadius - 1
    const opacity = focusOpacity(altitude)
    const coversView = altitude <= FOCUS_ALTITUDE + 0.005
    if (wideOn || activeLocale !== null) {
      fitNearPlane(distance)
    }
    if (widePack !== undefined) {
      widePack.patch.setOpacity(wideOn ? opacity : 0, wideOn && coversView)
    }
    for (const [id, loaded] of localePacks) {
      const on = id === activeLocale
      loaded.patch.setOpacity(on ? opacity : 0, on && coversView)
      loaded.border?.setOpacity(on ? opacity : 0)
    }
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

  const loadWide = async (token: number): Promise<void> => {
    const response = await fetch(WIDE_SOURCE.packUrl)
    if (!response.ok) {
      throw new Error(
        `California wide pack responded ${String(response.status)}`,
      )
    }
    const file: unknown = await response.json()
    const parsed = readPack(file, WIDE_SOURCE.label)
    const [day, height, normal] = await loadPackTextures(WIDE_SOURCE)
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
      border: null,
      textures: [day, height, normal],
    }
    if (token !== generation) {
      releasePack(loaded)
      return
    }
    loaded.patch.setOpacity(0, false)
    scene.add(loaded.patch.mesh)
    widePack = loaded
    syncFrame(camera)
  }

  const loadLocale = async (
    regionId: string,
    source: PackSource,
    token: number,
  ): Promise<void> => {
    const response = await fetch(source.packUrl)
    if (!response.ok) {
      throw new Error(
        `${source.label} pack responded ${String(response.status)}`,
      )
    }
    const file: unknown = await response.json()
    const parsed = readPack(file, source.label)
    const [day, height, normal] = await loadPackTextures(source)
    await yieldToPaint()
    const border = createTerrainBorder(
      parsed.lines,
      height,
      parsed.bounds,
      globeRadius,
      displacementScale,
      displacementBias,
    )
    const patch = createTerrainPatch(
      day,
      height,
      normal,
      parsed.bounds,
      globeRadius,
      displacementScale,
      displacementBias,
    )
    // Draws after the wide mesh so the tight crop stays on top where they overlap.
    patch.mesh.renderOrder = LOCALE_PATCH_RENDER_ORDER
    const loaded: LoadedPack = {
      patch,
      border,
      textures: [day, height, normal],
    }
    if (token !== generation) {
      releasePack(loaded)
      return
    }
    patch.setOpacity(0, false)
    border.setOpacity(0)
    scene.add(patch.mesh)
    scene.add(border.mesh)
    localePacks.set(regionId, loaded)
    syncFrame(camera)
  }

  const ensureWide = (): Promise<void> => {
    if (widePack !== undefined) return Promise.resolve()
    if (wideLoading !== undefined) return wideLoading
    const token = generation
    const pending = loadWide(token).finally(() => {
      if (wideLoading === pending) wideLoading = undefined
    })
    wideLoading = pending
    return pending
  }

  const ensureLocale = (regionId: string): Promise<void> => {
    const source = LOCALE_SOURCES[regionId]
    if (source === undefined) return Promise.resolve()
    if (localePacks.has(regionId)) return Promise.resolve()
    const pendingLoad = localeLoading.get(regionId)
    if (pendingLoad !== undefined) return pendingLoad
    const token = generation
    const pending = loadLocale(regionId, source, token).finally(() => {
      if (localeLoading.get(regionId) === pending) {
        localeLoading.delete(regionId)
      }
    })
    localeLoading.set(regionId, pending)
    return pending
  }

  const reportFailure = (label: string, error: unknown): void => {
    console.error(`${label} terrain pack failed to load`, error)
  }

  return {
    preload() {
      wideOn = true
      activeLocale = null
      disableZoom()
      hideLocales()
      startFrame()
      syncFrame(camera)
      const token = generation
      void ensureWide().catch((error: unknown) => {
        reportFailure('California wide', error)
        if (token !== generation) return
        wideOn = false
        widePack?.patch.setOpacity(0, false)
        if (activeLocale === null) stopFrame()
      })
    },
    focusRegion(regionId) {
      const source = regionId === null ? undefined : LOCALE_SOURCES[regionId]
      if (source !== undefined && regionId !== null) {
        wideOn = source.keepWide
        activeLocale = regionId
        enableZoom()
        if (!source.keepWide) {
          widePack?.patch.setOpacity(0, false)
        }
        startFrame()
        syncFrame(camera)
        const token = generation
        if (source.keepWide) {
          void ensureWide().catch((error: unknown) => {
            reportFailure('California wide', error)
            if (token !== generation) return
            wideOn = false
            widePack?.patch.setOpacity(0, false)
          })
        }
        void ensureLocale(regionId).catch((error: unknown) => {
          reportFailure(source.label, error)
          if (token !== generation || activeLocale !== regionId) return
          activeLocale = null
          disableZoom()
          if (!wideOn) stopFrame()
          syncFrame(camera)
        })
        return
      }
      activeLocale = null
      wideOn = false
      disableZoom()
      stopFrame()
      hideLocales()
      widePack?.patch.setOpacity(0, false)
    },
    dispose() {
      generation += 1
      wideOn = false
      activeLocale = null
      stopFrame()
      if (widePack !== undefined) {
        releasePack(widePack)
        widePack = undefined
      }
      for (const loaded of localePacks.values()) {
        releasePack(loaded)
      }
      localePacks.clear()
      disableZoom()
    },
  }
}
