/* global console, fetch, URLSearchParams, AbortSignal, Buffer */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, relative, dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'public/data/san-jose-dc04')
const raw = resolve(root, 'data/raw/san-jose-dc04')
const bounds = [-121.949, 37.367, -121.917, 37.393]
const playable = [-121.943, 37.372, -121.923, 37.387]
const city =
  'https://geo.sanjoseca.gov/server/rest/services/OPN/OPN_OpenDataService/MapServer'
const files = []
await mkdir(output, { recursive: true })
await mkdir(raw, { recursive: true })

async function download(url, path) {
  try {
    return await readFile(path)
  } catch {
    /* Resume previously completed downloads. */
  }
  let last
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000) })
      if (!r.ok) throw new Error(`${r.status}: ${url}`)
      const bytes = Buffer.from(await r.arrayBuffer())
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes)
      return bytes
    } catch (error) {
      last = error
    }
  }
  throw last
}

async function saveJSON(name, data) {
  await writeFile(join(output, name), JSON.stringify(data))
}

async function cityLayer(name, id, fields, where = '1=1') {
  const metadata = JSON.parse(
    (
      await download(`${city}/${id}?f=json`, join(raw, `${name}-metadata.json`))
    ).toString(),
  )
  const features = []
  for (let offset = 0; ; offset += 1000) {
    const query = new URLSearchParams({
      where,
      geometry: bounds.join(','),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: fields,
      outSR: '4326',
      f: 'geojson',
      resultOffset: String(offset),
      resultRecordCount: '1000',
      orderByFields: 'OBJECTID',
    })
    const page = JSON.parse(
      (
        await download(
          `${city}/${id}/query?${query}`,
          join(raw, `${name}-${offset}.geojson`),
        )
      ).toString(),
    )
    if (!Array.isArray(page.features))
      throw new Error(`Invalid ${name}: ${JSON.stringify(page).slice(0, 200)}`)
    features.push(...page.features)
    if (page.features.length < 1000) break
  }
  await saveJSON(`${name}.geojson`, { type: 'FeatureCollection', features })
  console.log(`${name}: ${features.length} features`)
  files.push({
    id: name,
    sourceUrl: `${city}/${id}`,
    attribution: 'City of San José GIS',
    license:
      'City public GIS data; retain attribution and consult source metadata',
    sourceDescription: metadata.description,
    count: features.length,
    file: `${name}.geojson`,
  })
  return features
}

function tileXY(lng, lat, z) {
  const n = 2 ** z
  return [
    Math.floor(((lng + 180) / 360) * n),
    Math.floor(
      ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
    ),
  ]
}

async function batches(items, fn, concurrency = 4) {
  for (let i = 0; i < items.length; i += concurrency)
    await Promise.all(items.slice(i, i + concurrency).map(fn))
}

// Persist only public geographic attributes; do not copy contact/owner information.
await batches(
  [
    [
      'project',
      455,
      'OBJECTID,PROJECTNAME,FILENUM,PROJECTSTATUS,PROJECTNOTES,LASTUPDATE',
      "FILENUM = 'CP23-008'",
    ],
    ['parcels', 270, 'OBJECTID,APN,PARCELID,LASTUPDATE'],
    ['roads', 60, 'OBJECTID,FULLNAME,STREETCLASS,FOCWIDTH,LASTUPDATE'],
    [
      'trees',
      510,
      'OBJECTID,NAMESCIENTIFIC,HEIGHT,DIAMETER,VACANTSITE,LASTUPDATE',
      "VACANTSITE <> 'Yes' OR VACANTSITE IS NULL",
    ],
    ['zoning', 401, 'OBJECTID,ZONING,PDUSE,LASTUPDATE'],
    ['landcover', 360, 'OBJECTID,LANDCOVER,NATURALCOVER,LASTUPDATE'],
    ['parks', 188, '*'],
    ['trails', 186, '*'],
    ['flood', 439, '*'],
  ],
  (args) => cityLayer(...args),
  3,
)

// OpenFreeMap distributes OSM-derived vector tiles and explicitly supports reuse/self-hosting.
const index = JSON.parse(
  (
    await download(
      'https://tiles.openfreemap.org/planet',
      join(raw, 'openfreemap-tilejson.json'),
    )
  ).toString(),
)
const [minX, minY] = tileXY(bounds[0], bounds[3], 14)
const [maxX, maxY] = tileXY(bounds[2], bounds[1], 14)
const tiles = []
for (let x = minX; x <= maxX; x++)
  for (let y = minY; y <= maxY; y++) tiles.push([x, y])
const buildings = [],
  water = [],
  landuse = []
await batches(tiles, async ([x, y]) => {
  const url = index.tiles[0]
    .replace('{z}', '14')
    .replace('{x}', x)
    .replace('{y}', y)
  const tile = new VectorTile(
    new PbfReader(await download(url, join(raw, `osm/14/${x}/${y}.pbf`))),
  )
  for (const [name, target] of [
    ['building', buildings],
    ['water', water],
    ['landuse', landuse],
  ]) {
    const layer = tile.layers[name]
    if (!layer) continue
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i).toGeoJSON(x, y, 14)
      feature.properties = {
        ...feature.properties,
        tileKey: `14-${x}-${y}-${i}`,
        source: 'OpenStreetMap / OpenFreeMap',
      }
      if (name === 'building') {
        // OpenMapTiles render_height may already contain a fallback; never call these surveyed heights.
        feature.properties.height = Math.max(
          3,
          Number(feature.properties.render_height) || 8,
        )
        feature.properties.base = Math.max(
          0,
          Number(feature.properties.render_min_height) || 0,
        )
        feature.properties.heightKind =
          'OSM-derived or illustrative fallback; not survey verified'
      }
      target.push(feature)
    }
  }
})
for (const [name, features] of [
  ['buildings', buildings],
  ['water', water],
  ['landuse', landuse],
]) {
  await saveJSON(`${name}.geojson`, { type: 'FeatureCollection', features })
  files.push({
    id: name,
    sourceUrl: 'https://tiles.openfreemap.org/planet',
    snapshot: index.tiles[0],
    attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
    license: 'ODbL 1.0 (OSM data); see https://www.openstreetmap.org/copyright',
    count: features.length,
    file: `${name}.geojson`,
  })
  console.log(`${name}: ${features.length} tile features`)
}

// High-resolution aerial imagery is fetched once, composited and served as a local image.
const search =
  'https://planetarycomputer.microsoft.com/api/stac/v1/search?' +
  new URLSearchParams({
    collections: 'naip',
    bbox: bounds.join(','),
    limit: '100',
    sortby: '-datetime',
  })
const catalog = JSON.parse(
  (await download(search, join(raw, 'naip-search.json'))).toString(),
)
const newestYear = Math.max(
  ...catalog.features.map((f) => Number(f.properties['naip:year'])),
)
const acquisitions = catalog.features.filter(
  (f) => Number(f.properties['naip:year']) === newestYear,
)
if (!acquisitions.length) throw new Error('No NAIP acquisitions found')
const imagery = []
await batches(
  acquisitions,
  async (item) => {
    const query = new URLSearchParams({
      collection: 'naip',
      item: item.id,
      assets: 'image',
      asset_bidx: 'image|1,2,3',
      width: '4096',
      height: '4096',
      coord_crs: 'EPSG:4326',
      dst_crs: 'EPSG:3857',
    })
    const url = `https://planetarycomputer.microsoft.com/api/data/v1/item/bbox/${bounds.join(',')}.png?${query}`
    const input = await download(url, join(raw, `imagery/${item.id}.png`))
    const metadata = await sharp(input).metadata()
    if (metadata.width !== 4096 || metadata.height !== 4096)
      throw new Error(`Unexpected imagery dimensions: ${item.id}`)
    imagery.push({ input, left: 0, top: 0 })
    console.log(`imagery: ${item.id}`)
  },
  2,
)
await sharp({
  create: {
    width: 4096,
    height: 4096,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(imagery)
  .png()
  .toFile(join(raw, 'imagery-mosaic.png'))
const transparency = await sharp(join(raw, 'imagery-mosaic.png'))
  .extractChannel(3)
  .raw()
  .toBuffer()
if (transparency.some((value) => value !== 255))
  throw new Error(
    'Imagery has uncovered pixels; do not publish incomplete imagery',
  )
await sharp(join(raw, 'imagery-mosaic.png'))
  .removeAlpha()
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(join(output, 'aerial.jpg'))

// Tile the Web Mercator mosaic so it can be draped over the terrain reliably.
function worldPixel(lng, lat, z) {
  const size = 256 * 2 ** z
  return [
    ((lng + 180) / 360) * size,
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * size,
  ]
}
let aerialTileCount = 0
for (let z = 14; z <= 18; z++) {
  const [left, top] = worldPixel(bounds[0], bounds[3], z)
  const [right, bottom] = worldPixel(bounds[2], bounds[1], z)
  const originX = Math.floor(left),
    originY = Math.floor(top)
  const width = Math.ceil(right) - originX,
    height = Math.ceil(bottom) - originY
  const mosaic = await sharp(join(raw, 'imagery-mosaic.png'))
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer()
  const [x0, y0] = tileXY(bounds[0], bounds[3], z)
  const [x1, y1] = tileXY(bounds[2], bounds[1], z)
  const jobs = []
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) jobs.push([x, y])
  await batches(
    jobs,
    async ([x, y]) => {
      const dx = x * 256 - originX,
        dy = y * 256 - originY
      const cropLeft = Math.max(0, dx),
        cropTop = Math.max(0, dy)
      const cropWidth = Math.min(width, dx + 256) - cropLeft
      const cropHeight = Math.min(height, dy + 256) - cropTop
      const crop = await sharp(mosaic, { raw: { width, height, channels: 4 } })
        .extract({
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight,
        })
        .png()
        .toBuffer()
      const path = join(output, `aerial/${z}/${x}/${y}.jpg`)
      await mkdir(dirname(path), { recursive: true })
      await sharp({
        create: { width: 256, height: 256, channels: 3, background: '#e6e4d7' },
      })
        .composite([
          { input: crop, left: Math.max(0, -dx), top: Math.max(0, -dy) },
        ])
        .jpeg({ quality: 88 })
        .toFile(path)
    },
    3,
  )
  aerialTileCount += jobs.length
  console.log(`aerial tiles z${z}: ${jobs.length}`)
}
files.push({
  id: 'aerial',
  file: 'aerial.jpg',
  sourceUrl: search,
  attribution: 'USDA NAIP · Microsoft Planetary Computer',
  license:
    'NAIP public-domain acquisition; preserve acquisition metadata and provider attribution',
  acquisitions: acquisitions.map((i) => ({
    id: i.id,
    datetime: i.properties.datetime,
    resolutionMeters: i.properties.gsd,
    asset: i.assets.image.href,
  })),
  renderedSize: [4096, 4096],
  tileCount: aerialTileCount,
  minzoom: 14,
  maxzoom: 18,
})

// The map cannot request terrain outside this cached, bounded pyramid.
const terrain = []
for (let z = 10; z <= 14; z++) {
  const [x0, y0] = tileXY(bounds[0], bounds[3], z)
  const [x1, y1] = tileXY(bounds[2], bounds[1], z)
  for (let x = x0 - 1; x <= x1 + 1; x++)
    for (let y = y0 - 1; y <= y1 + 1; y++) terrain.push([z, x, y])
}
await batches(
  terrain,
  async ([z, x, y]) =>
    download(
      `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
      join(output, `terrain/${z}/${x}/${y}.png`),
    ),
  6,
)
console.log(`terrain: ${terrain.length} tiles`)
files.push({
  id: 'terrain',
  file: 'terrain/{z}/{x}/{y}.png',
  count: terrain.length,
  sourceUrl: 'https://registry.opendata.aws/terrain-tiles/',
  attribution: 'Mapzen · USGS and other elevation contributors',
  license:
    'Source-specific public-domain / attribution terms: https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
  encoding: 'terrarium',
  minzoom: 10,
  maxzoom: 14,
})

await download(
  'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf',
  join(output, 'fonts/Noto Sans Regular/0-255.pbf'),
)
await saveJSON('project-facts.json', {
  sourceUrl:
    'https://www.energy.ca.gov/powerplant/backup-generating-system/san-jose-data-center-04',
  cityFile: 'CP23-008',
  docket: '22-SPPE-02',
  documentedProposal: {
    buildings: 2,
    storiesPerBuilding: 4,
    grossFloorAreaSqFtPerBuilding: 315639,
    maximumElectricalDemandMW: 97.8,
  },
  note: 'The interactive building is an illustrative alternative, not the engineering design. The city GIS project outline has a Trimble Road label while the CEC describes Orchard Parkway / Component Drive; matched by city file CP23-008 and proposal description. Current parcel IDs differ from the historical APNs in the CEC summary.',
})

async function checksums(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await checksums(path)))
    else if (entry.name !== 'manifest.json') {
      const bytes = await readFile(path)
      result.push({
        path: relative(output, path),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      })
    }
  }
  return result
}
const artifacts = await checksums(output)
await saveJSON('manifest.json', {
  id: 'san-jose-dc04',
  version: 1,
  preparedAt: new Date().toISOString(),
  bounds,
  playableBounds: playable,
  center: [-121.9332, 37.3786],
  imageryDate: acquisitions[0].properties.datetime.slice(0, 10),
  imageryCoordinates: [
    [bounds[0], bounds[3]],
    [bounds[2], bounds[3]],
    [bounds[2], bounds[1]],
    [bounds[0], bounds[1]],
  ],
  datasets: files,
  artifacts,
  totalBytes: artifacts.reduce((sum, f) => sum + f.bytes, 0),
  limitations: [
    'Aerial imagery is a historical NAIP snapshot, not current construction conditions.',
    'Building footprints are OSM-derived and may be incomplete; heights may be approximations.',
    'Street-tree inventory is not a complete inventory of trees on private parcels. Displayed crown sizes are illustrative.',
    'City land-cover polygons include historical observations; consult LASTUPDATE attributes.',
    'Flood polygons indicate mapped hazards, not predicted water depths or effects of this design.',
    'Placement checks are educational geometry checks, not a determination of planning approval.',
    'No environmental, employment, financial, or health prediction model is implemented in this map proposal.',
  ],
})
await mkdir(resolve(root, 'data/manifests'), { recursive: true })
await writeFile(
  resolve(root, 'data/manifests/san-jose-dc04.json'),
  await readFile(join(output, 'manifest.json')),
)
console.log(
  `Prepared ${(artifacts.reduce((s, f) => s + f.bytes, 0) / 1024 / 1024).toFixed(1)} MiB at ${output}`,
)
