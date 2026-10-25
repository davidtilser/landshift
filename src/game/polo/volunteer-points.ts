/** Fictional, page-session-only motivation for the demo, not volunteer records. */
export const POLO_VOLUNTEER_AREA = 'San Francisco area'
export const POLO_VOLUNTEER_DEMO_LABEL =
  'Demo leaderboard · fictional volunteers'
export const POLO_VOLUNTEER_INITIAL_XP = 160
export const POLO_VOLUNTEER_AWARDS = {
  milestone: 20,
  proposal: 40,
  conversation: 15,
} as const

export type PoloVolunteerAction = keyof typeof POLO_VOLUNTEER_AWARDS

export interface PoloVolunteerEntry {
  id: string
  name: string
  xp: number
  rank: number
  isCurrentPlayer: boolean
  avatar?: string
}

export interface PoloVolunteerAward {
  awarded: boolean
  /** Points earned by this call; zero when the action was already counted. */
  xp: number
  total: number
}

interface DemoVolunteer {
  readonly id: string
  readonly name: string
  readonly xp: number
  readonly avatar?: string
}

/** Names, scores and portraits are illustrative, with no real accounts behind them. */
export const POLO_DEMO_VOLUNTEERS: readonly DemoVolunteer[] = Object.freeze(
  [
    { id: 'amelia', name: 'Amelia R.', xp: 330, avatar: '/avatars/maya.png' },
    { id: 'noor', name: 'Noor A.', xp: 300, avatar: '/avatars/aisha.png' },
    { id: 'lucas', name: 'Lucas M.', xp: 270, avatar: '/avatars/leo.png' },
    { id: 'river', name: 'River J.', xp: 220 },
    { id: 'sam', name: 'Sam K.', xp: 185 },
    { id: 'jules', name: 'Jules P.', xp: 140 },
    { id: 'imani', name: 'Imani T.', xp: 130 },
    { id: 'alex', name: 'Alex C.', xp: 120 },
    { id: 'mika', name: 'Mika L.', xp: 110 },
    { id: 'robin', name: 'Robin D.', xp: 100 },
    { id: 'drew', name: 'Drew S.', xp: 95 },
    { id: 'eden', name: 'Eden V.', xp: 90 },
    { id: 'kai', name: 'Kai W.', xp: 85 },
    { id: 'taylor', name: 'Taylor F.', xp: 80 },
    { id: 'remy', name: 'Remy B.', xp: 75 },
    { id: 'sky', name: 'Sky N.', xp: 70 },
    { id: 'ari', name: 'Ari H.', xp: 65 },
    { id: 'sage', name: 'Sage E.', xp: 60 },
    { id: 'quinn', name: 'Quinn G.', xp: 55 },
    { id: 'rory', name: 'Rory O.', xp: 50 },
  ].map((entry) => Object.freeze(entry)),
)

/**
 * A fresh instance starts a fresh demo. Callers supply stable action IDs, such as
 * a milestone ID or community member ID, so replaying UI cannot farm points.
 */
export class PoloVolunteerPoints {
  private total = POLO_VOLUNTEER_INITIAL_XP
  private readonly completed = new Set<string>()

  get xp(): number {
    return this.total
  }

  get rank(): number {
    return this.entries.findIndex((entry) => entry.isCurrentPlayer) + 1
  }

  get entries(): PoloVolunteerEntry[] {
    const volunteers: Omit<PoloVolunteerEntry, 'rank'>[] =
      POLO_DEMO_VOLUNTEERS.map((entry) => ({
        ...entry,
        isCurrentPlayer: false,
      }))
    volunteers.push({
      id: 'you',
      name: 'You',
      xp: this.total,
      avatar: '/avatars/community-guide.png',
      isCurrentPlayer: true,
    })
    return volunteers
      .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  }

  award(kind: PoloVolunteerAction, actionId: string): PoloVolunteerAward {
    const normalizedId = actionId.trim()
    const key = `${kind}:${normalizedId}`
    if (!normalizedId || this.completed.has(key)) {
      return { awarded: false, xp: 0, total: this.total }
    }
    this.completed.add(key)
    const xp = POLO_VOLUNTEER_AWARDS[kind]
    this.total += xp
    return { awarded: true, xp, total: this.total }
  }
}
