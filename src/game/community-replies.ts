import { poloDialogueReply } from './polo/dialogue.ts'
import { communityProfiles, demoExchange } from './community-profiles.ts'
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

/** Give even instant private replies a one-second typing beat, without slowing live replies further. */
export async function privateReplyWithTyping(
  reply: () => CommunityResponse | Promise<CommunityResponse>,
  signal: AbortSignal,
): Promise<CommunityResponse> {
  const started = Date.now()
  const response = await reply()
  const remaining = 1000 - (Date.now() - started)
  if (remaining > 0 && !signal.aborted) await pause(remaining, signal)
  return response
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
    model: 'Prepared conversation',
  }
}

/** A player's public post gets answers to their words, not another automatic round. */
export function authoredPublicCommunityReply(
  request: CommunityRequest,
  context: DiscussionContext,
): CommunityResponse | undefined {
  const facts = context.polo
  if (!facts || request.mode !== 'discussion' || !request.message.trim())
    return undefined
  const speakers = demoExchange(context, request.target, true).messages
  const profiles = communityProfiles(context)
  return {
    messages: speakers.map(({ speaker }) => {
      const answer = poloDialogueReply(
        speaker,
        request.message,
        facts,
        request.history,
      ).text.split('\n\n')[0]
      const question = profiles.find(
        (profile) => profile.id === speaker,
      )?.question
      return { speaker, text: [answer, question].filter(Boolean).join(' ') }
    }),
    source: 'demo',
    model: 'Prepared conversation',
  }
}
