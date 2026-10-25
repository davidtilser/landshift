import type { PoloSceneState } from './model.ts'
import { poloConstructionStarted } from './placement.ts'

/** Phase time is independent of rain, overlays, animation replay and reduced motion. */
export class PoloOpinionReveal {
  private phase: PoloSceneState['phase'] | null = null
  private startedAt = 0

  setState(state: PoloSceneState, now: number): void {
    const phase = poloConstructionStarted(state) ? state.phase : null
    if (phase === this.phase) return
    this.phase = phase
    this.startedAt = now
  }

  count(now: number): number {
    if (this.phase === null) return 0
    const elapsed = now - this.startedAt
    return elapsed >= 8000 ? 2 : elapsed >= 5000 ? 1 : 0
  }
}
