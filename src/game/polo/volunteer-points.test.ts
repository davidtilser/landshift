import { describe, expect, it } from 'vitest'
import { PoloVolunteerPoints } from './volunteer-points.ts'

describe('demo volunteer points', () => {
  it('starts the player in the top ten among fictional local volunteers', () => {
    const points = new PoloVolunteerPoints()
    expect(points.xp).toBe(160)
    expect(points.rank).toBe(6)
    expect(points.entries).toHaveLength(21)
    expect(
      points.entries.filter((entry) => entry.isCurrentPlayer),
    ).toHaveLength(1)
    expect(points.entries.slice(0, 3).every((entry) => entry.avatar)).toBe(true)
  })

  it('awards each stable action once, even when it is replayed', () => {
    const points = new PoloVolunteerPoints()
    expect(points.award('milestone', 'M1')).toEqual({
      awarded: true,
      xp: 20,
      total: 180,
    })
    expect(points.award('milestone', ' M1 ')).toEqual({
      awarded: false,
      xp: 0,
      total: 180,
    })
    points.award('proposal', 'plan')
    points.award('conversation', 'neighbor')
    expect(points.xp).toBe(235)
    expect(points.award('conversation', 'neighbor').awarded).toBe(false)
    expect(points.award('conversation', '').awarded).toBe(false)
  })

  it('updates rankings as exploration, proposals and conversations earn points', () => {
    const points = new PoloVolunteerPoints()
    for (const milestone of ['M0', 'M1', 'M4', 'M5', 'M6']) {
      points.award('milestone', milestone)
    }
    expect(points.rank).toBe(4)
    points.award('proposal', 'plan')
    expect(points.rank).toBe(3)
    for (const person of ['neighbor', 'nature', 'student', 'operator']) {
      points.award('conversation', person)
    }
    expect(points.xp).toBe(360)
    expect(points.rank).toBe(1)
    expect(points.entries.map((entry) => entry.rank)).toEqual(
      Array.from({ length: 21 }, (_, index) => index + 1),
    )
  })

  it('does not leak mutable rankings or retain another demo session', () => {
    const points = new PoloVolunteerPoints()
    const snapshot = points.entries
    const leader = snapshot[0]
    if (leader) leader.xp = 0
    snapshot.pop()
    expect(points.entries[0]?.xp).toBe(330)
    expect(points.entries).toHaveLength(21)
    points.award('proposal', 'plan')
    const fresh = new PoloVolunteerPoints()
    expect(fresh.xp).toBe(160)
    expect(fresh.award('proposal', 'plan').awarded).toBe(true)
  })
})
