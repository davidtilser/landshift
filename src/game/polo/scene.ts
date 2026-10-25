import './placement.css'
import {
  CallbackPositionProperty,
  CallbackProperty,
  ConstantProperty,
  ColorMaterialProperty,
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
import { INITIAL_POLO_STATE, POLO_CENTER, POLO_PHASES } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import type { EnvironmentalLayer } from './impact.ts'
import { poloTransitionFrame } from './transitions.ts'
import type { PoloTransitionFrame } from './transitions.ts'
import { segmentReveal, workPass } from './scene-animation.ts'
import {
  poloReactions,
  poloProtestTurnout,
  poloProtesterPosition,
} from './reactions.ts'
import { poloOpinions } from './opinions.ts'
import { poloGeometryScale } from './size.ts'
import { usAcres } from './us-units.ts'
import { PoloOpinionBubbles } from './opinion-bubbles.ts'
import { PoloOpinionReveal } from './opinion-reveal.ts'
import { poloConstructionStarted, poloPlacementValid } from './placement.ts'
import { PoloAccessScene } from './access-scene.ts'
import { POLO_ACCESS_FIELD_ENTRY, POLO_ACCESS_ROAD } from './access.ts'
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
  transitionChanged: (status: {
    phase: PoloPhase
    progress: number
    playing: boolean
    caption: string
  }) => void
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
  private environmentalLayer: EnvironmentalLayer | null = null
  private protestActive = false
  private readonly source = new CustomDataSource('polo-guided-demo')
  private readonly aerial: ImageryLayer
  private readonly callbacks: SceneCallbacks
  private readonly handler: ScreenSpaceEventHandler
  private readonly grid: ElevationGrid
  private readonly access: PoloAccessScene
  private readonly reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  private state: PoloSceneState = {
    ...INITIAL_POLO_STATE,
    center: [...INITIAL_POLO_STATE.center],
  }
  private readonly placementHandle = document.createElement('button')
  private readonly placementControls = document.createElement('div')
  private readonly placementConfirm = document.createElement('button')
  private placementEdited = false
  private overview = true
  private readonly removePostRender: () => void
  private readonly opinionBubbles: PoloOpinionBubbles
  private readonly opinionReveal = new PoloOpinionReveal()
  private readonly opinionAnchors = new Map<
    CommunityId,
    CallbackPositionProperty
  >()
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
  private phaseStartedAt = performance.now()
  private baselinePlaying = false
  private transition: PoloTransitionFrame = poloTransitionFrame('M0', 0, false)
  private transitionStatus = ''
  private settleAt = Number.NEGATIVE_INFINITY
  private readonly visibilityUpdates: (() => void)[] = []
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
    this.access = new PoloAccessScene(
      viewer,
      grid,
      () => this.source.entities.values,
    )
    this.access.setState(this.state)
    this.handler = new ScreenSpaceEventHandler(viewer.canvas)
    this.handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        if (this.overview) return
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
        if (this.state.confirmed) {
          this.viewer.canvas.style.cursor = ''
          return
        }
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
    this.placementControls.className = 'polo-placement-controls'
    this.placementControls.setAttribute('role', 'group')
    this.placementControls.setAttribute('aria-label', 'Campus placement')
    this.placementConfirm.type = 'button'
    this.placementConfirm.className = 'polo-placement-confirm'
    this.placementConfirm.dataset['poloAction'] = 'confirm-location'
    this.placementConfirm.textContent = '✓ Confirm location'
    this.placementConfirm.setAttribute('aria-keyshortcuts', 'Enter')
    this.placementConfirm.title = 'Confirm location (Enter)'
    this.placementConfirm.hidden = true
    this.placementControls.append(this.placementHandle, this.placementConfirm)
    viewer.container.append(this.placementControls)
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
    this.opinionBubbles = new PoloOpinionBubbles(
      viewer.container,
      callbacks.communityRequested,
    )
    this.removePostRender = viewer.scene.postRender.addEventListener(() => {
      this.positionPlacementHandle()
      this.opinionBubbles.position((id) => {
        const world = this.opinionAnchors
          .get(id)
          ?.getValue(viewer.clock.currentTime)
        return world
          ? SceneTransforms.worldToWindowCoordinates(viewer.scene, world)
          : undefined
      })
    })
    this.rebuild()
    this.showCity()
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
    if (this.overview || this.state.confirmed || this.drag) return
    const ray = this.viewer.camera.getPickRay(position)
    const center =
      ray &&
      positionOnPlane(ray, placementPlane(this.state.center, this.ground))
    if (center) this.requestPosition(center)
  }
  private requestPosition(center: LngLat): boolean {
    if (this.destroyed || this.overview || this.state.confirmed) return false
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
    if (this.overview || this.state.confirmed) return
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
    if (this.overview || this.state.confirmed) return
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
    this.placementConfirm.hidden = true
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
    this.positionPlacementHandle()
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
    if (this.state.confirmed) return
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
    if (this.state.confirmed) return
    const next = ((bearing % 360) + 360) % 360
    if (this.destroyed || !this.callbacks.rotationRequested(next)) return
    if (this.state.bearing !== next)
      this.setState({ ...this.state, bearing: next })
  }
  private readonly positionPlacementHandle = (): void => {
    if (this.destroyed || this.viewer.isDestroyed()) return
    this.placementControls.hidden = this.overview || this.state.confirmed
    this.placementConfirm.hidden =
      !this.placementEdited || this.state.confirmed || this.drag !== undefined
    if (this.overview || this.state.confirmed) return
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
      this.placementControls.style.visibility = 'hidden'
      return
    }
    this.placementControls.style.visibility = 'visible'
    const halfWidth = this.placementControls.offsetWidth / 2 + 12
    const x = Math.max(
      halfWidth,
      Math.min(this.viewer.canvas.clientWidth - halfWidth, point.x),
    )
    this.placementControls.style.left = `${x.toFixed(1)}px`
    this.placementControls.style.top = `${point.y.toFixed(1)}px`
  }
  cancelPlacementDrag(): void {
    this.finishPlacementDrag(true)
  }
  resetPlacementControls(): void {
    this.placementEdited = false
    this.positionPlacementHandle()
  }

  private elapsed(): number {
    return this.reducedMotion.matches
      ? 6
      : (performance.now() - this.startAt) / 1000
  }
  private point(x: number, y: number, z = 0): Cartesian3 {
    return Cartesian3.fromDegrees(
      ...poloCoordinate(
        x,
        y,
        this.state.center,
        this.state.bearing,
        poloGeometryScale(this.state),
      ),
      this.ground + z,
    )
  }
  private campusOrientation(extraHeading = 0): Quaternion {
    return FixedFrameTransforms.headingPitchRollQuaternion(
      this.point(0, 0, 0),
      new HeadingPitchRoll(
        CesiumMath.toRadians(this.state.bearing + extraHeading),
        0,
        0,
      ),
    )
  }
  private surfaceMaterial(css: string): ColorMaterialProperty {
    const color = Color.fromCssColorString(css)
    return new ColorMaterialProperty(
      new CallbackProperty(
        () =>
          this.reducedMotion.matches
            ? color
            : color.withAlpha(
                color.alpha *
                  Math.min(
                    1,
                    Math.max(0.25, (performance.now() - this.settleAt) / 450),
                  ),
              ),
        false,
      ),
    )
  }
  private revealBox(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    css: string,
    fraction: () => number,
    axis: 'height' | 'width' = 'height',
  ): Entity {
    const entity = this.box(x, y, z, width, depth, height, css)
    entity.position = new CallbackPositionProperty(() => {
      const part = Math.max(0, Math.min(1, fraction()))
      return this.point(
        axis === 'width' ? x - width / 2 + (width * part) / 2 : x,
        y,
        z + (axis === 'height' ? height * part : height) / 2,
      )
    }, false)
    if (entity.box) {
      entity.box.show = new CallbackProperty(() => fraction() > 0.001, false)
      entity.box.dimensions = new CallbackProperty(
        () =>
          new Cartesian3(
            (axis === 'width' ? Math.max(0.02, width * fraction()) : width) *
              poloGeometryScale(this.state),
            depth * poloGeometryScale(this.state),
            axis === 'height' ? Math.max(0.02, height * fraction()) : height,
          ),
        false,
      )
    }
    return entity
  }
  private revealGroup(first: number, shown: () => boolean): void {
    const entities = this.source.entities.values.slice(first)
    const update = (): void => {
      for (const entity of entities) entity.show = shown()
    }
    update()
    this.visibilityUpdates.push(update)
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
        dimensions: new Cartesian3(
          width * (fieldAnchored ? 1 : poloGeometryScale(this.state)),
          depth * (fieldAnchored ? 1 : poloGeometryScale(this.state)),
          height,
        ),
        material: this.surfaceMaterial(css),
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
        topRadius: radius * poloGeometryScale(this.state),
        bottomRadius: radius * poloGeometryScale(this.state),
        slices: 12,
        material: this.surfaceMaterial(css),
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
        font: '600 15px sans-serif',
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
        scale: community ? 1 : 0.85,
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
    movement?: (activity: number) => readonly [number, number],
  ): (z: number) => CallbackPositionProperty {
    const scale = protesting ? 2 : 1
    const position = (z: number): CallbackPositionProperty =>
      new CallbackPositionProperty(() => {
        const activity = this.reducedMotion.matches
          ? 6
          : (performance.now() - this.activityStartAt) / 1000
        const offset = walking ? Math.sin(activity * 0.45 + index) * 7 : 0
        const [px, py] = movement?.(activity) ?? [
          x + offset,
          y + Math.sin(index) * 1.5,
        ]
        return fieldAnchored
          ? this.fieldPoint(px, py, z * scale + base)
          : this.point(px, py, z * scale + base)
      }, false)
    const orientation = fieldAnchored
      ? new ConstantProperty(
          FixedFrameTransforms.headingPitchRollQuaternion(
            this.fieldPoint(x, y),
            new HeadingPitchRoll(),
          ),
        )
      : new CallbackProperty(() => this.campusOrientation(), false)
    this.source.entities.add({
      position: position(1.5),
      orientation,
      cylinder: {
        length: 2 * scale,
        topRadius: 0.5 * scale,
        bottomRadius: 0.5 * scale,
        slices: 6,
        material: Color.fromCssColorString(color),
      },
    })
    this.source.entities.add({
      position: position(2.9),
      ellipsoid: {
        radii: new Cartesian3(0.55 * scale, 0.55 * scale, 0.55 * scale),
        stackPartitions: 6,
        slicePartitions: 6,
        material: Color.fromCssColorString('#dfb998'),
      },
    })
    if (protesting) {
      const pole = this.box(
        x,
        y,
        2.4,
        0.2 * scale,
        0.2 * scale,
        2.5 * scale,
        '#786a49',
        fieldAnchored,
      )
      const board = this.box(
        x,
        y,
        4.1,
        4.2 * scale,
        0.3 * scale,
        2 * scale,
        '#f4e7b4',
        fieldAnchored,
      )
      pole.position = position(3.65)
      board.position = position(5.1)
      pole.orientation = orientation
      board.orientation = orientation
    }
    return position
  }
  private fieldPlayers(leaving = false): void {
    for (let index = 0; index < 12; index++) {
      const x = -80 + index * 14
      const y = index % 2 ? 22 : -15
      this.person(
        x,
        y,
        index % 2 ? '#f0c766' : '#638bab',
        true,
        index,
        false,
        0,
        true,
        leaving
          ? (activity) => {
              const progress = Math.min(1, this.transition.turfRemoved * 2)
              return [
                x + Math.sin(activity * 0.45 + index) * 4,
                y + ((index % 2 ? 83 : -83) - y) * progress,
              ]
            }
          : undefined,
      )
    }
  }
  private protestCrowd(): void {
    const reactions = poloReactions(this.state)
    const groups = ['neighbor', 'student', 'nature'] as const
    const colors = ['#ce7755', '#698fa7', '#728c56'] as const
    const turnout = poloProtestTurnout(this.state, this.protestActive)
    for (let index = 0; index < turnout; index++) {
      const group = groups[index % groups.length] ?? 'neighbor'
      const position = this.person(
        0,
        -92,
        colors[index % colors.length] ?? '#ce7755',
        true,
        index + 24,
        true,
        0,
        true,
        (activity) => poloProtesterPosition(index, activity),
      )
      if (index % 20 === 3) {
        const sign = this.label(
          0,
          -92,
          10,
          reactions.voices[group].sign ?? 'Hear us out',
          '#985947',
          undefined,
          new Cartesian2(0, -5),
          true,
        )
        sign.position = position(6.4)
        if (sign.label) {
          sign.label.font = new ConstantProperty('700 11px sans-serif')
          sign.label.scale = new ConstantProperty(0.85)
          sign.label.backgroundPadding = new ConstantProperty(
            new Cartesian2(5, 3),
          )
        }
      }
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
    this.fieldPlayers()
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
          dimensions: new Cartesian3(
            hall.width * poloGeometryScale(this.state),
            hall.depth * poloGeometryScale(this.state),
            18,
          ),
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
          POLO_LAYOUT.pad.width * poloGeometryScale(this.state),
          POLO_LAYOUT.pad.depth * poloGeometryScale(this.state),
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
  private workSurface(fraction: () => number, css: string, z: number): void {
    for (let lane = 0; lane < 8; lane++) {
      const part = (): number => segmentReveal(fraction(), lane, 8)
      const tile = this.box(0, -43.75 + lane * 12.5, z, 320, 12.5, 0.16, css)
      tile.position = new CallbackPositionProperty(
        () =>
          this.point(
            lane % 2 === 0 ? -160 + 160 * part() : 160 - 160 * part(),
            -43.75 + lane * 12.5,
            z + 0.08,
          ),
        false,
      )
      if (tile.box) {
        tile.box.show = new CallbackProperty(() => part() > 0.001, false)
        tile.box.dimensions = new CallbackProperty(
          () =>
            new Cartesian3(
              Math.max(0.02, 320 * part()) * poloGeometryScale(this.state),
              12.5 * poloGeometryScale(this.state),
              0.16,
            ),
          false,
        )
      }
    }
  }
  private machinery(
    x: number,
    y: number,
    roller: boolean,
    travel?: () => { x: number; y: number; heading: number; shown: boolean },
  ): void {
    const firstEntity = this.source.entities.values.length
    const scale = 1.5
    this.box(x, y, scale, 13 * scale, 7 * scale, 4 * scale, '#dc493e')
    this.box(
      x - 3 * scale,
      y,
      5 * scale,
      5 * scale,
      5 * scale,
      4 * scale,
      '#ad352f',
    )
    for (const offset of [-4.5, 4.5]) {
      this.cylinder(
        x + offset * scale,
        y - 3.5 * scale,
        0.4 * scale,
        1.7 * scale,
        1.4 * scale,
        '#414f43',
      )
      this.cylinder(
        x + offset * scale,
        y + 3.5 * scale,
        0.4 * scale,
        1.7 * scale,
        1.4 * scale,
        '#414f43',
      )
    }
    if (roller)
      this.box(
        x + 8 * scale,
        y,
        0.5 * scale,
        5 * scale,
        10 * scale,
        3.5 * scale,
        '#6b7164',
      )
    else
      this.box(
        x + 8 * scale,
        y,
        0.4 * scale,
        2 * scale,
        11 * scale,
        3.8 * scale,
        '#b2b4a5',
      )
    for (const entity of this.source.entities.values.slice(firstEntity)) {
      const local = this.localAnchors.get(entity)
      if (!local) continue
      entity.position = new CallbackPositionProperty(() => {
        const move = travel?.() ?? {
          x: x + Math.sin(this.elapsed() * 0.4) * 22,
          y,
          heading: 0,
          shown: true,
        }
        const angle = (move.heading * Math.PI) / 180,
          dx = local[0] - x,
          dy = local[1] - y
        return this.point(
          move.x + dx * Math.cos(angle) + dy * Math.sin(angle),
          move.y - dx * Math.sin(angle) + dy * Math.cos(angle),
          local[2],
        )
      }, false)
      entity.orientation = new CallbackProperty(
        () => this.campusOrientation(travel?.().heading ?? 0),
        false,
      )
    }
    if (travel) this.revealGroup(firstEntity, () => travel().shown)
  }

  private campus(): void {
    // All horizontal construction geometry follows the selected site area.
    if (this.state.phase === 'M1') {
      this.workSurface(() => this.transition.turfRemoved, PALETTE.soil, 0.7)
      this.workSurface(() => this.transition.grading, '#b69a70', 0.88)
      this.workSurface(
        () => this.transition.compaction,
        PALETTE.compacted,
        1.06,
      )
      this.machinery(0, 0, false, () => ({
        ...workPass(
          this.transition.turfRemoved < 1
            ? this.transition.turfRemoved
            : this.transition.grading,
        ),
        shown: this.transition.grading < 1,
      }))
      this.machinery(0, 0, true, () => ({
        ...workPass(this.transition.compaction),
        shown: this.transition.grading === 1 && this.transition.compaction < 1,
      }))
      this.machinery(0, 0, false, () => ({
        x: -145 + 290 * this.transition.foundation,
        y: -44,
        heading: 0,
        shown: this.transition.compaction === 1 && !this.transition.complete,
      }))
    } else {
      this.box(
        0,
        0,
        1.06,
        POLO_LAYOUT.workBand.width,
        POLO_LAYOUT.workBand.depth,
        0.16,
        PALETTE.compacted,
      )
    }
    let foundationIndex = 0,
      columnIndex = 0,
      roofIndex = 0,
      wallIndex = 0,
      beamIndex = 0,
      equipmentIndex = 0
    for (const hall of POLO_LAYOUT.halls) {
      const { x, y, width, depth } = hall
      for (let bay = 0; bay < 10; bay++) {
        const index = foundationIndex++
        this.revealBox(
          x - 45 + bay * 10,
          y,
          0.95,
          10,
          depth,
          3,
          '#c4d0c0',
          () => segmentReveal(this.transition.foundation, index, 20),
          'width',
        )
      }
      for (const dx of [-46, -15, 15, 46])
        for (const dy of [-26, 26]) {
          const index = columnIndex++
          this.revealBox(x + dx, y + dy, 3.95, 1.8, 1.8, 14, '#e5e6d8', () =>
            segmentReveal(Math.min(1, this.transition.frame / 0.75), index, 16),
          )
        }
      for (const dy of [-26, 26]) {
        const index = beamIndex++
        this.revealBox(
          x,
          y + dy,
          16.6,
          width - 4,
          1.6,
          1.2,
          '#d6dfd0',
          () => segmentReveal((this.transition.frame - 0.75) / 0.25, index, 4),
          'width',
        )
      }
      for (let bay = 0; bay < 10; bay++) {
        const index = roofIndex++,
          part = (): number => segmentReveal(this.transition.roof, index, 20)
        const panel = this.revealBox(
          x - 45 + bay * 10,
          y,
          17.8,
          10,
          depth,
          0.4,
          '#d6decf',
          part,
        )
        panel.position = new CallbackPositionProperty(
          () => this.point(x - 45 + bay * 10, y, 18 + (1 - part()) * 18),
          false,
        )
      }
      for (const face of [-1, 1])
        for (let bay = 0; bay < 8; bay++) {
          const index = wallIndex++,
            part = (): number =>
              segmentReveal(this.transition.cladding, index, 48)
          this.revealBox(
            x - 43.75 + bay * 12.5,
            y + face * 30,
            3.95,
            12.5,
            0.6,
            14,
            PALETTE.dark,
            part,
          )
          if (face === -1) {
            const first = this.source.entities.values.length
            this.box(
              x - 43.75 + bay * 12.5,
              y - 30.4,
              5,
              8,
              0.5,
              8.5,
              '#8caeb0',
            )
            this.box(
              x - 43.75 + bay * 12.5,
              y - 30.7,
              13.5,
              8,
              0.5,
              0.9,
              '#acd9d5',
            )
            this.revealGroup(first, () => part() > 0.8)
          }
        }
      for (const side of [-1, 1])
        for (let bay = 0; bay < 4; bay++) {
          const index = wallIndex++
          this.revealBox(
            x + side * 50,
            y - 22.5 + bay * 15,
            3.95,
            0.6,
            15,
            14,
            PALETTE.dark,
            () => segmentReveal(this.transition.cladding, index, 48),
          )
        }
      for (let cooler = 0; cooler < 4; cooler++) {
        const index = equipmentIndex++,
          first = this.source.entities.values.length
        this.box(x - 35 + cooler * 23, 23, 18.8, 13, 10, 3, '#a8b8aa')
        this.cylinder(x - 35 + cooler * 23, 23, 22, 3.5, 0.6, '#58756e')
        this.revealGroup(
          first,
          () => segmentReveal(this.transition.commissioning, index, 8) > 0.15,
        )
      }
    }
    // The 28,000 m² developed band includes 12,000 m² roofs; its exposed hardstanding is 16,000 m².
    for (let tile = 0; tile < 16; tile++)
      this.revealBox(
        -150 + tile * 20,
        0,
        1.24,
        20,
        POLO_LAYOUT.developedBand.depth,
        0.18,
        PALETTE.concrete,
        () => segmentReveal(this.transition.hardstanding, tile, 16),
        'width',
      )
    for (const side of [-1, 1])
      for (let tile = 0; tile < 16; tile++) {
        const index = (side === -1 ? 0 : 16) + tile,
          part = (): number =>
            segmentReveal(this.transition.landscaping, index, 32)
        this.revealBox(
          -150 + tile * 20,
          side * 46.875,
          1.24,
          20,
          6.25,
          0.2,
          '#a6b87c',
          part,
          'width',
        )
        if (tile % 2 === 0) {
          const first = this.source.entities.values.length
          this.source.entities.add({
            position: new CallbackPositionProperty(
              () => this.point(-150 + tile * 20, side * 46.875, 1.8),
              false,
            ),
            ellipsoid: {
              radii: new CallbackProperty(
                () =>
                  new Cartesian3(
                    Math.max(0.02, 1.8 * part()) *
                      poloGeometryScale(this.state),
                    Math.max(0.02, 1.4 * part()) *
                      poloGeometryScale(this.state),
                    Math.max(0.02, 0.8 * part()),
                  ),
                false,
              ),
              material: this.surfaceMaterial('#829b58'),
              stackPartitions: 6,
              slicePartitions: 6,
            },
          })
          this.revealGroup(first, () => part() > 0.02)
        }
      }
    const gate = this.source.entities.values.length
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
    this.revealGroup(gate, () => this.transition.commissioning > 0.6)
    const services = this.source.entities.values.length
    this.box(-175, -65, 0, 14, 10, 11, '#8d9c90')
    this.cylinder(133, -23, 1, 8, 13, '#a1c2c1')
    this.revealGroup(services, () => this.transition.commissioning > 0.7)
    if (this.state.phase === 'M4' || this.state.phase === 'M5') {
      const first = this.source.entities.values.length
      this.box(0, 0, 1, 5, 5, 52, '#dcaf45')
      this.box(0, 0, 49, 230, 3, 3, '#f0c95b')
      const hook = (): LocalPoint => {
        const progress = Math.min(19.999, this.transition.roof * 20)
        const index = Math.floor(progress),
          hall =
            POLO_LAYOUT.halls[Math.min(1, Math.floor(index / 10))] ??
            POLO_LAYOUT.halls[0]
        const part = segmentReveal(this.transition.roof, index, 20)
        return [hall.x - 45 + (index % 10) * 10, 0, 18 + (1 - part) * 18]
      }
      this.source.entities.add({
        polyline: {
          positions: new CallbackProperty(() => {
            const point = hook()
            return [this.point(point[0], point[1], 50), this.point(...point)]
          }, false),
          width: 2,
          arcType: ArcType.NONE,
          material: Color.fromCssColorString('#655f43'),
        },
      })
      this.revealGroup(
        first,
        () => this.state.phase === 'M4' || this.transition.cladding < 0.9,
      )
      this.machinery(0, 0, false, () => ({
        x: 95 + 180 * this.transition.commissioning,
        y: -44,
        heading: 0,
        shown:
          this.state.phase === 'M4' || this.transition.commissioning < 0.95,
      }))
    }
  }
  private operation(): void {
    const selected = activePoloProposal(this.state)
    let first = this.source.entities.values.length
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
    this.revealGroup(first, () => this.transition.operation > 0.02)
    first = this.source.entities.values.length
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
    this.revealGroup(first, () => this.transition.operation > 0.25)
    first = this.source.entities.values.length
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
    this.revealGroup(first, () => this.transition.operation > 0.5)
    if (selected !== 'recycled_water') {
      first = this.source.entities.values.length
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
      this.revealGroup(first, () => this.transition.operation > 0.7)
    }
    if (!selected) {
      first = this.source.entities.values.length
      this.label(0, 22, 28, 'Computing continues', '#426b60')
      this.revealGroup(first, () => this.transition.operation > 0.75)
    }
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
            radii: new Cartesian3(
              4.5 * poloGeometryScale(this.state),
              3.2 * poloGeometryScale(this.state),
              1.7,
            ),
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
          [x - 5, y, ['M4', 'M5', 'M6'].includes(this.state.phase) ? 21 : 2],
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
    const reactions = poloReactions(this.state)
    if (!poloConstructionStarted(this.state)) {
      this.opinionAnchors.clear()
      this.opinionBubbles.update([])
      this.opinionBubbles.element.hidden = true
      this.protestCrowd()
      return
    }
    const bubbles: {
      id: CommunityId
      x: number
      y: number
      color: string
    }[] = [
      {
        id: 'neighbor',
        x: -150,
        y: 95,
        color: '#84734d',
      },
      {
        id: 'nature',
        x: 120,
        y: 145,
        color: '#587448',
      },
      { id: 'student', x: 25, y: -145, color: '#5b7d88' },
      { id: 'operator', x: 180, y: 35, color: '#647f70' },
    ]
    this.opinionAnchors.clear()
    this.opinionBubbles.setVisibleCount(
      this.opinionReveal.count(performance.now()),
    )
    this.opinionBubbles.update(poloOpinions(this.state))
    this.opinionBubbles.element.hidden =
      this.overview || this.environmentalLayer !== null
    for (const [index, bubble] of bubbles.entries()) {
      const protesting =
        !this.state.confirmed && reactions.voices[bubble.id].sign !== null
      const position = this.person(
        bubble.x,
        bubble.y,
        bubble.color,
        true,
        index + 7,
        protesting,
        0,
        true,
      )
      this.opinionAnchors.set(bubble.id, position(protesting ? 6 : 12))
    }
  }
  private rebuild(): void {
    this.source.entities.removeAll()
    this.draggableEntities.clear()
    this.localAnchors.clear()
    this.visibilityUpdates.length = 0
    this.placementControls.hidden = this.overview || this.state.confirmed
    if (!this.state.confirmed) {
      this.placementScene()
      this.fieldActivity()
      this.community()
      this.environmentalOverlay()
      this.positionPlacementHandle()
      this.viewer.scene.requestRender()
      return
    }
    // During the conversation keep the real field visible, without a synthetic
    // turf slab, pitch markings, construction traffic or other works.
    if (!poloConstructionStarted(this.state)) {
      this.community()
      if (this.state.rain) this.rain()
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
    this.campus()
    if (phase === 'M5') {
      const ready = this.source.entities.values.length
      this.label(
        0,
        48,
        25,
        'Commissioning · equipment tested, computing not yet running',
        '#6b826f',
      )
      this.revealGroup(ready, () => this.transition.complete)
    }
    if (phase === 'M6') this.operation()
    const proposal = activePoloProposal(this.state)
    if (proposal === 'heat_reuse_neighbors') this.heatReuse()
    else if (proposal === 'recycled_water') this.recycledWater()
    else if (proposal === 'green_roof') this.greenRoof()
    if (this.state.rain) this.rain()
    this.fieldActivity()
    this.community()
    this.environmentalOverlay()
    this.viewer.scene.requestRender()
  }

  setProtestActive(active: boolean): void {
    if (this.destroyed || this.protestActive === active) return
    this.protestActive = active
    this.rebuild()
  }

  /** Separate explanatory overlays; routes are schematic, never utility records. */
  setEnvironmentalLayer(layer: EnvironmentalLayer | null): void {
    if (this.destroyed || this.environmentalLayer === layer) return
    this.environmentalLayer = layer
    this.rebuild()
  }
  getEnvironmentalLayer(): EnvironmentalLayer | null {
    return this.environmentalLayer
  }
  private environmentalOverlay(): void {
    const layer = this.environmentalLayer
    if (!layer) return
    // Give the selected mechanism room; people and chat shortcuts stay active.
    for (const entity of this.source.entities.values)
      if (entity.label) entity.label.show = new ConstantProperty(false)
    const operating = this.state.confirmed && this.state.phase === 'M6'
    if (layer === 'water') {
      const recycled = activePoloProposal(this.state) === 'recycled_water'
      const supply: LocalPoint[] = recycled
        ? [
            [330, 30, -3],
            [222, 30, -3],
            [181, 30, -3],
            [181, -7, -3],
            [133, -7, -3],
            [133, -23, 6],
          ]
        : [
            [330, -140, -3],
            [245, -140, -3],
            [245, -70, -3],
            [150, -70, -3],
            [133, -23, 6],
          ]
      const drainage: LocalPoint[] = [
        [133, -23, -3],
        [170, -95, -3],
        [290, -95, -3],
        [330, -95, -3],
      ]
      this.cutawayPipe(supply, recycled ? '#b180ef' : '#10abed')
      this.cutawayPipe(drainage, '#647da2')
      if (operating) this.cutawayFlow(supply, '#bcefff')
      this.label(
        330,
        recycled ? 30 : -150,
        8,
        recycled ? 'Possible recycled supply' : 'Possible supply main',
        '#426a8f',
        undefined,
        new Cartesian2(-80, -45),
      )
      this.label(
        305,
        -80,
        8,
        'Drain route · destination unverified',
        '#536982',
        undefined,
        new Cartesian2(-80, -15),
      )
      this.label(215, -155, 8, 'Pipe cutaway · not groundwater', '#426a8f')
    } else if (layer === 'electricity') {
      const power: LocalPoint[] = [
        [-330, -140, 5],
        [-245, -140, 5],
        [-245, -65, 5],
        [-175, -65, 5],
        [-65, 0, 20],
      ]
      this.path(power, '#ffc83d', 7)
      if (operating) this.flow(power, '#fff1ac', 6, 0.12, 2)
      this.label(
        -300,
        -150,
        12,
        'Schematic grid link · capacity unknown',
        '#80602e',
      )
    } else if (layer === 'land') {
      const halfWidth = POLO_LAYOUT.pad.width / 2
      const halfDepth = POLO_LAYOUT.pad.depth / 2
      const areas = [
        [-halfWidth, -halfDepth, 0.9],
        [halfWidth, -halfDepth, 0.9],
        [halfWidth, halfDepth, 0.9],
        [-halfWidth, halfDepth, 0.9],
        [-halfWidth, -halfDepth, 0.9],
      ] satisfies LocalPoint[]
      this.path(areas, '#a1e700', 8, true)
      this.label(
        0,
        85,
        7,
        `Authored ${usAcres(this.state.areaHa * 10_000)} subset · public land`,
        '#52773a',
      )
    } else {
      const active = activePoloProposal(this.state) === 'heat_reuse_neighbors'
      if (!active) {
        this.label(
          210,
          65,
          15,
          'Try Heat for neighbours in Operating',
          '#92623f',
        )
        return
      }
      const heat: LocalPoint[] = [
        [155, 6, -3],
        [180, 6, -3],
        [180, 21, -3],
        [202, 21, -3],
      ]
      const returned: LocalPoint[] = [
        [202, 30, -3],
        [173, 30, -3],
        [173, 14, -3],
        [155, 14, -3],
      ]
      this.cutawayPipe(heat, '#ee824b')
      this.cutawayPipe(returned, '#51b9d2')
      if (this.state.recipientAvailable) {
        this.cutawayFlow(heat, '#ffd29a')
        this.cutawayFlow(returned, '#bcefff')
      }
      this.label(
        235,
        70,
        17,
        this.state.recipientAvailable
          ? 'Model pool · heat received\nSavings unknown'
          : 'No recipient · heat delivery paused',
        '#92623f',
        undefined,
        new Cartesian2(-60, -20),
      )
    }
  }
  private cutawayPipe(points: readonly LocalPoint[], css: string): void {
    const material = new PolylineGlowMaterialProperty({
      color: Color.fromCssColorString(css),
      glowPower: 0.2,
    })
    this.source.entities.add({
      polyline: {
        positions: new CallbackProperty(
          () => points.map(([x, y, z]) => this.point(x, y, z)),
          false,
        ),
        arcType: ArcType.NONE,
        width: 7,
        material,
        depthFailMaterial: material,
      },
    })
    // Dynamic polylines can still be hidden by streamed meshes. These native
    // depth-independent pipe markers make the explanatory cutaway explicit.
    const length = points.slice(1).reduce((sum, point, index) => {
      const previous = points[index]
      return previous
        ? sum +
            Math.hypot(
              point[0] - previous[0],
              point[1] - previous[1],
              point[2] - previous[2],
            )
        : sum
    }, 0)
    const count = Math.max(1, Math.ceil(length / 3))
    for (let index = 0; index <= count; index++) {
      const fraction = index / (count + 1)
      this.source.entities.add({
        position: new CallbackPositionProperty(
          () => this.point(...pointOnPath(points, fraction)),
          false,
        ),
        point: {
          pixelSize: 5,
          color: Color.fromCssColorString(css),
          disableDepthTestDistance: Infinity,
        },
      })
    }
  }
  private cutawayFlow(points: readonly LocalPoint[], css: string): void {
    for (let index = 0; index < 5; index++)
      this.source.entities.add({
        position: new CallbackPositionProperty(
          () =>
            this.point(
              ...pointOnPath(points, this.elapsed() * 0.12 + index / 5),
            ),
          false,
        ),
        point: {
          pixelSize: 9,
          color: Color.fromCssColorString(css),
          disableDepthTestDistance: Infinity,
        },
      })
  }

  private publishTransition(): void {
    const progress = Math.round(this.transition.progress * 100) / 100
    const playing = this.baselinePlaying && !this.transition.complete
    const key = [
      this.state.phase,
      progress,
      playing,
      this.transition.caption,
    ].join('|')
    if (key === this.transitionStatus) return
    this.transitionStatus = key
    this.callbacks.transitionChanged({
      phase: this.state.phase,
      progress,
      playing,
      caption: this.transition.caption,
    })
  }
  private updateTransition(now: number): void {
    if (this.baselinePlaying) {
      this.transition = poloTransitionFrame(
        this.state.phase,
        (now - this.phaseStartedAt) / 1000,
        !this.reducedMotion.matches,
      )
      if (this.transition.complete) this.baselinePlaying = false
    }
    for (const update of this.visibilityUpdates) update()
    this.publishTransition()
  }
  private readonly animate = (now: number): void => {
    if (this.destroyed) return
    if (!document.hidden && now - this.renderedAt > 50) {
      this.renderedAt = now
      const wasPlaying = this.baselinePlaying
      this.updateTransition(now)
      this.access.update(now)
      const opinionsChanged = this.opinionBubbles.setVisibleCount(
        this.opinionReveal.count(now),
      )
      if (!this.reducedMotion.matches || wasPlaying || opinionsChanged)
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
    const previous = this.state
    if (previous.confirmed && !state.confirmed) this.placementEdited = false
    else if (
      !state.confirmed &&
      (previous.bearing !== state.bearing ||
        previous.center[0] !== state.center[0] ||
        previous.center[1] !== state.center[1])
    )
      this.placementEdited = true
    if (previous.confirmed && !state.confirmed) this.environmentalLayer = null
    const phaseChanged =
      previous.phase !== state.phase || previous.confirmed !== state.confirmed
    const sceneChanged =
      phaseChanged ||
      previous.areaHa !== state.areaHa ||
      previous.proposal !== state.proposal ||
      previous.preview !== state.preview ||
      previous.rain !== state.rain ||
      previous.recipientAvailable !== state.recipientAvailable
    this.state = state.confirmed
      ? { ...state, center: [...state.center] }
      : { ...state, center: [...state.center], phase: 'M0', proposal: null }
    this.access.setState(this.state)
    const now = performance.now()
    this.opinionReveal.setState(this.state, now)
    this.opinionBubbles.setVisibleCount(this.opinionReveal.count(now))
    if (phaseChanged) {
      const forward =
        this.state.confirmed &&
        POLO_PHASES.indexOf(this.state.phase) ===
          POLO_PHASES.indexOf(previous.phase) + 1
      this.baselinePlaying =
        forward &&
        !this.reducedMotion.matches &&
        !activePoloProposal(this.state)
      this.phaseStartedAt = now
      this.transition = poloTransitionFrame(
        this.state.phase,
        0,
        this.baselinePlaying,
      )
      this.settleAt =
        !forward && this.state.confirmed && !this.reducedMotion.matches
          ? now
          : Number.NEGATIVE_INFINITY
    }
    // Opening a concept settles operation; later proposal/rain replays cannot rebuild the baseline story.
    if (activePoloProposal(this.state)) {
      this.baselinePlaying = false
      this.transition = poloTransitionFrame(this.state.phase, 0, false)
    }
    if (!this.drag) this.ground = this.siteGround(this.state.center)
    if (sceneChanged) this.startAt = now
    if (!sceneChanged) {
      this.positionPlacementHandle()
      this.viewer.scene.requestRender()
      return
    }
    this.updateTransition(now)
    this.rebuild()
    this.publishTransition()
  }
  replay(): void {
    const now = performance.now()
    this.startAt = now
    if (!activePoloProposal(this.state) && this.state.confirmed) {
      this.phaseStartedAt = now
      this.baselinePlaying =
        this.state.phase !== 'M0' && !this.reducedMotion.matches
      this.transition = poloTransitionFrame(
        this.state.phase,
        0,
        this.baselinePlaying,
      )
      this.settleAt = Number.NEGATIVE_INFINITY
    }
    this.updateTransition(now)
    this.viewer.scene.requestRender()
  }
  skip(): void {
    this.startAt = performance.now() - 6000
    this.baselinePlaying = false
    this.transition = poloTransitionFrame(this.state.phase, 0, false)
    this.updateTransition(performance.now())
    this.viewer.scene.requestRender()
  }
  showCity(): void {
    if (this.destroyed) return
    this.cancelPlacementDrag()
    this.overview = true
    this.source.show = false
    this.opinionBubbles.element.hidden = true
    this.placementControls.hidden = true
    const controls = this.viewer.scene.screenSpaceCameraController
    controls.enableInputs = false
    controls.maximumZoomDistance = 40_000
    this.viewer.camera.cancelFlight()
    this.viewer.camera.viewBoundingSphere(
      new BoundingSphere(Cartesian3.fromDegrees(-122.442, 37.759, 0), 1),
      new HeadingPitchRange(
        CesiumMath.toRadians(-10),
        CesiumMath.toRadians(-72),
        23_000,
      ),
    )
    this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    this.viewer.scene.requestRender()
  }

  flyToPlacement(arrived: () => void, duration = 3.2): void {
    if (this.destroyed) return
    this.viewer.camera.cancelFlight()
    this.focus('site', duration, () => {
      if (this.destroyed) return
      this.overview = false
      this.source.show = true
      this.placementEdited = true
      this.opinionBubbles.element.hidden =
        !poloConstructionStarted(this.state) || this.environmentalLayer !== null
      const controls = this.viewer.scene.screenSpaceCameraController
      controls.enableInputs = true
      controls.maximumZoomDistance = 6500
      arrived()
      this.positionPlacementHandle()
      if (!this.state.confirmed)
        this.placementConfirm.focus({ preventScroll: true })
      this.viewer.scene.requestRender()
    })
  }

  /** Include the near service-road approach without pulling back to the whole route. */
  focusFoundations(duration = 1.2): void {
    if (this.destroyed) return
    const approach = BoundingSphere.fromPoints(
      [...POLO_ACCESS_ROAD.slice(-5), POLO_ACCESS_FIELD_ENTRY].map(
        (coordinate) =>
          Cartesian3.fromDegrees(
            ...coordinate,
            sampleElevation(this.grid, ...coordinate),
          ),
      ),
    )
    const bounds = BoundingSphere.union(
      approach,
      new BoundingSphere(
        this.point(0, 0, 15),
        205 * poloGeometryScale(this.state),
      ),
    )
    // Shift the framing west so the card leaves the worksite and approach visible.
    const center = Cartographic.fromCartesian(bounds.center)
    bounds.center = Cartesian3.fromRadians(
      center.longitude - 95 / (6378137 * Math.cos(center.latitude)),
      center.latitude,
      center.height,
    )
    const offset = new HeadingPitchRange(
      CesiumMath.toRadians(-24),
      CesiumMath.toRadians(-48),
      Math.max(850, bounds.radius * 2.8),
    )
    this.viewer.camera.cancelFlight()
    if (duration === 0 || this.reducedMotion.matches) {
      this.viewer.camera.viewBoundingSphere(bounds, offset)
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    } else this.viewer.camera.flyToBoundingSphere(bounds, { offset, duration })
    this.viewer.scene.requestRender()
  }

  focus(
    view: 'site' | 'connection' | 'park' | 'access',
    duration = 1.2,
    complete?: () => void,
  ): void {
    if (this.destroyed) return
    if (view === 'access') {
      const bounds = BoundingSphere.union(
        this.access.bounds(),
        new BoundingSphere(this.point(0, 0, 15), 205),
      )
      // Keep the approach clear of the story card on the left of the map.
      const center = Cartographic.fromCartesian(bounds.center)
      bounds.center = Cartesian3.fromRadians(
        center.longitude - 260 / (6378137 * Math.cos(center.latitude)),
        center.latitude,
        center.height,
      )
      const offset = new HeadingPitchRange(
        CesiumMath.toRadians(-12),
        CesiumMath.toRadians(-55),
        Math.max(950, bounds.radius * 3.4),
      )
      if (duration === 0 || this.reducedMotion.matches) {
        this.viewer.camera.viewBoundingSphere(bounds, offset)
        this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
        complete?.()
      } else
        this.viewer.camera.flyToBoundingSphere(bounds, {
          offset,
          duration,
          ...(complete ? { complete } : {}),
        })
      this.viewer.scene.requestRender()
      return
    }
    const connection =
      view === 'connection' && activePoloProposal(this.state) !== 'green_roof'
    const target = this.point(
      connection
        ? 100
        : view === 'site' && this.viewer.canvas.clientWidth > 700
          ? -70
          : 0,
      view === 'park' ? -130 : -35,
      view === 'park' ? -100 : -35,
    )
    const offset = new HeadingPitchRange(
      CesiumMath.toRadians(-24),
      CesiumMath.toRadians(view === 'park' ? -65 : -43),
      // A 30% tighter site view emphasizes buildings; concept views keep room for pipes.
      view === 'park'
        ? 2400
        : (connection ? 710 : 760 / 1.3) * poloGeometryScale(this.state),
    )
    if (duration === 0 || this.reducedMotion.matches) {
      this.viewer.camera.viewBoundingSphere(
        new BoundingSphere(target, 1),
        offset,
      )
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
      complete?.()
    } else
      this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
        offset,
        duration,
        ...(complete ? { complete } : {}),
      })
    this.viewer.scene.requestRender()
  }
  focusProtest(): void {
    if (this.destroyed) return
    // Frame the existing field-edge rally beside the leader's dialogue.
    const target = Cartesian3.fromDegrees(...POLO_CENTER, this.fieldGround)
    const local = FixedFrameTransforms.eastNorthUpToFixedFrame(target)
    const desktop = this.viewer.canvas.clientWidth > 700
    const offset = new Cartesian3(desktop ? -75 : 0, desktop ? -90 : -165, 2)
    Matrix4.multiplyByPoint(local, offset, target)
    const bounds = new BoundingSphere(target, 1)
    const view = new HeadingPitchRange(
      CesiumMath.toRadians(-24),
      CesiumMath.toRadians(-48),
      420,
    )
    if (this.reducedMotion.matches) {
      this.viewer.camera.viewBoundingSphere(bounds, view)
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    } else {
      this.viewer.camera.flyToBoundingSphere(bounds, {
        offset: view,
        duration: 0.9,
      })
    }
    this.viewer.scene.requestRender()
  }
  pan(horizontal: number, vertical: number): void {
    if (this.destroyed || this.overview || this.drag) return
    const camera = this.viewer.camera
    const canvas = this.viewer.canvas
    const plane = placementPlane(this.state.center, this.ground)
    const groundAt = (x: number, y: number): LngLat | undefined => {
      const ray = camera.getPickRay(new Cartesian2(x, y))
      return ray ? positionOnPlane(ray, plane) : undefined
    }
    const x = canvas.clientWidth / 2
    const y = canvas.clientHeight / 2
    const current = groundAt(x, y)
    const next = groundAt(x + horizontal * 45, y - vertical * 45)
    if (!current || !next) return
    // Translate along the site's ground plane, leaving campus placement intact.
    const delta = Cartesian3.subtract(
      Cartesian3.fromDegrees(...next, this.ground),
      Cartesian3.fromDegrees(...current, this.ground),
      new Cartesian3(),
    )
    camera.cancelFlight()
    camera.position = Cartesian3.add(camera.position, delta, new Cartesian3())
    this.viewer.scene.requestRender()
  }
  zoom(inward: boolean): void {
    this.viewer.camera.cancelFlight()
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
    this.access.setOnline(false)
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
          this.access.refreshSurface()
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
      this.access.setOnline(true)
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
    this.access.destroy()
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
    this.placementControls.remove()
    this.opinionBubbles.destroy()
    this.handler.destroy()
    this.viewer.destroy()
  }
}
