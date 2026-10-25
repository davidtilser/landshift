import type { PoloSceneState } from './model.ts'
import { poloPortraitOpinions } from './opinions.ts'
import type { PoloOpinion } from './opinions.ts'

/** A finite sequence of authored voices for the current plan, never a polling feed. */
export class PoloTalkFeed {
  private context = ''
  private pending: PoloOpinion[] = []

  get remaining(): number {
    return this.pending.length
  }

  sync(state: PoloSceneState, restart = false): boolean {
    const opinions = poloPortraitOpinions(state)
    const context = state.confirmed
      ? JSON.stringify([state.phase, state.areaHa, opinions])
      : ''
    if (context === this.context && !restart) return false
    this.context = context
    this.pending = opinions
    return true
  }

  next(): PoloOpinion | undefined {
    return this.pending.shift()
  }
}
