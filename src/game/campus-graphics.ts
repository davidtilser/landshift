import {
  CallbackProperty,
  ImageMaterialProperty,
  ShadowMode,
} from '@cesium/engine'
import type { CustomDataSource } from '@cesium/engine'
import { Cartesian2, Cartesian3, Color, PolygonHierarchy } from '@cesium/core'
import type { FeatureCollection, Polygon } from 'geojson'

interface CampusShape {
  hierarchy: PolygonHierarchy
  positions: Cartesian3[]
  minimumHeights: number[]
  maximumHeights: number[]
  base: number
  top: number
}

/** Persistent entities with synchronous geometry updates during placement. */
export class CampusGraphics {
  private readonly shapes: CampusShape[] = []
  private readonly source: CustomDataSource
  private readonly facade: HTMLCanvasElement | string

  constructor(source: CustomDataSource, facade: HTMLCanvasElement | string) {
    this.source = source
    this.facade = facade
  }

  update(volumes: FeatureCollection<Polygon>, ground: number): void {
    volumes.features.forEach((feature, index) => {
      const ring = feature.geometry.coordinates[0]
      if (!ring) return
      const baseValue: unknown = feature.properties?.['base']
      const topValue: unknown = feature.properties?.['height']
      const base = ground + (typeof baseValue === 'number' ? baseValue : 0)
      const top = ground + (typeof topValue === 'number' ? topValue : 0)
      const points = ring.flatMap(([lng, lat]) =>
        lng === undefined || lat === undefined
          ? []
          : [Cartesian3.fromDegrees(lng, lat)],
      )
      const shape: CampusShape = {
        hierarchy: new PolygonHierarchy(points),
        positions: points,
        base,
        top,
        minimumHeights: points.map(() => base + 0.03),
        maximumHeights: points.map(() => top - 0.03),
      }
      const current = this.shapes[index]
      if (current) {
        Object.assign(current, shape)
        return
      }
      this.shapes[index] = shape
      const css: unknown = feature.properties?.['color']
      this.source.entities.add({
        id: `campus-${String(index)}`,
        polygon: {
          // Nonconstant geometry is rebuilt synchronously by Cesium. Replacing
          // static entities starts worker jobs and leaves the campus invisible
          // while the pointer keeps moving.
          hierarchy: new CallbackProperty(() => shape.hierarchy, false),
          height: new CallbackProperty(() => shape.base, false),
          extrudedHeight: new CallbackProperty(() => shape.top, false),
          material: Color.fromCssColorString(
            typeof css === 'string' ? css : '#aab9ad',
          ),
          shadows: ShadowMode.ENABLED,
          outline: false,
        },
      })
      if (top - base > 10)
        this.source.entities.add({
          id: `campus-wall-${String(index)}`,
          wall: {
            positions: new CallbackProperty(() => shape.positions, false),
            minimumHeights: new CallbackProperty(
              () => shape.minimumHeights,
              false,
            ),
            maximumHeights: new CallbackProperty(
              () => shape.maximumHeights,
              false,
            ),
            material: new ImageMaterialProperty({
              image: this.facade,
              repeat: new Cartesian2(10, 1),
              transparent: false,
            }),
            shadows: ShadowMode.ENABLED,
          },
        })
    })
  }
}
