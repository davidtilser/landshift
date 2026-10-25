import {
  CallbackPositionProperty,
  CallbackProperty,
  ColorMaterialProperty,
  LabelStyle,
} from '@cesium/engine'
import type { CustomDataSource } from '@cesium/engine'
import {
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
} from '@cesium/core'
import type { PlanChoices, SiteContext } from './consequences.ts'
import type { LngLat } from './geometry.ts'
import { rectangle } from './geometry.ts'

/** Symbolic game gauges, not physical tanks, emissions, or measured conditions. */
export class DecisionEffects {
  private waterLocation: LngLat = [0, 0]
  private powerLocation: LngLat = [0, 0]
  private ground = 0
  private waterFrom = 38
  private waterTarget = 38
  private powerFrom = 15
  private powerTarget = 15
  private changeAt = 0
  private readonly reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  private waterText = 'WATER ↑'
  private powerText = 'POWER ↓'
  private show = true
  private footprint: Cartesian3[] = []
  private footprintColor = Color.fromCssColorString('#9fc987')

  constructor(source: CustomDataSource) {
    source.entities.add({
      id: 'game-placement-edge',
      polyline: {
        positions: new CallbackProperty(() => this.footprint, false),
        width: 3,
        material: new ColorMaterialProperty(
          new CallbackProperty(() => this.footprintColor, false),
        ),
      },
    })
    source.entities.add({
      id: 'game-water-gauge',
      position: new CallbackPositionProperty(
        () => this.point(true, false),
        false,
      ),
      cylinder: {
        show: new CallbackProperty(() => this.show, false),
        length: new CallbackProperty(() => this.height(true), false),
        topRadius: 5,
        bottomRadius: 5,
        slices: 16,
        material: Color.fromCssColorString('#67cde1').withAlpha(0.85),
      },
    })
    source.entities.add({
      id: 'game-power-gauge',
      position: new CallbackPositionProperty(
        () => this.point(false, false),
        false,
      ),
      box: {
        show: new CallbackProperty(() => this.show, false),
        dimensions: new CallbackProperty(
          () => new Cartesian3(8, 8, this.height(false)),
          false,
        ),
        material: Color.fromCssColorString('#efd26b').withAlpha(0.9),
      },
    })
    for (const resource of ['water', 'power'])
      source.entities.add({
        id: 'game-gauge-label-' + resource,
        position: new CallbackPositionProperty(
          () => this.point(resource === 'water', true),
          false,
        ),
        label: {
          show: new CallbackProperty(() => this.show, false),
          text: new CallbackProperty(
            () => (resource === 'water' ? this.waterText : this.powerText),
            false,
          ),
          font: '700 12px sans-serif',
          style: LabelStyle.FILL_AND_OUTLINE,
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#2f554b'),
          outlineWidth: 2,
          showBackground: true,
          backgroundColor: Color.fromCssColorString(
            resource === 'water' ? '#3c879c' : '#a28a3e',
          ).withAlpha(0.94),
          backgroundPadding: new Cartesian2(8, 6),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 2600),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
  }
  setFocus(stage: string): void {
    this.show = stage === 'cooling' || stage === 'future'
  }
  update(
    center: LngLat,
    bearing: number,
    ground: number,
    choices: PlanChoices,
    site: SiteContext,
  ): void {
    const ring =
      rectangle(center, 184, 112, bearing).geometry.coordinates[0] ?? []
    this.footprint = ring.flatMap(([lng, lat]) =>
      lng === undefined || lat === undefined
        ? []
        : [Cartesian3.fromDegrees(lng, lat, ground + 1.1)],
    )
    this.footprintColor = Color.fromCssColorString(
      site.heritage || site.buildings || site.water || site.parks
        ? '#f18f6f'
        : site.flood
          ? '#ead08a'
          : '#9fc987',
    )
    const nextWater =
      choices.cooling === 'evaporative'
        ? 38
        : choices.cooling === 'hybrid'
          ? 18
          : 5
    const nextPower =
      choices.cooling === 'evaporative'
        ? 15
        : choices.cooling === 'hybrid'
          ? 26
          : 38
    if (nextWater !== this.waterTarget || nextPower !== this.powerTarget) {
      this.waterFrom = this.height(true)
      this.powerFrom = this.height(false)
      this.waterTarget = nextWater
      this.powerTarget = nextPower
      this.changeAt = performance.now()
    }
    this.waterText = choices.cooling === 'evaporative' ? 'WATER ↑' : 'WATER ↓'
    this.powerText = choices.cooling === 'evaporative' ? 'POWER ↓' : 'POWER ↑'
    this.waterLocation = this.offset(center, bearing, -180, -100)
    this.powerLocation = this.offset(center, bearing, -180, -165)
    this.ground = ground
  }
  private height(water: boolean): number {
    const t = this.reducedMotion.matches
      ? 1
      : Math.max(0, Math.min(1, (performance.now() - this.changeAt) / 450))
    const eased = 1 - Math.pow(1 - t, 3)
    return water
      ? this.waterFrom + (this.waterTarget - this.waterFrom) * eased
      : this.powerFrom + (this.powerTarget - this.powerFrom) * eased
  }
  private point(water: boolean, label: boolean): Cartesian3 {
    const height = this.height(water)
    return Cartesian3.fromDegrees(
      ...(water ? this.waterLocation : this.powerLocation),
      this.ground + (label ? height + 8 : height / 2),
    )
  }
  private offset(
    center: LngLat,
    bearing: number,
    east: number,
    north: number,
  ): LngLat {
    const angle = (bearing * Math.PI) / 180
    return [
      center[0] +
        (east * Math.cos(angle) + north * Math.sin(angle)) /
          (111320 * Math.cos((center[1] * Math.PI) / 180)),
      center[1] + (-east * Math.sin(angle) + north * Math.cos(angle)) / 111320,
    ]
  }
}
