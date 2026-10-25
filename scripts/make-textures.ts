import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
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

async function download(url: string): Promise<string> {
  const path = join(cacheDir, basename(new URL(url).pathname))
  if (await fileExists(path)) {
    console.log(`cached ${path}`)
    return path
  }
  console.log(`downloading ${url}`)
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`${url} returned "${contentType}", not an image`)
  }
  const data = Buffer.from(await response.arrayBuffer())
  // stats() decodes every pixel, so an HTML error page or a truncated body fails here.
  await sharp(data).stats()
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

await mkdir(cacheDir, { recursive: true })
await mkdir(outputDir, { recursive: true })
await makeDayTextures()
const heightsM = await readHeightsM()
await makeHeightTexture(heightsM)
await makeNormalTexture(heightsM)
await makeCloudsTexture()
