import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { loadDataPack } from './data.ts'

const feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [-122.46889, 37.77293] },
}
function manifest(
  id: 'golden-gate-park' | 'san-jose-dc04',
): Record<string, unknown> {
  return {
    id,
    version: 1,
    preparedAt: '2026-10-24',
    bounds: [-122.516, 37.764, -122.438, 37.776],
    playableBounds: [-122.514, 37.7648, -122.439, 37.7753],
    center: [-122.46889, 37.77293],
    imageryDate: '2022-05-18',
    imageryCoordinates: [
      [-122.516, 37.776],
      [-122.438, 37.776],
      [-122.438, 37.764],
      [-122.516, 37.764],
    ],
    totalBytes: 1,
    datasets:
      id === 'golden-gate-park'
        ? [{ id: 'heritage', attribution: 'NPS HALS CA-49-B' }]
        : [],
    limitations: [],
  }
}
function mockPack(
  id: 'golden-gate-park' | 'san-jose-dc04',
): Mock<(input: string) => Promise<Response>> {
  const fetcher = vi.fn((input: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          input.endsWith('manifest.json')
            ? manifest(id)
            : { type: 'FeatureCollection', features: [feature] },
        ),
      ),
    ),
  )
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
afterEach(() => vi.unstubAllGlobals())
describe('scenario-specific geographic packs', () => {
  it('loads Golden Gate Park by default, including its declared heritage data', async () => {
    const fetcher = mockPack('golden-gate-park')
    const pack = await loadDataPack()
    expect(pack.manifest.id).toBe('golden-gate-park')
    expect(pack.layers.heritage?.features).toHaveLength(1)
    expect(
      fetcher.mock.calls.every(([url]) =>
        url.includes('/data/golden-gate-park/'),
      ),
    ).toBe(true)
  })
  it('preserves the explicit San José scenario without requiring new files', async () => {
    const fetcher = mockPack('san-jose-dc04')
    const pack = await loadDataPack('san-jose-dc04')
    expect(pack.manifest.id).toBe('san-jose-dc04')
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith('heritage.geojson')),
    ).toBe(false)
  })
  it('rejects a manifest for the wrong place rather than displaying mislabeled geography', async () => {
    mockPack('san-jose-dc04')
    await expect(loadDataPack('golden-gate-park')).rejects.toThrow(
      'does not match',
    )
  })
  it('does not turn an unknown scenario into an arbitrary fetch path', async () => {
    const fetcher = mockPack('golden-gate-park')
    await expect(loadDataPack('../somewhere')).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
