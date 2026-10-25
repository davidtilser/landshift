import {
  communityResponseSchema,
  communityStatusSchema,
  DEFAULT_COMMUNITY_MODEL,
} from '../shared/community-contract.ts'
import type {
  CommunityRequest,
  CommunityResponse,
} from '../shared/community-contract.ts'
import type { DiscussionContext } from './discussion.ts'
import { scriptedDiscussion } from './discussion.ts'
import { communityVoices } from './community.ts'
import {
  authoredPrivateCommunityReply,
  authoredPublicCommunityReply,
} from './community-replies.ts'
import { demoExchange } from './community-profiles.ts'

export class CommunityClient {
  configured = false
  model = DEFAULT_COMMUNITY_MODEL
  async status(signal?: AbortSignal): Promise<void> {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/community/status`,
        { signal: signal ?? null },
      )
      if (!response.ok) throw new Error('Unavailable')
      const parsed: unknown = await response.json()
      const status = communityStatusSchema.parse(parsed)
      this.configured = status.configured
      this.model = status.model
    } catch (error) {
      if (signal?.aborted) throw error
      this.configured = false
    }
  }
  async exchange(
    request: CommunityRequest,
    context: DiscussionContext,
    signal: AbortSignal,
  ): Promise<CommunityResponse> {
    await this.status(signal)
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
    if (!this.configured) {
      if (request.mode === 'private') {
        const authored = authoredPrivateCommunityReply(request, context)
        if (authored) return authored
      }
      const publicReply = authoredPublicCommunityReply(request, context)
      if (publicReply) return publicReply
      if (context.polo)
        return {
          ...demoExchange(
            context,
            request.target,
            request.mode === 'discussion',
          ),
          source: 'demo',
          model: 'Prepared conversation',
        }
      if (request.mode === 'private' && request.target !== 'operator') {
        const voice = communityVoices(context.choices, context.site).find(
          (item) => item.id === request.target,
        )
        if (voice) {
          const reply = scriptedDiscussion({
            voice,
            question: request.message,
            context,
            history: request.history.map((line) => ({
              role: line.speaker === 'planner' ? 'user' : 'assistant',
              text: line.text,
            })),
          })
          return {
            messages: [{ speaker: request.target, text: reply.text }],
            source: 'demo',
            model: 'Prepared conversation',
          }
        }
      }
      return {
        ...demoExchange(context, request.target, request.mode === 'discussion'),
        source: 'demo',
        model: 'Prepared conversation',
      }
    }
    const response = await fetch(`${import.meta.env.BASE_URL}api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
    if (!response.ok) {
      if (response.status === 429)
        throw new Error('Take a moment, then try again. Your message is saved.')
      throw new Error(
        'A reply could not arrive. Your message is saved—try again.',
      )
    }
    const parsed: unknown = await response.json()
    return communityResponseSchema.parse(parsed)
  }
}
