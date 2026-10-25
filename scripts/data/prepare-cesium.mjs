/* global console, process */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { format } from 'prettier'

const root = resolve(import.meta.dirname, '../..')
const id = process.argv[2] ?? 'san-jose-dc04'
if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid pack id')
const pack = join(root, 'public/data', id)
const manifest = JSON.parse(await readFile(join(pack, 'manifest.json'), 'utf8'))
const size = 257
const bounds = manifest.bounds
const images = new Map()
const n = 2 ** 14
async function elevation(lng, lat) {
  const px = ((lng + 180) / 360) * n * 256
  const py =
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256
  const tx = Math.floor(px / 256),
    ty = Math.floor(py / 256)
  const key = `${tx}/${ty}`
  if (!images.has(key)) {
    const image = await sharp(join(pack, `terrain/14/${key}.png`))
      .removeAlpha()
      .raw()
      .toBuffer()
    images.set(key, image)
  }
  const image = images.get(key)
  const ix = Math.max(0, Math.min(255, Math.floor(px - tx * 256)))
  const iy = Math.max(0, Math.min(255, Math.floor(py - ty * 256)))
  const i = (iy * 256 + ix) * 3
  return (
    Math.round(
      (image[i] * 256 + image[i + 1] + image[i + 2] / 256 - 32768) * 10,
    ) / 10
  )
}
const heights = []
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    heights.push(
      await elevation(
        bounds[0] + (x / (size - 1)) * (bounds[2] - bounds[0]),
        bounds[3] - (y / (size - 1)) * (bounds[3] - bounds[1]),
      ),
    )
  }
const file = 'cesium-heightmap.json'
await writeFile(
  join(pack, file),
  JSON.stringify({
    size,
    bounds,
    heights,
    attribution: 'Mapzen elevation · USGS and other source contributors',
    note: 'Height samples derived locally from the cached Terrarium tiles, rounded to 0.1 m; not survey-grade elevation.',
  }),
)
const bytes = await readFile(join(pack, file))
manifest.artifacts = manifest.artifacts.filter((a) => a.path !== file)
manifest.artifacts.push({
  path: file,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
})
manifest.totalBytes = manifest.artifacts.reduce((s, a) => s + a.bytes, 0)
await writeFile(join(pack, 'manifest.json'), JSON.stringify(manifest))
await mkdir(join(root, 'data/manifests'), { recursive: true })
await writeFile(
  join(root, 'data/manifests', id + '.json'),
  await format(JSON.stringify(manifest), { parser: 'json' }),
)
console.log(
  `Prepared ${size} × ${size} local Cesium elevation samples (${(bytes.length / 1024).toFixed(0)} KiB); no new downloads.`,
)
