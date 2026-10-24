import {
  Cartesian3,
  Cartographic,
  Ellipsoid,
  IntersectionTests,
  Math as CesiumMath,
  Plane,
} from '@cesium/core'
import type { Ray } from '@cesium/core'
import type { LngLat } from './geometry.ts'

export interface CampusDrag {
  plane: Plane
  start: Cartesian3
  center: Cartesian3
}

export function placementPlane(center: LngLat, height: number): Plane {
  const point = Cartesian3.fromDegrees(...center, height)
  return Plane.fromPointNormal(
    point,
    Ellipsoid.WGS84.geodeticSurfaceNormal(point),
  )
}

export function positionOnPlane(ray: Ray, plane: Plane): LngLat | undefined {
  const point = intersectPlane(ray, plane)
  return point ? toLngLat(point) : undefined
}

export function beginCampusDrag(
  center: LngLat,
  height: number,
  ray: Ray,
): CampusDrag | undefined {
  // Keep the plane and grab offset fixed throughout the gesture. Picking the
  // rendered depth instead can hit our own roofs and feed movement back into itself.
  const plane = placementPlane(center, height)
  const start = intersectPlane(ray, plane)
  return start
    ? { plane, start, center: Cartesian3.fromDegrees(...center, height) }
    : undefined
}

export function dragCampus(drag: CampusDrag, ray: Ray): LngLat | undefined {
  const point = intersectPlane(ray, drag.plane)
  if (!point) return undefined
  const delta = Cartesian3.subtract(point, drag.start, new Cartesian3())
  return toLngLat(Cartesian3.add(drag.center, delta, new Cartesian3()))
}

// Cesium's declaration omits undefined, but rays parallel to or pointing away
// from the plane have no intersection.
function intersectPlane(ray: Ray, plane: Plane): Cartesian3 | undefined {
  return IntersectionTests.rayPlane(ray, plane)
}

function toLngLat(point: Cartesian3): LngLat {
  const location = Cartographic.fromCartesian(point)
  return [
    CesiumMath.toDegrees(location.longitude),
    CesiumMath.toDegrees(location.latitude),
  ]
}
