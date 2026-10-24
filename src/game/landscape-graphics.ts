import {
  CallbackPositionProperty,
  CallbackProperty,
  ColorMaterialProperty,
  ShadowMode,
  LabelStyle,
} from '@cesium/engine'
import type { CustomDataSource } from '@cesium/engine'
import {
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  PolygonHierarchy,
} from '@cesium/core'
import type { PlanChoices, GameYear, Weather } from './consequences.ts'
import type { LngLat } from './geometry.ts'
import { rectangle } from './geometry.ts'

interface TreeShape {
  position: Cartesian3
  trunk: Cartesian3
}

/** Proposed planting and recovery; these shapes are not observed GIS records. */
export class LandscapeGraphics {
  private readonly source: CustomDataSource
  private readonly trees: TreeShape[] = []
  private readonly blooms: Cartesian3[] = []
  private bloomCount = 0
  private radii = new Cartesian3(1, 1, 1.5)
  private treeCount = 0
  private patch = new PolygonHierarchy([])
  private path = new PolygonHierarchy([])
  private patchHeight = 0
  private patchColor = Color.TRANSPARENT
  private showPatch = false
  private showPath = false
  private patchLabel = ''
  private patchPoint = Cartesian3.ZERO
  private pathPoint = Cartesian3.ZERO

  constructor(source: CustomDataSource) {
    this.source = source
    for (let index = 0; index < 60; index++) {
      const tree: TreeShape = {
        position: new Cartesian3(),
        trunk: new Cartesian3(),
      }
      this.trees.push(tree)
      source.entities.add({
        id: 'proposed-tree-' + String(index),
        show: true,
        position: new CallbackPositionProperty(() => tree.position, false),
        ellipsoid: {
          show: new CallbackProperty(() => index < this.treeCount, false),
          radii: new CallbackProperty(() => this.radii, false),
          material: Color.fromCssColorString(
            index % 3 === 0 ? '#a9bc69' : '#6d9c59',
          ),
          stackPartitions: 8,
          slicePartitions: 8,
          shadows: ShadowMode.ENABLED,
        },
      })
      source.entities.add({
        id: 'proposed-trunk-' + String(index),
        position: new CallbackPositionProperty(() => tree.trunk, false),
        cylinder: {
          show: new CallbackProperty(() => index < this.treeCount, false),
          length: 3,
          topRadius: 0.2,
          bottomRadius: 0.3,
          slices: 5,
          material: Color.fromCssColorString('#846b4a'),
        },
      })
    }
    for (let index = 0; index < 32; index++) {
      this.blooms.push(new Cartesian3())
      source.entities.add({
        id: 'proposed-bloom-' + String(index),
        position: new CallbackPositionProperty(() => this.blooms[index], false),
        ellipsoid: {
          show: new CallbackProperty(
            () => this.showPatch && index < this.bloomCount,
            false,
          ),
          radii: new Cartesian3(1.6, 1.6, 0.85),
          material: Color.fromCssColorString(
            index % 3 === 0
              ? '#f2d877'
              : index % 3 === 1
                ? '#eadcc6'
                : '#c49daf',
          ),
          stackPartitions: 5,
          slicePartitions: 6,
        },
      })
    }
    source.entities.add({
      id: 'proposed-restoration',
      polygon: {
        show: new CallbackProperty(() => this.showPatch, false),
        hierarchy: new CallbackProperty(() => this.patch, false),
        height: new CallbackProperty(() => this.patchHeight, false),
        material: new ColorMaterialProperty(
          new CallbackProperty(() => this.patchColor, false),
        ),
      },
    })
    source.entities.add({
      id: 'proposed-public-walk',
      polygon: {
        show: new CallbackProperty(() => this.showPath, false),
        hierarchy: new CallbackProperty(() => this.path, false),
        height: new CallbackProperty(() => this.patchHeight + 0.1, false),
        material: Color.fromCssColorString('#e0cf9f'),
      },
    })
    for (const kind of ['restoration', 'walk'])
      source.entities.add({
        id: 'proposed-label-' + kind,
        position: new CallbackPositionProperty(
          () => (kind === 'walk' ? this.pathPoint : this.patchPoint),
          false,
        ),
        label: {
          show: new CallbackProperty(
            () => (kind === 'walk' ? this.showPath : this.showPatch),
            false,
          ),
          text: new CallbackProperty(
            () => (kind === 'walk' ? 'Proposed public walk' : this.patchLabel),
            false,
          ),
          font: '11px sans-serif',
          style: LabelStyle.FILL_AND_OUTLINE,
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#214b39'),
          outlineWidth: 3,
          distanceDisplayCondition: new DistanceDisplayCondition(0, 2200),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
  }

  update(
    center: LngLat,
    bearing: number,
    ground: number,
    choices: PlanChoices,
    year: GameYear,
    weather: Weather,
  ): void {
    const growth = year === 0 ? 0.25 : year === 5 ? 0.6 : 1
    this.radii = new Cartesian3(5 * growth, 5 * growth, 6.8 * growth)
    this.treeCount =
      year === 0
        ? choices.trees
        : Math.round(choices.trees * (weather === 'drought' ? 0.82 : 0.9))
    const count = Math.max(1, choices.trees)
    this.trees.forEach((tree, index) => {
      const distance = (index / count) * (228 * 2 + 160 * 2)
      const east =
        distance < 228
          ? -114 + distance
          : distance < 388
            ? 114
            : distance < 616
              ? 114 - (distance - 388)
              : -114
      const north =
        distance < 228
          ? -80
          : distance < 388
            ? -80 + (distance - 228)
            : distance < 616
              ? 80
              : 80 - (distance - 616)
      const point = this.offset(center, bearing, east, north)
      tree.position = Cartesian3.fromDegrees(
        ...point,
        ground + 2.5 + 6.8 * growth,
      )
      tree.trunk = Cartesian3.fromDegrees(...point, ground + 1.5)
    })
    this.showPatch = choices.restoration !== 'none'
    this.bloomCount = year === 0 ? 8 : year === 5 ? 20 : 32
    this.blooms.forEach((_point, index) => {
      this.blooms[index] = Cartesian3.fromDegrees(
        ...this.offset(
          center,
          bearing,
          112 + (index % 4) * 9,
          -56 + Math.floor(index / 4) * 16,
        ),
        ground + 1.25,
      )
    })
    this.showPath = choices.access
    const recovery = year === 0 ? 0.3 : year === 5 ? 0.65 : 1
    this.patchColor = Color.fromCssColorString(
      choices.restoration === 'rain-garden' ? '#599e87' : '#9bb95e',
    ).withAlpha(0.45 + recovery * 0.45)
    this.patchHeight = ground + 0.5
    this.patch = this.polygon(center, bearing, 38, 140, 126)
    this.path = this.polygon(center, bearing, 7, 140, -128)
    this.patchPoint = Cartesian3.fromDegrees(
      ...this.offset(center, bearing, 135, 30),
      ground + 7,
    )
    this.pathPoint = Cartesian3.fromDegrees(
      ...this.offset(center, bearing, -135, 0),
      ground + 7,
    )
    this.patchLabel =
      choices.restoration === 'rain-garden'
        ? 'Proposed rain garden'
        : 'Proposed native meadow'
    this.source.show = Boolean(choices.trees || this.showPatch || this.showPath)
  }
  private offset(
    center: LngLat,
    bearing: number,
    east: number,
    north: number,
  ): LngLat {
    const radians = (bearing * Math.PI) / 180
    return [
      center[0] +
        (east * Math.cos(radians) + north * Math.sin(radians)) /
          (111320 * Math.cos((center[1] * Math.PI) / 180)),
      center[1] +
        (-east * Math.sin(radians) + north * Math.cos(radians)) / 111320,
    ]
  }
  private polygon(
    center: LngLat,
    bearing: number,
    width: number,
    depth: number,
    east: number,
  ): PolygonHierarchy {
    const ring =
      rectangle(center, width, depth, bearing, east).geometry.coordinates[0] ??
      []
    return new PolygonHierarchy(
      ring.flatMap(([lng, lat]) =>
        lng === undefined || lat === undefined
          ? []
          : [Cartesian3.fromDegrees(lng, lat)],
      ),
    )
  }
}
