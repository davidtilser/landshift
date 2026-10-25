import { poloDialogueReply } from './polo/dialogue.ts'
import type { DiscussionContext } from './discussion.ts'
import type {
  CommunityRequest,
  CommunityResponse,
  CommunityReply,
} from '../shared/community-contract.ts'

function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
}

/** Reveal each public reply with its own mood snapshot; canceled turns stay unseen. */
export async function revealCommunityReplies(
  messages: CommunityReply['messages'],
  signal: AbortSignal,
  append: (message: CommunityReply['messages'][number]) => void,
  delayMs = 1600,
): Promise<boolean> {
  for (const [index, message] of messages.entries()) {
    if (index) await pause(delayMs, signal)
    if (signal.aborted) return false
    append(message)
  }
  return true
}

/** Guided Polo turns and the offline fallback share one question-aware branch. */
export function authoredPrivateCommunityReply(
  request: Pick<CommunityRequest, 'target' | 'message' | 'history'>,
  context: DiscussionContext,
): CommunityResponse | undefined {
  if (!context.polo) return undefined
  const reply = poloDialogueReply(
    request.target,
    request.message,
    context.polo,
    request.history,
  )
  return {
    messages: [{ speaker: request.target, text: reply.text }],
    source: 'demo',
    model: 'Authored scenario',
  }
}
