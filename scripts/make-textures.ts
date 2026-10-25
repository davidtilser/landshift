import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import sharp from 'sharp'
import type { OutputInfo } from 'sharp'
import {
  EARTH_RADIUS_M,
  LAND_EXAGGERATION,
  MAX_HEIGHT_CODE,
  MAX_LAND_HEIGHT_M,
  MAX_SEA_DEPTH_M,
  SEA_FLOOR_EXAGGERATION,
  SEA_LEVEL_CODE,
} from '../src/globe/relief.ts'

const BLUE_MARBLE_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/june/world.topo.bathy.200406.3x21600x10800.jpg'
const ELEVATION_GRID_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.tif'
const BATHYMETRY_GRID_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bathymetry/gebco_08_rev_bath_5400x2700.tif'
const CLOUDS_URL =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif'

const DAY_QUALITY = 85
const NORMAL_NEAR_LOSSLESS_QUALITY = 60
// Owner chose full 4096 detail over size (about 12 MB near-lossless).
const NORMAL_WIDTH = 4096
// Near the poles the east spacing vanishes; capping the tilt keeps quantized normals from flipping inward.
const MIN_NORMAL_Z = 0.05
const CLOUDS_QUALITY = 80
const DOWNLOAD_TIMEOUT_MS = 120_000
const GRID_WIDTH = 5400
const GRID_HEIGHT = 2700
const MAX_GRID_CODE = 255

const rootDir = join(import.meta.dirname, '..')
const cacheDir = join(rootDir, '.cache', 'textures')
const outputDir = join(rootDir, 'public', 'textures')

interface EncodedTexture {
  data: Buffer
  info: OutputInfo
}

/** Row-major equirectangular grid; row 0 is the north edge. */
interface Grid {
  width: number
  height: number
  data: Float32Array
}

interface Tap {
  index: number
  weight: number
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function hasContents(path: string, data: Buffer): Promise<boolean> {
  try {
    return (await readFile(path)).equals(data)
  } catch {
    return false
  }
}

interface DownloadOptions {
  timeoutMs?: number
  /** Census zip is not an image; imagery still has to decode as one. */
  requireImage?: boolean
  /** Skip a full pixel decode. A 500 m tile is over a gigabyte uncompressed. */
  fullDecode?: boolean
}

async function download(
  url: string,
  options: DownloadOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS
  const requireImage = options.requireImage ?? true
  const fullDecode = options.fullDecode ?? true
  const path = join(cacheDir, basename(new URL(url).pathname))
  if (await fileExists(path)) {
    console.log(`cached ${path}`)
    return path
  }
  console.log(`downloading ${url}`)
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (requireImage && !contentType.startsWith('image/')) {
    throw new Error(`${url} returned "${contentType}", not an image`)
  }
  const data = Buffer.from(await response.arrayBuffer())
  if (requireImage) {
    if (fullDecode) {
      // stats() decodes every pixel, so an HTML error page or a truncated body fails here.
      await sharp(data).stats()
    } else {
      await sharp(data, { limitInputPixels: false }).metadata()
    }
  }
  // Write to a temporary name so an interrupted download is never mistaken for a cached original.
  const partialPath = `${path}.part`
  await writeFile(partialPath, data)
  await rename(partialPath, path)
  return path
}

async function writeOutput(
  fileName: string,
  { data, info }: EncodedTexture,
): Promise<void> {
  const path = join(outputDir, fileName)
  const unchanged = await hasContents(path, data)
  if (!unchanged) {
    // Stage in the cache so a crash never leaves a stray file that Vite would publish.
    const temporaryPath = join(cacheDir, `${fileName}.tmp`)
    await writeFile(temporaryPath, data)
    await rename(temporaryPath, path)
  }
  console.log(
    `${fileName}: ${String(info.width)}x${String(info.height)}, ${String(data.length)} bytes, ${unchanged ? 'unchanged' : 'written'}`,
  )
}

async function makeDayTextures(): Promise<void> {
  const source = await download(BLUE_MARBLE_URL)
  for (const [width, fileName] of [
    [8192, 'earth-day-8k.webp'],
    [4096, 'earth-day-4k.webp'],
  ] as const) {
    await writeOutput(
      fileName,
      await sharp(source)
        .resize(width, width / 2, { fit: 'fill' })
        .webp({ quality: DAY_QUALITY, effort: 6 })
        .toBuffer({ resolveWithObject: true }),
    )
  }
}

async function readGridCodes(url: string): Promise<Buffer> {
  const { data, info } = await sharp(await download(url))
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (info.width !== GRID_WIDTH || info.height !== GRID_HEIGHT) {
    throw new Error(
      `${url} is ${String(info.width)}x${String(info.height)}, expected ${String(GRID_WIDTH)}x${String(GRID_HEIGHT)}`,
    )
  }
  return data
}

async function readHeightsM(): Promise<Grid> {
  const elevation = await readGridCodes(ELEVATION_GRID_URL)
  const bathymetry = await readGridCodes(BATHYMETRY_GRID_URL)
  const data = new Float32Array(GRID_WIDTH * GRID_HEIGHT)
  for (let index = 0; index < data.length; index++) {
    const landCode = elevation[index] ?? 0
    const seaCode = bathymetry[index] ?? MAX_GRID_CODE
    if (landCode > 0) {
      data[index] = (landCode / MAX_GRID_CODE) * MAX_LAND_HEIGHT_M
    } else if (seaCode < MAX_GRID_CODE) {
      data[index] =
        -((MAX_GRID_CODE - seaCode) / MAX_GRID_CODE) * MAX_SEA_DEPTH_M
    }
  }
  return { width: GRID_WIDTH, height: GRID_HEIGHT, data }
}

/** Box-filter taps that cover each output cell's exact footprint, including partial source cells. */
function areaTaps(sourceSize: number, outputSize: number): Tap[][] {
  const ratio = sourceSize / outputSize
  return Array.from({ length: outputSize }, (_, output) => {
    const start = output * ratio
    const end = start + ratio
    const taps: Tap[] = []
    for (
      let index = Math.floor(start);
      index < Math.min(sourceSize, end);
      index++
    ) {
      const overlap = Math.min(end, index + 1) - Math.max(start, index)
      if (overlap > 0) {
        taps.push({ index, weight: overlap / ratio })
      }
    }
    return taps
  })
}

function areaAverage(grid: Grid, width: number, height: number): Grid {
  const columnTaps = areaTaps(grid.width, width)
  const rows = new Float32Array(width * grid.height)
  for (let y = 0; y < grid.height; y++) {
    const sourceRow = y * grid.width
    for (const [x, taps] of columnTaps.entries()) {
      let sum = 0
      for (const { index, weight } of taps) {
        sum += (grid.data[sourceRow + index] ?? 0) * weight
      }
      rows[y * width + x] = sum
    }
  }
  const data = new Float32Array(width * height)
  for (const [y, taps] of areaTaps(grid.height, height).entries()) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (const { index, weight } of taps) {
        sum += (rows[index * width + x] ?? 0) * weight
      }
      data[y * width + x] = sum
    }
  }
  return { width, height, data }
}

function flattenRow(grid: Grid, y: number): void {
  const row = grid.data.subarray(y * grid.width, (y + 1) * grid.width)
  row.fill(row.reduce((sum, value) => sum + value, 0) / grid.width)
}

function heightCode(heightM: number): number {
  if (heightM > 0) {
    const landCodes = MAX_HEIGHT_CODE - SEA_LEVEL_CODE - 1
    return (
      SEA_LEVEL_CODE + 1 + Math.round((heightM / MAX_LAND_HEIGHT_M) * landCodes)
    )
  }
  return (
    SEA_LEVEL_CODE - Math.round((-heightM / MAX_SEA_DEPTH_M) * SEA_LEVEL_CODE)
  )
}

function exaggeratedRadii(heightM: number): number {
  const exaggeration = heightM > 0 ? LAND_EXAGGERATION : SEA_FLOOR_EXAGGERATION
  return (heightM * exaggeration) / EARTH_RADIUS_M
}

async function makeHeightTexture(heightsM: Grid): Promise<void> {
  const grid = areaAverage(heightsM, 1440, 720)
  // Every vertex in a pole row shares one position, so differing heights there would fan.
  flattenRow(grid, 0)
  flattenRow(grid, grid.height - 1)
  const codes = Buffer.from(Uint8Array.from(grid.data, heightCode))
  const encoded = await sharp(codes, {
    raw: { width: grid.width, height: grid.height, channels: 1 },
  })
    .toColourspace('b-w')
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })
  const decoded = await sharp(encoded.data).extractChannel(0).raw().toBuffer()
  if (encoded.info.channels !== 1 || !decoded.equals(codes)) {
    throw new Error('earth-height.png does not round-trip as 8-bit grayscale')
  }
  await writeOutput('earth-height.png', encoded)
}

/** Unit tangent-space normals as xyz triples, before 8-bit quantization. */
function tangentNormals({ width, height, data }: Grid): Float32Array {
  const radii = data.map(exaggeratedRadii)
  const normals = new Float32Array(width * height * 3)
  const northSpacing = Math.PI / height
  for (let y = 0; y < height; y++) {
    const cosLatitude = Math.cos(Math.PI / 2 - (y + 0.5) * northSpacing)
    const eastSpacing = (2 * Math.PI * cosLatitude) / width
    const north = Math.max(0, y - 1)
    const south = Math.min(height - 1, y + 1)
    // three's normal-map frame scales tangent:bitangent by |grad u|:|grad v| = 1:2cos(lat), capped at 1, so divide that back out.
    const tangentScale = Math.min(1, 1 / (2 * cosLatitude))
    const bitangentScale = Math.min(1, 2 * cosLatitude)
    for (let x = 0; x < width; x++) {
      const east = (x + 1) % width
      const west = (x - 1 + width) % width
      const slopeEast =
        ((radii[y * width + east] ?? 0) - (radii[y * width + west] ?? 0)) /
        (2 * eastSpacing)
      const slopeNorth =
        ((radii[north * width + x] ?? 0) - (radii[south * width + x] ?? 0)) /
        ((south - north) * northSpacing)
      const normalX = -slopeEast / tangentScale
      const normalY = -slopeNorth / bitangentScale
      const tilt = Math.hypot(normalX, normalY)
      const z = Math.max(MIN_NORMAL_Z, 1 / Math.hypot(tilt, 1))
      const xyScale = tilt > 0 ? Math.sqrt(1 - z * z) / tilt : 0
      normals.set(
        [normalX * xyScale, normalY * xyScale, z],
        (y * width + x) * 3,
      )
    }
  }
  return normals
}

function percentile(sorted: Float32Array, fraction: number): number {
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ??
    0
  )
}

async function makeNormalTexture(heightsM: Grid): Promise<void> {
  const width = NORMAL_WIDTH
  const height = NORMAL_WIDTH / 2
  const normals = tangentNormals(areaAverage(heightsM, width, height))
  const encoded = await sharp(
    Buffer.from(
      Uint8Array.from(normals, (value) => Math.round((value + 1) * 127.5)),
    ),
    { raw: { width, height, channels: 3 } },
  )
    .webp({
      nearLossless: true,
      quality: NORMAL_NEAR_LOSSLESS_QUALITY,
      effort: 6,
    })
    .toBuffer({ resolveWithObject: true })
  const decoded = await sharp(encoded.data).raw().toBuffer()
  const errorsDeg = new Float32Array(width * height)
  let inward = 0
  for (let texel = 0; texel < errorsDeg.length; texel++) {
    const offset = texel * 3
    const x = (decoded[offset] ?? 0) / 127.5 - 1
    const y = (decoded[offset + 1] ?? 0) / 127.5 - 1
    const z = (decoded[offset + 2] ?? 0) / 127.5 - 1
    if (z <= 0) {
      inward++
    }
    const dot =
      (x * (normals[offset] ?? 0) +
        y * (normals[offset + 1] ?? 0) +
        z * (normals[offset + 2] ?? 0)) /
      Math.hypot(x, y, z)
    errorsDeg[texel] = (Math.acos(Math.min(1, dot)) * 180) / Math.PI
  }
  if (inward > 0) {
    throw new Error(
      `earth-normal.webp has ${String(inward)} inward-pointing texels`,
    )
  }
  errorsDeg.sort()
  console.log(
    `earth-normal.webp angular error: p50 ${percentile(errorsDeg, 0.5).toFixed(2)}°, p90 ${percentile(errorsDeg, 0.9).toFixed(2)}°, p99 ${percentile(errorsDeg, 0.99).toFixed(2)}°`,
  )
  await writeOutput('earth-normal.webp', encoded)
}

async function makeCloudsTexture(): Promise<void> {
  const source = await download(CLOUDS_URL)
  const { data: density, info } = await sharp(source)
    .resize(4096, 2048, { fit: 'fill' })
    .grayscale()
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  await writeOutput(
    'clouds-density.webp',
    // Density goes in luma because WebP's lossy alpha keeps about 16 levels, which shows as blocky plateaus up close.
    await sharp(density, { raw: { width, height, channels: 1 } })
      .toColourspace('b-w')
      .webp({ quality: CLOUDS_QUALITY, effort: 6 })
      .toBuffer({ resolveWithObject: true }),
  )
}

const SF_BAY_FOCUS = { lat: 37.8, lng: -122.3 }
const SF_BAY_ALTITUDE = 0.35
const SF_BAY_FOV_DEGREES = 50
// Wider than 16:9 so a full-bleed window still hides the patch edge at the focus altitude.
const SF_BAY_VIEW_ASPECT = 1.9
const SF_BAY_VIEW_MARGIN = 1.08
const TILE_EDGE = 21600
const TILE_PIXELS_PER_DEGREE = TILE_EDGE / 90
const GEBCO_CELLS_PER_DEGREE = 15
const DAY_EDGE = 8192
const LOCALE_DAY_EDGE = 4096
const TILE_TIMEOUT_MS = 300_000
const BAY_COUNTY_GEOIDS = new Set([
  '06001',
  '06013',
  '06041',
  '06055',
  '06075',
  '06081',
  '06085',
  '06095',
  '06097',
])
const CENSUS_COUNTY_URL =
  'https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_500k.zip'
const NORTHERN_TILES = [
  {
    west: -180,
    url: 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/june/world.topo.bathy.200406.3x21600x21600.A1.jpg',
  },
  {
    west: -90,
    url: 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/june/world.topo.bathy.200406.3x21600x21600.B1.jpg',
  },
] as const
const REGION_DIR = join(rootDir, 'public', 'regions')
const OUTLINE_TOLERANCE_DEGREES = 0.004

interface LngLat {
  lng: number
  lat: number
}

interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

function viewCornerDegrees(altitude: number, aspect: number): number {
  const halfFov = (SF_BAY_FOV_DEGREES * Math.PI) / 180 / 2
  const distance = 1 + altitude
  const cameraAngle = Math.atan(Math.hypot(aspect, 1) * Math.tan(halfFov))
  const cosine = Math.cos(cameraAngle)
  const sine = Math.sin(cameraAngle)
  const discriminant = distance ** 2 * cosine ** 2 - distance ** 2 + 1
  if (discriminant < 0) {
    throw new Error('SF Bay pack view reaches past the horizon')
  }
  const t = distance * cosine - Math.sqrt(discriminant)
  const radial = distance - t * cosine
  return (Math.atan2(t * sine, radial) * 180) / Math.PI
}

const GEBCO_CELL = 1 / GEBCO_CELLS_PER_DEGREE

function snapDown(value: number): number {
  return Math.floor(value / GEBCO_CELL + 1e-8) * GEBCO_CELL
}

function snapUp(value: number): number {
  return Math.ceil(value / GEBCO_CELL - 1e-8) * GEBCO_CELL
}

function packBounds(): Bounds {
  const radius =
    viewCornerDegrees(SF_BAY_ALTITUDE, SF_BAY_VIEW_ASPECT) * SF_BAY_VIEW_MARGIN
  const lat = (SF_BAY_FOCUS.lat * Math.PI) / 180
  const angular = (radius * Math.PI) / 180
  const cosLng = (Math.cos(angular) - Math.sin(lat) ** 2) / Math.cos(lat) ** 2
  if (cosLng <= -1 || cosLng >= 1) {
    throw new Error('SF Bay pack longitude span is not on the globe')
  }
  const lngRadius = (Math.acos(cosLng) * 180) / Math.PI
  return {
    west: snapDown(SF_BAY_FOCUS.lng - lngRadius),
    south: snapDown(SF_BAY_FOCUS.lat - radius),
    east: snapUp(SF_BAY_FOCUS.lng + lngRadius),
    north: snapUp(SF_BAY_FOCUS.lat + radius),
  }
}

function cropGrid(grid: Grid, bounds: Bounds, label: string): Grid {
  const x0 = Math.round((bounds.west + 180) * GEBCO_CELLS_PER_DEGREE)
  const x1 = Math.round((bounds.east + 180) * GEBCO_CELLS_PER_DEGREE)
  const y0 = Math.round((90 - bounds.north) * GEBCO_CELLS_PER_DEGREE)
  const y1 = Math.round((90 - bounds.south) * GEBCO_CELLS_PER_DEGREE)
  const width = x1 - x0
  const height = y1 - y0
  if (
    width <= 1 ||
    height <= 1 ||
    x0 < 0 ||
    y0 < 0 ||
    x1 > grid.width ||
    y1 > grid.height
  ) {
    throw new Error(
      `${label} height crop ${String(x0)},${String(y0)} ${String(width)}x${String(height)} is outside GEBCO`,
    )
  }
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const source = (y0 + y) * grid.width + x0
    data.set(grid.data.subarray(source, source + width), y * width)
  }
  return { width, height, data }
}

function patchNormals(grid: Grid, bounds: Bounds): Float32Array {
  const { width, height, data } = grid
  const latSpan = ((bounds.north - bounds.south) * Math.PI) / 180
  const lngSpan = ((bounds.east - bounds.west) * Math.PI) / 180
  const radii = Float32Array.from(data, exaggeratedRadii)
  const northSpacing = latSpan / height
  const cellLat = (bounds.north - bounds.south) / height
  const normals = new Float32Array(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    const lat = ((bounds.north - (y + 0.5) * cellLat) * Math.PI) / 180
    const cosLatitude = Math.max(0.2, Math.cos(lat))
    const eastSpacing = (lngSpan * cosLatitude) / width
    // Same derivative frame as the global normal, for this crop's UV aspect instead of a full equirectangular sphere.
    const gradRatio = latSpan / (lngSpan * cosLatitude)
    const tangentScale = Math.min(1, gradRatio)
    const bitangentScale = Math.min(1, 1 / gradRatio)
    const north = Math.max(0, y - 1)
    const south = Math.min(height - 1, y + 1)
    for (let x = 0; x < width; x += 1) {
      const east = Math.min(width - 1, x + 1)
      const west = Math.max(0, x - 1)
      const slopeEast =
        ((radii[y * width + east] ?? 0) - (radii[y * width + west] ?? 0)) /
        ((east - west) * eastSpacing)
      const slopeNorth =
        ((radii[north * width + x] ?? 0) - (radii[south * width + x] ?? 0)) /
        ((south - north) * northSpacing)
      const normalX = -slopeEast / tangentScale
      const normalY = -slopeNorth / bitangentScale
      const tilt = Math.hypot(normalX, normalY)
      const z = Math.max(MIN_NORMAL_Z, 1 / Math.hypot(tilt, 1))
      const xyScale = tilt > 0 ? Math.sqrt(1 - z * z) / tilt : 0
      normals.set(
        [normalX * xyScale, normalY * xyScale, z],
        (y * width + x) * 3,
      )
    }
  }
  return normals
}

async function downloadTile(url: string): Promise<string> {
  try {
    return await download(url, {
      timeoutMs: TILE_TIMEOUT_MS,
      fullDecode: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`500 m tile ${url} failed: ${message}`, { cause: error })
  }
}

interface RegionFiles {
  label: string
  dayFile: string
  maxDayEdge: number
  heightFile: string
  normalFile: string
}

const WIDE_BAY_FILES: RegionFiles = {
  label: 'SF Bay',
  dayFile: 'sf-bay-area-day.webp',
  maxDayEdge: DAY_EDGE,
  heightFile: 'sf-bay-area-height.png',
  normalFile: 'sf-bay-area-normal.webp',
}

async function makeRegionDay(
  bounds: Bounds,
  files: RegionFiles,
): Promise<void> {
  if (bounds.south < 0 || bounds.north > 90) {
    throw new Error(
      `${files.label} pack latitude ${String(bounds.south)} to ${String(bounds.north)} is outside the northern 500 m tiles`,
    )
  }
  const strips: { left: number; width: number; source: string }[] = []
  let sourceWidth = 0
  let sourceHeight = 0
  for (const tile of NORTHERN_TILES) {
    const overlapWest = Math.max(bounds.west, tile.west)
    const overlapEast = Math.min(bounds.east, tile.west + 90)
    if (overlapEast <= overlapWest) {
      continue
    }
    const left = Math.round((overlapWest - tile.west) * TILE_PIXELS_PER_DEGREE)
    const right = Math.round((overlapEast - tile.west) * TILE_PIXELS_PER_DEGREE)
    const top = Math.round((90 - bounds.north) * TILE_PIXELS_PER_DEGREE)
    const bottom = Math.round((90 - bounds.south) * TILE_PIXELS_PER_DEGREE)
    const width = right - left
    const height = bottom - top
    if (
      left < 0 ||
      top < 0 ||
      width <= 0 ||
      height <= 0 ||
      left + width > TILE_EDGE ||
      top + height > TILE_EDGE
    ) {
      throw new Error(
        `500 m crop ${tile.url} ${String(left)},${String(top)} ${String(width)}x${String(height)} is outside the tile`,
      )
    }
    strips.push({ left, width, source: await downloadTile(tile.url) })
    sourceWidth += width
    sourceHeight = height
  }
  if (strips.length === 0 || sourceHeight <= 0) {
    throw new Error(`500 m tiles do not cover the ${files.label} pack`)
  }
  const scale = Math.min(
    1,
    files.maxDayEdge / Math.max(sourceWidth, sourceHeight),
  )
  const outHeight = Math.max(1, Math.round(sourceHeight * scale))
  const parts: { data: Buffer; width: number; left: number }[] = []
  let cursor = 0
  for (const strip of strips) {
    const outWidth = Math.max(1, Math.round(strip.width * scale))
    const top = Math.round((90 - bounds.north) * TILE_PIXELS_PER_DEGREE)
    let image = sharp(strip.source, {
      limitInputPixels: false,
    }).extract({
      left: strip.left,
      top,
      width: strip.width,
      height: sourceHeight,
    })
    if (scale < 1) {
      image = image.resize(outWidth, outHeight, { fit: 'fill' })
    }
    const { data, info } = await image
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    parts.push({ data, width: info.width, left: cursor })
    cursor += info.width
  }
  const first = parts[0]
  if (first === undefined) {
    throw new Error(`500 m tiles produced no ${files.label} imagery`)
  }
  await writeOutput(
    files.dayFile,
    await sharp({
      create: {
        width: cursor,
        height: outHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite(
        parts.map((part) => ({
          input: part.data,
          raw: { width: part.width, height: outHeight, channels: 3 },
          left: part.left,
          top: 0,
        })),
      )
      .webp({ quality: DAY_QUALITY, effort: 6 })
      .toBuffer({ resolveWithObject: true }),
  )
}

async function makeRegionRelief(
  heightsM: Grid,
  bounds: Bounds,
  files: RegionFiles,
): Promise<void> {
  const grid = cropGrid(heightsM, bounds, files.label)
  const codes = Buffer.from(Uint8Array.from(grid.data, heightCode))
  const encoded = await sharp(codes, {
    raw: { width: grid.width, height: grid.height, channels: 1 },
  })
    .toColourspace('b-w')
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })
  const decoded = await sharp(encoded.data).extractChannel(0).raw().toBuffer()
  if (encoded.info.channels !== 1 || !decoded.equals(codes)) {
    throw new Error(
      `${files.heightFile} does not round-trip as 8-bit grayscale`,
    )
  }
  await writeOutput(files.heightFile, encoded)

  const normals = patchNormals(grid, bounds)
  const normalEncoded = await sharp(
    Buffer.from(
      Uint8Array.from(normals, (value) => Math.round((value + 1) * 127.5)),
    ),
    { raw: { width: grid.width, height: grid.height, channels: 3 } },
  )
    .webp({
      nearLossless: true,
      quality: NORMAL_NEAR_LOSSLESS_QUALITY,
      effort: 6,
    })
    .toBuffer({ resolveWithObject: true })
  const decodedNormal = await sharp(normalEncoded.data)
    .removeAlpha()
    .raw()
    .toBuffer()
  let inward = 0
  for (let texel = 0; texel < grid.width * grid.height; texel += 1) {
    const z = (decodedNormal[texel * 3 + 2] ?? 0) / 127.5 - 1
    if (z <= 0) {
      inward += 1
    }
  }
  if (inward > 0) {
    throw new Error(
      `${files.normalFile} has ${String(inward)} inward-pointing texels`,
    )
  }
  await writeOutput(files.normalFile, normalEncoded)
}

function unzip(data: Buffer): Map<string, Buffer> {
  const marker = Buffer.from([0x50, 0x4b, 0x05, 0x06])
  const eocd = data.lastIndexOf(marker)
  if (eocd < 0) {
    throw new Error('census boundary zip has no central directory')
  }
  const count = data.readUInt16LE(eocd + 10)
  let offset = data.readUInt32LE(eocd + 16)
  const files = new Map<string, Buffer>()
  for (let index = 0; index < count; index += 1) {
    if (data.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('census boundary zip central directory is truncated')
    }
    const method = data.readUInt16LE(offset + 10)
    const compressedSize = data.readUInt32LE(offset + 20)
    const nameLength = data.readUInt16LE(offset + 28)
    const extraLength = data.readUInt16LE(offset + 30)
    const commentLength = data.readUInt16LE(offset + 32)
    const localOffset = data.readUInt32LE(offset + 42)
    const name = data
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8')
    const localNameLength = data.readUInt16LE(localOffset + 26)
    const localExtraLength = data.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const compressed = data.subarray(start, start + compressedSize)
    let content: Buffer
    if (method === 0) {
      content = Buffer.from(compressed)
    } else if (method === 8) {
      content = inflateRawSync(compressed)
    } else {
      throw new Error(`${name} is zip method ${String(method)}`)
    }
    files.set(name, content)
    offset += 46 + nameLength + extraLength + commentLength
  }
  return files
}

function zipEntry(files: Map<string, Buffer>, extension: string): Buffer {
  for (const [name, data] of files) {
    if (name.endsWith(extension)) {
      return data
    }
  }
  throw new Error(`census boundary zip has no ${extension} entry`)
}

interface DbfField {
  name: string
  length: number
}

function readCountyGeoids(dbf: Buffer): string[] {
  const records = dbf.readUInt32LE(4)
  const headerBytes = dbf.readUInt16LE(8)
  const recordBytes = dbf.readUInt16LE(10)
  const fields: DbfField[] = []
  let cursor = 32
  while (cursor < headerBytes - 1) {
    if (dbf[cursor] === 0x0d) {
      break
    }
    const name = dbf
      .subarray(cursor, cursor + 11)
      .toString('latin1')
      .replaceAll('\0', '')
    const length = dbf[cursor + 16] ?? 0
    fields.push({ name, length })
    cursor += 32
  }
  const geoids: string[] = []
  for (let index = 0; index < records; index += 1) {
    let fieldOffset = headerBytes + index * recordBytes + 1
    let state = ''
    let county = ''
    let geoid = ''
    for (const field of fields) {
      const text = dbf
        .subarray(fieldOffset, fieldOffset + field.length)
        .toString('latin1')
        .trim()
      if (field.name === 'GEOID') {
        geoid = text
      } else if (field.name === 'STATEFP') {
        state = text
      } else if (field.name === 'COUNTYFP') {
        county = text
      }
      fieldOffset += field.length
    }
    geoids.push(geoid.length > 0 ? geoid : `${state}${county}`)
  }
  return geoids
}

function readPolygons(shp: Buffer): LngLat[][][] {
  const polygons: LngLat[][][] = []
  let offset = 100
  while (offset + 8 <= shp.length) {
    const contentBytes = shp.readInt32BE(offset + 4) * 2
    const type = shp.readInt32LE(offset + 8)
    if (type === 0) {
      polygons.push([])
    } else if (type === 5) {
      let cursor = offset + 12 + 32
      const numParts = shp.readInt32LE(cursor)
      const numPoints = shp.readInt32LE(cursor + 4)
      cursor += 8
      const parts: number[] = []
      for (let index = 0; index < numParts; index += 1) {
        parts.push(shp.readInt32LE(cursor))
        cursor += 4
      }
      const points: LngLat[] = []
      for (let index = 0; index < numPoints; index += 1) {
        points.push({
          lng: shp.readDoubleLE(cursor),
          lat: shp.readDoubleLE(cursor + 8),
        })
        cursor += 16
      }
      polygons.push(
        parts.map((start, index) => {
          const end = parts[index + 1] ?? numPoints
          return points.slice(start, end)
        }),
      )
    } else {
      throw new Error(`census shapefile type ${String(type)} is not a polygon`)
    }
    offset += 8 + contentBytes
  }
  return polygons
}

function pointKey(point: LngLat): string {
  return `${point.lng.toFixed(7)},${point.lat.toFixed(7)}`
}

function mergeOutlines(rings: readonly (readonly LngLat[])[]): LngLat[][] {
  const points = new Map<string, LngLat>()
  const undirected = new Map<string, { from: string; to: string }[]>()
  for (const ring of rings) {
    if (ring.length < 2) {
      continue
    }
    const closing = ring[ring.length - 1]
    const opens =
      closing !== undefined &&
      pointKey(closing) === pointKey(ring[0] ?? closing)
    const limit = opens ? ring.length - 1 : ring.length
    for (let index = 0; index < limit; index += 1) {
      const from = ring[index]
      const to = ring[(index + 1) % ring.length]
      if (from === undefined || to === undefined) {
        continue
      }
      const fromKey = pointKey(from)
      const toKey = pointKey(to)
      if (fromKey === toKey) {
        continue
      }
      points.set(fromKey, from)
      points.set(toKey, to)
      const id = fromKey < toKey ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`
      const list = undirected.get(id) ?? []
      list.push({ from: fromKey, to: toKey })
      undirected.set(id, list)
    }
  }
  const outgoing = new Map<string, string[]>()
  for (const list of undirected.values()) {
    if (list.length !== 1) {
      continue
    }
    const edge = list[0]
    if (edge === undefined) {
      continue
    }
    const next = outgoing.get(edge.from) ?? []
    next.push(edge.to)
    outgoing.set(edge.from, next)
  }
  const used = new Set<string>()
  const outlines: LngLat[][] = []
  for (const start of outgoing.keys()) {
    if (
      outgoing
        .get(start)
        ?.some((candidate) => !used.has(`${start}>${candidate}`)) !== true
    ) {
      continue
    }
    const ring: LngLat[] = []
    let current = start
    for (let step = 0; step <= outgoing.size; step += 1) {
      const point = points.get(current)
      const next = outgoing
        .get(current)
        ?.find((candidate) => !used.has(`${current}>${candidate}`))
      if (point === undefined || next === undefined) {
        break
      }
      ring.push(point)
      used.add(`${current}>${next}`)
      if (next === start) {
        const startPoint = points.get(start)
        if (startPoint !== undefined) {
          ring.push(startPoint)
        }
        break
      }
      current = next
    }
    if (ring.length >= 4) {
      outlines.push(ring)
    }
  }
  return outlines
}

function segmentDistance(point: LngLat, start: LngLat, end: LngLat): number {
  const dx = end.lng - start.lng
  const dy = end.lat - start.lat
  const length = Math.hypot(dx, dy)
  if (length === 0) {
    return Math.hypot(point.lng - start.lng, point.lat - start.lat)
  }
  return (
    Math.abs(
      dy * point.lng -
        dx * point.lat +
        end.lng * start.lat -
        end.lat * start.lng,
    ) / length
  )
}

function simplifyRing(points: readonly LngLat[], tolerance: number): LngLat[] {
  const open = points.slice(0, -1)
  if (open.length < 3) {
    return [...points]
  }
  const keep = new Uint8Array(open.length)
  keep[0] = 1
  keep[open.length - 1] = 1
  const stack: [number, number][] = [[0, open.length - 1]]
  while (stack.length > 0) {
    const range = stack.pop()
    if (range === undefined) {
      break
    }
    const [start, end] = range
    const from = open[start]
    const to = open[end]
    if (from === undefined || to === undefined) {
      continue
    }
    let farthest = start
    let distance = 0
    for (let index = start + 1; index < end; index += 1) {
      const point = open[index]
      if (point === undefined) {
        continue
      }
      const candidate = segmentDistance(point, from, to)
      if (candidate > distance) {
        distance = candidate
        farthest = index
      }
    }
    if (distance > tolerance && farthest !== start) {
      keep[farthest] = 1
      stack.push([start, farthest], [farthest, end])
    }
  }
  const simplified = open.filter((_, index) => keep[index] === 1)
  const first = simplified[0]
  if (first === undefined) {
    return []
  }
  return [...simplified, first]
}

interface CountyTable {
  geoids: string[]
  polygons: LngLat[][][]
}

const BAY_OUTLINE_LIMIT: Bounds = {
  west: -125,
  south: 36,
  east: -120,
  north: 40,
}
const LA_COUNTY_GEOIDS = new Set(['06037', '06059'])
const NYC_BOROUGH_GEOIDS = new Set([
  '36061',
  '36047',
  '36081',
  '36005',
  '36085',
])
const LOCALE_PAD_DEGREES = 0.75
const LOCALE_PAD_FRACTION = 0.4
const LOCALE_MAX_SPAN_DEGREES = 12
const WIDE_BAY_OUTPUTS = new Set([
  WIDE_BAY_FILES.dayFile,
  WIDE_BAY_FILES.heightFile,
  WIDE_BAY_FILES.normalFile,
  'sf-bay-area.geojson',
])

interface LocaleSpec {
  id: string
  label: string
  dayFile: string
  heightFile: string
  normalFile: string
  geojsonFile: string
  geoids: ReadonlySet<string>
  limit: Bounds
  missingLabel: string
}

const LOCALE_SPECS: readonly LocaleSpec[] = [
  {
    id: 'sf-bay-area',
    label: 'SF Bay Area',
    dayFile: 'sf-bay-area-locale-day.webp',
    heightFile: 'sf-bay-area-locale-height.png',
    normalFile: 'sf-bay-area-locale-normal.webp',
    geojsonFile: 'sf-bay-area-locale.geojson',
    geoids: BAY_COUNTY_GEOIDS,
    limit: BAY_OUTLINE_LIMIT,
    missingLabel: 'bay counties',
  },
  {
    id: 'los-angeles-basin',
    label: 'Los Angeles Basin',
    dayFile: 'los-angeles-basin-day.webp',
    heightFile: 'los-angeles-basin-height.png',
    normalFile: 'los-angeles-basin-normal.webp',
    geojsonFile: 'los-angeles-basin.geojson',
    geoids: LA_COUNTY_GEOIDS,
    limit: { west: -119.5, south: 33, east: -117, north: 35 },
    missingLabel: 'los angeles basin counties',
  },
  {
    id: 'new-york-city',
    label: 'New York City',
    dayFile: 'new-york-city-day.webp',
    heightFile: 'new-york-city-height.png',
    normalFile: 'new-york-city-normal.webp',
    geojsonFile: 'new-york-city.geojson',
    geoids: NYC_BOROUGH_GEOIDS,
    limit: { west: -74.3, south: 40.4, east: -73.6, north: 41 },
    missingLabel: 'new york city boroughs',
  },
]

async function loadCounties(): Promise<CountyTable> {
  const archive = unzip(
    await readFile(await download(CENSUS_COUNTY_URL, { requireImage: false })),
  )
  const geoids = readCountyGeoids(zipEntry(archive, '.dbf'))
  const polygons = readPolygons(zipEntry(archive, '.shp'))
  if (geoids.length !== polygons.length) {
    throw new Error(
      `census county table has ${String(geoids.length)} rows and ${String(polygons.length)} shapes`,
    )
  }
  return { geoids, polygons }
}

function countyRings(
  table: CountyTable,
  wanted: ReadonlySet<string>,
  missingLabel: string,
): LngLat[][] {
  const rings: LngLat[][] = []
  const found = new Set<string>()
  for (const [index, geoid] of table.geoids.entries()) {
    if (!wanted.has(geoid)) {
      continue
    }
    found.add(geoid)
    rings.push(...(table.polygons[index] ?? []))
  }
  if (found.size !== wanted.size) {
    throw new Error(
      `census boundary file is missing ${missingLabel}: ${[...wanted].filter((geoid) => !found.has(geoid)).join(', ')}`,
    )
  }
  return rings
}

function simplifiedOutlines(rings: readonly (readonly LngLat[])[]): LngLat[][] {
  return mergeOutlines(rings).map((ring) =>
    simplifyRing(ring, OUTLINE_TOLERANCE_DEGREES),
  )
}

function outlineExtent(rings: readonly (readonly LngLat[])[]): Bounds {
  let west = 180
  let south = 90
  let east = -180
  let north = -90
  for (const ring of rings) {
    for (const point of ring) {
      west = Math.min(west, point.lng)
      east = Math.max(east, point.lng)
      south = Math.min(south, point.lat)
      north = Math.max(north, point.lat)
    }
  }
  return { west, south, east, north }
}

function assertOutlineInside(
  rings: readonly (readonly LngLat[])[],
  limit: Bounds,
  label: string,
): Bounds {
  const extent = outlineExtent(rings)
  if (
    rings.length === 0 ||
    extent.south < limit.south ||
    extent.north > limit.north ||
    extent.west < limit.west ||
    extent.east > limit.east
  ) {
    throw new Error(
      `merged ${label} outline is empty or out of range (${String(extent.west)},${String(extent.south)})-(${String(extent.east)},${String(extent.north)})`,
    )
  }
  return extent
}

function ringInside(ring: readonly LngLat[], limit: Bounds): boolean {
  return ring.every(
    (point) =>
      point.lat >= limit.south &&
      point.lat <= limit.north &&
      point.lng >= limit.west &&
      point.lng <= limit.east,
  )
}

function localeTextureBounds(outline: Bounds): Bounds {
  const lngSpan = outline.east - outline.west
  const latSpan = outline.north - outline.south
  let padLng = Math.max(LOCALE_PAD_DEGREES, lngSpan * LOCALE_PAD_FRACTION)
  let padLat = Math.max(LOCALE_PAD_DEGREES, latSpan * LOCALE_PAD_FRACTION)
  const shrink = (span: number, pad: number): number => {
    if (span + 2 * pad <= LOCALE_MAX_SPAN_DEGREES) {
      return pad
    }
    return Math.max(0, (LOCALE_MAX_SPAN_DEGREES - span) / 2)
  }
  if (lngSpan + 2 * padLng >= latSpan + 2 * padLat) {
    padLng = shrink(lngSpan, padLng)
    padLat = shrink(latSpan, padLat)
  } else {
    padLat = shrink(latSpan, padLat)
    padLng = shrink(lngSpan, padLng)
  }
  return {
    west: snapDown(outline.west - padLng),
    south: snapDown(outline.south - padLat),
    east: snapUp(outline.east + padLng),
    north: snapUp(outline.north + padLat),
  }
}

async function writeOutlineFile(
  fileName: string,
  id: string,
  bounds: Bounds,
  rings: readonly (readonly LngLat[])[],
): Promise<void> {
  const feature = {
    type: 'Feature',
    properties: {
      id,
      west: bounds.west,
      south: bounds.south,
      east: bounds.east,
      north: bounds.north,
    },
    geometry: {
      type: 'MultiLineString',
      coordinates: rings.map((ring) =>
        ring.map((point) => [
          Number(point.lng.toFixed(5)),
          Number(point.lat.toFixed(5)),
        ]),
      ),
    },
  }
  const data = Buffer.from(`${JSON.stringify(feature)}\n`)
  await mkdir(REGION_DIR, { recursive: true })
  const path = join(REGION_DIR, fileName)
  const unchanged = await hasContents(path, data)
  if (!unchanged) {
    const temporaryPath = join(cacheDir, `${fileName}.tmp`)
    await writeFile(temporaryPath, data)
    await rename(temporaryPath, path)
  }
  console.log(
    `${fileName}: ${String(rings.length)} lines, ${String(data.length)} bytes, ${unchanged ? 'unchanged' : 'written'}`,
  )
}

async function makeBayOutline(bounds: Bounds): Promise<void> {
  const rings = simplifiedOutlines(
    countyRings(await loadCounties(), BAY_COUNTY_GEOIDS, 'bay counties'),
  )
  assertOutlineInside(rings, BAY_OUTLINE_LIMIT, 'bay')
  await writeOutlineFile('sf-bay-area.geojson', 'sf-bay-area', bounds, rings)
}

async function makeSfBayPack(heightsM: Grid): Promise<void> {
  const bounds = packBounds()
  console.log(
    `sf-bay-area pack bounds ${bounds.west.toFixed(4)},${bounds.south.toFixed(4)} ${bounds.east.toFixed(4)},${bounds.north.toFixed(4)}`,
  )
  await makeRegionDay(bounds, WIDE_BAY_FILES)
  await makeRegionRelief(heightsM, bounds, WIDE_BAY_FILES)
  await makeBayOutline(bounds)
}

function assertLocaleOutput(fileName: string): void {
  if (WIDE_BAY_OUTPUTS.has(fileName)) {
    throw new Error(`${fileName} is a wide Bay file`)
  }
}

interface LocalePlan {
  spec: LocaleSpec
  rings: LngLat[][]
  extent: Bounds
  texture: Bounds
}

function planLocale(table: CountyTable, spec: LocaleSpec): LocalePlan {
  const raw = countyRings(table, spec.geoids, spec.missingLabel)
  // San Clemente Island is in Los Angeles County and sits south of the basin box.
  const rings = simplifiedOutlines(
    raw.filter((ring) => ringInside(ring, spec.limit)),
  )
  const extent = assertOutlineInside(rings, spec.limit, spec.id)
  return { spec, rings, extent, texture: localeTextureBounds(extent) }
}

async function makeLocalePacks(): Promise<void> {
  const table = await loadCounties()
  const plans = LOCALE_SPECS.map((spec) => planLocale(table, spec))
  for (const plan of plans) {
    assertLocaleOutput(plan.spec.geojsonFile)
    assertLocaleOutput(plan.spec.dayFile)
    assertLocaleOutput(plan.spec.heightFile)
    assertLocaleOutput(plan.spec.normalFile)
    console.log(
      `${plan.spec.id} outline bbox ${plan.extent.west.toFixed(6)},${plan.extent.south.toFixed(6)} ${plan.extent.east.toFixed(6)},${plan.extent.north.toFixed(6)}`,
    )
    console.log(
      `${plan.spec.id} texture bounds ${plan.texture.west.toFixed(4)},${plan.texture.south.toFixed(4)} ${plan.texture.east.toFixed(4)},${plan.texture.north.toFixed(4)}`,
    )
    await writeOutlineFile(
      plan.spec.geojsonFile,
      plan.spec.id,
      plan.texture,
      plan.rings,
    )
  }
  const heightsM = await readHeightsM()
  for (const plan of plans) {
    const files: RegionFiles = {
      label: plan.spec.label,
      dayFile: plan.spec.dayFile,
      maxDayEdge: LOCALE_DAY_EDGE,
      heightFile: plan.spec.heightFile,
      normalFile: plan.spec.normalFile,
    }
    await makeRegionDay(plan.texture, files)
    await makeRegionRelief(heightsM, plan.texture, files)
  }
}

await mkdir(cacheDir, { recursive: true })
await mkdir(outputDir, { recursive: true })
if (process.argv.includes('--locales')) {
  console.log('node scripts/make-textures.ts --locales')
  await makeLocalePacks()
} else {
  console.log('npm run textures')
  await makeDayTextures()
  const heightsM = await readHeightsM()
  await makeHeightTexture(heightsM)
  await makeNormalTexture(heightsM)
  await makeCloudsTexture()
  await makeSfBayPack(heightsM)
}
