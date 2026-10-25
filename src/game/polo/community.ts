import { CommunityHub } from '../community-hub.ts'
import type {
  CommunityId,
  PlannerState,
} from '../../shared/community-contract.ts'
import { DEFAULT_CHOICES } from '../consequences.ts'
import { poloDiscussionContext } from './context.ts'
import { POLO_SCENARIO_ID } from './model.ts'
import type { PoloSceneState } from './model.ts'
import type { ConversationReactions } from '../community-reactions.ts'

interface Options {
  getState: () => PoloSceneState
  focus: () => void
  beforeOpen: () => void
  reactionsChanged: (reactions: ConversationReactions) => void
}

export class PoloCommunity {
  private readonly hub: CommunityHub
  constructor(options: Options) {
    this.hub = new CommunityHub({
      getContext: () => poloDiscussionContext(options.getState()),
      getPlan: (): PlannerState => ({
        scenarioId: POLO_SCENARIO_ID,
        center: [...options.getState().center],
        bearing: options.getState().bearing,
        choices: { ...DEFAULT_CHOICES },
        year: 0,
        weather: 'drought',
        polo: { ...options.getState(), center: [...options.getState().center] },
      }),
      tryIdea: () => {
        options.focus()
      },
      beforeOpen: options.beforeOpen,
      reactionsChanged: options.reactionsChanged,
    })
    this.sync()
  }
  sync(): void {
    this.hub.sync()
  }
  open(id: CommunityId): void {
    this.hub.openPerson(id)
  }
  destroy(): void {
    this.hub.destroy()
  }
}
