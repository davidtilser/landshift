import {
  CustomHeightmapTerrainProvider,
  GeographicTilingScheme,
} from '@cesium/engine'
import { Math as CesiumMath } from '@cesium/core'
import { z } from 'zod'

const gridSchema = z
  .object({
    size: z.number().int().min(2),
    bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    heights: z.array(z.number()),
  })
  .refine(
    (grid) => grid.heights.length === grid.size * grid.size,
    'Incomplete elevation grid',
  )
export type ElevationGrid = z.infer<typeof gridSchema>

export async function loadElevationGrid(
  baseUrl: string,
): Promise<ElevationGrid> {
  const response = await fetch(`${baseUrl}cesium-heightmap.json`)
  if (!response.ok)
    throw new Error(
      'Local Cesium elevation is missing. Run npm run data:cesium, then reload.',
    )
  return gridSchema.parse(await response.json())
}

export function sampleElevation(
  grid: ElevationGrid,
  lng: number,
  lat: number,
): number {
  const [west, south, east, north] = grid.bounds
  if (lng < west || lng > east || lat < south || lat > north) return 0
  const x = ((lng - west) / (east - west)) * (grid.size - 1)
  const y = ((north - lat) / (north - south)) * (grid.size - 1)
  const x0 = Math.floor(x),
    y0 = Math.floor(y)
  const x1 = Math.min(grid.size - 1, x0 + 1),
    y1 = Math.min(grid.size - 1, y0 + 1)
  const a = grid.heights[y0 * grid.size + x0] ?? 0
  const b = grid.heights[y0 * grid.size + x1] ?? a
  const c = grid.heights[y1 * grid.size + x0] ?? a
  const d = grid.heights[y1 * grid.size + x1] ?? a
  return (
    a * (1 - (x - x0)) * (1 - (y - y0)) +
    b * (x - x0) * (1 - (y - y0)) +
    c * (1 - (x - x0)) * (y - y0) +
    d * (x - x0) * (y - y0)
  )
}

export function createLocalTerrain(
  grid: ElevationGrid,
): CustomHeightmapTerrainProvider {
  const tilingScheme = new GeographicTilingScheme()
  const width = 33
  return new CustomHeightmapTerrainProvider({
    width,
    height: width,
    tilingScheme,
    credit: 'Mapzen elevation · USGS and other source contributors',
    callback: (x, y, level) => {
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level)
      const buffer = new Float32Array(width * width)
      for (let row = 0; row < width; row++)
        for (let column = 0; column < width; column++) {
          const lng = CesiumMath.toDegrees(
            rectangle.west + (column / (width - 1)) * rectangle.width,
          )
          const lat = CesiumMath.toDegrees(
            rectangle.north - (row / (width - 1)) * rectangle.height,
          )
          buffer[row * width + column] = sampleElevation(grid, lng, lat)
        }
      return buffer
    },
  })
}
