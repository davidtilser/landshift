/* global console, process */
import { readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const id = process.argv[2] ?? 'san-jose-dc04'
if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid pack id')
const directory = resolve(import.meta.dirname, '../../public/data', id)
const manifest = JSON.parse(
  await readFile(join(directory, 'manifest.json'), 'utf8'),
)
const failures = []
if (manifest.id !== id) failures.push('Manifest does not match requested pack')
const paths = new Set(manifest.artifacts.map((a) => a.path))
function tileXY(lng, lat, z) {
  const n = 2 ** z
  return [
    Math.floor(((lng + 180) / 360) * n),
    Math.floor(
      ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
    ),
  ]
}
for (const [kind, low, high, extension] of [
  ['aerial', 14, 18, 'jpg'],
  ['terrain', 10, 14, 'png'],
]) {
  for (let z = low; z <= high; z++) {
    const [x0, y0] = tileXY(manifest.bounds[0], manifest.bounds[3], z)
    const [x1, y1] = tileXY(manifest.bounds[2], manifest.bounds[1], z)
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const path = `${kind}/${z}/${x}/${y}.${extension}`
        if (!paths.has(path)) failures.push(`Tile coverage gap: ${path}`)
      }
  }
}
for (const artifact of manifest.artifacts) {
  try {
    const data = await readFile(join(directory, artifact.path))
    if (data.length !== artifact.bytes)
      failures.push(`Size mismatch: ${artifact.path}`)
    if (createHash('sha256').update(data).digest('hex') !== artifact.sha256)
      failures.push(`Checksum mismatch: ${artifact.path}`)
  } catch {
    failures.push(`Missing file: ${artifact.path}`)
  }
}
for (const name of await readdir(directory)) {
  if (!name.endsWith('.geojson')) continue
  const collection = JSON.parse(await readFile(join(directory, name), 'utf8'))
  if (collection.type !== 'FeatureCollection')
    failures.push(`Invalid collection: ${name}`)
  function validCoordinates(value) {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      (typeof value[0] === 'number'
        ? value.length === 2 &&
          value.every(Number.isFinite) &&
          Math.abs(value[0]) <= 180 &&
          Math.abs(value[1]) <= 90
        : value.every(validCoordinates))
    )
  }
  for (const feature of collection.features)
    if (!validCoordinates(feature.geometry.coordinates))
      failures.push(`Invalid WGS84 geometry: ${name}`)
}
if (id === 'golden-gate-park') {
  const parks = JSON.parse(
    await readFile(join(directory, 'parks.geojson'), 'utf8'),
  )
  const park = parks.features.find(
    (feature) => feature.properties?.map_label === 'Golden Gate Park',
  )
  if (!park)
    failures.push('Missing complete official Golden Gate Park geometry')
  else {
    const containsCoordinates = (coordinates) =>
      typeof coordinates[0] === 'number'
        ? coordinates[0] >= manifest.bounds[0] &&
          coordinates[0] <= manifest.bounds[2] &&
          coordinates[1] >= manifest.bounds[1] &&
          coordinates[1] <= manifest.bounds[3]
        : coordinates.every(containsCoordinates)
    if (!containsCoordinates(park.geometry.coordinates))
      failures.push('Prepared bounds do not cover the complete official park')
  }
  const heritage = JSON.parse(
    await readFile(join(directory, 'heritage.geojson'), 'utf8'),
  )
  if (
    !heritage.features.some(
      (feature) =>
        feature.geometry.type === 'Point' &&
        feature.geometry.coordinates[0] === -122.46889 &&
        feature.geometry.coordinates[1] === 37.77293,
    )
  )
    failures.push('Missing NPS-documented Heroes’ Grove memorial point')
}
const image = await sharp(join(directory, 'aerial.jpg')).metadata()
const [expectedWidth, expectedHeight] = manifest.imagerySize ?? [4096, 4096]
if (image.width !== expectedWidth || image.height !== expectedHeight)
  failures.push('Unexpected aerial image dimensions')
if (
  !manifest.artifacts.some(
    (a) => a.path === 'fonts/Noto Sans Regular/0-255.pbf',
  )
)
  failures.push('Missing local map font')
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else
  console.log(
    `Verified ${manifest.artifacts.length} assets, WGS84 geometry and aerial image (${(manifest.totalBytes / 1024 / 1024).toFixed(1)} MiB).`,
  )
