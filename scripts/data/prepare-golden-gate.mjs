/* global console, fetch, URLSearchParams, AbortSignal, Buffer */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, relative, dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { format } from 'prettier'
import { rectangle } from '../../src/game/geometry.ts'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'public/data/golden-gate-park')
const raw = resolve(root, 'data/raw/golden-gate-park')
// Includes the main park, its Panhandle, and a narrow surrounding context band.
const bounds = [-122.516, 37.764, -122.438, 37.776]
const playable = [-122.514, 37.7648, -122.439, 37.7753]
// NPS HALS CA-49-B: WGS84 GPS, north face of the memorial boulder.
const center = [-122.46889, 37.77293]
const heritageSource =
  'https://tile.loc.gov/storage-services/master/pnp/habshaer/ca/ca4300/ca4343/data/ca4343data.pdf'
const files = []
await mkdir(output, { recursive: true })
await mkdir(raw, { recursive: true })

async function download(url, path) {
  try {
    return await readFile(path)
  } catch {
    /* Resume completed downloads. */
  }
  let last
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(
          url.includes('/api/data/') ? 120000 : 30000,
        ),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
      const bytes = Buffer.from(await response.arrayBuffer())
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
function collection(features = []) {
  return { type: 'FeatureCollection', features }
}
function xyOnly(value) {
  return typeof value[0] === 'number' ? value.slice(0, 2) : value.map(xyOnly)
}
const envelope = `POLYGON((${bounds[0]} ${bounds[1]},${bounds[2]} ${bounds[1]},${bounds[2]} ${bounds[3]},${bounds[0]} ${bounds[3]},${bounds[0]} ${bounds[1]}))`
async function cityLayer(
  name,
  id,
  geometry,
  fields,
  order,
  filter = '',
  normalize = (feature) => feature,
) {
  const sourceUrl = `https://data.sf.gov/resource/${id}.geojson`
  const metadata = JSON.parse(
    (
      await download(
        `https://data.sf.gov/api/views/${id}.json`,
        join(raw, `${name}-metadata.json`),
      )
    ).toString(),
  )
  const features = []
  for (let offset = 0; ; offset += 1000) {
    const query = new URLSearchParams({
      $select: fields,
      $where: `${filter ? '(' + filter + ') AND ' : ''}intersects(${geometry}, '${envelope}')`,
      $order: order,
      $limit: '1000',
      $offset: String(offset),
    })
    const page = JSON.parse(
      (
        await download(
          `${sourceUrl}?${query}`,
          join(raw, `${name}-${offset}.geojson`),
        )
      ).toString(),
    )
    if (!Array.isArray(page.features))
      throw new Error(
        'Invalid city layer ' +
          name +
          ': ' +
          JSON.stringify(page).slice(0, 180),
      )
    features.push(...page.features.map(normalize).filter(Boolean))
    if (page.features.length < 1000) break
  }
  for (const feature of features)
    feature.geometry.coordinates = xyOnly(feature.geometry.coordinates)
  await saveJSON(name + '.geojson', collection(features))
  files.push({
    id: name,
    file: name + '.geojson',
    count: features.length,
    sourceUrl,
    attribution: 'City and County of San Francisco · DataSF',
    license:
      metadata.license?.name ??
      'SF Open Data; retain dataset attribution and metadata',
    description: metadata.description,
  })
  console.log(name + ': ' + features.length + ' city features')
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

// Public geometry and geographic attributes only; no owners or contact details.
let cityBuildingsReady = false
await Promise.all([
  cityLayer(
    'parks',
    'bz92-g22m',
    'shape',
    'shape,objectid,map_label,acres,propertytype',
    'objectid',
    '',
    (feature) => {
      if (/ - Section /i.test(feature.properties.map_label ?? '')) return null
      feature.id = 'sf-park-' + feature.properties.objectid
      feature.properties.name = feature.properties.map_label
      return feature
    },
  ),
  cityLayer(
    'buildings',
    'ynuv-fyni',
    'shape',
    'shape,sf16_bldgid,hgt_median_m,data_as_of',
    'sf16_bldgid',
    '',
    (feature) => {
      feature.id = 'sf-building-' + feature.properties.sf16_bldgid
      feature.properties.height = Math.max(
        3,
        Number(feature.properties.hgt_median_m) || 8,
      )
      feature.properties.heightKind =
        'City historic LiDAR median or illustrative fallback; not current survey'
      return feature
    },
  )
    .then(() => {
      cityBuildingsReady = true
    })
    .catch(() => {
      console.log(
        'City building export unavailable; using real OSM footprints instead.',
      )
    }),
  cityLayer(
    'roads',
    '3psu-pn9h',
    'line',
    'line,cnn,streetname,street,st_type,classcode,oneway,active,data_as_of',
    'cnn',
    'active = true',
    (feature) => {
      feature.id = 'sf-street-' + feature.properties.cnn
      feature.properties.FULLNAME = feature.properties.streetname
      feature.properties.STREETCLASS = feature.properties.classcode
      // Authored traffic is kept off park promenades and paths, not live access data.
      feature.properties.motorVehicle =
        /^(FULTON|LINCOLN|STANYAN|PARK PRESIDIO|CROSSOVER|19TH)\b/.test(
          feature.properties.streetname ?? '',
        )
      return feature
    },
  ),
])
// The city inventory is street trees, not a census of the park's forest.
const treeQuery = new URLSearchParams({
  $select: 'treeid,species,latitude,longitude,mapdbh,data_as_of',
  $where: `longitude between ${bounds[0]} and ${bounds[2]} AND latitude between ${bounds[1]} and ${bounds[3]}`,
  $order: 'treeid',
  $limit: '50000',
})
const treeRows = JSON.parse(
  (
    await download(
      `https://data.sf.gov/resource/tkzw-k3nq.json?${treeQuery}`,
      join(raw, 'tree-points.json'),
    )
  ).toString(),
)
if (!Array.isArray(treeRows) || treeRows.length >= 50000)
  throw new Error('Invalid or truncated tree response')
const treeFeatures = treeRows
  .filter((row) => row.latitude && row.longitude)
  .map((row) => ({
    type: 'Feature',
    id: 'sf-tree-' + row.treeid,
    properties: {
      treeid: row.treeid,
      NAMESCIENTIFIC: row.species,
      DIAMETER: row.mapdbh,
      data_as_of: row.data_as_of,
      source: 'DataSF street-tree inventory; incomplete in parks',
    },
    geometry: {
      type: 'Point',
      coordinates: [Number(row.longitude), Number(row.latitude)],
    },
  }))
await saveJSON('trees.geojson', collection(treeFeatures))
files.push({
  id: 'trees',
  file: 'trees.geojson',
  count: treeFeatures.length,
  sourceUrl: 'https://data.sf.gov/resource/tkzw-k3nq.json',
  attribution: 'San Francisco Public Works · DataSF',
  license: 'SF Open Data',
  limitation:
    'Street-tree records do not enumerate all park trees or measure tree canopy.',
})
console.log('trees: ' + treeFeatures.length + ' city street-tree records')

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
const layers = {
  buildings: [],
  water: [],
  landuse: [],
  landcover: [],
  trails: [],
  places: [],
}
await batches(tiles, async ([x, y]) => {
  const url = index.tiles[0]
    .replace('{z}', '14')
    .replace('{x}', x)
    .replace('{y}', y)
  const tile = new VectorTile(
    new PbfReader(await download(url, join(raw, `osm/14/${x}/${y}.pbf`))),
  )
  for (const [source, name] of [
    ['building', 'buildings'],
    ['water', 'water'],
    ['landuse', 'landuse'],
    ['landcover', 'landcover'],
    ['transportation', 'trails'],
    ['poi', 'places'],
  ]) {
    const layer = tile.layers[source]
    if (!layer) continue
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i).toGeoJSON(x, y, 14)
      if (name === 'buildings') {
        feature.properties.height = Math.max(
          3,
          Number(feature.properties.render_height) || 8,
        )
        feature.properties.base = Math.max(
          0,
          Number(feature.properties.render_min_height) || 0,
        )
        feature.properties.heightKind =
          'OSM-derived or illustrative fallback, not a current survey'
      }
      if (
        name === 'trails' &&
        !['path', 'track', 'pedestrian', 'cycleway'].includes(
          feature.properties.class,
        )
      )
        continue
      feature.properties.source = 'OpenStreetMap / OpenFreeMap'
      feature.properties.tileKey = `14-${x}-${y}-${i}`
      layers[name].push(feature)
    }
  }
})
for (const [name, features] of Object.entries(layers)) {
  if (name === 'buildings' && cityBuildingsReady) continue
  await saveJSON(name + '.geojson', collection(features))
  files.push({
    id: name,
    file: name + '.geojson',
    count: features.length,
    sourceUrl: 'https://tiles.openfreemap.org/planet',
    snapshot: index.tiles[0],
    attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
    license: 'ODbL 1.0; https://www.openstreetmap.org/copyright',
  })
  console.log(name + ': ' + features.length + ' OSM tile features')
}
const fema =
  'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28'
const flood = []
for (let offset = 0; ; offset += 1000) {
  const query = new URLSearchParams({
    where: '1=1',
    geometry: bounds.join(','),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OBJECTID,FLD_ZONE,SFHA_TF,ZONE_SUBTY',
    outSR: '4326',
    f: 'geojson',
    resultOffset: String(offset),
    resultRecordCount: '1000',
    orderByFields: 'OBJECTID',
  })
  const page = JSON.parse(
    (
      await download(
        `${fema}/query?${query}`,
        join(raw, `flood-${offset}.geojson`),
      )
    ).toString(),
  )
  if (!Array.isArray(page.features))
    throw new Error(
      'Invalid FEMA response: ' + JSON.stringify(page).slice(0, 180),
    )
  flood.push(
    ...page.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: xyOnly(feature.geometry.coordinates),
      },
      properties: { ...feature.properties, SFHATF: feature.properties.SFHA_TF },
    })),
  )
  if (page.features.length < 1000) break
}
await saveJSON('flood.geojson', collection(flood))
files.push({
  id: 'flood',
  file: 'flood.geojson',
  count: flood.length,
  sourceUrl: fema,
  attribution: 'FEMA National Flood Hazard Layer',
  license:
    'US government public data; retain zone and effective-study metadata',
  limitation: 'Mapped flood zones, not stormwater simulation or flood depths.',
})
console.log('flood: ' + flood.length + ' FEMA zone features')

for (const name of ['parcels', 'zoning'])
  await saveJSON(name + '.geojson', collection())
await saveJSON(
  'heritage.geojson',
  collection([
    {
      type: 'Feature',
      id: 'heroes-grove-wwi-memorial',
      properties: {
        name: 'Heroes’ Grove WWI Memorial',
        kind: 'memorial',
        source: heritageSource,
        coordinateDescription:
          'NPS WGS84 GPS: north face of Gold Star Mothers’ Memorial Boulder',
        extentKnown: false,
      },
      geometry: { type: 'Point', coordinates: center },
    },
  ]),
)
files.push({
  id: 'heritage',
  file: 'heritage.geojson',
  count: 1,
  sourceUrl: heritageSource,
  attribution:
    'National Park Service · Historic American Landscapes Survey CA-49-B · Library of Congress',
  license:
    'US government survey; factual coordinate transcribed with attribution',
  limitation:
    'Documented point, not a surveyed footprint or legal protection boundary.',
})
const sketch = rectangle(center, 184, 112, 28)
sketch.properties = {
  name: 'Hypothetical memorial-replacement sketch',
  hypothetical: true,
  officialProject: false,
}
await saveJSON('project.geojson', collection([sketch]))
files.push({
  id: 'project',
  file: 'project.geojson',
  count: 1,
  attribution: 'Landshift hypothetical game sketch',
  sourceUrl: heritageSource,
  license: 'Project-authored illustration',
  limitation:
    'No real data-center proposal, planning application, or approval is asserted.',
})
await saveJSON('project-facts.json', {
  hypothetical: true,
  name: 'Golden Gate Park: a place worth protecting',
  center,
  memorialSource: heritageSource,
  note: 'A fictional data-center placement exercise at the documented WWI memorial point. Characters and protests are authored roleplay, not statements by real groups.',
})
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
      height: '1024',
      coord_crs: 'EPSG:4326',
      dst_crs: 'EPSG:3857',
    })
    const url = `https://planetarycomputer.microsoft.com/api/data/v1/item/bbox/${bounds.join(',')}.png?${query}`
    const input = await download(url, join(raw, `imagery/${item.id}.png`))
    const metadata = await sharp(input).metadata()
    if (metadata.width !== 4096 || metadata.height !== 1024)
      throw new Error(`Unexpected imagery dimensions: ${item.id}`)
    imagery.push({ input, left: 0, top: 0, itemId: item.id })
    console.log(`imagery: ${item.id}`)
  },
  2,
)
await sharp({
  create: {
    width: 4096,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    imagery
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
      .map(({ input, left, top }) => ({ input, left, top })),
  )
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
  renderedSize: [4096, 1024],
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
  return result.sort((a, b) => a.path.localeCompare(b.path))
}
const artifacts = await checksums(output)
const manifest = {
  id: 'golden-gate-park',
  version: 1,
  preparedAt: new Date().toISOString(),
  bounds,
  playableBounds: playable,
  center,
  displayName: 'Golden Gate Park',
  city: 'San Francisco',
  hypothetical: true,
  imagerySize: [4096, 1024],
  imageryDate: [
    ...new Set(
      acquisitions.map((item) => item.properties.datetime.slice(0, 10)),
    ),
  ]
    .sort()
    .join(' / '),
  imageryCoordinates: [
    [bounds[0], bounds[3]],
    [bounds[2], bounds[3]],
    [bounds[2], bounds[1]],
    [bounds[0], bounds[1]],
  ],
  datasets: files,
  artifacts,
  totalBytes: artifacts.reduce((sum, item) => sum + item.bytes, 0),
  limitations: [
    'This is a hypothetical data-center exercise, not an actual proposal to develop Golden Gate Park or replace the memorial.',
    'The memorial point comes from NPS HALS CA-49-B. Its physical extent and any legal protection boundary are not mapped by this point.',
    'City park polygons represent real public space; a clear memorial point does not make another park location suitable for development.',
    'NAIP imagery dates are May 18–19, 2022. Native 60 cm imagery is resampled to a 4096 × 1024 whole-park mosaic; this is not current imagery or 60 cm rendered resolution.',
    'Street-tree points are incomplete within Golden Gate Park. Absence of a tree point does not mean no trees; crowns are schematic.',
    'Building footprints and median heights derive from older city LiDAR sources; they are not a current survey.',
    'OSM vector features may be incomplete, generalized or split at tile boundaries. Named places are not verified amenity footprints.',
    'Parcel and zoning layers are not included. Empty collections must not be treated as evidence of ownership or development permission.',
    'FEMA polygons describe mapped zones, not flood depths, local stormwater drainage, or the effects of this design.',
    'Terrain is an approximate elevation grid. Character movement, communities, protests and consequences are game illustrations, not observations or forecasts.',
    'Photorealistic Google 3D tiles stream separately; the local aerial and terrain data remain available offline.',
  ],
}
await saveJSON('manifest.json', manifest)
await mkdir(join(root, 'data/manifests'), { recursive: true })
await writeFile(
  join(root, 'data/manifests/golden-gate-park.json'),
  await format(JSON.stringify(manifest), { parser: 'json' }),
)
console.log(
  `Prepared ${(manifest.totalBytes / 1024 / 1024).toFixed(1)} MiB across ${artifacts.length} assets`,
)
