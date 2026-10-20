import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '../src/rerum-history-tree.js'

const BASE = 'https://store.rerum.io/v1/id'

const v1 = { '@id': `${BASE}/v1`, label: 'First', __rerum: { createdAt: '2020-01-01T00:00:00Z', history: { prime: 'root' } } }
const v2 = { '@id': `${BASE}/v2`, label: 'Second', __rerum: { createdAt: '2021-01-01T00:00:00Z', history: { previous: `${BASE}/v1` } } }
const v3 = { '@id': `${BASE}/v3`, label: 'Third', __rerum: { createdAt: '2022-01-01T00:00:00Z', history: { previous: `${BASE}/v2` } } }

function jsonResponse(data, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Not Found', json: async () => data }
}

function mockHistoryFetch() {
  return vi.fn((url) => {
    if (url.includes('/history/')) return jsonResponse([v1, v2])
    if (url.includes('/since/')) return jsonResponse([v3])
    return jsonResponse(null, false, 404)
  })
}

let el

async function mount(documentUri) {
  el = document.createElement('rerum-history-tree')
  const loaded = new Promise((resolve) => el.addEventListener('loaded', resolve))
  document.body.appendChild(el)
  el.setAttribute('document-uri', documentUri)
  return loaded
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockHistoryFetch())
})

afterEach(() => {
  el?.remove()
  el = null
  vi.unstubAllGlobals()
})

describe('rerum-history-tree element', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('rerum-history-tree')).toBeTruthy()
  })

  it('renders the tree and dispatches loaded', async () => {
    const event = await mount(`${BASE}/v2`)

    expect(event.detail.count).toBe(3)
    expect(el.shadowRoot.querySelector('.tree')).toBeTruthy()
    expect(el.shadowRoot.querySelectorAll('summary[data-id]').length).toBeGreaterThan(0)
  })

  it('auto-selects the current document version', async () => {
    await mount(`${BASE}/v2`)

    const selected = el.shadowRoot.querySelector('.selected[data-id]')
    expect(selected?.getAttribute('data-id')).toBe(`${BASE}/v2`)
    expect(el.shadowRoot.getElementById('detailsPanel').classList.contains('hidden')).toBe(false)
  })

  it('dispatches versionselected when a node is clicked', async () => {
    await mount(`${BASE}/v2`)

    const leaf = el.shadowRoot.querySelector('.leaf[data-id]')
    const selected = new Promise((resolve) => el.addEventListener('versionselected', resolve))
    leaf.querySelector('.label').click()

    const event = await selected
    expect(event.detail.id).toBe(`${BASE}/v3`)
  })

  it('filters the tree and reports the match count', async () => {
    await mount(`${BASE}/v2`)

    el.setAttribute('filter', 'Third')

    const leaves = el.shadowRoot.querySelectorAll('.leaf[data-id]')
    expect(leaves).toHaveLength(1)
    expect(leaves[0].getAttribute('data-id')).toBe(`${BASE}/v3`)
    expect(el.shadowRoot.getElementById('matchCount').textContent).toBe('1 match')
  })

  it('supports keyboard selection with Enter', async () => {
    await mount(`${BASE}/v2`)

    const summary = el.shadowRoot.querySelector('summary[data-id]')
    summary.focus()
    const selected = new Promise((resolve) => el.addEventListener('versionselected', resolve))
    summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    const event = await selected
    expect(event.detail.id).toBe(summary.getAttribute('data-id'))
  })

  it('moves focus with ArrowDown', async () => {
    await mount(`${BASE}/v2`)

    const first = el.shadowRoot.querySelector('summary[data-id]')
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    const active = el.shadowRoot.activeElement
    expect(active).toBeTruthy()
    expect(active).not.toBe(first)
    expect(active.matches('summary[data-id], .leaf[data-id]')).toBe(true)
  })

  it('dispatches error when the history request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(null, false, 500)))

    el = document.createElement('rerum-history-tree')
    const errored = new Promise((resolve) => el.addEventListener('error', resolve))
    document.body.appendChild(el)
    el.setAttribute('document-uri', `${BASE}/v2`)

    const event = await errored
    expect(event.detail.error).toBeInstanceOf(Error)
    expect(el.shadowRoot.querySelector('.error')).toBeTruthy()
  })
})
