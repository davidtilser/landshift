import { describe, expect, it } from 'vitest'
import { CustomDataSource } from '@cesium/engine'
import { JulianDate, PolygonHierarchy } from '@cesium/core'
import { CampusGraphics } from './campus-graphics.ts'
import { campus } from './geometry.ts'

describe('campus rendering while editing', () => {
  it('keeps the same entities alive through movement and rotation', () => {
    const source = new CustomDataSource('campus')
    const graphics = new CampusGraphics(source, 'facade.png')
    graphics.update(campus([-121.9332, 37.3786], 28).volumes, 10)
    const original = [...source.entities.values]
    let removed = 0
    source.entities.collectionChanged.addEventListener(
      (_source, _added, deleted) => {
        removed += deleted.length
      },
    )
    for (let step = 0; step < 10; step++)
      graphics.update(
        campus([-121.9332 + step * 0.00005, 37.3786], 28 + step * 10).volumes,
        10,
      )
    expect(removed).toBe(0)
    expect(source.entities.values).toEqual(original)
    expect(source.entities.values.every((entity) => entity.show)).toBe(true)
  })
  it('exposes updated geometry immediately without waiting for a static worker rebuild', () => {
    const source = new CustomDataSource('campus')
    const graphics = new CampusGraphics(source, 'facade.png')
    const time = JulianDate.now()
    graphics.update(campus([-121.9332, 37.3786], 28).volumes, 10)
    const polygon = source.entities.getById('campus-0')?.polygon
    const before: unknown = polygon?.hierarchy?.getValue(time)
    graphics.update(campus([-121.9322, 37.3786], 90).volumes, 15)
    const after: unknown = polygon?.hierarchy?.getValue(time)
    expect(polygon?.hierarchy?.isConstant).toBe(false)
    expect(before).toBeInstanceOf(PolygonHierarchy)
    expect(after).toBeInstanceOf(PolygonHierarchy)
    expect(after).not.toEqual(before)
    const height: unknown = polygon?.height?.getValue(time)
    expect(height).toBe(15)
  })
})
