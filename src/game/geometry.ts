import type { FeatureCollection, Feature, Polygon, Position } from 'geojson'
import { booleanIntersects } from '@turf/boolean-intersects'
import { area } from '@turf/area'

export type LngLat = [number, number]
export type Bounds = [number, number, number, number]

export function rectangle(
  center: LngLat,
  width: number,
  depth: number,
  bearing: number,
  east = 0,
  north = 0,
): Feature<Polygon> {
  const angle = (bearing * Math.PI) / 180
  const corners: Position[] = []
  for (const [x, y] of [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ]) {
    if (x === undefined || y === undefined) continue
    const ex = (x + east) * Math.cos(angle) + (y + north) * Math.sin(angle)
    const ny = -(x + east) * Math.sin(angle) + (y + north) * Math.cos(angle)
    corners.push([
      center[0] + ex / (111320 * Math.cos((center[1] * Math.PI) / 180)),
      center[1] + ny / 111320,
    ])
  }
  const first = corners[0]
  if (first) corners.push([...first])
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [corners] },
  }
}

export function campus(
  center: LngLat,
  bearing: number,
): {
  volumes: FeatureCollection<Polygon>
  footprints: FeatureCollection<Polygon>
  area: number
} {
  const volumes: Feature<Polygon>[] = []
  const footprints: Feature<Polygon>[] = []
  function block(
    width: number,
    depth: number,
    east: number,
    north: number,
    height: number,
    base: number,
    color: string,
  ): Feature<Polygon> {
    const shape = rectangle(center, width, depth, bearing, east, north)
    shape.properties = { height, base, color }
    volumes.push(shape)
    return shape
  }
  block(184, 112, 0, 0, 0.8, 0, '#a3b9a9')
  for (const east of [-47, 47]) {
    const building = block(76, 88, east, 0, 24, 0.8, '#527568')
    footprints.push(building)
    block(72, 84, east, 0, 24.5, 24, '#b8c9bb')
    for (let row = 0; row < 4; row++) {
      block(48, 10, east - 5, -27 + row * 16, 25.2, 24.5, '#315d65')
    }
    for (let unit = 0; unit < 4; unit++)
      block(7, 9, east + 29, -25 + unit * 17, 27, 24.5, '#dde2d8')
  }
  const footprintCollection: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: footprints,
  }
  return {
    volumes: { type: 'FeatureCollection', features: volumes },
    footprints: footprintCollection,
    area: area(footprintCollection),
  }
}

export function insideBounds(
  footprints: FeatureCollection<Polygon>,
  bounds: Bounds,
): boolean {
  return footprints.features.every((f) =>
    f.geometry.coordinates.every((ring) =>
      ring.every(
        ([lng, lat]) =>
          lng !== undefined &&
          lat !== undefined &&
          lng >= bounds[0] &&
          lat >= bounds[1] &&
          lng <= bounds[2] &&
          lat <= bounds[3],
      ),
    ),
  )
}

export function intersectingFeatures(
  footprints: FeatureCollection<Polygon>,
  collection: FeatureCollection,
): number {
  const records = new Set<string>()
  collection.features.forEach((feature, index) => {
    if (
      footprints.features.some((footprint) =>
        booleanIntersects(footprint, feature),
      )
    ) {
      records.add(
        feature.id === undefined
          ? `index:${String(index)}`
          : `id:${String(feature.id)}`,
      )
    }
  })
  return records.size
}

export function boundary(bounds: Bounds): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[1]],
          [bounds[2], bounds[3]],
          [bounds[0], bounds[3]],
          [bounds[0], bounds[1]],
        ],
      ],
    },
  }
}
