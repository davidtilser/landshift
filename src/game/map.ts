import {
  CesiumWidget,
  CustomDataSource,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SceneTransforms,
  CameraEventType,
  KeyboardEventModifier,
  ShadowMode,
  IonResource,
  Cesium3DTileset,
  LabelStyle,
  HeightReference,
  VerticalOrigin,
  HorizontalOrigin,
} from '@cesium/engine'
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  Color,
  PolygonHierarchy,
  Matrix4,
  Rectangle,
  HeadingPitchRange,
  BoundingSphere,
  JulianDate,
  ArcType,
  DistanceDisplayCondition,
  NearFarScalar,
  Cartesian2 as ScreenPosition,
} from '@cesium/core'
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson'
import type {
  Cartesian3 as Cartesian3Value,
  Cartesian2 as Cartesian2Value,
  Color as CesiumColor,
} from '@cesium/core'
import type { DataPack } from './data.ts'
import type { LngLat } from './geometry.ts'
import { boundary, campus } from './geometry.ts'
import { createLocalTerrain, sampleElevation } from './terrain.ts'
import { CampusGraphics } from './campus-graphics.ts'
import { LandscapeGraphics } from './landscape-graphics.ts'
import { DecisionEffects } from './decision-effects.ts'
import { AmbientLife } from './ambient-life.ts'
import { DEFAULT_CHOICES, assessSite } from './consequences.ts'
import type {
  PlanChoices,
  GameYear,
  Weather,
  SiteContext,
} from './consequences.ts'
import {
  beginCampusDrag,
  dragCampus,
  placementPlane,
  positionOnPlane,
} from './placement.ts'
import type { CampusDrag } from './placement.ts'
import type { Plane } from '@cesium/core'
import type { ElevationGrid } from './terrain.ts'
import type { ImageryLayer } from '@cesium/engine'

export type SceneStyle = 'aerial' | 'landscape' | 'reality'
export type OnlineState = 'local' | 'connecting' | 'online' | 'error'
export type CameraPreset = 'neighborhood' | 'site' | 'street'
export interface CameraState {
  lng: number
  lat: number
  height: number
  heading: number
  is3D: boolean
}
export interface SceneCallbacks {
  cameraChanged: (state: CameraState) => void
  positionRequested: (position: LngLat) => void
  positionPreviewed: (position: LngLat) => void
  dragged: (position: LngLat, finished: boolean) => void
  onlineChanged: (state: OnlineState) => void
  mapError: (message: string) => void
}

function numberProperty(
  feature: Feature,
  name: string,
  fallback: number,
): number {
  const value: unknown = feature.properties?.[name]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
function textProperty(feature: Feature, name: string): string {
  const value: unknown = feature.properties?.[name]
  return typeof value === 'string' ? value : ''
}
function positions(ring: Position[], height: number): Cartesian3Value[] {
  return ring.flatMap(([lng, lat]) =>
    lng === undefined || lat === undefined
      ? []
      : [Cartesian3.fromDegrees(lng, lat, height)],
  )
}
function polygonParts(feature: Feature): Position[][][] {
  if (feature.geometry.type === 'Polygon') return [feature.geometry.coordinates]
  if (feature.geometry.type === 'MultiPolygon')
    return feature.geometry.coordinates
  return []
}
function facadeTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.fillStyle = '#c7c9bd'
  context.fillRect(0, 0, 256, 256)
  for (let floor = 0; floor < 4; floor++) {
    const y = floor * 64
    context.fillStyle = '#929d95'
    context.fillRect(0, y + 58, 256, 6)
    for (let panel = 0; panel < 8; panel++) {
      context.fillStyle = panel % 3 === 0 ? '#809c9f' : '#394f56'
      context.fillRect(panel * 32 + 5, y + 12, 23, 34)
      context.fillStyle = '#a3b5b2'
      context.fillRect(panel * 32 + 5, y + 12, 23, 3)
      context.fillStyle = '#b7bdb1'
      context.fillRect(panel * 32, y, 2, 64)
    }
  }
  return canvas
}

export class GameScene {
  readonly viewer: CesiumWidget
  private readonly pack: DataPack
  private readonly grid: ElevationGrid
  private readonly callbacks: SceneCallbacks
  private readonly groups = new Map<string, CustomDataSource>()
  private readonly localAerial: ImageryLayer
  private readonly handler: ScreenSpaceEventHandler
  private readonly handle: HTMLButtonElement
  private readonly facade = facadeTexture()
  private readonly campusGraphics: CampusGraphics
  private readonly landscapeGraphics: LandscapeGraphics
  private readonly decisionEffects: DecisionEffects
  private readonly ambientLife: AmbientLife
  private landscapeChoices: PlanChoices = { ...DEFAULT_CHOICES }
  private landscapeYear: GameYear = 0
  private landscapeWeather: Weather = 'drought'
  private placementSite: SiteContext = {
    buildings: 0,
    trees: 0,
    water: 0,
    parks: 0,
    flood: 0,
  }
  private tileset: Cesium3DTileset | undefined
  private activeToken = ''
  private campusCenter: LngLat
  private campusBearing = 28
  private campusHeight = 0
  private style: SceneStyle = 'aerial'
  private placing = false
  private dragging = false
  private drag:
    | {
        projection: CampusDrag
        pointerId: number
        start: Cartesian2Value
        original: LngLat
        last: LngLat
        moved: boolean
        cameraInputs: boolean
      }
    | undefined
  private placementSurface: Plane | undefined
  private placementControls: { rotate: boolean; translate: boolean } | undefined
  private connectionRevision = 0
  private readonly layerVisibility: Record<string, boolean> = {
    buildings: true,
    trees: true,
    parcels: false,
    zoning: false,
    flood: false,
  }
  private readonly removeCameraListener: () => void
  private readonly removeRenderListener: () => void

  constructor(
    pack: DataPack,
    grid: ElevationGrid,
    handle: HTMLButtonElement,
    callbacks: SceneCallbacks,
  ) {
    this.pack = pack
    this.grid = grid
    this.handle = handle
    this.callbacks = callbacks
    this.campusCenter = [...pack.manifest.center]
    this.viewer = new CesiumWidget('map', {
      baseLayer: false,
      terrainProvider: createLocalTerrain(grid),
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      shadows: true,
      shouldAnimate: false,
      creditContainer: 'cesium-credits',
      contextOptions: {
        webgl: { antialias: true, preserveDrawingBuffer: true },
      },
    })
    const viewer = this.viewer
    viewer.clock.currentTime = JulianDate.fromIso8601('2026-10-24T21:30:00Z')
    viewer.scene.globe.baseColor = Color.fromCssColorString('#25372f')
    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.globe.maximumScreenSpaceError = 2
    viewer.scene.backgroundColor = Color.fromCssColorString('#d9e2e5')
    viewer.scene.highDynamicRange = true
    viewer.scene.postProcessStages.fxaa.enabled = true
    viewer.scene.shadowMap.softShadows = true
    viewer.scene.shadowMap.size = 2048
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.5)
    const controls = viewer.scene.screenSpaceCameraController
    controls.minimumZoomDistance = 35
    controls.maximumZoomDistance = 6500
    controls.tiltEventTypes = [
      CameraEventType.RIGHT_DRAG,
      {
        eventType: CameraEventType.LEFT_DRAG,
        modifier: KeyboardEventModifier.CTRL,
      },
    ]
    controls.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH]
    controls.enableCollisionDetection = true
    const rectangle = Rectangle.fromDegrees(...pack.manifest.bounds)
    this.localAerial = viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: `${pack.baseUrl}aerial/{z}/{x}/{y}.jpg`,
        tilingScheme: new WebMercatorTilingScheme(),
        minimumLevel: 14,
        maximumLevel: 18,
        rectangle,
        credit: 'USDA NAIP · May 19, 2022 · Microsoft Planetary Computer',
      }),
    )
    this.localAerial.brightness = 1.06
    this.localAerial.saturation = 0.95
    this.localAerial.imageryProvider.errorEvent.addEventListener(() => {
      callbacks.mapError(
        'A local imagery tile could not load. The local data pack may be incomplete.',
      )
    })
    this.buildLocalScene()
    this.campusGraphics = new CampusGraphics(this.group('campus'), this.facade)
    this.landscapeGraphics = new LandscapeGraphics(
      this.group('proposed-landscape'),
    )
    this.decisionEffects = new DecisionEffects(this.group('game-gauges'))
    this.ambientLife = new AmbientLife(viewer, pack, (lng, lat) =>
      this.heightAt(lng, lat),
    )
    this.updateCampus(
      campus(this.campusCenter, 28).volumes,
      this.campusCenter,
      28,
    )
    viewer.container.append(handle)
    handle.style.position = 'absolute'
    handle.style.zIndex = '1'
    this.handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    this.handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        if (!this.placing) return
        const position = this.pickPlacement(event.position)
        if (position) callbacks.positionRequested(position)
      },
      ScreenSpaceEventType.LEFT_CLICK,
    )
    this.handler.setInputAction(
      (event: ScreenSpaceEventHandler.MotionEvent) => {
        if (!this.placing || this.dragging) return
        const position = this.pickPlacement(event.endPosition)
        if (position) callbacks.positionPreviewed(position)
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    )
    handle.addEventListener('pointerdown', this.onPointerDown)
    handle.addEventListener('pointermove', this.onPointerMove)
    handle.addEventListener('pointerup', this.onPointerUp)
    handle.addEventListener('pointercancel', this.onPointerCancel)
    handle.addEventListener('lostpointercapture', this.onPointerCancel)
    window.addEventListener('blur', this.onPointerCancel)
    this.removeCameraListener = viewer.camera.changed.addEventListener(() => {
      this.reportCamera()
    })
    viewer.camera.percentageChanged = 0.01
    this.removeRenderListener = viewer.scene.postRender.addEventListener(() => {
      this.positionHandle()
    })
    this.setCamera('site', 0)
    this.reportCamera()
  }

  private group(name: string): CustomDataSource {
    const existing = this.groups.get(name)
    if (existing) return existing
    const group = new CustomDataSource(name)
    this.groups.set(name, group)
    void this.viewer.dataSources.add(group)
    return group
  }
  private heightAt(lng: number, lat: number): number {
    return sampleElevation(this.grid, lng, lat)
  }
  private addPolygons(
    name: string,
    data: FeatureCollection,
    color: CesiumColor,
    outlines = false,
  ): void {
    const group = this.group(name)
    for (const feature of data.features)
      for (const rings of polygonParts(feature)) {
        const ring = rings[0]
        if (!ring) continue
        const holes = rings
          .slice(1)
          .map((hole) => new PolygonHierarchy(positions(hole, 0)))
        if (outlines) {
          group.entities.add({
            polyline: {
              positions: positions(ring, 0),
              clampToGround: true,
              width: 1.5,
              material: color,
              arcType: ArcType.GEODESIC,
            },
          })
        } else {
          group.entities.add({
            polygon: {
              hierarchy: new PolygonHierarchy(positions(ring, 0), holes),
              material: color,
              height: 0,
              heightReference: HeightReference.CLAMP_TO_GROUND,
              shadows: ShadowMode.RECEIVE_ONLY,
            },
          })
        }
      }
  }
  private buildLocalScene(): void {
    this.addPolygons(
      'parcels',
      this.pack.layers.parcels,
      Color.fromCssColorString('#d8dcc5').withAlpha(0.6),
      true,
    )
    this.addPolygons(
      'flood',
      {
        type: 'FeatureCollection',
        features: this.pack.layers.flood.features.filter(
          (f) => textProperty(f, 'SFHATF') === 'T',
        ),
      },
      Color.fromCssColorString('#4facc9').withAlpha(0.3),
    )
    this.addPolygons(
      'zoning',
      this.pack.layers.zoning,
      Color.fromCssColorString('#bda2dc').withAlpha(0.25),
    )
    this.addPolygons(
      'reference-site',
      this.pack.layers.project,
      Color.fromCssColorString('#f0c47b').withAlpha(0.9),
      true,
    )
    this.addPolygons(
      'study-boundary',
      {
        type: 'FeatureCollection',
        features: [boundary(this.pack.manifest.playableBounds)],
      },
      Color.fromCssColorString('#dce4cd').withAlpha(0.5),
      true,
    )
    const local = this.group('buildings')
    for (const feature of this.pack.layers.buildings.features)
      for (const rings of polygonParts(feature)) {
        const ring = rings[0],
          point = ring?.[0]
        const lng = point?.[0],
          lat = point?.[1]
        if (!ring || lng === undefined || lat === undefined) continue
        const ground = this.heightAt(lng, lat)
        local.entities.add({
          polygon: {
            hierarchy: new PolygonHierarchy(
              positions(ring, 0),
              rings
                .slice(1)
                .map((hole) => new PolygonHierarchy(positions(hole, 0))),
            ),
            height: ground + numberProperty(feature, 'base', 0),
            extrudedHeight: ground + numberProperty(feature, 'height', 8),
            material: Color.fromCssColorString('#c6c9bf'),
            shadows: ShadowMode.ENABLED,
            outline: false,
          },
        })
      }
    const trees = this.group('trees')
    const treeModels = this.group('tree-models')
    let modeledTrees = 0
    for (const feature of this.pack.layers.trees.features) {
      if (feature.geometry.type !== 'Point') continue
      const [lng, lat] = feature.geometry.coordinates
      if (lng === undefined || lat === undefined) continue
      const ground = this.heightAt(lng, lat)
      const nearby =
        Math.abs(lng - this.campusCenter[0]) < 0.007 &&
        Math.abs(lat - this.campusCenter[1]) < 0.006
      if (nearby && modeledTrees < 280) {
        modeledTrees++
        treeModels.entities.add({
          position: Cartesian3.fromDegrees(lng, lat, ground + 5),
          ellipsoid: {
            radii: new Cartesian3(2.7, 2.7, 3.5),
            material: Color.fromCssColorString(
              modeledTrees % 3 === 0 ? '#657d47' : '#496c42',
            ),
            stackPartitions: 8,
            slicePartitions: 8,
            shadows: ShadowMode.ENABLED,
          },
        })
        treeModels.entities.add({
          position: Cartesian3.fromDegrees(lng, lat, ground + 1.7),
          cylinder: {
            length: 3.4,
            topRadius: 0.18,
            bottomRadius: 0.28,
            material: Color.fromCssColorString('#80745b'),
            numberOfVerticalLines: 0,
            slices: 6,
          },
        })
      }
      trees.entities.add({
        position: Cartesian3.fromDegrees(lng, lat, ground + 1),
        point: {
          pixelSize: 3,
          color: Color.fromCssColorString('#71925e'),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 5000),
        },
      })
    }
    const labels = this.group('labels')
    const used = new Set<string>()
    for (const feature of this.pack.layers.roads.features) {
      const name = textProperty(feature, 'FULLNAME')
      if (!name || used.has(name) || feature.geometry.type !== 'LineString')
        continue
      const midpoint =
        feature.geometry.coordinates[
          Math.floor(feature.geometry.coordinates.length / 2)
        ]
      const lng = midpoint?.[0],
        lat = midpoint?.[1]
      if (lng === undefined || lat === undefined) continue
      used.add(name)
      labels.entities.add({
        position: Cartesian3.fromDegrees(lng, lat, this.heightAt(lng, lat) + 2),
        label: {
          text: name,
          font: '11px sans-serif',
          style: LabelStyle.FILL_AND_OUTLINE,
          fillColor: Color.WHITE.withAlpha(0.9),
          outlineColor: Color.BLACK.withAlpha(0.6),
          outlineWidth: 2,
          verticalOrigin: VerticalOrigin.CENTER,
          horizontalOrigin: HorizontalOrigin.CENTER,
          scaleByDistance: new NearFarScalar(200, 1, 3000, 0.6),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 3000),
        },
      })
    }
    for (const [name, visible] of Object.entries(this.layerVisibility))
      this.group(name).show = visible
  }

  updateCampus(
    volumes: FeatureCollection<Polygon>,
    center: LngLat,
    bearing: number,
  ): void {
    this.campusCenter = center
    this.campusBearing = bearing
    let ground = this.dragging ? this.campusHeight : this.heightAt(...center)
    if (
      !this.dragging &&
      this.style === 'reality' &&
      this.viewer.scene.sampleHeightSupported
    ) {
      const measured = this.sampleSceneGround(center)
      if (measured !== undefined && Number.isFinite(measured)) ground = measured
    }
    this.campusHeight = ground
    this.campusGraphics.update(volumes, ground)
    if (!this.dragging)
      this.placementSite = assessSite(this.pack, center, bearing)
    this.decisionEffects.update(
      center,
      bearing,
      ground,
      this.landscapeChoices,
      this.placementSite,
    )
    if (!this.dragging)
      this.ambientLife.update(
        center,
        bearing,
        ground,
        this.landscapeChoices,
        this.placementSite,
      )
    this.landscapeGraphics.update(
      center,
      bearing,
      ground,
      this.landscapeChoices,
      this.landscapeYear,
      this.landscapeWeather,
    )
    this.viewer.scene.requestRender()
  }

  setLandscape(choices: PlanChoices, year: GameYear, weather: Weather): void {
    this.landscapeChoices = { ...choices }
    this.landscapeYear = year
    this.landscapeWeather = weather
    this.decisionEffects.update(
      this.campusCenter,
      this.campusBearing,
      this.campusHeight,
      choices,
      this.placementSite,
    )
    this.ambientLife.update(
      this.campusCenter,
      this.campusBearing,
      this.campusHeight,
      choices,
      this.placementSite,
    )
    this.landscapeGraphics.update(
      this.campusCenter,
      this.campusBearing,
      this.campusHeight,
      choices,
      year,
      weather,
    )
    this.viewer.scene.requestRender()
  }

  setFocus(stage: string): void {
    this.decisionEffects.setFocus(stage)
    this.viewer.scene.requestRender()
  }

  private sampleSceneGround(center: LngLat): number | undefined {
    const excluded: object[] = []
    for (let index = 0; index < this.viewer.dataSources.length; index++)
      excluded.push(...this.viewer.dataSources.get(index).entities.values)
    // Ignore every authored game piece, including passing cars and people.
    const height = this.viewer.scene.sampleHeight(
      Cartographic.fromDegrees(...center),
      excluded,
    )
    // Coarse globe tiles can report deep false hits before the city loads.
    return height !== undefined &&
      Number.isFinite(height) &&
      Math.abs(height - this.heightAt(...center)) < 120
      ? height
      : undefined
  }

  private pickPlacement(position: Cartesian2Value): LngLat | undefined {
    const ray = this.viewer.camera.getPickRay(position)
    if (!ray) return undefined
    // Placement uses a stable ground plane, never the campus or a building roof.
    // The separate depth pick remains useful for navigating the real 3D scene.
    const plane =
      this.placementSurface ??
      placementPlane(this.campusCenter, this.campusHeight)
    return positionOnPlane(ray, plane)
  }

  private pickGround(position: Cartesian2Value): LngLat | undefined {
    const scene = this.viewer.scene
    let point: Cartesian3Value | undefined
    if (this.style === 'reality' && scene.pickPositionSupported)
      point = scene.pickPosition(position)
    if (!point) {
      const ray = this.viewer.camera.getPickRay(position)
      if (ray) point = scene.globe.pick(ray, scene)
    }
    if (!point) point = this.viewer.camera.pickEllipsoid(position)
    if (!point) return undefined
    const cartographic = Cartographic.fromCartesian(point)
    return [
      CesiumMath.toDegrees(cartographic.longitude),
      CesiumMath.toDegrees(cartographic.latitude),
    ]
  }
  private pointerPosition(event: PointerEvent): Cartesian2Value {
    const rectangle = this.viewer.scene.canvas.getBoundingClientRect()
    return new Cartesian2(
      event.clientX - rectangle.left,
      event.clientY - rectangle.top,
    )
  }
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (
      this.handle.hidden ||
      event.button !== 0 ||
      !event.isPrimary ||
      this.drag
    )
      return
    if (this.placing) {
      event.preventDefault()
      event.stopPropagation()
      this.callbacks.positionRequested(this.campusCenter)
      return
    }
    const start = this.pointerPosition(event)
    const ray = this.viewer.camera.getPickRay(start)
    const projection =
      ray && beginCampusDrag(this.campusCenter, this.campusHeight + 34, ray)
    if (!projection) return
    event.preventDefault()
    event.stopPropagation()
    this.viewer.camera.cancelFlight()
    this.drag = {
      projection,
      pointerId: event.pointerId,
      start,
      original: [...this.campusCenter],
      last: [...this.campusCenter],
      moved: false,
      cameraInputs: this.viewer.scene.screenSpaceCameraController.enableInputs,
    }
    this.dragging = true
    this.handle.classList.add('dragging')
    this.handle.setPointerCapture(event.pointerId)
    this.viewer.scene.screenSpaceCameraController.enableInputs = false
  }
  private readonly onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || event.pointerId !== drag.pointerId) return
    const pointer = this.pointerPosition(event)
    if (!drag.moved && Cartesian2.distance(drag.start, pointer) < 3) return
    const ray = this.viewer.camera.getPickRay(pointer)
    const position = ray && dragCampus(drag.projection, ray)
    if (!position) return
    drag.moved = true
    drag.last = position
    this.callbacks.dragged(position, false)
  }
  private finishDrag(cancelled: boolean): void {
    const drag = this.drag
    if (!drag) return
    this.drag = undefined
    this.dragging = false
    this.handle.classList.remove('dragging')
    if (this.handle.hasPointerCapture(drag.pointerId))
      this.handle.releasePointerCapture(drag.pointerId)
    this.viewer.scene.screenSpaceCameraController.enableInputs =
      drag.cameraInputs
    // Do not depth-pick again on release: the just-moved building occupies that pixel.
    if (drag.moved)
      this.callbacks.dragged(cancelled ? drag.original : drag.last, true)
  }
  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag?.pointerId !== event.pointerId) return
    this.onPointerMove(event)
    this.finishDrag(false)
  }
  private readonly onPointerCancel = (): void => {
    this.finishDrag(true)
  }
  private positionHandle(): void {
    if (this.viewer.isDestroyed()) return
    const point = SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      Cartesian3.fromDegrees(...this.campusCenter, this.campusHeight + 34),
    )
    if (!point) {
      this.handle.style.visibility = 'hidden'
      return
    }
    this.handle.style.visibility = 'visible'
    this.handle.style.left = `${point.x.toFixed(1)}px`
    this.handle.style.top = `${point.y.toFixed(1)}px`
    this.handle.style.transform = 'translate(-50%, -100%)'
  }
  private reportCamera(): void {
    const c = this.viewer.camera.positionCartographic
    const canvas = this.viewer.canvas
    const focus = this.pickGround(
      new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
    )
    this.callbacks.cameraChanged({
      lng: focus?.[0] ?? CesiumMath.toDegrees(c.longitude),
      lat: focus?.[1] ?? CesiumMath.toDegrees(c.latitude),
      height: c.height,
      heading: CesiumMath.toDegrees(this.viewer.camera.heading),
      is3D: Math.abs(this.viewer.camera.pitch + Math.PI / 2) > 0.05,
    })
  }

  setPlacing(value: boolean): void {
    const controls = this.viewer.scene.screenSpaceCameraController
    if (value && !this.placing) {
      this.placementControls = {
        rotate: controls.enableRotate,
        translate: controls.enableTranslate,
      }
      controls.enableRotate = false
      controls.enableTranslate = false
    } else if (!value && this.placementControls) {
      controls.enableRotate = this.placementControls.rotate
      controls.enableTranslate = this.placementControls.translate
      this.placementControls = undefined
    }
    this.placing = value
    this.placementSurface = value
      ? placementPlane(this.campusCenter, this.campusHeight)
      : undefined
    this.viewer.canvas.style.cursor = value ? 'crosshair' : ''
  }
  cancelDrag(): void {
    this.finishDrag(true)
  }
  setDesignMode(value: boolean): void {
    if (!value) this.finishDrag(true)
    this.handle.hidden = !value
    this.viewer.scene.requestRender()
  }
  setLayer(name: string, visible: boolean): void {
    this.layerVisibility[name] = visible
    this.group(name).show =
      visible && !(this.style === 'reality' && name === 'buildings')
    if (name === 'trees')
      this.group('tree-models').show = visible && this.style !== 'reality'
    this.viewer.scene.requestRender()
  }
  setLocalStyle(style: 'aerial' | 'landscape'): void {
    this.connectionRevision++
    this.style = style
    if (this.tileset) this.tileset.show = false
    this.viewer.scene.globe.show = true
    this.localAerial.show = true
    this.localAerial.saturation = style === 'landscape' ? 0.25 : 0.95
    this.localAerial.brightness = style === 'landscape' ? 1.25 : 1.06
    this.group('buildings').show = this.layerVisibility['buildings'] ?? true
    this.group('labels').show = true
    this.group('tree-models').show = this.layerVisibility['trees'] ?? true
    this.updateCampus(
      campus(this.campusCenter, this.campusBearing).volumes,
      this.campusCenter,
      this.campusBearing,
    )
    this.callbacks.onlineChanged('local')
    this.viewer.scene.requestRender()
  }
  async connectPhotorealistic(token: string): Promise<void> {
    const revision = ++this.connectionRevision
    this.callbacks.onlineChanged('connecting')
    try {
      if (this.tileset && this.activeToken !== token) {
        this.viewer.scene.primitives.remove(this.tileset)
        this.tileset = undefined
      }
      if (!this.tileset) {
        const resource = await IonResource.fromAssetId(2275207, {
          accessToken: token,
        })
        const tileset = await Cesium3DTileset.fromUrl(resource, {
          maximumScreenSpaceError: 12,
          cacheBytes: 384 * 1024 * 1024,
          maximumCacheOverflowBytes: 128 * 1024 * 1024,
          showCreditsOnScreen: true,
          enableCollision: true,
        })
        if (this.viewer.isDestroyed() || revision !== this.connectionRevision) {
          tileset.destroy()
          return
        }
        tileset.tileFailed.addEventListener(() => {
          this.callbacks.mapError(
            'A photorealistic tile could not stream. Check the internet connection or switch to the local aerial view.',
          )
        })
        this.tileset = tileset
        this.activeToken = token
        this.viewer.scene.primitives.add(tileset)
        tileset.initialTilesLoaded.addEventListener(() => {
          if (this.style === 'reality' && !this.dragging && !this.placing)
            this.updateCampus(
              campus(this.campusCenter, this.campusBearing).volumes,
              this.campusCenter,
              this.campusBearing,
            )
        })
        tileset.allTilesLoaded.addEventListener(() => {
          if (
            this.style !== 'reality' ||
            this.dragging ||
            this.placing ||
            !this.viewer.scene.sampleHeightSupported
          )
            return
          const height = this.sampleSceneGround(this.campusCenter)
          if (
            height !== undefined &&
            Math.abs(height - this.campusHeight) > 0.25
          )
            this.updateCampus(
              campus(this.campusCenter, this.campusBearing).volumes,
              this.campusCenter,
              this.campusBearing,
            )
        })
      }
      if (revision !== this.connectionRevision) return
      this.style = 'reality'
      this.tileset.show = true
      this.viewer.scene.globe.show = false
      this.group('buildings').show = false
      this.group('labels').show = false
      this.group('tree-models').show = false
      this.callbacks.onlineChanged('online')
      this.viewer.scene.requestRender()
    } catch {
      if (revision !== this.connectionRevision) return
      this.setLocalStyle('aerial')
      this.callbacks.onlineChanged('error')
      throw new Error(
        'Could not connect to photorealistic 3D. Check the ion token and enable Google Photorealistic 3D Tiles in your Cesium ion account.',
      )
    }
  }

  setCamera(preset: CameraPreset, duration = 1.6): void {
    const [lng, lat] =
      preset === 'neighborhood' ? this.pack.manifest.center : this.campusCenter
    const angle = (this.campusBearing * Math.PI) / 180
    const targetLng =
      preset === 'street'
        ? lng -
          (Math.sin(angle) * 95) / (111320 * Math.cos((lat * Math.PI) / 180))
        : lng
    const targetLat =
      preset === 'street' ? lat - (Math.cos(angle) * 95) / 111320 : lat
    const target = Cartesian3.fromDegrees(
      targetLng,
      targetLat,
      preset === 'street'
        ? this.campusHeight - 70
        : this.heightAt(lng, lat) - (preset === 'site' ? 65 : 0),
    )
    const ranges: Record<CameraPreset, number> = {
      neighborhood: 2600,
      site: 1050,
      street:
        550 *
        Math.max(
          1,
          this.viewer.canvas.clientWidth /
            this.viewer.canvas.clientHeight /
            1.35,
        ),
    }
    const pitches: Record<CameraPreset, number> = {
      neighborhood: -43,
      site: -34,
      street: -40,
    }
    const options = {
      offset: new HeadingPitchRange(
        CesiumMath.toRadians(-27),
        CesiumMath.toRadians(pitches[preset]),
        ranges[preset],
      ),
    }
    if (duration === 0) {
      this.viewer.camera.viewBoundingSphere(
        new BoundingSphere(target, 1),
        options.offset,
      )
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    } else
      this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
        ...options,
        duration,
      })
    this.viewer.scene.requestRender()
  }
  zoom(inward: boolean): void {
    const amount = Math.max(
      40,
      this.viewer.camera.positionCartographic.height * 0.25,
    )
    if (inward) this.viewer.camera.zoomIn(amount)
    else this.viewer.camera.zoomOut(amount)
    this.viewer.scene.requestRender()
    this.reportCamera()
  }
  faceNorth(): void {
    const camera = this.viewer.camera
    camera.flyTo({
      destination: camera.position,
      orientation: { heading: 0, pitch: camera.pitch, roll: 0 },
      duration: 0.6,
    })
  }
  topDown(enabled: boolean): void {
    const target = Cartesian3.fromDegrees(
      ...this.campusCenter,
      this.campusHeight,
    )
    this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
      offset: new HeadingPitchRange(
        this.viewer.camera.heading,
        enabled ? -Math.PI / 2 : CesiumMath.toRadians(-34),
        enabled ? 850 : 1050,
      ),
      duration: 0.8,
    })
  }
  pan(x: number, y: number): void {
    const canvas = this.viewer.scene.canvas
    const current = this.pickGround(
      new ScreenPosition(canvas.clientWidth / 2, canvas.clientHeight / 2),
    )
    const next = this.pickGround(
      new ScreenPosition(
        canvas.clientWidth / 2 + x,
        canvas.clientHeight / 2 + y,
      ),
    )
    if (!current || !next) return
    const camera = this.viewer.camera
    const delta = Cartesian3.subtract(
      Cartesian3.fromDegrees(...next),
      Cartesian3.fromDegrees(...current),
      new Cartesian3(),
    )
    camera.position = Cartesian3.add(camera.position, delta, new Cartesian3())
    this.viewer.scene.requestRender()
    this.reportCamera()
  }
  orbit(heading: number, pitch: number): void {
    const canvas = this.viewer.canvas
    const center =
      this.pickGround(
        new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
      ) ?? this.campusCenter
    const target = Cartesian3.fromDegrees(...center, this.heightAt(...center))
    const camera = this.viewer.camera
    this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
      offset: new HeadingPitchRange(
        camera.heading + CesiumMath.toRadians(heading),
        CesiumMath.clamp(
          camera.pitch + CesiumMath.toRadians(pitch),
          -1.55,
          -0.1,
        ),
        Cartesian3.distance(camera.positionWC, target),
      ),
      duration: 0.25,
    })
  }
  destroy(): void {
    this.finishDrag(true)
    this.ambientLife.destroy()
    this.connectionRevision++
    this.removeCameraListener()
    this.removeRenderListener()
    this.handler.destroy()
    this.handle.removeEventListener('pointerdown', this.onPointerDown)
    this.handle.removeEventListener('pointermove', this.onPointerMove)
    this.handle.removeEventListener('pointerup', this.onPointerUp)
    this.handle.removeEventListener('pointercancel', this.onPointerCancel)
    this.handle.removeEventListener('lostpointercapture', this.onPointerCancel)
    window.removeEventListener('blur', this.onPointerCancel)
    this.viewer.destroy()
  }
}
