import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import sharp from 'sharp'
import type { OutputInfo } from 'sharp'

const BLUE_MARBLE_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/june/world.topo.bathy.200406.3x21600x10800.jpg'
const TOPOGRAPHY_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_21600x10800.jpg'
const CLOUDS_URL =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg'

const DAY_QUALITY = 85
const BUMP_QUALITY = 80
const CLOUDS_ALPHA_QUALITY = 50
const DOWNLOAD_TIMEOUT_MS = 120_000

const rootDir = join(import.meta.dirname, '..')
const cacheDir = join(rootDir, '.cache', 'textures')
const outputDir = join(rootDir, 'public', 'textures')

interface EncodedTexture {
  data: Buffer
  info: OutputInfo
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

async function makeBumpTexture(): Promise<void> {
  const source = await download(TOPOGRAPHY_URL)
  await writeOutput(
    'earth-bump.webp',
    await sharp(source)
      .resize(4096, 2048, { fit: 'fill' })
      .grayscale()
      .webp({ quality: BUMP_QUALITY, effort: 6 })
      .toBuffer({ resolveWithObject: true }),
  )
}

async function makeCloudsTexture(): Promise<void> {
  const source = await download(CLOUDS_URL)
  const { data: alpha, info } = await sharp(source)
    .resize(2048, 1024, { fit: 'fill' })
    .grayscale()
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const clouds = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    // exact keeps RGB white under fully transparent pixels instead of letting the encoder alter it.
    .webp({ alphaQuality: CLOUDS_ALPHA_QUALITY, exact: true, effort: 6 })
    .toBuffer({ resolveWithObject: true })
  const { channels } = await sharp(clouds.data).stats()
  if (channels.slice(0, 3).some((channel) => channel.min !== 255)) {
    throw new Error('clouds-alpha.webp has non-white RGB pixels')
  }
  await writeOutput('clouds-alpha.webp', clouds)
}

await mkdir(cacheDir, { recursive: true })
await mkdir(outputDir, { recursive: true })
await makeDayTextures()
await makeBumpTexture()
await makeCloudsTexture()
