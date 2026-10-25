import { z } from 'zod'
import type { FeatureCollection } from 'geojson'

const coordinate = z.tuple([z.number(), z.number()])
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Point'), coordinates: coordinate }),
  z.object({ type: z.literal('MultiPoint'), coordinates: z.array(coordinate) }),
  z.object({ type: z.literal('LineString'), coordinates: z.array(coordinate) }),
  z.object({
    type: z.literal('MultiLineString'),
    coordinates: z.array(z.array(coordinate)),
  }),
  z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(coordinate)),
  }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(coordinate))),
  }),
])
const collectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      id: z.union([z.string(), z.number()]).optional(),
      geometry,
      properties: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
})
const bounds = z.tuple([z.number(), z.number(), z.number(), z.number()])
const packIdSchema = z.enum(['san-jose-dc04', 'golden-gate-park'])
const manifestSchema = z.object({
  id: packIdSchema,
  displayName: z.string().optional(),
  city: z.string().optional(),
  hypothetical: z.boolean().optional(),
  imagerySize: z
    .tuple([z.number().positive(), z.number().positive()])
    .optional(),
  version: z.number(),
  preparedAt: z.string(),
  bounds,
  playableBounds: bounds,
  center: coordinate,
  imageryDate: z.string(),
  imageryCoordinates: z.tuple([coordinate, coordinate, coordinate, coordinate]),
  totalBytes: z.number(),
  datasets: z.array(
    z.object({
      id: z.string(),
      attribution: z.string(),
      count: z.number().optional(),
    }),
  ),
  limitations: z.array(z.string()),
})

export type PackManifest = z.infer<typeof manifestSchema>
export type LayerName =
  | 'buildings'
  | 'water'
  | 'landuse'
  | 'roads'
  | 'trees'
  | 'project'
  | 'parcels'
  | 'zoning'
  | 'landcover'
  | 'parks'
  | 'trails'
  | 'flood'
export interface DataPack {
  manifest: PackManifest
  layers: Record<LayerName, FeatureCollection> & {
    heritage?: FeatureCollection
    places?: FeatureCollection
  }
  baseUrl: string
}

export async function loadDataPack(id = 'golden-gate-park'): Promise<DataPack> {
  const packId = packIdSchema.parse(id)
  const baseUrl = `${import.meta.env.BASE_URL}data/${packId}/`
  const manifestResponse = await fetch(`${baseUrl}manifest.json`)
  if (!manifestResponse.ok)
    throw new Error(
      `The ${packId} data pack is missing. Run ${packId === 'golden-gate-park' ? 'npm run data:prepare:golden-gate' : 'npm run data:prepare'}, then reload.`,
    )
  const manifest = manifestSchema.parse(await manifestResponse.json())
  if (manifest.id !== packId)
    throw new Error(
      'The geographic pack id does not match the selected scenario.',
    )
  async function layer(
    name: LayerName | 'heritage' | 'places',
  ): Promise<FeatureCollection> {
    const response = await fetch(`${baseUrl}${name}.geojson`)
    if (!response.ok) throw new Error(`Missing local geographic layer: ${name}`)
    return collectionSchema.parse(await response.json())
  }
  const [
    buildings,
    water,
    landuse,
    roads,
    trees,
    project,
    parcels,
    zoning,
    landcover,
    parks,
    trails,
    flood,
  ] = await Promise.all([
    layer('buildings'),
    layer('water'),
    layer('landuse'),
    layer('roads'),
    layer('trees'),
    layer('project'),
    layer('parcels'),
    layer('zoning'),
    layer('landcover'),
    layer('parks'),
    layer('trails'),
    layer('flood'),
  ])
  function optionalLayer(
    name: 'heritage' | 'places',
  ): Promise<FeatureCollection> {
    return manifest.datasets.some((dataset) => dataset.id === name)
      ? layer(name)
      : Promise.resolve({ type: 'FeatureCollection', features: [] })
  }
  const [heritage, places] = await Promise.all([
    optionalLayer('heritage'),
    optionalLayer('places'),
  ])
  if (!project.features.length || !buildings.features.length)
    throw new Error('The geographic pack is incomplete.')
  return {
    manifest,
    baseUrl,
    layers: {
      buildings,
      water,
      landuse,
      roads,
      trees,
      project,
      parcels,
      zoning,
      landcover,
      parks,
      trails,
      flood,
      heritage,
      places,
    },
  }
}
