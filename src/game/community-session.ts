import type {
  CommunityId,
  ConversationLine,
  PlannerState,
  CommunityMoodBreakdown,
  CommunityReaction,
  CommunityMood,
} from '../shared/community-contract.ts'
import type { CommunityProfile } from './community-profiles.ts'
import type { DiscussionTopic } from './discussion.ts'
import { initialCommunityMoodBreakdown } from './community-mood.ts'
import { POLO_PROPOSAL_NAMES } from './polo/model.ts'
import { poloImprovementSummary } from './polo/interventions.ts'
import { conversationReaction } from './community-reactions.ts'
import type {
  ConversationReactions,
  ConversationReaction,
} from './community-reactions.ts'

export interface CommunityLine extends ConversationLine {
  id: number
  revision: number
  createdAt: number
  source: 'scenario' | 'live' | 'demo' | 'planner'
  replyTo?: number
  kind?: 'update'
  category?: string
  communityMood?: CommunityMoodBreakdown | undefined
  reaction?: CommunityReaction | undefined
}
export type NewCommunityLine = Omit<
  CommunityLine,
  'id' | 'revision' | 'createdAt'
>
export interface CommunityThread {
  revision: number
  lines: CommunityLine[]
  draft: string
  topic: DiscussionTopic | undefined
  freeText: boolean
}
function thread(): CommunityThread {
  return {
    revision: 0,
    lines: [],
    draft: '',
    topic: undefined,
    freeText: false,
  }
}
function planUpdate(
  previous: PlannerState,
  next: PlannerState,
): { text: string; category: string } {
  const changes: string[] = []
  let category = 'plan'
  if (
    next.polo &&
    JSON.stringify(previous.polo) !== JSON.stringify(next.polo)
  ) {
    const view = !next.polo.confirmed
      ? 'Position preview · not confirmed'
      : next.polo.proposal && next.polo.preview
        ? POLO_PROPOSAL_NAMES[next.polo.proposal] + ' · proposed option'
        : 'Original arrangement'
    const improvements = poloImprovementSummary(next.polo)
    changes.push(
      `Polo Fields ${next.polo.phase} · ${improvements ? 'Plan improvements' : view}.`,
    )
    if (improvements) changes.push(improvements)
    if (next.polo.confirmed && !previous.polo?.confirmed)
      changes.push(
        'Location confirmed. The field is still shown before construction.',
      )
    if (next.polo.proposal === 'heat_reuse_neighbors' && next.polo.preview)
      changes.push(
        next.polo.recipientAvailable
          ? 'Proposed pool can accept heat.'
          : 'Proposed pool unavailable; original cooling stays active.',
      )
    category = 'polo'
  }
  if (
    previous.center[0] !== next.center[0] ||
    previous.center[1] !== next.center[1]
  ) {
    changes.push('Moved the campus.')
    category = 'placement'
  } else if (previous.bearing !== next.bearing) {
    changes.push('Rotated the campus.')
    category = 'placement'
  }
  if (previous.choices.cooling !== next.choices.cooling) {
    const names = {
      dry: 'air cooling',
      hybrid: 'air + water cooling',
      evaporative: 'water cooling',
    }
    changes.push('Trying ' + names[next.choices.cooling] + '.')
    category = 'cooling'
  }
  if (
    previous.choices.trees !== next.choices.trees ||
    previous.choices.restoration !== next.choices.restoration
  ) {
    changes.push(
      `${String(next.choices.trees)} new trees · ${next.choices.restoration === 'none' ? 'no restoration' : next.choices.restoration.replace('-', ' ')}.`,
    )
    category = 'nature'
  }
  if (
    previous.choices.access !== next.choices.access ||
    previous.choices.training !== next.choices.training
  ) {
    changes.push(
      `Public path ${next.choices.access ? 'on' : 'off'} · paid training ${next.choices.training ? 'on' : 'off'}.`,
    )
    category = 'sharing'
  }
  if (previous.year !== next.year || previous.weather !== next.weather) {
    changes.push(
      `Looking at ${next.year ? 'year ' + String(next.year) : 'today'} · ${next.weather === 'drought' ? 'dry summer' : next.weather === 'heatwave' ? 'heatwave' : 'heavy rain'}.`,
    )
    category = 'time'
  }
  return { text: changes.join(' '), category }
}

/** Exactly one public thread per scenario. Private histories have separate ownership. */
export class CommunitySession {
  readonly publicThread = thread()
  readonly privateThreads = new Map<CommunityId, CommunityThread>()
  readonly heard = new Set<CommunityId>()
  publicMood: CommunityMoodBreakdown | undefined
  revision = 0
  private sequence = 0
  private previous: PlannerState | undefined
  private reactions = new Map<CommunityId, string>()
  private readonly latestReactions = new Map<
    CommunityId,
    ConversationReaction
  >()
  private moods = new Map<CommunityId, CommunityMood>()
  private key = ''
  private readonly onReactionsChange: () => void

  constructor(onReactionsChange: () => void = () => {}) {
    this.onReactionsChange = onReactionsChange
  }

  bubbleReactions(): ConversationReactions {
    return new Map(
      [...this.latestReactions].map(([id, reaction]) => [id, { ...reaction }]),
    )
  }

  sync(plan: PlannerState, profiles: CommunityProfile[]): boolean {
    const key = JSON.stringify(plan)
    if (key === this.key) return false
    if (this.previous && this.previous.scenarioId !== plan.scenarioId)
      this.reset()
    this.revision++
    this.latestReactions.clear()
    this.moods = new Map(
      profiles.map((profile) => [profile.id, profile.initialMood.mood]),
    )
    this.publicMood = initialCommunityMoodBreakdown(profiles)
    if (!this.previous) {
      const [proposal] = this.append(this.publicThread, [
        {
          speaker: 'planner',
          source: 'scenario',
          text:
            plan.scenarioId === 'golden-gate-polo'
              ? 'What if a data center replaced part of the Polo Fields? Follow the changes, compare ideas and hear who gains or loses.'
              : plan.scenarioId === 'golden-gate-park'
                ? 'What if a data center went here, at Heroes’ Grove? Let’s hear what this place means before we decide.'
                : 'What would this data center mean for the neighborhood? Let’s compare the plan and hear different perspectives.',
        },
      ])
      for (const profile of profiles)
        this.append(this.publicThread, [
          {
            speaker: profile.id,
            text: profile.post,
            source: 'scenario',
            ...(proposal ? { replyTo: proposal.id } : {}),
          },
        ])
    } else {
      const update = planUpdate(this.previous, plan)
      const last = this.publicThread.lines.at(-1)
      let updateId: number | undefined
      if (
        last?.kind === 'update' &&
        last.category === update.category &&
        update.category === 'placement'
      ) {
        last.text = update.text
        last.revision = this.revision
        last.createdAt = Date.now()
        updateId = last.id
      } else {
        updateId = this.append(this.publicThread, [
          {
            speaker: 'planner',
            text: update.text || 'Plan updated.',
            source: 'scenario',
            kind: 'update',
            category: update.category,
          },
        ])[0]?.id
      }
      const changed = profiles
        .filter((profile) => this.reactions.get(profile.id) !== profile.post)
        .slice(0, 2)
      for (const profile of changed)
        this.append(this.publicThread, [
          {
            speaker: profile.id,
            text: profile.post,
            source: 'scenario',
            ...(updateId ? { replyTo: updateId } : {}),
          },
        ])
    }
    this.publicThread.revision = this.revision
    this.key = key
    this.previous = structuredClone(plan)
    this.reactions = new Map(
      profiles.map((profile) => [profile.id, profile.post]),
    )
    this.onReactionsChange()
    return true
  }
  privateThread(profile: CommunityProfile): CommunityThread {
    let current = this.privateThreads.get(profile.id)
    if (!current) {
      current = thread()
      current.revision = this.revision
      this.append(current, [
        { speaker: profile.id, text: profile.post, source: 'scenario' },
      ])
      this.privateThreads.set(profile.id, current)
    }
    return current
  }
  useFreeText(current: CommunityThread): void {
    current.freeText = true
    current.topic = undefined
  }
  append(current: CommunityThread, lines: NewCommunityLine[]): CommunityLine[] {
    const added = lines.map((line) => ({
      ...line,
      id: ++this.sequence,
      revision: this.revision,
      createdAt: Date.now(),
    }))
    current.lines.push(...added)
    const limit = current === this.publicThread ? 160 : 40
    if (current.lines.length > limit)
      current.lines.splice(1, current.lines.length - limit)
    let reactionChanged = false
    for (const line of added)
      if (line.speaker !== 'planner') {
        if (line.source !== 'scenario') this.heard.add(line.speaker)
        if (current === this.publicThread && line.communityMood)
          this.publicMood = line.communityMood
        if (
          (line.source === 'live' || line.source === 'demo') &&
          (current === this.publicThread ||
            this.privateThreads.get(line.speaker) === current)
        ) {
          this.latestReactions.set(
            line.speaker,
            conversationReaction(
              line.text,
              this.latestReactions.get(line.speaker)?.mood ??
                this.moods.get(line.speaker) ??
                'concerned',
              current === this.publicThread ? 'community' : 'private',
              line.reaction,
            ),
          )
          reactionChanged = true
        }
      }
    if (reactionChanged) this.onReactionsChange()
    return added
  }
  history(current: CommunityThread): ConversationLine[] {
    return current.lines
      .filter((line) => line.kind !== 'update')
      .slice(-18)
      .map(({ speaker, text }) => ({ speaker, text }))
  }
  replyPublic(lines: NewCommunityLine[], replyTo?: number): CommunityLine[] {
    const added: CommunityLine[] = []
    for (const line of lines) {
      const [reply] = this.append(this.publicThread, [
        { ...line, ...(replyTo !== undefined ? { replyTo } : {}) },
      ])
      if (reply) {
        added.push(reply)
        replyTo = reply.id
      }
    }
    return added
  }
  remove(current: CommunityThread, id: number): void {
    current.lines = current.lines.filter((line) => line.id !== id)
  }
  reset(): void {
    this.publicThread.lines = []
    this.publicThread.draft = ''
    this.publicThread.revision = 0
    this.publicThread.freeText = false
    this.privateThreads.clear()
    this.heard.clear()
    this.publicMood = undefined
    this.reactions.clear()
    this.latestReactions.clear()
    this.moods.clear()
    this.revision = 0
    this.previous = undefined
    this.key = ''
    this.sequence = 0
    this.onReactionsChange()
  }
}
