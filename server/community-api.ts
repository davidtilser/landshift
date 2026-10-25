import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  communityRequestSchema,
  DEFAULT_COMMUNITY_MODEL,
} from '../src/shared/community-contract.ts'
import { communityContext, generateCommunityReply } from './community-engine.ts'
import type { CommunitySettings } from './community-engine.ts'

function json(status: number, value: unknown): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

const MAX_BODY_BYTES = 20000

export function createCommunityHandler(
  getSettings: () => CommunitySettings,
): (request: Request) => Promise<Response> {
  // These renewable limits apply to one warm process, not the whole deployment.
  let active = 0
  let windowStart = Date.now()
  let windowRequests = 0

  return async (request): Promise<Response> => {
    const url = new URL(request.url)
    if (
      url.pathname !== '/api/community' &&
      url.pathname !== '/api/community/status'
    )
      return json(404, { error: 'Not found' })

    const configured = getSettings()
    const settings = {
      ...configured,
      model: /^google\/gemini-[a-z0-9.-]+$/.test(configured.model)
        ? configured.model
        : DEFAULT_COMMUNITY_MODEL,
    }
    if (request.method === 'GET' && url.pathname === '/api/community/status')
      return json(200, {
        configured: Boolean(settings.apiKey),
        model: settings.model,
      })
    if (request.method !== 'POST' || url.pathname !== '/api/community')
      return json(405, { error: 'Method not allowed' })

    const origin = request.headers.get('origin')
    if (
      (origin && origin !== url.origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      return json(403, { error: 'Use the community chat to continue.' })
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return json(415, { error: 'Expected JSON' })
    if (!settings.apiKey)
      return json(503, {
        error:
          'Configure OPENROUTER_API_KEY on the server to connect live replies.',
      })

    function limited(): boolean {
      if (Date.now() - windowStart >= 60000) {
        windowStart = Date.now()
        windowRequests = 0
      }
      return active >= 2 || windowRequests >= 30
    }
    function rateLimited(): Response {
      const response = json(429, { error: 'Take a moment, then try again.' })
      response.headers.set('Retry-After', '60')
      return response
    }
    if (limited()) return rateLimited()

    const reader = request.body?.getReader()
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      if (reader) {
        for (
          let chunk = await reader.read();
          !chunk.done;
          chunk = await reader.read()
        ) {
          const value = chunk.value
          bytes += value.byteLength
          if (bytes > MAX_BODY_BYTES) {
            await reader.cancel()
            return json(413, { error: 'That conversation is too long.' })
          }
          chunks.push(value)
        }
      }
    } catch {
      return json(400, { error: 'Invalid conversation' })
    } finally {
      reader?.releaseLock()
    }
    let body: unknown
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      return json(400, { error: 'Invalid conversation' })
    }
    const parsed = communityRequestSchema.safeParse(body)
    if (!parsed.success)
      return json(400, { error: 'Invalid conversation or plan' })
    // Recheck after reading the body so simultaneous requests cannot bypass limits.
    if (limited()) return rateLimited()
    active++
    windowRequests++
    try {
      const context = await communityContext(parsed.data.plan)
      const reply = await generateCommunityReply(
        parsed.data,
        context,
        settings,
        request.signal,
      )
      return json(200, reply)
    } catch {
      return json(502, {
        error:
          'A reply could not arrive. Your message is kept—try again in a moment.',
      })
    } finally {
      active--
    }
  }
}

/** Adapt Vite's Node middleware to the same Web handler used by Vercel. */
export function createCommunityMiddleware(
  getSettings: () => CommunitySettings,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  const handle = createCommunityHandler(getSettings)
  return (req, res, next): void => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/community' && path !== '/api/community/status') {
      next()
      return
    }
    const controller = new AbortController()
    const abort = (): void => {
      if (!res.writableEnded) controller.abort()
    }
    res.on('close', abort)
    async function respond(): Promise<void> {
      const headers = new Headers()
      for (const [name, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) headers.append(name, item)
        } else if (value !== undefined) headers.set(name, value)
      }
      const init = {
        method: req.method ?? 'GET',
        headers,
        signal: controller.signal,
        ...(req.method !== 'GET' && req.method !== 'HEAD'
          ? { body: requestBody(req), duplex: 'half' }
          : {}),
      }
      const request = new Request(
        new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`),
        init,
      )
      const response = await handle(request)
      if (!controller.signal.aborted) {
        res.writeHead(response.status, Object.fromEntries(response.headers))
        res.end(await response.text())
      }
    }
    void respond()
      .catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          })
          res.end(
            JSON.stringify({
              error: 'Community chat is unavailable. Try again in a moment.',
            }),
          )
        } else res.end()
      })
      .finally(() => {
        res.off('close', abort)
        req.resume()
      })
  }
}

function requestBody(req: IncomingMessage): ReadableStream<Uint8Array> {
  const iterator: AsyncIterator<unknown, unknown> = req[Symbol.asyncIterator]()
  return new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      const { done, value } = await iterator.next()
      if (done) controller.close()
      else
        controller.enqueue(
          Buffer.isBuffer(value) ? value : Buffer.from(String(value)),
        )
    },
    cancel(): void {
      // Drain rejected bodies without closing the socket before sending the error.
      req.resume()
    },
  })
}
