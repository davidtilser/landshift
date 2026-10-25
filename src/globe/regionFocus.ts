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
import type { DayUvRect, PatchBounds, TerrainPatch } from './regionPatch.ts'

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
interface FileDay {
  kind: 'file'
  url: string
}

interface PlateDay {
  kind: 'plate'
}

interface LocaleSource {
  label: string
  packUrl: string
  heightUrl: string
  normalUrl: string
  day: FileDay | PlateDay
}

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}

function localeSource(
  label: string,
  regionFile: string,
  heightFile: string,
  normalFile: string,
  day: FileDay | PlateDay,
): LocaleSource {
  return {
    label,
    packUrl: assetUrl(`regions/${regionFile}`),
    heightUrl: assetUrl(`textures/${heightFile}`),
    normalUrl: assetUrl(`textures/${normalFile}`),
    day,
  }
}

const PLATE_DAY_URL = assetUrl('textures/california-day.webp')
// Union of the Bay and Los Angeles locale texture bounds.
const PLATE_BOUNDS: PatchBounds = {
  west: -124.46666666666667,
  south: 32.53333333333333,
  east: -116.6,
  north: 39.666666666666664,
}

const LOCALE_SOURCES: Readonly<Record<string, LocaleSource>> = {
  [SF_BAY_AREA]: localeSource(
    'SF Bay Area',
    'sf-bay-area-locale.geojson',
    'sf-bay-area-locale-height.png',
    'sf-bay-area-locale-normal.webp',
    { kind: 'plate' },
  ),
  [LOS_ANGELES_BASIN]: localeSource(
    'Los Angeles Basin',
    'los-angeles-basin.geojson',
    'los-angeles-basin-height.png',
    'los-angeles-basin-normal.webp',
    { kind: 'plate' },
  ),
  [NEW_YORK_CITY]: localeSource(
    'New York City',
    'new-york-city.geojson',
    'new-york-city-height.png',
    'new-york-city-normal.webp',
    { kind: 'file', url: assetUrl('textures/new-york-city-day.webp') },
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
  /** Hides locale imagery and disables zoom. Does not upload a day texture. */
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

function configureDay(texture: Texture): Texture {
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function configureRelief(texture: Texture): Texture {
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  return texture
}

function plateWindow(bounds: PatchBounds): DayUvRect {
  const lngSpan = PLATE_BOUNDS.east - PLATE_BOUNDS.west
  const latSpan = PLATE_BOUNDS.north - PLATE_BOUNDS.south
  const u0 = (bounds.west - PLATE_BOUNDS.west) / lngSpan
  const u1 = (bounds.east - PLATE_BOUNDS.west) / lngSpan
  const v0 = (PLATE_BOUNDS.north - bounds.north) / latSpan
  const v1 = (PLATE_BOUNDS.north - bounds.south) / latSpan
  if (
    u0 < -1e-4 ||
    v0 < -1e-4 ||
    u1 > 1 + 1e-4 ||
    v1 > 1 + 1e-4 ||
    !(u1 > u0) ||
    !(v1 > v0)
  ) {
    throw new Error('locale bounds fall outside the California day plate')
  }
  return { u0, v0, u1, v1 }
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
  let activeLocale: string | null = null
  let plateDay: Texture | undefined
  let plateLoading: Promise<Texture | undefined> | undefined
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
    if (activeLocale !== null) {
      fitNearPlane(distance)
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

  const ensurePlate = (): Promise<Texture | undefined> => {
    if (plateDay !== undefined) return Promise.resolve(plateDay)
    if (plateLoading !== undefined) return plateLoading
    const token = generation
    const pending = loadImageTexture(PLATE_DAY_URL, SRGBColorSpace)
      .then((day) => {
        if (token !== generation) {
          day.dispose()
          return undefined
        }
        plateDay = configureDay(day)
        return plateDay
      })
      .finally(() => {
        if (plateLoading === pending) plateLoading = undefined
      })
    plateLoading = pending
    return pending
  }

  const loadDay = (source: LocaleSource): Promise<Texture | undefined> => {
    switch (source.day.kind) {
      case 'plate':
        return ensurePlate()
      case 'file':
        return loadImageTexture(source.day.url, SRGBColorSpace).then(
          configureDay,
        )
      default: {
        const unexpected: never = source.day
        return unexpected
      }
    }
  }

  const loadLocale = async (
    regionId: string,
    source: LocaleSource,
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
    const dayUvRect =
      source.day.kind === 'plate' ? plateWindow(parsed.bounds) : undefined
    const [day, height, normal] = await Promise.all([
      loadDay(source),
      loadImageTexture(source.heightUrl, NoColorSpace).then(configureRelief),
      loadImageTexture(source.normalUrl, NoColorSpace).then(configureRelief),
    ])
    if (day === undefined || token !== generation) {
      if (source.day.kind === 'file' && day !== undefined) day.dispose()
      height.dispose()
      normal.dispose()
      return
    }
    await yieldToPaint()
    if (token !== generation) {
      if (source.day.kind === 'file') day.dispose()
      height.dispose()
      normal.dispose()
      return
    }
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
      dayUvRect,
    )
    const loaded: LoadedPack = {
      patch,
      border,
      textures:
        source.day.kind === 'file' ? [day, height, normal] : [height, normal],
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
      activeLocale = null
      disableZoom()
      hideLocales()
      stopFrame()
    },
    focusRegion(regionId) {
      const source = regionId === null ? undefined : LOCALE_SOURCES[regionId]
      if (source !== undefined && regionId !== null) {
        activeLocale = regionId
        enableZoom()
        startFrame()
        syncFrame(camera)
        const token = generation
        void ensureLocale(regionId).catch((error: unknown) => {
          reportFailure(source.label, error)
          if (token !== generation || activeLocale !== regionId) return
          activeLocale = null
          disableZoom()
          stopFrame()
          syncFrame(camera)
        })
        return
      }
      activeLocale = null
      disableZoom()
      stopFrame()
      hideLocales()
    },
    dispose() {
      generation += 1
      activeLocale = null
      stopFrame()
      for (const loaded of localePacks.values()) {
        releasePack(loaded)
      }
      localePacks.clear()
      plateLoading = undefined
      if (plateDay !== undefined) {
        plateDay.dispose()
        plateDay = undefined
      }
      disableZoom()
    },
  }
}
