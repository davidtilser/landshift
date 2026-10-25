import {
  CallbackPositionProperty,
  CallbackProperty,
  CustomDataSource,
  ColorMaterialProperty,
} from '@cesium/engine'
import { Cartesian3, Color } from '@cesium/core'
import type { Quaternion } from '@cesium/core'
import type { CesiumWidget } from '@cesium/engine'
import type { PoloSceneState } from './model.ts'
import { activePoloImprovements, POLO_INTERVENTIONS } from './interventions.ts'
import type { InterventionPreview } from './interventions.ts'

/** A separate source keeps painting from rebuilding or restarting construction. */
export class PoloInterventionScene {
  private readonly source = new CustomDataSource(
    'polo-interactive-improvements',
  )
  private preview: InterventionPreview | null = null
  private readonly viewer: CesiumWidget
  private readonly point: (x: number, y: number, z: number) => Cartesian3
  private readonly orientation: () => Quaternion
  private readonly scale: () => number
  private readonly state: () => PoloSceneState
  constructor(
    viewer: CesiumWidget,
    point: (x: number, y: number, z: number) => Cartesian3,
    orientation: () => Quaternion,
    scale: () => number,
    state: () => PoloSceneState,
  ) {
    this.viewer = viewer
    this.point = point
    this.orientation = orientation
    this.scale = scale
    this.state = state
    void viewer.dataSources.add(this.source)
  }
  paint(preview: InterventionPreview | null): void {
    this.preview = preview
    this.render()
  }
  render(): void {
    this.source.entities.removeAll()
    const applied = new Set(
      activePoloImprovements(this.state()).map((item) => item.id),
    )
    for (const item of POLO_INTERVENTIONS) {
      const cells = applied.has(item.id)
        ? item.cells.map((_, i) => i)
        : this.preview?.id === item.id
          ? this.preview.cells
          : []
      for (const index of cells) {
        const cell = item.cells[index]
        if (!cell) continue
        const [x, y] = cell
        const box = (
          px: number,
          py: number,
          z: number,
          w: number,
          d: number,
          h: number,
          css: string,
        ): void => {
          this.source.entities.add({
            position: new CallbackPositionProperty(
              () => this.point(px, py, z + h / 2),
              false,
            ),
            orientation: new CallbackProperty(() => this.orientation(), false),
            box: {
              dimensions: new CallbackProperty(
                () => new Cartesian3(w * this.scale(), d * this.scale(), h),
                false,
              ),
              material: new ColorMaterialProperty(
                Color.fromCssColorString(css),
              ),
            },
          })
        }
        if (item.id === 'soil') {
          box(x, y, 1.7, 49, 12, 0.5, '#6b9952')
          for (const dx of [-23, 23])
            box(x + dx, y - 6, 2, 0.8, 0.8, 4, '#f5d87a')
        } else if (item.id === 'foundation') {
          box(x, y, 1.05, 24, 36, 3.55, '#dce4e6')
          for (const dy of [-12, 0, 12])
            box(x, y + dy, 4.62, 20, 0.5, 0.12, '#76949f')
        } else {
          box(x, y, 1.7, 49, 10, 0.5, '#6f9955')
          box(x, y + 10, 2, 50, 5, 0.35, '#e3d2a1')
          if (index === 0 || index === item.cells.length - 1)
            box(index === 0 ? -150 : 150, -65, 2, 5, 38, 0.35, '#e3d2a1')
          for (const dx of [-14, 12]) {
            box(x + dx, y - 1, 2, 1, 1, 5, '#8a6e50')
            this.source.entities.add({
              position: new CallbackPositionProperty(
                () => this.point(x + dx, y - 1, 8),
                false,
              ),
              ellipsoid: {
                radii: new Cartesian3(3.6, 3.6, 4.3),
                material: Color.fromCssColorString('#70a34d'),
                stackPartitions: 8,
                slicePartitions: 8,
              },
            })
          }
          box(x, y + 14, 2.2, 9, 2, 1.2, '#a78458')
        }
      }
    }
    this.viewer.scene.requestRender()
  }
  destroy(): void {
    this.viewer.dataSources.remove(this.source, true)
  }
}
