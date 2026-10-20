import { describe, it, expect, afterEach, vi } from 'vitest'
import { RerumHistoryData } from '../src/rerum-history-tree.js'

const BASE = 'https://store.rerum.io/v1/id'

const v1 = { '@id': `${BASE}/v1`, label: 'First', __rerum: { createdAt: '2020-01-01T00:00:00Z', history: { prime: 'root' } } }
const v2 = { '@id': `${BASE}/v2`, label: 'Second', __rerum: { createdAt: '2021-01-01T00:00:00Z', history: { previous: `${BASE}/v1` } } }
const v3 = { '@id': `${BASE}/v3`, label: 'Third', __rerum: { createdAt: '2022-01-01T00:00:00Z', history: { previous: `${BASE}/v2` } } }

function jsonResponse(data, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Not Found', json: async () => data }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RerumHistoryData.fetch', () => {
  it('derives /history/ and /since/ endpoints from the document URI', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([v1, v2])
      if (url.includes('/since/')) return jsonResponse([v3])
      return jsonResponse(null, false, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    await new RerumHistoryData(`${BASE}/v2`).fetch()

    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toContain('https://store.rerum.io/v1/history/v2')
    expect(urls).toContain('https://store.rerum.io/v1/since/v2')
  })

  it('builds a graph with roots, children and de-duplicated nodes', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([v1, v2, v2])
      if (url.includes('/since/')) return jsonResponse([v3])
      return jsonResponse(null, false, 404)
    }))

    const data = new RerumHistoryData(`${BASE}/v2`)
    await data.fetch()

    expect(data.getNodes().size).toBe(3)
    expect(data.getRoots()).toEqual([`${BASE}/v1`])
    expect(data.getChildren().get(`${BASE}/v1`)).toEqual([`${BASE}/v2`])
    expect(data.getChildren().get(`${BASE}/v2`)).toEqual([`${BASE}/v3`])
  })

  it('fetches the current document when it is missing from history/since', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([v1])
      if (url.includes('/since/')) return jsonResponse(null, false, 404)
      if (url === `${BASE}/v2`) return jsonResponse(v2)
      return jsonResponse(null, false, 404)
    }))

    const data = new RerumHistoryData(`${BASE}/v2`)
    await data.fetch()

    expect(data.getNodes().has(`${BASE}/v2`)).toBe(true)
    expect(data.getRoots()).toEqual([`${BASE}/v1`])
  })

  it('normalizes an array of bare id strings', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([`${BASE}/v1`, `${BASE}/v2`])
      if (url.includes('/since/')) return jsonResponse([])
      return jsonResponse(null, false, 404)
    }))

    const data = new RerumHistoryData(`${BASE}/v2`)
    await data.fetch()

    expect(data.getNodes().has(`${BASE}/v1`)).toBe(true)
    expect(data.getNodes().has(`${BASE}/v2`)).toBe(true)
  })

  it('rejects when the history request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(null, false, 500)))

    await expect(new RerumHistoryData(`${BASE}/v2`).fetch()).rejects.toThrow(/History request failed/)
  })

  it('rejects when the document URI has no /id/ segment', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse([])))

    await expect(new RerumHistoryData('https://store.rerum.io/v1/object/123').fetch())
      .rejects.toThrow(/path segment/)
  })
})

describe('RerumHistoryData summaries', () => {
  it('returns a summary with label, parent and children', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([v1, v2])
      if (url.includes('/since/')) return jsonResponse([v3])
      return jsonResponse(null, false, 404)
    }))

    const data = new RerumHistoryData(`${BASE}/v2`)
    await data.fetch()

    const summary = data.getSummary(`${BASE}/v2`, 'label')
    expect(summary.label).toBe('Second')
    expect(summary.parent).toBe(`${BASE}/v1`)
    expect(summary.children).toEqual([`${BASE}/v3`])
    expect(data.getAllSummaries('label')).toHaveLength(3)
  })

  it('falls back to the last id segment for labels', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/history/')) return jsonResponse([{ '@id': `${BASE}/abc123` }])
      if (url.includes('/since/')) return jsonResponse([])
      return jsonResponse(null, false, 404)
    }))

    const data = new RerumHistoryData(`${BASE}/abc123`)
    await data.fetch()

    expect(data.getSummary(`${BASE}/abc123`).label).toBe('abc123')
  })
})
