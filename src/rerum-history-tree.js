// RERUM History Tree Web Component
// Fetches the /history/{id} and /since/{id} endpoints for a RERUM document and renders a
// collapsible, searchable, keyboard-navigable version tree.
// Heuristics for id and parent/child linkage are documented in README.md.

const TEMPLATE = document.createElement('template')
TEMPLATE.innerHTML = `
  <style>
    :host {
      --rht-font-size: 14px;
      --rht-line-height: 1.35;
      --rht-accent: #2563eb; /* blue-600 */
      --rht-muted: #6b7280;  /* gray-500 */
      --rht-border: #e5e7eb; /* gray-200 */
      --rht-bg: #fff;
      --rht-hover: #f9fafb;

      display: block;
      font-size: var(--rht-font-size);
      line-height: var(--rht-line-height);
      color: #111827; /* gray-900 */
      background: var(--rht-bg);
      /* Allow height transitions to/from auto so details can slide open/closed. */
      interpolate-size: allow-keywords;
    }
    .container {
      display: flex;
      gap: 1rem;
    }
    .tree-section {
      flex: 1;
      min-width: 0;
    }
    .details-panel {
      width: 300px;
      border-left: 2px solid var(--rht-border);
      padding-left: 1rem;
      font-size: 0.9em;
    }
    .details-panel h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1em;
      color: var(--rht-accent);
    }
    .details-panel.hidden {
      display: none;
    }
    .key-value-table {
      margin: 0;
    }
    .key-value-table dt {
      font-weight: 500;
      color: #374151;
      margin-top: 0.5rem;
      margin-bottom: 0.125rem;
    }
    .key-value-table dt:first-child {
      margin-top: 0;
    }
    .key-value-table dd {
      margin: 0 0 0 1rem;
      color: var(--rht-muted);
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9em;
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      white-space: pre-wrap;
    }
    .header {
      display: flex;
      gap: .5rem;
      align-items: baseline;
      margin-bottom: .5rem;
      flex-wrap: wrap;
    }
    .header code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #f3f4f6;
      padding: 0 .35rem;
      border-radius: 4px;
      border: 1px solid var(--rht-border);
      color: #111827;
      word-break: break-all;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-left: auto;
    }
    .search {
      font: inherit;
      padding: .25rem .5rem;
      border: 1px solid var(--rht-border);
      border-radius: 6px;
      min-width: 12rem;
    }
    .search:focus-visible,
    summary:focus-visible,
    .leaf:focus-visible {
      outline: 2px solid var(--rht-accent);
      outline-offset: 1px;
    }
    .tree {
      padding-left: .25rem;
    }
    details {
      border-left: 2px solid var(--rht-border);
      margin: .125rem 0 .125rem .5rem;
      padding-left: .5rem;
    }
    summary {
      list-style: none;
      cursor: default;
      padding: .1rem .25rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: .4rem;
    }
    summary::-webkit-details-marker { display: none; }
    summary:hover { background: var(--rht-hover); }
    .twisty {
      width: .9em;
      display: inline-flex;
      transform: rotate(-90deg);
      transition: transform .12s ease;
      color: var(--rht-muted);
      cursor: pointer;
    }
    details[open] > summary .twisty {
      transform: rotate(0deg);
      color: var(--rht-accent);
    }
    /* Slide the branch content open/closed. The ::details-content pseudo-element is
       the box the browser shows/hides for a details; animating its block-size gives a
       continuous slide. Browsers without support fall back to native toggle. */
    details::details-content {
      block-size: 0;
      overflow: clip;
      overflow-clip-margin: 4px; /* let focus outlines bleed past the clip edge */
      transition:
        block-size .24s ease,
        content-visibility .24s allow-discrete;
    }
    details[open]::details-content {
      block-size: auto;
    }
    @media (prefers-reduced-motion: reduce) {
      details::details-content {
        transition: none;
      }
    }
    .label {
      font-weight: 500;
      cursor: pointer;
    }
    .label:hover {
      text-decoration: underline;
    }
    .meta {
      color: var(--rht-muted);
      font-size: 0.92em;
    }
    .time-ago {
      margin-left: 0.5rem;
      font-style: italic;
    }
    .id {
      cursor: pointer;
    }
    .id:hover {
      text-decoration: underline;
    }
    .leaf {
      margin: .125rem 0 .125rem 1.5rem;
      padding: .1rem .25rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .leaf:hover { background: var(--rht-hover); }
    .leaf.selected,
    details.selected > summary {
      background: var(--rht-accent);
      color: white;
    }
    .leaf.selected .meta,
    details.selected > summary .meta {
      color: rgba(255, 255, 255, 0.8);
    }
    .id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #374151;
      word-break: break-all;
    }
    .leaf.selected .id,
    details.selected > summary .id {
      color: rgba(255, 255, 255, 0.9);
    }
    .error {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: .5rem .75rem;
      border-radius: 8px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }
  </style>
  <div class="header">
    <div><strong>RERUM History</strong></div>
    <div class="meta">
      <span class="sr-only">Document URI: </span><code id="docUriDisplay"></code>
    </div>
    <div class="search-wrap">
      <label class="sr-only" for="search">Filter versions</label>
      <input id="search" class="search" type="search" placeholder="Filter versions…" autocomplete="off" />
      <span id="matchCount" class="meta" role="status" aria-live="polite"></span>
    </div>
  </div>
  <div class="container">
    <div class="tree-section">
      <div id="content"></div>
    </div>
    <div class="details-panel hidden" id="detailsPanel">
      <h3>Selected Version</h3>
      <dl class="key-value-table" id="keyValueTable"></dl>
    </div>
  </div>
`

export class RerumHistoryTree extends HTMLElement {
  static get observedAttributes() {
    return ['document-uri', 'node-label-key', 'filter']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' }).appendChild(TEMPLATE.content.cloneNode(true))
    this._state = {
      items: [],
      graph: null,
      selectedItem: null,
      selectedId: null
    }
    this._historyData = null
    this._nodeEls = new Map()
    this._onTreeKeydown = this._onTreeKeydown.bind(this)
    this._onTreeFocusIn = this._onTreeFocusIn.bind(this)
  }

  connectedCallback() {
    this._renderHeader()
    this._wireSearch()
    if (this.documentUri) {
      this.refresh()
    }
  }

  // Abort any in-flight request when the element leaves the DOM to avoid leaks.
  disconnectedCallback() {
    this._clearAbort()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return

    switch (name) {
      case 'document-uri':
        this._renderHeader()
        if (this.isConnected && this.documentUri) {
          this.refresh()
        }
        return
      case 'node-label-key':
        if (this._state.items?.length) this._renderTree()
        return
      case 'filter': {
        const input = this.shadowRoot.getElementById('search')
        if (input && input.value !== (newVal ?? '')) input.value = newVal ?? ''
        if (this._state.items?.length) this._renderTree()
        return
      }
      default:
        return
    }
  }

  get documentUri() {
    return this.getAttribute('document-uri') ?? ''
  }
  set documentUri(v) {
    if (v == null) {
      this.removeAttribute('document-uri')
      return
    }
    this.setAttribute('document-uri', v)
  }

  get nodeLabelKey() {
    return this.getAttribute('node-label-key') ?? ''
  }
  set nodeLabelKey(v) {
    if (!v) {
      this.removeAttribute('node-label-key')
      return
    }
    this.setAttribute('node-label-key', v)
  }

  get filter() {
    return this.getAttribute('filter') ?? ''
  }
  set filter(v) {
    if (!v) {
      this.removeAttribute('filter')
      return
    }
    this.setAttribute('filter', v)
  }

  async refresh() {
    if (!this.documentUri) return
    this._clearAbort()

    const historyData = new RerumHistoryData(this.documentUri)
    this._historyData = historyData
    this._setContent(this._infoEl('Loading history…'))

    try {
      await historyData.fetch()

      this._state.items = historyData.getItems()
      this._state.graph = historyData.getGraph()

      this._renderTree()

      this.dispatchEvent(new CustomEvent('loaded', {
        detail: { count: this._state.items.length, roots: this._state.graph.roots },
        bubbles: true
      }))
    } catch (error) {
      if (error.name === 'AbortError') return
      this._setContent(this._errorEl(error))
      this.dispatchEvent(new CustomEvent('error', { detail: { error }, bubbles: true }))
    }
  }

  _renderHeader() {
    this.shadowRoot.getElementById('docUriDisplay').textContent = this.documentUri || '(no document URI)'
  }

  _wireSearch() {
    if (this._searchWired) return
    const input = this.shadowRoot.getElementById('search')
    if (!input) return
    input.value = this.filter
    input.addEventListener('input', () => {
      this.filter = input.value
    })
    this._searchWired = true
  }

  _renderTree() {
    const container = document.createElement('div')
    container.className = 'tree'
    container.setAttribute('role', 'tree')
    container.setAttribute('aria-label', 'Version history')
    this._nodeEls = new Map()

    const { nodes, children, roots, idFor } = this._state.graph ?? {}
    if (!nodes) {
      this._setContent(this._errorEl(new Error('No graph to render.')))
      return
    }

    const countEl = this.shadowRoot.getElementById('matchCount')
    const query = this.filter.trim().toLowerCase()

    if (query) {
      this._renderFiltered(container, nodes, query, countEl)
      this._setContent(container)
      this._wireTreeKeyboard(container)
      return
    }

    if (countEl) countEl.textContent = ''

    if (roots.length === 0) {
      container.appendChild(this._infoEl('No roots found. Rendering all as leaves.'))
      for (const item of this._state.items) {
        container.appendChild(this._leafEl(item, idFor(item)))
      }
      this._setContent(container)
      this._wireTreeKeyboard(container)
      return
    }

    for (const rootId of roots) {
      container.appendChild(this._branchEl(nodes.get(rootId), rootId, children, nodes, idFor, 0))
    }

    this._setContent(container)
    this._wireTreeKeyboard(container)

    // Auto-select the current document version if it exists in the tree
    if (this.documentUri && nodes.has(this.documentUri)) {
      this._selectVersion(nodes.get(this.documentUri), this.documentUri)
    }
  }

  _renderFiltered(container, nodes, query, countEl) {
    const matches = []
    for (const [id, item] of nodes.entries()) {
      const label = this._labelFor(item, id)
      if (label.toLowerCase().includes(query) || String(id).toLowerCase().includes(query)) {
        matches.push({ id, item, ts: getLatestTimestamp(item) })
      }
    }
    matches.sort((a, b) => b.ts - a.ts)

    if (countEl) countEl.textContent = `${matches.length} match${matches.length === 1 ? '' : 'es'}`

    if (matches.length === 0) {
      container.appendChild(this._infoEl('No versions match your filter.'))
      return
    }

    for (const m of matches) {
      container.appendChild(this._leafEl(m.item, m.id))
    }
  }

  _branchEl(item, id, childrenMap, nodes, idFor, depth) {
    const kids = childrenMap.get(id) ?? []
    const details = document.createElement('details')
    details.setAttribute('data-id', id)
    if (depth < 2) details.open = true

    const summary = document.createElement('summary')
    summary.className = 'node'
    summary.setAttribute('data-id', id)
    summary.tabIndex = -1
    summary.setAttribute('aria-level', String(depth + 1))

    const twisty = document.createElement('span')
    twisty.className = 'twisty'
    twisty.setAttribute('aria-hidden', 'true')
    twisty.textContent = '▶'
    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = this._labelFor(item, id)
    const timeAgo = document.createElement('span')
    timeAgo.className = 'time-ago meta'
    timeAgo.textContent = formatTimeAgo(getLatestTimestamp(item))
    const idEl = document.createElement('span')
    idEl.className = 'id meta'
    idEl.textContent = `(${id})`

    summary.appendChild(twisty)
    summary.appendChild(label)
    summary.appendChild(timeAgo)
    summary.appendChild(idEl)

    // Selecting via the label or id should not also toggle the disclosure.
    const handleSelection = (e) => {
      e.preventDefault()
      this._selectById(id)
    }
    label.addEventListener('click', handleSelection)
    idEl.addEventListener('click', handleSelection)

    this._nodeEls.set(id, summary)
    details.appendChild(summary)

    for (const childId of kids) {
      const child = nodes.get(childId)
      const childKids = childrenMap.get(childId) ?? []
      if (childKids.length > 0) {
        details.appendChild(this._branchEl(child, childId, childrenMap, nodes, idFor, depth + 1))
      } else {
        details.appendChild(this._leafEl(child, childId))
      }
    }
    return details
  }

  _leafEl(item, id) {
    const leaf = document.createElement('div')
    leaf.className = 'leaf node'
    leaf.setAttribute('data-id', id)
    leaf.tabIndex = -1
    leaf.innerHTML = `
      <span class="label">${escapeHtml(this._labelFor(item, id))}</span>
      <span class="time-ago meta">${escapeHtml(formatTimeAgo(getLatestTimestamp(item)))}</span>
      <span class="id meta">(${escapeHtml(id)})</span>
    `
    leaf.addEventListener('click', () => {
      this._selectById(id)
    })
    this._nodeEls.set(id, leaf)
    return leaf
  }

  _labelFor(item, id) {
    return labelFor(item, id, this.nodeLabelKey)
  }

  _wireTreeKeyboard(container) {
    container.addEventListener('keydown', this._onTreeKeydown)
    container.addEventListener('focusin', this._onTreeFocusIn)
    this._setRoving(this._visibleFocusables(), 0)
  }

  _isFocusableNode(el) {
    return el instanceof Element && el.matches('summary[data-id], .leaf[data-id]')
  }

  _visibleFocusables() {
    const container = this.shadowRoot.querySelector('.tree')
    if (!container) return []
    return Array.from(container.querySelectorAll('summary[data-id], .leaf[data-id]'))
      .filter((el) => this._isVisibleInTree(el, container))
  }

  _isVisibleInTree(el, container) {
    // A summary stays visible even when its own details is collapsed, so start above it.
    let cur = el.tagName === 'SUMMARY' ? el.parentElement?.parentElement : el.parentElement
    while (cur && cur !== container) {
      if (cur.tagName === 'DETAILS' && !cur.open) return false
      cur = cur.parentElement
    }
    return true
  }

  _setRoving(list, activeIdx) {
    list.forEach((el, i) => { el.tabIndex = i === activeIdx ? 0 : -1 })
  }

  _focusIndex(list, i) {
    if (!list.length) return
    const idx = Math.max(0, Math.min(i, list.length - 1))
    this._setRoving(list, idx)
    list[idx].focus()
  }

  _onTreeFocusIn(e) {
    const target = e.target
    if (!this._isFocusableNode(target)) return
    const list = this._visibleFocusables()
    this._setRoving(list, list.indexOf(target))
  }

  _onTreeKeydown(e) {
    const target = e.target
    if (!this._isFocusableNode(target)) return

    const list = this._visibleFocusables()
    const idx = list.indexOf(target)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this._focusIndex(list, idx + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        this._focusIndex(list, idx - 1)
        break
      case 'Home':
        e.preventDefault()
        this._focusIndex(list, 0)
        break
      case 'End':
        e.preventDefault()
        this._focusIndex(list, list.length - 1)
        break
      case 'ArrowRight': {
        const d = target.closest('details')
        if (d && !d.open) {
          e.preventDefault()
          d.open = true
        }
        break
      }
      case 'ArrowLeft': {
        const d = target.closest('details')
        if (d && d.open) {
          e.preventDefault()
          d.open = false
        }
        break
      }
      case 'Enter':
      case ' ':
        e.preventDefault()
        this._selectById(target.getAttribute('data-id'))
        break
      default:
        break
    }
  }

  _infoEl(msg) {
    const d = document.createElement('div')
    d.className = 'meta'
    d.textContent = msg
    return d
  }
  _errorEl(error) {
    const d = document.createElement('div')
    d.className = 'error'
    d.textContent = `Error: ${error?.message ?? error}`
    return d
  }
  _setContent(node) {
    const content = this.shadowRoot.getElementById('content')
    content.innerHTML = ''
    content.appendChild(node)
  }
  _clearAbort() {
    if (this._historyData) {
      this._historyData.abort()
      this._historyData = null
    }
  }

  _selectById(id) {
    const nodes = this._state.graph?.nodes
    if (!id || !nodes || !nodes.has(id)) return

    const item = nodes.get(id)
    this._selectVersion(item, id)

    this.dispatchEvent(new CustomEvent('versionselected', {
      detail: { id, item },
      bubbles: true
    }))
  }

  _selectVersion(item, id) {
    this._clearSelection()

    this._state.selectedItem = item
    this._state.selectedId = id
    this._showVersionDetails(item)

    const element = this._nodeEls.get(id)
    if (element) {
      element.classList.add('selected')
      element.setAttribute('aria-current', 'true')
    }
  }

  _clearSelection() {
    this.shadowRoot.querySelectorAll('.selected').forEach((el) => {
      el.classList.remove('selected')
      el.removeAttribute('aria-current')
    })
  }

  _showVersionDetails(item) {
    const panel = this.shadowRoot.getElementById('detailsPanel')
    const table = this.shadowRoot.getElementById('keyValueTable')

    if (!item || typeof item !== 'object') {
      panel.classList.add('hidden')
      return
    }

    // Create filtered object without __rerum property
    const filteredItem = {}
    for (const [key, value] of Object.entries(item)) {
      if (key !== '__rerum') {
        filteredItem[key] = value
      }
    }

    table.innerHTML = ''

    for (const [key, value] of Object.entries(filteredItem)) {
      const dt = document.createElement('dt')
      dt.textContent = key
      const dd = document.createElement('dd')

      if (value == null) {
        dd.textContent = 'null'
      } else if (typeof value === 'object') {
        dd.textContent = JSON.stringify(value, null, 2)
      } else {
        dd.textContent = String(value)
      }

      table.appendChild(dt)
      table.appendChild(dd)
    }

    panel.classList.remove('hidden')
  }
}

customElements.define('rerum-history-tree', RerumHistoryTree)

/**
 * RerumHistoryData - A class for fetching and managing RERUM version history data
 * Can be used independently of the web component to access version history information
 */
export class RerumHistoryData {
  constructor(documentUri) {
    this.documentUri = documentUri
    this.items = []
    this.graph = null
    this._abort = null
  }

  /**
   * Fetch history and since data for the document URI
   * @returns {Promise<void>}
   */
  async fetch() {
    if (!this.documentUri) {
      throw new Error('Document URI is required')
    }

    if (this._abort) {
      this._abort.abort()
    }
    const controller = new AbortController()
    this._abort = controller

    try {
      const historyUrl = deriveEndpointUrl(this.documentUri, 'history')
      const sinceUrl = deriveEndpointUrl(this.documentUri, 'since')

      const [historyRes, sinceRes] = await Promise.all([
        fetch(historyUrl, { signal: controller.signal, headers: { accept: 'application/json' } }),
        fetch(sinceUrl, { signal: controller.signal, headers: { accept: 'application/json' } })
      ])

      if (!historyRes.ok) {
        throw new Error(`History request failed (${historyRes.status}) ${historyRes.statusText}`)
      }

      const historyData = await historyRes.json()
      const historyRawItems = Array.isArray(historyData) ? historyData : (historyData?.items ?? historyData?.history ?? [])
      if (!Array.isArray(historyRawItems)) {
        throw new Error('Unexpected history response format (expected array).')
      }

      let sinceRawItems = []
      if (sinceRes.ok) {
        const sinceData = await sinceRes.json()
        sinceRawItems = Array.isArray(sinceData) ? sinceData : (sinceData?.items ?? sinceData?.since ?? [])
        if (!Array.isArray(sinceRawItems)) {
          sinceRawItems = []
        }
      }

      const allRawItems = [...historyRawItems, ...sinceRawItems]
      const items = allRawItems.map((it) => (typeof it === 'string' ? { '@id': it } : it))

      // Add the current document if it's not already in the items
      const currentDocumentIncluded = items.some((item) => idFrom(item) === this.documentUri)
      if (!currentDocumentIncluded) {
        try {
          const currentRes = await fetch(this.documentUri, {
            signal: controller.signal,
            headers: { accept: 'application/json' }
          })
          if (currentRes.ok) {
            items.push(await currentRes.json())
          }
        } catch {
          // The current document is a nice-to-have; ignore failures and render what we have.
        }
      }

      const seen = new Set()
      const uniqueItems = items.filter((item) => {
        const id = idFrom(item)
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })

      this.items = uniqueItems
      this.graph = buildGraph(uniqueItems)
    } finally {
      this._abort = null
    }
  }

  /**
   * Get all version items
   * @returns {Array}
   */
  getItems() {
    return this.items
  }

  /**
   * Get the version graph structure
   * @returns {Object} { nodes: Map, children: Map, roots: Array, idFor: Function }
   */
  getGraph() {
    return this.graph
  }

  /**
   * Get root version IDs (versions with no parent)
   * @returns {Array<string>}
   */
  getRoots() {
    return this.graph?.roots ?? []
  }

  /**
   * Get a map of all version nodes by ID
   * @returns {Map<string, Object>}
   */
  getNodes() {
    return this.graph?.nodes ?? new Map()
  }

  /**
   * Get children map (parent ID -> array of child IDs)
   * @returns {Map<string, Array<string>>}
   */
  getChildren() {
    return this.graph?.children ?? new Map()
  }

  /**
   * Get summary for a specific version
   * @param {string} id - Version ID
   * @param {string} labelKey - Optional key to use for label
   * @returns {Object} { id, label, item, children, parent }
   */
  getSummary(id, labelKey) {
    const nodes = this.getNodes()
    const children = this.getChildren()
    const item = nodes.get(id)

    if (!item) return null

    const label = this._getLabelFor(item, id, labelKey)
    const childIds = children.get(id) ?? []
    const parent = this._findParent(id)

    return {
      id,
      label,
      item,
      children: childIds,
      parent
    }
  }

  /**
   * Get summaries for all versions
   * @param {string} labelKey - Optional key to use for labels
   * @returns {Array<Object>}
   */
  getAllSummaries(labelKey) {
    const nodes = this.getNodes()
    return Array.from(nodes.keys()).map((id) => this.getSummary(id, labelKey))
  }

  _getLabelFor(item, id, labelKey) {
    return labelFor(item, id, labelKey)
  }

  _findParent(childId) {
    const children = this.getChildren()
    for (const [parentId, childIds] of children.entries()) {
      if (childIds.includes(childId)) {
        return parentId
      }
    }
    return null
  }

  /**
   * Cancel any ongoing fetch operation
   */
  abort() {
    if (this._abort) {
      this._abort.abort()
      this._abort = null
    }
  }
}

/**
 * Build a graph from items using RERUM history heuristics:
 * - idFor: @id || id || _id (falls back to __rerum.history.id || __rerum.id)
 * - parentFrom(item): __rerum.history.previous (string or object) - the @id/id of the directly earlier version
 * - nextFrom(item): __rerum.history.next (array of ids) - branches to more recent versions
 * - primeFrom(item): __rerum.history.prime (string) - "root" indicates the very first version
 * - Root detection: Documents with __rerum.history.prime: "root" are preferred as roots,
 *   fallback to orphaned nodes (those not referenced as children)
 */
function buildGraph(items) {
  const nodes = new Map()
  const idFor = (item) => idFrom(item)
  for (const it of items) {
    const id = idFor(it)
    if (!id) continue
    nodes.set(id, it)
  }

  const children = new Map()
  const allChildren = new Set()
  const ensure = (id) => {
    if (!children.has(id)) children.set(id, new Set())
    return children.get(id)
  }

  // previous -> child
  for (const it of items) {
    const childId = idFor(it)
    if (!childId) continue

    const prev = previousFrom(it)
    const parentId = normalizeId(prev)
    if (parentId) {
      ensure(parentId).add(childId)
      allChildren.add(childId)
    }
  }

  // next array -> children
  for (const it of items) {
    const parentId = idFor(it)
    if (!parentId) continue

    const nexts = nextFrom(it)
    if (Array.isArray(nexts)) {
      for (const nxt of nexts) {
        const cid = normalizeId(nxt)
        if (!cid) continue
        ensure(parentId).add(cid)
        allChildren.add(cid)
      }
    }
  }

  // Convert child sets to arrays and filter to known nodes, then sort by timestamp
  // Also build a filtered set of children to correctly identify roots
  const childrenArr = new Map()
  const allChildrenFiltered = new Set()

  for (const [pid, set] of children.entries()) {
    // Skip parents that don't exist in the dataset
    if (!nodes.has(pid)) continue

    // Get valid child IDs (children that exist in the dataset)
    const childIds = Array.from(set).filter((cid) => nodes.has(cid))
    if (childIds.length === 0) continue

    // Sort children by timestamp
    const childItems = childIds.map((id) => nodes.get(id))
    const sortedChildItems = sortByTimestamp(childItems)
    const sortedChildIds = sortedChildItems.map((item) => idFor(item)).filter((id) => id && nodes.has(id))

    // Store the parent-child relationship
    childrenArr.set(pid, sortedChildIds)

    // Add all these children to the filtered set
    for (const childId of sortedChildIds) {
      allChildrenFiltered.add(childId)
    }
  }

  // Roots = nodes with __rerum.history.prime: "root", fallback to nodes that are not children
  const roots = []
  const primeRoots = []
  const primeRootIds = new Set()

  // First, find documents marked as prime roots
  for (const [id, item] of nodes.entries()) {
    if (isPrimeRoot(item)) {
      primeRoots.push(id)
      primeRootIds.add(id)
    }
  }

  // Also look for documents that point to a prime root (in case the actual root isn't in the dataset)
  if (primeRoots.length === 0) {
    for (const [, item] of nodes.entries()) {
      const prime = primeFrom(item)
      if (prime && typeof prime === 'string' && prime !== 'root') {
        // This document points to a prime root that might not be in our dataset
        // If we DO have that prime root, add it to our roots
        if (nodes.has(prime)) {
          primeRootIds.add(prime)  // Add the actual prime root, not this node
        }
        // If the prime root is missing, we'll fall back to orphan detection
      }
    }
  }

  // If we have prime roots, use them; otherwise fall back to orphaned nodes
  if (primeRoots.length > 0) {
    roots.push(...primeRoots)
  } else if (primeRootIds.size > 0) {
    roots.push(...Array.from(primeRootIds))
  } else {
    // Use filtered children set to identify roots (nodes not in any existing parent's children)
    for (const id of nodes.keys()) {
      const isChild = allChildrenFiltered.has(id)
      if (!isChild) {
        roots.push(id)
      }
    }
  }

  return { nodes, children: childrenArr, roots, idFor }
}

function idFrom(item) {
  if (!item || typeof item !== 'object') return ''
  if (typeof item['@id'] === 'string') return item['@id']
  if (typeof item.id === 'string') return item.id
  if (typeof item._id === 'string') return item._id
  const nested = item?.__rerum?.history?.id ?? item?.__rerum?.id
  if (typeof nested === 'string') return nested
  return ''
}

function previousFrom(item) {
  const prev = item?.__rerum?.history?.previous ?? item?.history?.previous ?? item?.__rerum?.previous
  return prev
}

function nextFrom(item) {
  const nxt = item?.__rerum?.history?.next ?? item?.history?.next ?? item?.__rerum?.next
  return Array.isArray(nxt) ? nxt : (typeof nxt === 'string' ? [nxt] : null)
}

function primeFrom(item) {
  return item?.__rerum?.history?.prime ?? item?.history?.prime ?? item?.__rerum?.prime
}

function isPrimeRoot(item) {
  const prime = primeFrom(item)
  return prime === 'root'
}

function normalizeId(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return idFrom(value)
  return ''
}

/**
 * Derive a RERUM endpoint URL (e.g. "history" or "since") from a document URI by
 * replacing the "id" path segment. Throws when the URI is missing or has no "/id/" segment.
 * @param {string} documentUri
 * @param {string} kind
 * @returns {string}
 */
function deriveEndpointUrl(documentUri, kind) {
  if (!documentUri || typeof documentUri !== 'string') {
    throw new Error('Document URI must be a non-empty string')
  }

  let url
  try {
    url = new URL(documentUri)
  } catch {
    throw new Error(`Invalid document URI: ${documentUri}`)
  }

  const segments = url.pathname.split('/')
  const idx = segments.lastIndexOf('id')
  if (idx === -1) {
    throw new Error('Document URI must contain an "/id/" path segment')
  }

  segments[idx] = kind
  url.pathname = segments.join('/')
  return url.toString()
}

/**
 * Resolve a human-friendly label for a version item.
 * @param {Object} item
 * @param {string} id
 * @param {string} [labelKey]
 * @returns {string}
 */
function labelFor(item, id, labelKey) {
  const key = labelKey?.trim()
  if (key && item && typeof item === 'object' && key in item) {
    const v = item[key]
    if (v != null) return String(v)
  }
  if (item?.label) return String(item.label)
  if (item?.name) return String(item.name)
  if (id) {
    try {
      const u = new URL(String(id))
      const segs = u.pathname.split('/').filter(Boolean)
      if (segs.length) return segs[segs.length - 1]
    } catch {
      const segs = String(id).split(/[/#!]/).filter(Boolean)
      if (segs.length) return segs[segs.length - 1]
    }
  }
  return 'version'
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getLatestTimestamp(item) {
  const createdAt = item?.__rerum?.createdAt ?? item?.createdAt
  const isOverwritten = item?.__rerum?.isOverwritten ?? item?.isOverwritten

  const timestamps = [createdAt, isOverwritten].filter(Boolean).map((ts) => {
    if (typeof ts === 'string') {
      const date = new Date(ts)
      return isNaN(date.getTime()) ? null : date.getTime()
    }
    if (typeof ts === 'number') return ts
    return null
  }).filter((t) => t !== null)

  return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return ''

  const diff = Date.now() - timestamp
  const future = diff < 0
  const abs = Math.abs(diff)
  const minutes = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)

  const unit = days > 0 ? `${days} day${days > 1 ? 's' : ''}`
    : hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}`
      : minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}`
        : null

  if (!unit) return 'just now'
  return future ? `in ${unit}` : `${unit} ago`
}

function sortByTimestamp(items) {
  return [...items].sort((a, b) => {
    const timestampA = getLatestTimestamp(a)
    const timestampB = getLatestTimestamp(b)
    return timestampB - timestampA // Most recent first
  })
}
