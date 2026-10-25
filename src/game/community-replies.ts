import type { CommunityReply } from '../shared/community-contract.ts'

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
