import './placement.css'
import {
  CallbackPositionProperty,
  CallbackProperty,
  CameraEventType,
  Cesium3DTileset,
  CesiumWidget,
  CustomDataSource,
  Entity,
  IonResource,
  KeyboardEventModifier,
  LabelStyle,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SceneTransforms,
  ShadowMode,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  WebMercatorTilingScheme,
} from '@cesium/engine'
import {
  ArcType,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  DistanceDisplayCondition,
  HeadingPitchRange,
  HeadingPitchRoll,
  FixedFrameTransforms,
  JulianDate,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
} from '@cesium/core'
import type { ImageryLayer } from '@cesium/engine'
import type { Quaternion } from '@cesium/core'
import type { DataPack } from '../data.ts'
import type { LngLat } from '../geometry.ts'
import {
  beginCampusDrag,
  dragCampus,
  placementPlane,
  positionOnPlane,
} from '../placement.ts'
import type { CampusDrag } from '../placement.ts'
import { createLocalTerrain, sampleElevation } from '../terrain.ts'
import type { ElevationGrid } from '../terrain.ts'
import { INITIAL_POLO_STATE, POLO_CENTER } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { poloPlacementValid } from './placement.ts'
import {
  activePoloProposal,
  pointOnPath,
  poloCoordinate,
  POLO_LAYOUT,
} from './scene-geometry.ts'

type CommunityId = 'neighbor' | 'nature' | 'student' | 'operator'
type LocalPoint = readonly [number, number, number]
interface SceneCallbacks {
  onlineChanged: (state: 'local' | 'connecting' | 'online' | 'error') => void
  message: (text: string) => void
  communityRequested: (id: CommunityId) => void
  positionRequested: (center: LngLat) => boolean
  rotationRequested: (bearing: number) => boolean
}
const PALETTE = {
  grass: '#8fab62',
  soil: '#a7855d',
  compacted: '#b9a07c',
  concrete: '#c5c7b7',
  white: '#edf1e5',
  dark: '#365c57',
  water: '#63c9e1',
  power: '#f5ce62',
  heat: '#f19b67',
  return: '#87c3d0',
  recycled: '#bd96e0',
}

/** A separate authored Polo scenario. No old sandbox campus or consequence rules enter this scene. */
export class PoloScene {
  readonly viewer: CesiumWidget
  private readonly source = new CustomDataSource('polo-guided-demo')
  private readonly aerial: ImageryLayer
  private readonly callbacks: SceneCallbacks
  private readonly handler: ScreenSpaceEventHandler
  private readonly grid: ElevationGrid
  private readonly reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  private state: PoloSceneState = {
    ...INITIAL_POLO_STATE,
    center: [...INITIAL_POLO_STATE.center],
  }
  private readonly placementHandle = document.createElement('button')
  private readonly removePostRender: () => void
  private readonly draggableEntities = new Set<Entity>()
  private readonly localAnchors = new Map<Entity, LocalPoint>()
  private ignoreMapClickUntil = 0
  private hoverAt = 0
  private drag:
    | {
        projection: CampusDrag
        pointerId: number
        start: Cartesian2
        original: LngLat
        originalBearing: number
        captureTarget: HTMLElement
        last: LngLat
        moved: boolean
        cameraInputs: boolean
      }
    | undefined
  private readonly activityStartAt = performance.now()
  private tileset: Cesium3DTileset | undefined
  private token = ''
  private connectionRevision = 0
  private online = false
  private ground: number
  private fieldGround: number
  private startAt = performance.now()
  private animation = 0
  private renderedAt = 0
  private destroyed = false

  constructor(pack: DataPack, grid: ElevationGrid, callbacks: SceneCallbacks) {
    this.callbacks = callbacks
    this.grid = grid
    this.ground = sampleElevation(grid, ...this.state.center) + 0.7
    this.fieldGround = sampleElevation(grid, ...POLO_CENTER) + 0.7
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
    viewer.clock.currentTime = JulianDate.fromIso8601('2026-10-24T21:00:00Z')
    viewer.resolutionScale = Math.min(devicePixelRatio, 1.5)
    viewer.scene.globe.baseColor = Color.fromCssColorString('#4b6547')
    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.globe.maximumScreenSpaceError = 2
    viewer.scene.backgroundColor = Color.fromCssColorString('#e5eade')
    viewer.scene.postProcessStages.fxaa.enabled = true
    viewer.scene.shadowMap.softShadows = true
    viewer.scene.shadowMap.size = 2048
    const controls = viewer.scene.screenSpaceCameraController
    controls.minimumZoomDistance = 80
    controls.maximumZoomDistance = 6500
    controls.tiltEventTypes = [
      CameraEventType.RIGHT_DRAG,
      {
        eventType: CameraEventType.LEFT_DRAG,
        modifier: KeyboardEventModifier.CTRL,
      },
    ]
    controls.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH]
    this.aerial = viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: `${pack.baseUrl}aerial/{z}/{x}/{y}.jpg`,
        tilingScheme: new WebMercatorTilingScheme(),
        rectangle: Rectangle.fromDegrees(...pack.manifest.bounds),
        minimumLevel: 14,
        maximumLevel: 18,
        credit: 'USDA NAIP · 2022 · Microsoft Planetary Computer',
      }),
    )
    this.aerial.brightness = 1.07
    this.aerial.imageryProvider.errorEvent.addEventListener(() => {
      callbacks.message(
        'A local image tile is missing. Check the Golden Gate Park data pack.',
      )
    })
    void viewer.dataSources.add(this.source)
    this.handler = new ScreenSpaceEventHandler(viewer.canvas)
    this.handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        if (performance.now() < this.ignoreMapClickUntil) return
        const picked: unknown = viewer.scene.pick(event.position)
        if (
          picked &&
          typeof picked === 'object' &&
          'id' in picked &&
          picked.id instanceof Entity
        ) {
          const id = picked.id.id.replace('polo-community-', '')
          if (
            id === 'neighbor' ||
            id === 'nature' ||
            id === 'student' ||
            id === 'operator'
          ) {
            callbacks.communityRequested(id)
            return
          }
        }
        if (!this.state.confirmed) this.requestPlacementAt(event.position)
      },
      ScreenSpaceEventType.LEFT_CLICK,
    )
    this.handler.setInputAction(
      (event: ScreenSpaceEventHandler.MotionEvent) => {
        if (this.drag || performance.now() - this.hoverAt < 90) return
        this.hoverAt = performance.now()
        const picked: unknown = this.viewer.scene.pick(event.endPosition)
        const draggable =
          picked &&
          typeof picked === 'object' &&
          'id' in picked &&
          picked.id instanceof Entity &&
          this.draggableEntities.has(picked.id)
        this.viewer.canvas.style.cursor = draggable ? 'grab' : ''
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    )
    this.placementHandle.type = 'button'
    this.placementHandle.className = 'polo-placement-handle'
    this.placementHandle.innerHTML =
      '<span aria-hidden="true">✥</span><span>Move data center</span>'
    this.placementHandle.setAttribute('aria-label', 'Move planned data center')
    this.placementHandle.title =
      'Drag the campus or handle. ← / → rotate 5°; Shift rotates 1°.'
    viewer.container.append(this.placementHandle)
    this.placementHandle.addEventListener('pointerdown', this.onPlacementDown)
    this.placementHandle.addEventListener('pointermove', this.onPlacementMove)
    this.placementHandle.addEventListener('pointerup', this.onPlacementUp)
    this.placementHandle.addEventListener(
      'pointercancel',
      this.onPlacementCancel,
    )
    this.placementHandle.addEventListener(
      'lostpointercapture',
      this.onPlacementCancel,
    )
    this.placementHandle.addEventListener('keydown', this.onPlacementKey)
    viewer.canvas.addEventListener('pointerdown', this.onCampusDown, true)
    viewer.canvas.addEventListener('pointermove', this.onPlacementMove, true)
    viewer.canvas.addEventListener('pointerup', this.onPlacementUp, true)
    viewer.canvas.addEventListener(
      'pointercancel',
      this.onPlacementCancel,
      true,
    )
    viewer.canvas.addEventListener(
      'lostpointercapture',
      this.onPlacementCancel,
      true,
    )
    window.addEventListener('blur', this.onPlacementCancel)
    this.removePostRender = viewer.scene.postRender.addEventListener(
      this.positionPlacementHandle,
    )
    this.rebuild()
    this.focus('site', 0)
    this.animation = requestAnimationFrame(this.animate)
  }

  private pointerPosition(event: PointerEvent): Cartesian2 {
    const bounds = this.viewer.canvas.getBoundingClientRect()
    return new Cartesian2(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
    )
  }
  private requestPlacementAt(position: Cartesian2): void {
    if (this.state.confirmed || this.drag) return
    const ray = this.viewer.camera.getPickRay(position)
    const center =
      ray &&
      positionOnPlane(ray, placementPlane(this.state.center, this.ground))
    if (center) this.requestPosition(center)
  }
  private requestPosition(center: LngLat): boolean {
    if (this.destroyed) return false
    if (
      !poloPlacementValid(center) ||
      !this.callbacks.positionRequested([...center])
    ) {
      return false
    }
    if (
      this.state.center[0] !== center[0] ||
      this.state.center[1] !== center[1]
    )
      this.setState({ ...this.state, center: [...center] })
    return true
  }
  private readonly onPlacementDown = (event: PointerEvent): void => {
    this.beginPlacementDrag(event, this.placementHandle)
  }
  private readonly onCampusDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary || this.drag) return
    const picked: unknown = this.viewer.scene.pick(this.pointerPosition(event))
    if (
      !picked ||
      typeof picked !== 'object' ||
      !('id' in picked) ||
      !(picked.id instanceof Entity) ||
      !this.draggableEntities.has(picked.id)
    )
      return
    this.beginPlacementDrag(event, this.viewer.canvas)
  }
  private beginPlacementDrag(
    event: PointerEvent,
    captureTarget: HTMLElement,
  ): void {
    if (event.button !== 0 || !event.isPrimary || this.drag) return
    const start = this.pointerPosition(event)
    const ray = this.viewer.camera.getPickRay(start)
    const projection =
      ray && beginCampusDrag(this.state.center, this.ground + 27, ray)
    if (!projection) return
    event.preventDefault()
    event.stopImmediatePropagation()
    this.viewer.camera.cancelFlight()
    this.placementHandle.focus({ preventScroll: true })
    this.drag = {
      projection,
      pointerId: event.pointerId,
      start,
      original: [...this.state.center],
      originalBearing: this.state.bearing,
      captureTarget,
      last: [...this.state.center],
      moved: false,
      cameraInputs: this.viewer.scene.screenSpaceCameraController.enableInputs,
    }
    this.viewer.scene.screenSpaceCameraController.enableInputs = false
    this.placementHandle.classList.add('is-dragging')
    this.viewer.canvas.style.cursor = 'grabbing'
    captureTarget.setPointerCapture(event.pointerId)
  }
  private readonly onPlacementMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const pointer = this.pointerPosition(event)
    if (!drag.moved && Cartesian2.distance(pointer, drag.start) < 3) return
    const ray = this.viewer.camera.getPickRay(pointer)
    const center = ray && dragCampus(drag.projection, ray)
    if (!center || !this.requestPosition(center)) return
    drag.last = [...center]
    drag.moved = true
  }
  private finishPlacementDrag(cancelled: boolean): void {
    const drag = this.drag
    if (!drag) return
    this.drag = undefined
    this.placementHandle.classList.remove('is-dragging')
    if (drag.captureTarget.hasPointerCapture(drag.pointerId))
      drag.captureTarget.releasePointerCapture(drag.pointerId)
    this.viewer.scene.screenSpaceCameraController.enableInputs =
      drag.cameraInputs
    if (drag.moved) this.ignoreMapClickUntil = performance.now() + 350
    if (cancelled) {
      if (drag.moved) this.requestPosition(drag.original)
      if (this.state.bearing !== drag.originalBearing)
        this.requestRotation(drag.originalBearing)
    }
    this.viewer.canvas.style.cursor = ''
    this.ground = this.siteGround(this.state.center)
    this.viewer.scene.requestRender()
  }
  private readonly onPlacementUp = (event: PointerEvent): void => {
    if (this.drag?.pointerId !== event.pointerId) return
    this.onPlacementMove(event)
    event.preventDefault()
    event.stopImmediatePropagation()
    this.finishPlacementDrag(false)
  }
  private readonly onPlacementCancel = (): void => {
    this.finishPlacementDrag(true)
  }
  private readonly onPlacementKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.cancelPlacementDrag()
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const step = event.shiftKey ? 1 : 5
    event.preventDefault()
    event.stopPropagation()
    this.requestRotation(
      this.state.bearing + (event.key === 'ArrowLeft' ? -step : step),
    )
  }
  private requestRotation(bearing: number): void {
    const next = ((bearing % 360) + 360) % 360
    if (this.destroyed || !this.callbacks.rotationRequested(next)) return
    if (this.state.bearing !== next)
      this.setState({ ...this.state, bearing: next })
  }
  private readonly positionPlacementHandle = (): void => {
    if (this.destroyed || this.viewer.isDestroyed()) return
    this.placementHandle.hidden = false
    const point = SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      this.point(0, 0, 27),
    )
    if (
      !point ||
      point.x < 0 ||
      point.y < 0 ||
      point.x > this.viewer.canvas.clientWidth ||
      point.y > this.viewer.canvas.clientHeight
    ) {
      this.placementHandle.style.visibility = 'hidden'
      return
    }
    this.placementHandle.style.visibility = 'visible'
    this.placementHandle.style.left = `${point.x.toFixed(1)}px`
    this.placementHandle.style.top = `${point.y.toFixed(1)}px`
    this.placementHandle.style.transform = 'translate(-50%, -100%)'
  }
  cancelPlacementDrag(): void {
    this.finishPlacementDrag(true)
  }

  private elapsed(): number {
    return this.reducedMotion.matches
      ? 6
      : (performance.now() - this.startAt) / 1000
  }
  private point(x: number, y: number, z = 0): Cartesian3 {
    return Cartesian3.fromDegrees(
      ...poloCoordinate(x, y, this.state.center, this.state.bearing),
      this.ground + z,
    )
  }
  private campusOrientation(): Quaternion {
    return FixedFrameTransforms.headingPitchRollQuaternion(
      this.point(0, 0, 0),
      new HeadingPitchRoll(CesiumMath.toRadians(this.state.bearing), 0, 0),
    )
  }
  private fieldPoint(x: number, y: number, z = 0): Cartesian3 {
    return Cartesian3.fromDegrees(...poloCoordinate(x, y), this.fieldGround + z)
  }
  private box(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    css: string,
    fieldAnchored = false,
  ): Entity {
    const entity = this.source.entities.add({
      position: fieldAnchored
        ? this.fieldPoint(x, y, z + height / 2)
        : new CallbackPositionProperty(
            () => this.point(x, y, z + height / 2),
            false,
          ),
      ...(!fieldAnchored
        ? {
            orientation: new CallbackProperty(
              () => this.campusOrientation(),
              false,
            ),
          }
        : {}),
      box: {
        dimensions: new Cartesian3(width, depth, height),
        material: Color.fromCssColorString(css),
        shadows: ShadowMode.ENABLED,
      },
    })
    if (!fieldAnchored) {
      this.draggableEntities.add(entity)
      this.localAnchors.set(entity, [x, y, z + height / 2])
    }
    return entity
  }
  private cylinder(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    css: string,
  ): Entity {
    const entity = this.source.entities.add({
      position: new CallbackPositionProperty(
        () => this.point(x, y, z + height / 2),
        false,
      ),
      cylinder: {
        length: height,
        topRadius: radius,
        bottomRadius: radius,
        slices: 12,
        material: Color.fromCssColorString(css),
        numberOfVerticalLines: 0,
        shadows: ShadowMode.ENABLED,
      },
    })
    this.localAnchors.set(entity, [x, y, z + height / 2])
    return entity
  }
  private label(
    x: number,
    y: number,
    z: number,
    text: string,
    css = PALETTE.dark,
    id?: string,
    pixelOffset = new Cartesian2(0, -12),
    fieldAnchored = false,
  ): Entity {
    const community = id?.startsWith('polo-community-') ?? false
    return this.source.entities.add({
      ...(id ? { id } : {}),
      position: fieldAnchored
        ? this.fieldPoint(x, y, z)
        : new CallbackPositionProperty(() => this.point(x, y, z), false),
      label: {
        text,
        font: '600 12px sans-serif',
        fillColor: Color.fromCssColorString('#fffef1'),
        showBackground: true,
        backgroundColor: Color.fromCssColorString(css).withAlpha(0.94),
        backgroundPadding: community
          ? new Cartesian2(11, 8)
          : new Cartesian2(8, 6),
        style: LabelStyle.FILL,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset,
        disableDepthTestDistance: Infinity,
        distanceDisplayCondition: new DistanceDisplayCondition(
          0,
          community ? 1800 : 1250,
        ),
        scale: community ? 0.85 : 0.8,
      },
      point: {
        pixelSize: 5,
        color: Color.fromCssColorString(css),
        disableDepthTestDistance: Infinity,
      },
    })
  }
  private path(
    points: readonly LocalPoint[],
    css: string,
    width = 5,
    dashed = false,
    fieldAnchored = false,
  ): void {
    this.source.entities.add({
      polyline: {
        positions: fieldAnchored
          ? points.map(([x, y, z]) => this.fieldPoint(x, y, z))
          : new CallbackProperty(
              () => points.map(([x, y, z]) => this.point(x, y, z)),
              false,
            ),
        arcType: ArcType.NONE,
        width,
        material: dashed
          ? new PolylineDashMaterialProperty({
              color: Color.fromCssColorString(css),
              dashLength: 12,
            })
          : new PolylineGlowMaterialProperty({
              color: Color.fromCssColorString(css),
              glowPower: 0.14,
            }),
      },
    })
  }
  private flow(
    points: readonly LocalPoint[],
    css: string,
    count = 4,
    speed = 0.18,
    radius = 1.4,
  ): void {
    for (let index = 0; index < count; index++) {
      this.source.entities.add({
        position: new CallbackPositionProperty(() => {
          const point = pointOnPath(
            points,
            this.elapsed() * speed + index / count,
          )
          return this.point(...point)
        }, false),
        ellipsoid: {
          radii: new Cartesian3(radius, radius, radius),
          material: Color.fromCssColorString(css),
          stackPartitions: 6,
          slicePartitions: 6,
        },
      })
    }
  }
  private person(
    x: number,
    y: number,
    color: string,
    walking: boolean,
    index: number,
    protesting = false,
    base = 0,
    fieldAnchored = false,
  ): void {
    const position = (z: number): CallbackPositionProperty =>
      new CallbackPositionProperty(() => {
        const activity = this.reducedMotion.matches
          ? 6
          : (performance.now() - this.activityStartAt) / 1000
        const offset = walking ? Math.sin(activity * 0.45 + index) * 7 : 0
        return fieldAnchored
          ? this.fieldPoint(x + offset, y + Math.sin(index) * 1.5, z + base)
          : this.point(x + offset, y + Math.sin(index) * 1.5, z + base)
      }, false)
    this.source.entities.add({
      position: position(1.5),
      cylinder: {
        length: 2,
        topRadius: 0.5,
        bottomRadius: 0.5,
        slices: 6,
        material: Color.fromCssColorString(color),
      },
    })
    this.source.entities.add({
      position: position(2.9),
      ellipsoid: {
        radii: new Cartesian3(0.55, 0.55, 0.55),
        stackPartitions: 6,
        slicePartitions: 6,
        material: Color.fromCssColorString('#dfb998'),
      },
    })
    if (protesting) {
      const pole = this.box(x, y, 2.4, 0.2, 0.2, 2.5, '#786a49', fieldAnchored)
      const board = this.box(x, y, 4.1, 4.2, 0.3, 2, '#f4e7b4', fieldAnchored)
      pole.position = position(3.65)
      board.position = position(5.1)
    }
  }
  private fieldActivity(): void {
    for (let index = 0; index < 6; index++)
      this.person(
        -150 + index * 60,
        index % 2 ? 83 : -83,
        index % 2 ? '#c89664' : '#698c9b',
        true,
        index + 12,
        false,
        0,
        true,
      )
  }
  private placementScene(): void {
    this.box(
      0,
      0,
      0,
      POLO_LAYOUT.pad.width,
      POLO_LAYOUT.pad.depth,
      0.2,
      '#a1ba6c33',
      true,
    )
    this.path(
      [
        [-95, -40, 1],
        [95, -40, 1],
        [95, 40, 1],
        [-95, 40, 1],
        [-95, -40, 1],
      ],
      '#ecf2d7',
      2,
      false,
      true,
    )
    this.path(
      [
        [0, -40, 1],
        [0, 40, 1],
      ],
      '#ecf2d7',
      2,
      false,
      true,
    )
    for (let index = 0; index < 12; index++)
      this.person(
        -80 + index * 14,
        index % 2 ? 22 : -15,
        index % 2 ? '#f0c766' : '#638bab',
        true,
        index,
        false,
        0,
        true,
      )
    for (const hall of POLO_LAYOUT.halls) {
      const ghost = this.source.entities.add({
        position: new CallbackPositionProperty(
          () => this.point(hall.x, hall.y, 9.5),
          false,
        ),
        orientation: new CallbackProperty(
          () => this.campusOrientation(),
          false,
        ),
        box: {
          dimensions: new Cartesian3(hall.width, hall.depth, 18),
          material: Color.fromCssColorString('#d9f1d5').withAlpha(0.18),
          outline: true,
          outlineColor: Color.fromCssColorString('#e8f6c5'),
          shadows: ShadowMode.DISABLED,
        },
      })
      this.draggableEntities.add(ghost)
    }
    const ghostPad = this.source.entities.add({
      position: new CallbackPositionProperty(
        () => this.point(0, 0, 0.9),
        false,
      ),
      orientation: new CallbackProperty(() => this.campusOrientation(), false),
      box: {
        dimensions: new Cartesian3(
          POLO_LAYOUT.pad.width,
          POLO_LAYOUT.pad.depth,
          0.3,
        ),
        material: Color.fromCssColorString('#a6d8a2').withAlpha(0.28),
        outline: true,
        outlineColor: Color.fromCssColorString('#f3facb'),
        shadows: ShadowMode.DISABLED,
      },
    })
    this.draggableEntities.add(ghostPad)
    this.source.entities.add({
      polyline: {
        positions: new CallbackProperty(
          () =>
            [
              [-160, -62.5],
              [160, -62.5],
              [160, 62.5],
              [-160, 62.5],
              [-160, -62.5],
            ].map(([x, y]) => this.point(x ?? 0, y ?? 0, 1.2)),
          false,
        ),
        width: 3,
        arcType: ArcType.NONE,
        material: Color.fromCssColorString('#e2efac'),
      },
    })
  }
  private machinery(x: number, y: number, roller: boolean): void {
    const firstEntity = this.source.entities.values.length
    this.box(x, y, 1, 13, 7, 4, '#edb852')
    this.box(x - 3, y, 5, 5, 5, 4, '#4e655b')
    for (const offset of [-4.5, 4.5]) {
      this.cylinder(x + offset, y - 3.5, 0.4, 1.7, 1.4, '#414f43')
      this.cylinder(x + offset, y + 3.5, 0.4, 1.7, 1.4, '#414f43')
    }
    if (roller) this.box(x + 8, y, 0.5, 5, 10, 3.5, '#6b7164')
    else this.box(x + 8, y, 0.4, 2, 11, 3.8, '#b2b4a5')
    for (const entity of this.source.entities.values.slice(firstEntity)) {
      const local = this.localAnchors.get(entity)
      if (!local) continue
      entity.position = new CallbackPositionProperty(
        () =>
          this.point(
            local[0] + Math.sin(this.elapsed() * 0.4) * 22,
            local[1],
            local[2],
          ),
        false,
      )
    }
  }

  private campus(): void {
    const building = this.state.phase === 'M4'
    // Only the central 32,000 m² work band changes; the outer 8,000 m² stays original turf.
    // Construction has 12,000 m² roof and 20,000 m² bare soil. At opening the same
    // band becomes 12,000 m² roof, 16,000 m² hardstanding and 4,000 m² new landscape.
    this.box(
      0,
      0,
      0.7,
      POLO_LAYOUT.workBand.width,
      POLO_LAYOUT.workBand.depth,
      0.2,
      building ? PALETTE.soil : '#a6b87c',
    )
    if (!building)
      this.box(
        0,
        0,
        0.95,
        POLO_LAYOUT.developedBand.width,
        POLO_LAYOUT.developedBand.depth,
        0.2,
        PALETTE.concrete,
      )
    for (const hall of POLO_LAYOUT.halls) {
      const { x, y, width, depth } = hall
      if (building) {
        this.box(x, y, 1, width, depth, 3, '#c4d0c0')
        for (const dx of [-46, -15, 15, 46])
          for (const dy of [-26, 26])
            this.box(x + dx, y + dy, 4, 1.8, 1.8, 14, '#e5e6d8')
        this.box(x, y, 17.8, width, depth, 0.4, '#d6decf')
        this.path(
          [
            [x - 49, y - 29, 18],
            [x + 49, y - 29, 18],
            [x + 49, y + 29, 18],
            [x - 49, y + 29, 18],
            [x - 49, y - 29, 18],
          ],
          '#cad7c5',
          4,
        )
      } else {
        this.box(x, y, 1, width, depth, 17, PALETTE.dark)
        this.box(x, y, 18, width, depth, 0.8, PALETTE.white)
        for (let bay = 0; bay < 8; bay++) {
          this.box(x - 43 + bay * 12, y - 30.3, 5, 8, 0.5, 8.5, '#8caeb0')
          this.box(x - 43 + bay * 12, y - 30.7, 12.5, 8, 0.5, 0.9, '#acd9d5')
        }
        for (let cooler = 0; cooler < 4; cooler++) {
          this.box(x - 35 + cooler * 23, 23, 18.8, 13, 10, 3, '#a8b8aa')
          this.cylinder(x - 35 + cooler * 23, 23, 22, 3.5, 0.6, '#58756e')
        }
      }
    }
    if (!building) {
      this.box(0, -36, 1, 24, 10, 5, '#e4e7d9')
      this.path(
        [
          [-155, -43, 1.3],
          [150, -43, 1.3],
        ],
        '#eeebce',
        2,
        true,
      )
    }
    if (building) {
      this.box(-133, 32, 1, 5, 5, 52, '#dcaf45')
      this.box(-101, 32, 48, 86, 3, 3, '#f0c95b')
      this.path(
        [
          [-75, 32, 49],
          [-75, 32, 22],
        ],
        '#625e42',
        2,
      )
      this.source.entities.add({
        position: new CallbackPositionProperty(
          () => this.point(-75, 32, 17 + (Math.sin(this.elapsed()) + 1) * 7),
          false,
        ),
        orientation: new CallbackProperty(
          () => this.campusOrientation(),
          false,
        ),
        box: {
          dimensions: new Cartesian3(11, 9, 3),
          material: Color.fromCssColorString('#d8ded3'),
        },
      })
      this.machinery(95, -48, false)
      this.label(15, -12, 31, 'Building the campus', '#76603b')
    }
  }
  private operation(): void {
    const selected = activePoloProposal(this.state)
    this.box(-175, -65, 0, 14, 10, 11, '#8d9c90')
    const power: LocalPoint[] = [
      [-175, -65, 13],
      [-148, -65, 13],
      [-148, -40, 20],
      [-65, -40, 20],
      [-65, 0, 20],
    ]
    this.path(power, PALETTE.power, 4)
    this.flow(power, PALETTE.power, 5, 0.12)
    if (!selected) this.label(-184, -65, 19, 'Electricity → servers', '#807039')
    const cooling: LocalPoint[] = [
      [65, 0, 21],
      [65, 23, 25],
      ...(selected === 'heat_reuse_neighbors'
        ? ([
            [125, 23, 16],
            [149, 0, 6],
          ] satisfies LocalPoint[])
        : ([[130, 23, 25]] satisfies LocalPoint[])),
      [135, -20, 12],
    ]
    this.path(cooling, PALETTE.water, 4)
    this.flow(cooling, PALETTE.water, 4, 0.15)
    this.cylinder(133, -23, 1, 8, 13, '#a1c2c1')
    const rejection: LocalPoint[] = [
      [133, -23, 14],
      [133, -23, 27],
      [140, -23, 37],
    ]
    this.flow(
      rejection,
      PALETTE.heat,
      selected === 'heat_reuse_neighbors' && this.state.recipientAvailable
        ? 2
        : 5,
      0.12,
      1.6,
    )
    if (selected !== 'green_roof')
      this.label(
        133,
        -23,
        36,
        selected === 'recycled_water'
          ? 'Cooling + blowdown remain'
          : 'Original cooling',
        '#93634c',
        undefined,
        new Cartesian2(-85, -35),
      )
    if (selected !== 'recycled_water') {
      const makeup: LocalPoint[] = [
        [177, -70, 2.5],
        [150, -70, 2.5],
        [150, -23, 5],
        [133, -23, 6],
      ]
      this.path(makeup, PALETTE.water, 4)
      this.flow(makeup, PALETTE.water, 3, 0.14)
      if (!selected)
        this.label(183, -76, 6, 'Cooling water · schematic supply', '#4a8190')
    }
    if (!selected) this.label(0, 22, 28, 'Computing continues', '#426b60')
  }
  private heatReuse(): void {
    const enabled = this.state.recipientAvailable
    this.box(230, 30, 0.5, 60, 36, 9, '#e2d6b7')
    this.box(230, 30, 9.5, 64, 40, 1.2, '#e9e7db')
    this.box(230, 30, 10.9, 28, 14, 0.4, '#7bbec8')
    this.label(
      240,
      60,
      16,
      enabled ? 'MODEL POOL' : 'MODEL POOL\nRecipient unavailable',
      '#7f7254',
      undefined,
      new Cartesian2(50, -28),
    )
    this.box(149, 0, 1, 9, 12, 8, '#eeebd9')
    this.box(185, 0, 1, 9, 10, 7, '#d4e1d3')
    this.label(
      149,
      0,
      10,
      'Heat exchanger',
      '#9d7254',
      undefined,
      new Cartesian2(-30, 28),
    )
    const circuit: LocalPoint[] = [
      [149, 0, 6],
      [124, 0, 6],
      [124, -23, 6],
      [133, -23, 6],
    ]
    this.path(circuit, PALETTE.water, 5)
    this.flow(circuit, PALETTE.water, 3, 0.17)
    const trench = this.box(189, 26, 0.1, 69, 24, 0.7, '#7b6c53')
    if (trench.box)
      trench.box.show = new CallbackProperty(() => this.elapsed() < 3.8, false)
    const supply: LocalPoint[] = [
      [155, 6, 3],
      [180, 6, 3],
      [180, 21, 3],
      [202, 21, 3],
    ]
    const returned: LocalPoint[] = [
      [202, 30, 3],
      [173, 30, 3],
      [173, 14, 3],
      [155, 14, 3],
    ]
    this.path(supply, enabled ? PALETTE.heat : '#b7ada0', 8)
    this.path(returned, enabled ? PALETTE.return : '#a9b6b2', 8)
    if (enabled) {
      this.flow(supply, '#ffd398', 4, 0.17, 1.8)
      this.flow(returned, '#b9ebed', 4, 0.17, 1.8)
    }
    this.label(
      185,
      35,
      7,
      'Supply →  ← return\nSchematic cutaway',
      '#745f48',
      undefined,
      new Cartesian2(20, 30),
    )
    this.box(202, 25, 0.5, 7, 12, 8, '#e9e3ce')
    const poolLoop: LocalPoint[] = [
      [208, 23, 12],
      [224, 23, 12],
      [224, 37, 12],
      [208, 37, 12],
      [208, 23, 12],
    ]
    this.path(poolLoop, '#d9b28c', 3)
    if (enabled) this.flow(poolLoop, '#e8b285', 3, 0.12, 1.1)
    this.box(266, 27, 0, 8, 9, 7, '#a4aa99')
    this.path(
      [
        [266, 27, 10],
        [257, 27, 10],
        [250, 27, 11],
      ],
      '#d2a58e',
      3,
      enabled,
    )
    const addedPower: LocalPoint[] = [
      [-175, -65, 5],
      [-163, -78, 5],
      [176, -78, 5],
      [176, -13, 5],
      [155, -13, 5],
    ]
    this.path(addedPower, PALETTE.power, 3)
    if (enabled) this.flow(addedPower, PALETTE.power, 4, 0.13, 1.2)
  }
  private recycledWater(): void {
    this.cylinder(222, 30, 1, 19, 17, '#ab8dbe')
    this.cylinder(222, 30, 18.2, 19.5, 1.3, '#d4c2df')
    this.label(
      228,
      59,
      25,
      'MODEL RECYCLED SOURCE\nDelivery + quality not verified',
      '#846d9d',
    )
    this.box(181, -7, 1, 17, 20, 10, '#c7b8d4')
    this.label(183, -20, 16, 'Treatment + checks', '#846d9d')
    const delivery: LocalPoint[] = [
      [222, 30, 4],
      [181, 30, 4],
      [181, -7, 5],
      [133, -7, 5],
      [133, -23, 6],
    ]
    this.path(delivery, PALETTE.recycled, 7)
    this.flow(delivery, '#e8d6fc', 6, 0.13, 1.8)
    // A proposed recycled source does not eliminate the need for another supply.
    // Dashed, inactive geometry describes an illustrative backup, not a verified utility.
    this.box(104, -99, 0.4, 8, 8, 4, '#a3bfc1')
    const backup: LocalPoint[] = [
      [104, -99, 3],
      [104, -75, 3],
      [114, -75, 3],
      [114, -23, 5],
      [133, -23, 6],
    ]
    this.path(backup, '#8db9c6', 4, true)
    this.label(
      78,
      -104,
      7,
      'Backup supply\nSchematic · not verified',
      '#6b919a',
    )
    const blowdown: LocalPoint[] = [
      [133, -23, 4],
      [133, -64, 4],
      [173, -64, 4],
    ]
    this.path(blowdown, '#819baf', 4)
    this.flow(blowdown, '#a6c3d0', 3, 0.15)
  }
  private greenRoof(): void {
    for (const hall of POLO_LAYOUT.halls) {
      this.box(hall.x, -4, 18.9, 88, 38, 0.8, '#8fa46a')
      this.box(hall.x, -4, 19.7, 3, 38, 0.2, '#d5d6c0')
      for (let index = 0; index < 18; index++) {
        const x = hall.x - 38 + (index % 6) * 15
        const y = -17 + Math.floor(index / 6) * 12
        this.source.entities.add({
          position: new CallbackPositionProperty(
            () => this.point(x, y, 21.2),
            false,
          ),
          orientation: new CallbackProperty(
            () => this.campusOrientation(),
            false,
          ),
          ellipsoid: {
            radii: new Cartesian3(4.5, 3.2, 1.7),
            stackPartitions: 6,
            slicePartitions: 6,
            material: Color.fromCssColorString(
              index % 3 === 0 ? '#b5c57b' : '#6e984f',
            ),
          },
        })
      }
    }
    this.label(
      3,
      -5,
      29,
      'Planted roof · water held in living layers',
      '#658249',
    )
    this.label(-109, 35, 29, 'Keep access + cooling equipment clear', '#66795a')
    this.person(-48, -10, '#f0ca64', true, 4, false, 19.7)
    const slowDrain: LocalPoint[] = [
      [65, -15, 20],
      [116, -15, 20],
      [119, -15, 3],
      [145, -48, 3],
    ]
    this.path(slowDrain, '#7aa3ab', 3)
    if (this.state.rain) this.flow(slowDrain, '#a4d7dc', 3, 0.08)
    this.label(141, -48, 10, 'Some drainage remains', '#64848a')
    this.label(
      -40,
      -44,
      5,
      'Roof habitat does not replace a public field',
      '#63764c',
    )
  }
  private rain(): void {
    for (let index = 0; index < 22; index++) {
      const x = -150 + ((index * 53) % 300),
        y = -55 + ((index * 29) % 110)
      this.flow(
        [
          [x, y, 65],
          [x - 5, y, this.state.phase >= 'M5' ? 21 : 2],
        ],
        '#94d2e0',
        1,
        0.36,
        0.65,
      )
    }
    if (!activePoloProposal(this.state))
      this.label(
        -155,
        71,
        18,
        'Same rain replay · qualitative water paths',
        '#4e8190',
      )
    if (this.state.phase !== 'M0') {
      const runoff: LocalPoint[] = [
        [-100, -35, 2],
        [-30, -52, 2],
        [65, -56, 2],
        [160, -56, 2],
      ]
      this.path(runoff, PALETTE.water, 3)
      this.flow(runoff, PALETTE.water, 5, 0.14)
    }
  }
  private community(): void {
    const phase = this.state.phase
    const built = phase !== 'M0'
    const bubbles: {
      id: CommunityId
      x: number
      y: number
      text: string
      color: string
    }[] = [
      {
        id: 'neighbor',
        x: -120,
        y: 90,
        text: built
          ? 'PARK REGULAR\nWe need our shared field.\nTap to chat ↗'
          : 'PARK REGULAR\nThis is where we meet.\nTap to chat ↗',
        color: '#84734d',
      },
      {
        id: 'nature',
        x: 55,
        y: 150,
        text: built
          ? 'SOIL VOLUNTEER\nWhat happens to living soil?\nTap to chat ↗'
          : 'SOIL VOLUNTEER\nLiving soil matters too.\nTap to chat ↗',
        color: '#587448',
      },
      {
        id: 'student',
        x: 25,
        y: -132,
        text: built
          ? 'YOUNG PLAYER\nWhere can we play now?\nTap to chat ↗'
          : 'YOUNG PLAYER\nA place to play together.\nTap to chat ↗',
        color: '#5b7d88',
      },
    ]
    for (const bubble of bubbles) {
      const label = this.label(
        bubble.x,
        bubble.y,
        12,
        bubble.text,
        bubble.color,
        'polo-community-' + bubble.id,
      )
      const walking = bubble.id !== 'student'
      const index = bubble.id === 'nature' ? 9 : 7
      label.position = new CallbackPositionProperty(() => {
        const activity = this.reducedMotion.matches
          ? 6
          : (performance.now() - this.activityStartAt) / 1000
        const offset = walking ? Math.sin(activity * 0.45 + index) * 7 : 0
        return this.fieldPoint(
          bubble.x + offset,
          bubble.y + Math.sin(index) * 1.5,
          12,
        )
      }, false)
      this.person(
        bubble.x,
        bubble.y,
        bubble.color,
        walking,
        index,
        built,
        0,
        true,
      )
    }
    if (phase === 'M6' && !activePoloProposal(this.state))
      this.label(
        95,
        60,
        13,
        'DESIGNER\nEvery idea has trade-offs.\nTap to chat ↗',
        '#647f70',
        'polo-community-operator',
      )
  }
  private rebuild(): void {
    this.source.entities.removeAll()
    this.draggableEntities.clear()
    this.localAnchors.clear()
    this.placementHandle.hidden = false
    if (!this.state.confirmed) {
      this.placementScene()
      this.fieldActivity()
      this.community()
      this.positionPlacementHandle()
      this.viewer.scene.requestRender()
      return
    }
    const phase = this.state.phase
    this.box(
      0,
      0,
      0,
      POLO_LAYOUT.pad.width,
      POLO_LAYOUT.pad.depth,
      0.65,
      PALETTE.grass,
    )
    if (phase === 'M2' || phase === 'M3')
      this.box(
        0,
        0,
        0.7,
        POLO_LAYOUT.workBand.width,
        POLO_LAYOUT.workBand.depth,
        0.15,
        phase === 'M2' ? PALETTE.soil : PALETTE.compacted,
      )
    if (phase === 'M0') {
      this.path(
        [
          [-95, -40, 1],
          [95, -40, 1],
          [95, 40, 1],
          [-95, 40, 1],
          [-95, -40, 1],
        ],
        '#ebefdc',
        2,
        false,
        true,
      )
      this.path(
        [
          [0, -40, 1],
          [0, 40, 1],
        ],
        '#ebefdc',
        2,
        false,
        true,
      )
      for (let index = 0; index < 12; index++)
        this.person(
          -80 + index * 14,
          index % 2 ? 22 : -15,
          index % 2 ? '#f0c766' : '#638bab',
          true,
          index,
          false,
          0,
          true,
        )
      this.label(65, 48, 4, 'Today · shared sports turf', '#69834c')
    } else if (phase === 'M1') {
      const stripped = this.box(
        0,
        0,
        0.7,
        POLO_LAYOUT.workBand.width,
        POLO_LAYOUT.workBand.depth,
        0.15,
        PALETTE.soil,
      )
      const span = (): number =>
        Math.max(
          0.1,
          Math.min(1, this.elapsed() / 3.5) * POLO_LAYOUT.workBand.width,
        )
      stripped.position = new CallbackPositionProperty(
        () =>
          this.point(-POLO_LAYOUT.workBand.width / 2 + span() / 2, 0, 0.775),
        false,
      )
      if (stripped.box)
        stripped.box.dimensions = new CallbackProperty(
          () => new Cartesian3(span(), POLO_LAYOUT.workBand.depth, 0.15),
          false,
        )
      for (let row = 0; row < 6; row++)
        this.box(-82, -48 + row * 19, 1, 150, 1, 0.15, '#947452')
      this.machinery(-8, -20, false)
      for (let roll = 0; roll < 5; roll++)
        this.cylinder(-140 + roll * 9, 44, 1, 3, 4, '#75864e')
      this.label(80, 40, 8, 'Grass lifted · the field’s use changes', '#8a7554')
    } else if (phase === 'M2') {
      for (let strip = 0; strip < 6; strip++)
        this.box(
          -132 + strip * 53,
          0,
          0.8,
          52,
          POLO_LAYOUT.workBand.depth,
          0.2 + (strip % 2) * 0.8,
          strip % 2 ? '#b79666' : '#a18359',
        )
      this.machinery(45, -15, false)
      this.label(45, 43, 12, 'Grading · moving and levelling soil', '#8d7756')
    } else if (phase === 'M3') {
      for (let strip = 0; strip < 8; strip++)
        this.box(
          -141 + strip * 40,
          0,
          0.88,
          1.8,
          POLO_LAYOUT.workBand.depth - 2,
          0.1,
          '#a38e6d',
        )
      this.machinery(-20, -12, true)
      this.label(15, 43, 12, 'Compacted soil · less room for water', '#8a785c')
    } else this.campus()
    if (phase === 'M5')
      this.label(
        0,
        48,
        25,
        'Opening · equipment ready, computing not yet running',
        '#6b826f',
      )
    if (phase === 'M6') this.operation()
    const proposal = activePoloProposal(this.state)
    if (proposal === 'heat_reuse_neighbors') this.heatReuse()
    else if (proposal === 'recycled_water') this.recycledWater()
    else if (proposal === 'green_roof') this.greenRoof()
    if (this.state.rain) this.rain()
    this.fieldActivity()
    this.community()
    this.viewer.scene.requestRender()
  }

  private readonly animate = (now: number): void => {
    if (this.destroyed) return
    if (
      !document.hidden &&
      !this.reducedMotion.matches &&
      now - this.renderedAt > 40
    ) {
      this.renderedAt = now
      this.viewer.scene.requestRender()
    }
    this.animation = requestAnimationFrame(this.animate)
  }
  private siteGround(center: LngLat): number {
    const local = sampleElevation(this.grid, ...center)
    if (this.online && !this.drag && this.viewer.scene.sampleHeightSupported) {
      const measured = this.viewer.scene.sampleHeight(
        Cartographic.fromDegrees(...center),
        this.source.entities.values,
      )
      if (
        measured !== undefined &&
        Number.isFinite(measured) &&
        Math.abs(measured - local) < 100
      )
        return measured + 0.7
    }
    return local + 0.7
  }
  setState(state: PoloSceneState): void {
    if (this.destroyed) return
    const newAnimation =
      this.state.phase !== state.phase ||
      this.state.proposal !== state.proposal ||
      this.state.preview !== state.preview ||
      this.state.rain !== state.rain ||
      this.state.recipientAvailable !== state.recipientAvailable ||
      this.state.confirmed !== state.confirmed
    this.state = state.confirmed
      ? { ...state, center: [...state.center] }
      : { ...state, center: [...state.center], phase: 'M0', proposal: null }
    if (!this.drag) this.ground = this.siteGround(this.state.center)
    if (newAnimation) this.startAt = performance.now()
    if (!newAnimation) {
      this.positionPlacementHandle()
      this.viewer.scene.requestRender()
      return
    }
    this.rebuild()
  }
  replay(): void {
    this.startAt = performance.now()
    this.viewer.scene.requestRender()
  }
  skip(): void {
    this.startAt = performance.now() - 6000
    this.viewer.scene.requestRender()
  }
  focus(view: 'site' | 'connection' | 'park', duration = 1.2): void {
    if (this.destroyed) return
    const connection =
      view === 'connection' && activePoloProposal(this.state) !== 'green_roof'
    const target = this.point(
      connection ? 100 : 0,
      view === 'park' ? -130 : -35,
      view === 'park' ? -100 : -35,
    )
    const offset = new HeadingPitchRange(
      CesiumMath.toRadians(-24),
      CesiumMath.toRadians(view === 'park' ? -65 : -43),
      view === 'park' ? 2400 : connection ? 710 : 760,
    )
    if (duration === 0 || this.reducedMotion.matches) {
      this.viewer.camera.viewBoundingSphere(
        new BoundingSphere(target, 1),
        offset,
      )
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    } else
      this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
        offset,
        duration,
      })
    this.viewer.scene.requestRender()
  }
  zoom(inward: boolean): void {
    const amount = Math.max(
      40,
      this.viewer.camera.positionCartographic.height * 0.22,
    )
    if (inward) this.viewer.camera.zoomIn(amount)
    else this.viewer.camera.zoomOut(amount)
    this.viewer.scene.requestRender()
  }
  setLocal(): void {
    this.cancelPlacementDrag()
    this.connectionRevision++
    this.online = false
    if (this.tileset) this.tileset.show = false
    this.aerial.show = true
    this.viewer.scene.globe.show = true
    this.ground = sampleElevation(this.grid, ...this.state.center) + 0.7
    this.fieldGround = sampleElevation(this.grid, ...POLO_CENTER) + 0.7
    this.rebuild()
    this.callbacks.onlineChanged('local')
  }
  async connectPhotorealistic(token: string): Promise<void> {
    const revision = ++this.connectionRevision
    this.callbacks.onlineChanged('connecting')
    try {
      if (this.tileset && this.token !== token) {
        this.viewer.scene.primitives.remove(this.tileset)
        this.tileset = undefined
      }
      if (!this.tileset) {
        const resource = await IonResource.fromAssetId(2275207, {
          accessToken: token,
        })
        const tileset = await Cesium3DTileset.fromUrl(resource, {
          maximumScreenSpaceError: 14,
          cacheBytes: 256 * 1024 * 1024,
          maximumCacheOverflowBytes: 96 * 1024 * 1024,
          showCreditsOnScreen: true,
          enableCollision: true,
        })
        if (this.destroyed || revision !== this.connectionRevision) {
          tileset.destroy()
          return
        }
        this.tileset = tileset
        this.token = token
        this.viewer.scene.primitives.add(tileset)
        tileset.tileFailed.addEventListener(() => {
          this.callbacks.message(
            'A photorealistic tile could not load. Local aerial is available.',
          )
        })
        tileset.allTilesLoaded.addEventListener(() => {
          if (
            !this.online ||
            this.destroyed ||
            this.drag ||
            !this.viewer.scene.sampleHeightSupported
          )
            return
          const height = this.viewer.scene.sampleHeight(
            Cartographic.fromDegrees(...this.state.center),
            this.source.entities.values,
          )
          const fieldHeight = this.viewer.scene.sampleHeight(
            Cartographic.fromDegrees(...POLO_CENTER),
            this.source.entities.values,
          )
          let changed = false
          if (
            height !== undefined &&
            Number.isFinite(height) &&
            Math.abs(height - this.ground) > 1 &&
            Math.abs(
              height - sampleElevation(this.grid, ...this.state.center),
            ) < 100
          ) {
            this.ground = height + 0.7
            changed = true
          }
          if (
            fieldHeight !== undefined &&
            Number.isFinite(fieldHeight) &&
            Math.abs(fieldHeight - this.fieldGround) > 1 &&
            Math.abs(fieldHeight - sampleElevation(this.grid, ...POLO_CENTER)) <
              100
          ) {
            this.fieldGround = fieldHeight + 0.7
            changed = true
          }
          if (changed) this.rebuild()
        })
      }
      if (this.destroyed || revision !== this.connectionRevision) return
      this.online = true
      this.tileset.show = true
      this.aerial.show = false
      this.viewer.scene.globe.show = false
      this.callbacks.onlineChanged('online')
      this.viewer.scene.requestRender()
    } catch {
      if (this.destroyed || revision !== this.connectionRevision) return
      this.setLocal()
      this.callbacks.onlineChanged('error')
      throw new Error(
        'Photorealistic 3D could not connect. The local Golden Gate Park map is ready.',
      )
    }
  }
  destroy(): void {
    if (this.destroyed) return
    this.finishPlacementDrag(false)
    this.destroyed = true
    this.connectionRevision++
    cancelAnimationFrame(this.animation)
    this.removePostRender()
    window.removeEventListener('blur', this.onPlacementCancel)
    this.placementHandle.removeEventListener(
      'pointerdown',
      this.onPlacementDown,
    )
    this.placementHandle.removeEventListener(
      'pointermove',
      this.onPlacementMove,
    )
    this.placementHandle.removeEventListener('pointerup', this.onPlacementUp)
    this.placementHandle.removeEventListener(
      'pointercancel',
      this.onPlacementCancel,
    )
    this.placementHandle.removeEventListener(
      'lostpointercapture',
      this.onPlacementCancel,
    )
    this.placementHandle.removeEventListener('keydown', this.onPlacementKey)
    this.viewer.canvas.removeEventListener(
      'pointerdown',
      this.onCampusDown,
      true,
    )
    this.viewer.canvas.removeEventListener(
      'pointermove',
      this.onPlacementMove,
      true,
    )
    this.viewer.canvas.removeEventListener(
      'pointerup',
      this.onPlacementUp,
      true,
    )
    this.viewer.canvas.removeEventListener(
      'pointercancel',
      this.onPlacementCancel,
      true,
    )
    this.viewer.canvas.removeEventListener(
      'lostpointercapture',
      this.onPlacementCancel,
      true,
    )
    this.placementHandle.remove()
    this.handler.destroy()
    this.viewer.destroy()
  }
}
