import { describe, expect, it } from 'vitest'
import { Cartesian3, Ellipsoid, Ray } from '@cesium/core'
import {
  beginCampusDrag,
  dragCampus,
  placementPlane,
  positionOnPlane,
} from './placement.ts'
import type { LngLat } from './geometry.ts'

const center: LngLat = [-121.9332, 37.3786]
const anchor = Cartesian3.fromDegrees(...center, 45)
const up = Ellipsoid.WGS84.geodeticSurfaceNormal(anchor)
const east = Cartesian3.normalize(
  Cartesian3.cross(Cartesian3.UNIT_Z, up, new Cartesian3()),
  new Cartesian3(),
)
const north = Cartesian3.cross(up, east, new Cartesian3())
const eye = Cartesian3.add(
  anchor,
  Cartesian3.multiplyByScalar(up, 500, new Cartesian3()),
  new Cartesian3(),
)
function rayTo(point: Cartesian3): Ray {
  return new Ray(eye, Cartesian3.subtract(point, eye, new Cartesian3()))
}
function offset(
  point: Cartesian3,
  direction: Cartesian3,
  meters: number,
): Cartesian3 {
  return Cartesian3.add(
    point,
    Cartesian3.multiplyByScalar(direction, meters, new Cartesian3()),
    new Cartesian3(),
  )
}

describe('campus pointer projection', () => {
  it('does not jump when grabbing an off-center part of the handle', () => {
    const ray = rayTo(offset(anchor, east, 20))
    const drag = beginCampusDrag(center, 45, ray)
    expect(drag).toBeDefined()
    if (!drag) return
    const result = dragCampus(drag, ray)
    expect(result?.[0]).toBeCloseTo(center[0], 9)
    expect(result?.[1]).toBeCloseTo(center[1], 9)
  })
  it('preserves the grab offset and gives the same result when an event repeats', () => {
    const grabbed = offset(anchor, east, 20)
    const drag = beginCampusDrag(center, 45, rayTo(grabbed))
    expect(drag).toBeDefined()
    if (!drag) return
    const ray = rayTo(offset(grabbed, east, 50))
    const first = dragCampus(drag, ray)
    expect(first?.[0]).toBeGreaterThan(center[0])
    expect(first?.[1]).toBeCloseTo(center[1], 6)
    expect(dragCampus(drag, ray)).toEqual(first)
    const moved = first && Cartesian3.fromDegrees(...first, 45)
    expect(moved && Cartesian3.distance(anchor, moved)).toBeCloseTo(50, 1)
  })
  it('projects onto the ground independently of roofs or changing scene depth', () => {
    const point = offset(anchor, north, 80)
    const result = positionOnPlane(rayTo(point), placementPlane(center, 45))
    expect(result?.[1]).toBeGreaterThan(center[1])
    expect(result?.[0]).toBeCloseTo(center[0], 8)
  })
  it('ignores rays into the sky instead of moving the campus to a fallback surface', () => {
    const sky = new Ray(eye, up)
    expect(beginCampusDrag(center, 45, sky)).toBeUndefined()
    expect(positionOnPlane(sky, placementPlane(center, 45))).toBeUndefined()
  })
})
