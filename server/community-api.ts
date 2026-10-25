import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  communityRequestSchema,
  DEFAULT_COMMUNITY_MODEL,
} from '../src/shared/community-contract.ts'
import { communityContext, generateCommunityReply } from './community-engine.ts'
import type { CommunitySettings } from './community-engine.ts'

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

export function createCommunityMiddleware(
  getSettings: () => CommunitySettings,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  let requests = 0
  let active = 0
  let windowStart = Date.now()
  let windowRequests = 0
  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> {
    const path = req.url?.split('?')[0]
    if (path !== '/api/community' && path !== '/api/community/status') {
      next()
      return
    }
    const settings = getSettings()
    if (!/^google\/gemini-[a-z0-9.-]+$/.test(settings.model))
      settings.model = DEFAULT_COMMUNITY_MODEL
    if (req.method === 'GET' && path === '/api/community/status') {
      json(res, 200, {
        configured: Boolean(settings.apiKey),
        model: settings.model,
      })
      return
    }
    if (req.method !== 'POST' || path !== '/api/community') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }
    const origin = req.headers.origin
    if (
      (origin && new URL(origin).host !== req.headers.host) ||
      req.headers['sec-fetch-site'] === 'cross-site'
    ) {
      json(res, 403, { error: 'Use the community chat to continue.' })
      return
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      json(res, 415, { error: 'Expected JSON' })
      return
    }
    if (!settings.apiKey) {
      json(res, 503, {
        error: 'Add OPENROUTER_API_KEY to .env.local to connect live replies.',
      })
      return
    }
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now()
      windowRequests = 0
    }
    if (active >= 2 || windowRequests >= 30 || requests >= 500) {
      json(res, 429, {
        error:
          requests >= 500
            ? 'Session request limit reached. Restart the local server to begin a new session.'
            : 'Take a moment, then try again.',
      })
      return
    }
    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      bytes += buffer.length
      if (bytes > 20000) {
        json(res, 413, { error: 'That conversation is too long.' })
        return
      }
      chunks.push(buffer)
    }
    let body: unknown
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      json(res, 400, { error: 'Invalid conversation' })
      return
    }
    const parsed = communityRequestSchema.safeParse(body)
    if (!parsed.success) {
      json(res, 400, { error: 'Invalid conversation or plan' })
      return
    }
    // Recheck after reading the request: simultaneous requests cannot bypass limits.
    if (active >= 2 || windowRequests >= 30 || requests >= 500) {
      json(res, 429, { error: 'Take a moment, then try again.' })
      return
    }
    active++
    requests++
    windowRequests++
    const controller = new AbortController()
    const abort = (): void => {
      if (!res.writableEnded) controller.abort()
    }
    res.on('close', abort)
    try {
      const context = await communityContext(parsed.data.plan)
      const reply = await generateCommunityReply(
        parsed.data,
        context,
        settings,
        controller.signal,
      )
      if (!controller.signal.aborted) json(res, 200, reply)
    } catch {
      if (!controller.signal.aborted)
        json(res, 502, {
          error:
            'A reply could not arrive. Your message is kept—try again in a moment.',
        })
    } finally {
      active--
      res.off('close', abort)
    }
  }
  return (req, res, next): void => {
    void handle(req, res, next).catch(() => {
      if (!res.headersSent)
        json(res, 500, {
          error: 'Community chat is unavailable. Try again in a moment.',
        })
      else res.end()
    })
  }
}
