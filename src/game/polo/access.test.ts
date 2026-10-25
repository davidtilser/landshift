import { describe, expect, it } from 'vitest'
import {
  accessDistance,
  accessRoutePosition,
  accessVehicleJourney,
  accessVehicleKind,
  poloAccessConnector,
  POLO_ACCESS_FIELD_ENTRY,
  POLO_ACCESS_ROAD,
  sampleAccessRoute,
} from './access.ts'
import { INITIAL_POLO_STATE } from './model.ts'
import { poloCoordinate } from './scene-geometry.ts'

describe('Polo proposed access', () => {
  it('keeps the observed road and field entrance fixed while the gate follows campus pose', () => {
    const original = structuredClone(POLO_ACCESS_ROAD)
    for (const bearing of [0, 90, 180, 270, 340]) {
      const state = {
        ...INITIAL_POLO_STATE,
        center: poloCoordinate(45, 15),
        bearing,
      }
      const connector = poloAccessConnector(state)
      expect(connector[0]).toEqual(POLO_ACCESS_ROAD.at(-1))
      expect(connector[1]).toEqual(POLO_ACCESS_FIELD_ENTRY)
      expect(connector.at(-1)).toEqual(
        poloCoordinate(0, -43, state.center, bearing),
      )
    }
    expect(POLO_ACCESS_ROAD).toEqual(original)
  })

  it('routes around the halls to the gate even when the campus faces away from the entrance', () => {
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const state = { ...INITIAL_POLO_STATE, bearing }
      // The last segment enters the gate; the perimeter approach must stay outside the pad.
      const connector = poloAccessConnector(state).slice(2, -1)
      const angle = (bearing * Math.PI) / 180
      for (const sample of sampleAccessRoute(connector)) {
        const east =
          (sample.coordinate[0] - state.center[0]) *
          111320 *
          Math.cos((state.center[1] * Math.PI) / 180)
        const north = (sample.coordinate[1] - state.center[1]) * 111320
        const x = east * Math.cos(angle) - north * Math.sin(angle)
        const y = east * Math.sin(angle) + north * Math.cos(angle)
        expect(Math.abs(x) >= 179.99 || Math.abs(y) >= 82.49).toBe(true)
      }
    }
  })

  it('uses metre-based travel over unevenly spaced bends and opposite traffic lanes', () => {
    const origin: [number, number] = [-122.49, 37.768]
    const samples = sampleAccessRoute([
      origin,
      poloCoordinate(20, 0, origin),
      poloCoordinate(20, 100, origin),
    ])
    expect(samples.at(-1)?.distance).toBeCloseTo(120, 2)
    const a = accessRoutePosition(samples, 40, false, 0)
    const b = accessRoutePosition(samples, 52, false, 0)
    expect(accessDistance(a.coordinate, b.coordinate)).toBeCloseTo(12, 2)
    const incoming = accessRoutePosition(samples, 60)
    const outgoing = accessRoutePosition(samples, 60, true)
    expect(
      accessDistance(incoming.coordinate, outgoing.coordinate),
    ).toBeCloseTo(3.2, 2)
    expect(outgoing.heading - incoming.heading).toBeCloseTo(Math.PI)
    expect(accessRoutePosition(samples, 1e6, false, 0).coordinate).toEqual(
      samples.at(-1)?.coordinate,
    )
  })

  it('staggers departures, includes an off-route turnaround gap and changes vehicle types by phase', () => {
    expect(accessVehicleJourney(0, 0, 600)).toMatchObject({
      visible: true,
      distance: 0,
    })
    expect(accessVehicleJourney(0, 1, 600).visible).toBe(false)
    expect(accessVehicleJourney(4, 1, 600)).toMatchObject({
      visible: true,
      reverse: true,
      distance: 588,
    })
    expect(accessVehicleJourney(52, 0, 600).visible).toBe(false)
    expect(accessVehicleJourney(58, 0, 600).visible).toBe(true)
    expect(accessVehicleKind('M0', 0)).toBe('truck')
    expect(accessVehicleKind('M1', 0)).toBe('truck')
    expect(accessVehicleKind('M4', 1)).toBe('truck')
    expect(accessVehicleKind('M6', 1)).toBe('car')
  })
})
