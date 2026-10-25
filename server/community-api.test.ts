import { createServer } from 'node:http'
import { once } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCommunityHandler,
  createCommunityMiddleware,
} from './community-api.ts'
import { communityContext, generateCommunityReply } from './community-engine.ts'
import chatEndpoint from '../api/community.ts'
import statusEndpoint from '../api/community/status.ts'
import { DEFAULT_CHOICES } from '../src/game/consequences.ts'
import { DEFAULT_COMMUNITY_MODEL } from '../src/shared/community-contract.ts'
import type {
  CommunityRequest,
  CommunityResponse,
} from '../src/shared/community-contract.ts'
import type { DiscussionContext } from '../src/game/discussion.ts'

vi.mock('./community-engine.ts', () => ({
  communityContext: vi.fn(),
  generateCommunityReply: vi.fn(),
}))

const settings = {
  apiKey: 'test-server-secret',
  model: DEFAULT_COMMUNITY_MODEL,
}
const context: DiscussionContext = {
  choices: { ...DEFAULT_CHOICES },
  year: 0,
  weather: 'drought',
  site: {
    buildings: 0,
    trees: 0,
    water: 0,
    parks: 1,
    flood: 0,
    heritage: 1,
    heritageContext: true,
  },
}
const body: CommunityRequest = {
  mode: 'private',
  target: 'neighbor',
  history: [],
  message: 'Could we compare another site?',
  plan: {
    scenarioId: 'golden-gate-park',
    center: [-122.46889, 37.77293],
    bearing: 28,
    choices: { ...DEFAULT_CHOICES },
    year: 0,
    weather: 'drought',
  },
}
const reply: CommunityResponse = {
  messages: [
    {
      speaker: 'neighbor',
      text: 'Let’s compare what we lose at each site.',
      reaction: { text: 'I want a fair comparison.', mood: 'concerned' },
    },
  ],
  model: DEFAULT_COMMUNITY_MODEL,
  source: 'live',
}
const origin = 'https://landshift.example'
function post(
  value: unknown = body,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${origin}/api/community`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(value),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(communityContext).mockResolvedValue(context)
  vi.mocked(generateCommunityReply).mockResolvedValue(reply)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('Vercel community endpoints', () => {
  it('reads server environment at request time and never exposes the key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', settings.apiKey)
    vi.stubEnv('OPENROUTER_MODEL', 'invalid-model')
    const response = await statusEndpoint.fetch(
      new Request(`${origin}/api/community/status`),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      configured: true,
      model: DEFAULT_COMMUNITY_MODEL,
    })
    vi.stubEnv('OPENROUTER_API_KEY', '')
    const unavailable = await chatEndpoint.fetch(post())
    expect(unavailable.status).toBe(503)
    expect(await unavailable.text()).not.toContain(settings.apiKey)
    expect(generateCommunityReply).not.toHaveBeenCalled()
  })

  it('awaits a validated live reply through the production entry point', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', settings.apiKey)
    vi.stubEnv('OPENROUTER_MODEL', settings.model)
    const request = post(body, { Origin: origin })
    const response = await chatEndpoint.fetch(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(reply)
    expect(communityContext).toHaveBeenCalledWith(body.plan)
    expect(generateCommunityReply).toHaveBeenCalledWith(
      body,
      context,
      settings,
      request.signal,
    )
  })
})

describe('shared request validation and renewable limits', () => {
  it('rejects unknown routes, methods and cross-origin requests before generating', async () => {
    const handle = createCommunityHandler(() => settings)
    expect((await handle(new Request(`${origin}/missing`))).status).toBe(404)
    expect((await handle(new Request(`${origin}/api/community`))).status).toBe(
      405,
    )
    expect(
      (await handle(post(body, { Origin: 'https://other.example' }))).status,
    ).toBe(403)
    expect((await handle(post(body, { Origin: 'null' }))).status).toBe(403)
    expect(
      (await handle(post(body, { 'Sec-Fetch-Site': 'cross-site' }))).status,
    ).toBe(403)
    expect(
      (await handle(post(body, { 'Content-Type': 'text/plain' }))).status,
    ).toBe(415)
    expect(generateCommunityReply).not.toHaveBeenCalled()
  })

  it('bounds raw bytes and rejects malformed JSON and invalid plans', async () => {
    const handle = createCommunityHandler(() => settings)
    const malformed = new Request(`${origin}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    expect((await handle(malformed)).status).toBe(400)
    expect((await handle(post({ message: 'missing plan' }))).status).toBe(400)
    expect(
      (await handle(post({ ...body, message: '🌎'.repeat(6000) }))).status,
    ).toBe(413)
    expect(generateCommunityReply).not.toHaveBeenCalled()
  })

  it('releases capacity on provider errors and returns a retryable failure', async () => {
    const handle = createCommunityHandler(() => settings)
    vi.mocked(generateCommunityReply).mockRejectedValueOnce(
      new Error('provider failed'),
    )
    expect((await handle(post())).status).toBe(502)
    expect((await handle(post())).status).toBe(200)
  })

  it('limits concurrent requests and recovers when the replies finish', async () => {
    const handle = createCommunityHandler(() => settings)
    let release = (): void => {}
    const pending = new Promise<CommunityResponse>((resolve) => {
      release = (): void => {
        resolve(reply)
      }
    })
    vi.mocked(generateCommunityReply).mockReturnValue(pending)
    const first = handle(post())
    const second = handle(post())
    await vi.waitFor(() => {
      expect(generateCommunityReply).toHaveBeenCalledTimes(2)
    })
    expect((await handle(post())).status).toBe(429)
    release()
    await Promise.all([first, second])
    expect((await handle(post())).status).toBe(200)
  })

  it('renews its minute budget and remains available beyond 500 total requests', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0)
    const handle = createCommunityHandler(() => settings)
    for (let minute = 0; minute < 18; minute++) {
      now.mockReturnValue(minute * 60000)
      for (let count = 0; count < 30; count++)
        expect((await handle(post())).status).toBe(200)
      const limited = await handle(post())
      expect(limited.status).toBe(429)
      expect(limited.headers.get('retry-after')).toBe('60')
    }
    expect(generateCommunityReply).toHaveBeenCalledTimes(540)
  })
})

describe('local Vite middleware adapter', () => {
  it('preserves HTTP bodies and headers and passes unrelated paths to Vite', async () => {
    const middleware = createCommunityMiddleware(() => settings)
    const server = createServer((req, res) => {
      middleware(req, res, () => {
        res.writeHead(404)
        res.end('vite fallback')
      })
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const address = server.address()
      if (!address || typeof address === 'string')
        throw new Error('Missing test port')
      const base = `http://127.0.0.1:${String(address.port)}`
      const response = await fetch(`${base}/api/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: base },
        body: JSON.stringify(body),
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(reply)
      const oversized = await fetch(`${base}/api/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, message: 'x'.repeat(25000) }),
      })
      expect(oversized.status).toBe(413)
      const status = await fetch(`${base}/api/community/status`)
      expect(await status.json()).toEqual({
        configured: true,
        model: settings.model,
      })
      expect(await (await fetch(`${base}/unrelated`)).text()).toBe(
        'vite fallback',
      )
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
        server.closeAllConnections()
      })
    }
  })
})
