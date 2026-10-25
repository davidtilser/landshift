import {
  ConstantPositionProperty,
  ConstantProperty,
  CustomDataSource,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
  ShadowMode,
} from '@cesium/engine'
import type { CesiumWidget, Entity } from '@cesium/engine'
import {
  ArcType,
  BoundingSphere,
  Cartesian3,
  Cartographic,
  Color,
  FixedFrameTransforms,
  HeadingPitchRoll,
} from '@cesium/core'
import type { LngLat } from '../geometry.ts'
import { sampleElevation } from '../terrain.ts'
import type { ElevationGrid } from '../terrain.ts'
import type { PoloSceneState } from './model.ts'
import {
  accessRoutePosition,
  accessVehicleJourney,
  accessVehicleKind,
  poloAccessConnector,
  POLO_ACCESS_ROAD,
  sampleAccessRoute,
} from './access.ts'
import type { AccessSample } from './access.ts'

interface Vehicle {
  entity: Entity
  position: ConstantPositionProperty
  orientation: ConstantProperty
  kind: ReturnType<typeof accessVehicleKind>
}

/** Geographic access stays separate from campus-local construction and its replay clock. */
export class PoloAccessScene {
  private readonly viewer: CesiumWidget
  private readonly grid: ElevationGrid
  private readonly excluded: () => Entity[]
  private readonly source = new CustomDataSource('polo-proposed-access')
  private readonly reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  private readonly road: Entity
  private readonly connector: Entity
  private readonly pulse: Entity
  private readonly vehicles: Vehicle[] = []
  private samples: AccessSample[] = []
  private positions: Cartesian3[] = []
  private heights: number[] = []
  private readonly meshHeights = new Map<string, number>()
  private readonly roadSamples = sampleAccessRoute(POLO_ACCESS_ROAD)
  private state: PoloSceneState | undefined
  private pose = ''
  private online = false
  private lastSurfaceAt = Number.NEGATIVE_INFINITY
  private frameAt = performance.now()
  private trafficSeconds = 0
  private destroyed = false

  constructor(
    viewer: CesiumWidget,
    grid: ElevationGrid,
    excluded: () => Entity[],
  ) {
    this.viewer = viewer
    this.grid = grid
    this.excluded = excluded
    this.source.show = false
    this.road = this.source.entities.add({
      id: 'polo-access-road',
      polyline: {
        positions: [],
        width: 7,
        arcType: ArcType.NONE,
        material: new PolylineGlowMaterialProperty({
          color: Color.fromCssColorString('#f6da8b').withAlpha(0.75),
          glowPower: 0.2,
        }),
        depthFailMaterial: Color.fromCssColorString('#f6da8b').withAlpha(0.28),
      },
    })
    this.connector = this.source.entities.add({
      id: 'polo-access-connector',
      polyline: {
        positions: [],
        width: 4,
        arcType: ArcType.NONE,
        material: new PolylineDashMaterialProperty({
          color: Color.fromCssColorString('#f6da8b').withAlpha(0.8),
          dashLength: 14,
        }),
        depthFailMaterial: Color.fromCssColorString('#f6da8b').withAlpha(0.25),
      },
    })
    this.pulse = this.source.entities.add({
      id: 'polo-access-pulse',
      show: false,
      point: {
        pixelSize: 12,
        color: Color.fromCssColorString('#fff7cb'),
        outlineColor: Color.fromCssColorString('#ecbd50').withAlpha(0.5),
        outlineWidth: 7,
        disableDepthTestDistance: Infinity,
      },
    })
    void viewer.dataSources.add(this.source)
    this.reducedMotion.addEventListener('change', this.motionChanged)
  }

  setState(state: PoloSceneState): void {
    if (this.destroyed) return
    if (state.confirmed && !this.state?.confirmed) {
      this.trafficSeconds = 0
      this.frameAt = performance.now()
    }
    this.state = state
    this.source.show = state.confirmed
    const pose = [...state.center, state.bearing, state.areaHa].join('|')
    if (pose !== this.pose) {
      this.pose = pose
      this.samples = sampleAccessRoute([
        ...POLO_ACCESS_ROAD.slice(0, -1),
        ...poloAccessConnector(state),
      ])
      this.refreshSurface(true)
    }
    for (let index = 0; index < 4; index++) {
      const kind = accessVehicleKind(state.phase, index)
      const previous = this.vehicles[index]
      if (previous?.kind === kind) continue
      if (previous) this.source.entities.remove(previous.entity)
      this.vehicles[index] = this.createVehicle(index, kind)
    }
    this.update(performance.now())
    this.viewer.scene.requestRender()
  }

  setOnline(online: boolean): void {
    this.online = online
    this.meshHeights.clear()
    this.refreshSurface(true)
  }

  /** Resample loaded mesh surfaces, excluding every illustrative scene entity. */
  refreshSurface(force = false): void {
    if (this.destroyed || this.samples.length < 2) return
    const now = performance.now()
    if (!force && now - this.lastSurfaceAt < 1500) return
    this.lastSurfaceAt = now
    const excluded = [...this.excluded(), ...this.source.entities.values]
    const height = (coordinate: LngLat): number => {
      const local = sampleElevation(this.grid, ...coordinate)
      const key = coordinate.join('|')
      const cached = this.meshHeights.get(key)
      if (this.online && cached !== undefined) return cached
      const mesh =
        this.online && this.viewer.scene.sampleHeightSupported
          ? this.viewer.scene.sampleHeight(
              Cartographic.fromDegrees(...coordinate),
              excluded,
            )
          : undefined
      if (
        mesh !== undefined &&
        Number.isFinite(mesh) &&
        Math.abs(mesh - local) < 100
      ) {
        this.meshHeights.set(key, mesh)
        return mesh
      }
      return local
    }
    this.heights = this.samples.map((sample) => height(sample.coordinate))
    this.positions = this.samples.map((sample, index) =>
      Cartesian3.fromDegrees(
        ...sample.coordinate,
        (this.heights[index] ?? 0) + 0.65,
      ),
    )
    if (this.road.polyline)
      this.road.polyline.positions = new ConstantProperty(
        this.roadSamples.map((sample) =>
          Cartesian3.fromDegrees(
            ...sample.coordinate,
            height(sample.coordinate) + 0.65,
          ),
        ),
      )
    const roadEnd = this.roadSamples.at(-1)?.distance ?? 0
    if (this.connector.polyline)
      this.connector.polyline.positions = new ConstantProperty(
        this.positions.filter(
          (_, index) => (this.samples[index]?.distance ?? 0) >= roadEnd - 0.01,
        ),
      )
  }

  bounds(): BoundingSphere {
    return BoundingSphere.fromPoints(this.positions)
  }

  private createVehicle(index: number, kind: Vehicle['kind']): Vehicle {
    const initial =
      this.positions[0] ??
      Cartesian3.fromDegrees(-122.500857016, 37.764845907, 50)
    const position = new ConstantPositionProperty(initial)
    const orientation = new ConstantProperty(
      FixedFrameTransforms.headingPitchRollQuaternion(
        initial,
        new HeadingPitchRoll(),
      ),
    )
    const entity = this.source.entities.add({
      id: `polo-access-vehicle-${String(index)}`,
      show: false,
      position,
      orientation,
      model: {
        uri: `${import.meta.env.BASE_URL}models/polo/${kind}.gltf`,
        scale: kind === 'truck' ? 1.5 : 1,
        minimumPixelSize: kind === 'truck' ? 27 : 18,
        maximumScale: kind === 'truck' ? 4.5 : 3,
        shadows: ShadowMode.ENABLED,
      },
    })
    return { entity, position, orientation, kind }
  }

  update(now: number): void {
    if (this.destroyed || !this.state) return
    const elapsed = Math.min(0.2, Math.max(0, (now - this.frameAt) / 1000))
    this.frameAt = now
    if (this.state.confirmed && !this.reducedMotion.matches)
      this.trafficSeconds += elapsed
    const last = this.samples.at(-1)
    if (!last) return
    for (const [index, vehicle] of this.vehicles.entries()) {
      const journey = accessVehicleJourney(
        this.trafficSeconds,
        index,
        last.distance,
      )
      const parked = this.reducedMotion.matches
      const visible =
        this.state.confirmed && (parked ? index === 0 : journey.visible)
      vehicle.entity.show = visible
      if (!visible) continue
      const pose = accessRoutePosition(
        this.samples,
        parked ? last.distance * 0.45 : journey.distance,
        journey.reverse,
      )
      const a = this.heights[pose.index] ?? 0,
        b = this.heights[pose.index + 1] ?? a
      const origin = Cartesian3.fromDegrees(
        ...pose.coordinate,
        a + (b - a) * pose.fraction + 0.25,
      )
      const orientation = FixedFrameTransforms.headingPitchRollQuaternion(
        origin,
        new HeadingPitchRoll(pose.heading, 0, 0),
      )
      vehicle.position.setValue(origin)
      vehicle.orientation.setValue(orientation)
    }
    this.pulse.show =
      this.state.confirmed &&
      !this.reducedMotion.matches &&
      this.trafficSeconds < 2.8
    if (this.pulse.show) {
      const pose = accessRoutePosition(
        this.samples,
        (this.trafficSeconds / 2.8) * last.distance,
        false,
        0,
      )
      const a = this.heights[pose.index] ?? 0,
        b = this.heights[pose.index + 1] ?? a
      this.pulse.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(
          ...pose.coordinate,
          a + (b - a) * pose.fraction + 2,
        ),
      )
    }
  }

  private readonly motionChanged = (): void => {
    this.update(performance.now())
    this.viewer.scene.requestRender()
  }

  destroy(): void {
    this.destroyed = true
    this.reducedMotion.removeEventListener('change', this.motionChanged)
    this.viewer.dataSources.remove(this.source, true)
  }
}
