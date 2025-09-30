// RERUM History Tree Web Component
// Fetches the appropriate /history/{id} endpoint and renders a collapsible tree.
// Takes a document URI and replaces /id/ with /history/ to get the history endpoint.
// Heuristics for id and parent/child linkage are documented in README.md.

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>
    :host {
      --rht-font-size: 14px;
      --rht-line-height: 1.35;
      --rht-accent: #2563eb; /* indigo-600 */
      --rht-muted: #6b7280;  /* gray-500 */
      --rht-border: #e5e7eb; /* gray-200 */
      --rht-bg: #fff;
      --rht-hover: #f9fafb;

      display: block;
      font-size: var(--rht-font-size);
      line-height: var(--rht-line-height);
      color: #111827; /* gray-900 */
      background: var(--rht-bg);
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
      cursor: pointer;
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
    }
    details[open] > summary .twisty {
      transform: rotate(0deg);
      color: var(--rht-accent);
    }
    .label {
      font-weight: 500;
    }
    .meta {
      color: var(--rht-muted);
      font-size: 0.92em;
    }
    .leaf {
      margin: .125rem 0 .125rem 1.5rem;
      padding: .1rem .25rem;
      border-radius: 6px;
    }
    .leaf:hover { background: var(--rht-hover); }
    .id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #374151;
      word-break: break-all;
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
  </div>
  <div id="content"></div>
`;

export class RerumHistoryTree extends HTMLElement {
  static get observedAttributes() {
    return ['document-uri', 'node-label-key'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(TEMPLATE.content.cloneNode(true));
    this._state = {
      items: [],
      graph: null
    };
    this._abort = null;
  }

  connectedCallback() {
    this._renderHeader();
    if (this.documentUri) {
      this.refresh();
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'document-uri') {
      this._renderHeader();
      if (this.isConnected && this.documentUri) {
        this.refresh();
      }
    } else if (name === 'node-label-key' && this._state.items?.length) {
      this._renderTree();
    }
  }

  get documentUri() {
    return this.getAttribute('document-uri') || '';
  }
  set documentUri(v) {
    if (v == null) this.removeAttribute('document-uri');
    else this.setAttribute('document-uri', v);
  }

  get nodeLabelKey() {
    return this.getAttribute('node-label-key') || '';
  }
  set nodeLabelKey(v) {
    if (!v) this.removeAttribute('node-label-key');
    else this.setAttribute('node-label-key', v);
  }

  async refresh() {
    if (!this.documentUri) return;
    this._clearAbort();
    const controller = new AbortController();
    this._abort = controller;

    // Replace /id/ with /history/ to get the history endpoint
    const url = this.documentUri.replace('/id/', '/history/');
    this._setContent(this._infoEl(`Loading history…`));

    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Request failed (${res.status}) ${res.statusText}`);
      const data = await res.json();

      const rawItems = Array.isArray(data) ? data : (data?.items || data?.history || []);
      if (!Array.isArray(rawItems)) {
        throw new Error('Unexpected response format (expected array).');
      }

      const items = rawItems.map((it) => (typeof it === 'string' ? { '@id': it } : it));
      this._state.items = items;
      this._state.graph = buildGraph(items);

      this._renderTree();

      this.dispatchEvent(new CustomEvent('loaded', {
        detail: { count: items.length, roots: this._state.graph.roots },
        bubbles: true
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      this._setContent(this._errorEl(error));
      this.dispatchEvent(new CustomEvent('error', { detail: { error }, bubbles: true }));
    } finally {
      this._clearAbort();
    }
  }

  _renderHeader() {
    const root = this.shadowRoot;
    root.getElementById('docUriDisplay').textContent = this.documentUri || '(no document URI)';
  }

  _renderTree() {
    const container = document.createElement('div');
    container.className = 'tree';

    const { nodes, children, roots, idFor } = this._state.graph || {};
    if (!nodes) {
      this._setContent(this._errorEl(new Error('No graph to render.')));
      return;
    }

    if (roots.length === 0) {
      container.appendChild(this._infoEl('No roots found. Rendering all as leaves.'));
      for (const item of this._state.items) {
        container.appendChild(this._leafEl(item, idFor(item)));
      }
      this._setContent(container);
      return;
    }

    for (const rootId of roots) {
      const el = this._branchEl(nodes.get(rootId), rootId, children, nodes, idFor, 0);
      container.appendChild(el);
    }

    this._setContent(container);
  }

  _branchEl(item, id, childrenMap, nodes, idFor, depth) {
    const kids = childrenMap.get(id) || [];
    const details = document.createElement('details');
    if (depth < 2) details.open = true;

    const summary = document.createElement('summary');
    const twisty = document.createElement('span');
    twisty.className = 'twisty';
    twisty.textContent = '▶';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = this._labelFor(item, id);
    const idEl = document.createElement('span');
    idEl.className = 'id meta';
    idEl.textContent = `(${id})`;

    summary.appendChild(twisty);
    summary.appendChild(label);
    summary.appendChild(idEl);
    summary.addEventListener('click', (e) => {
      this.dispatchEvent(new CustomEvent('nodeclick', {
        detail: { id, item },
        bubbles: true
      }));
      e.stopPropagation();
    });

    details.appendChild(summary);

    for (const childId of kids) {
      const child = nodes.get(childId);
      const childKids = (childrenMap.get(childId) || []);
      if (childKids.length > 0) {
        details.appendChild(this._branchEl(child, childId, childrenMap, nodes, idFor, depth + 1));
      } else {
        details.appendChild(this._leafEl(child, childId));
      }
    }
    return details;
  }

  _leafEl(item, id) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.innerHTML = `
      <span class="label">${escapeHtml(this._labelFor(item, id))}</span>
      <span class="id meta">(${escapeHtml(id)})</span>
    `;
    leaf.addEventListener('click', (e) => {
      this.dispatchEvent(new CustomEvent('nodeclick', {
        detail: { id, item },
        bubbles: true
      }));
      e.stopPropagation();
    });
    return leaf;
  }

  _labelFor(item, id) {
    const key = this.nodeLabelKey?.trim();
    if (key && item && typeof item === 'object' && key in item) {
      const v = item[key];
      if (v != null) return String(v);
    }
    if (item?.label) return String(item.label);
    if (item?.name) return String(item.name);
    if (id) {
      try {
        const u = new URL(String(id), window.location.href);
        const segs = u.pathname.split('/').filter(Boolean);
        if (segs.length) return segs[segs.length - 1];
      } catch {
        const segs = String(id).split(/[\/#!]/).filter(Boolean);
        if (segs.length) return segs[segs.length - 1];
      }
    }
    return 'version';
  }

  _infoEl(msg) {
    const d = document.createElement('div');
    d.className = 'meta';
    d.textContent = msg;
    return d;
  }
  _errorEl(error) {
    const d = document.createElement('div');
    d.className = 'error';
    d.textContent = `Error: ${error?.message || error}`;
    return d;
  }
  _setContent(node) {
    const content = this.shadowRoot.getElementById('content');
    content.innerHTML = '';
    content.appendChild(node);
  }
  _clearAbort() {
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
  }
}

customElements.define('rerum-history-tree', RerumHistoryTree);

/**
 * Build a graph from items using heuristics:
 * - idFor: @id || id || _id (falls back to __rerum.history.id || __rerum.id)
 * - parentFrom(item): __rerum.history.previous (string or object)
 * - nextFrom(item): __rerum.history.next (array of ids)
 */
function buildGraph(items) {
  const nodes = new Map();
  const idFor = (item) => idFrom(item);
  for (const it of items) {
    const id = idFor(it);
    if (!id) continue;
    nodes.set(id, it);
  }

  const children = new Map();
  const allChildren = new Set();
  const ensure = (id) => { if (!children.has(id)) children.set(id, new Set()); return children.get(id); };

  // previous -> child
  for (const it of items) {
    const childId = idFor(it);
    if (!childId) continue;

    const prev = previousFrom(it);
    const parentId = normalizeId(prev);
    if (parentId) {
      ensure(parentId).add(childId);
      allChildren.add(childId);
    }
  }

  // next array -> children
  for (const it of items) {
    const parentId = idFor(it);
    if (!parentId) continue;

    const nexts = nextFrom(it);
    if (Array.isArray(nexts)) {
      for (const nxt of nexts) {
        const cid = normalizeId(nxt);
        if (!cid) continue;
        ensure(parentId).add(cid);
        allChildren.add(cid);
      }
    }
  }

  // Convert child sets to arrays and filter to known nodes
  const childrenArr = new Map();
  for (const [pid, set] of children.entries()) {
    childrenArr.set(pid, Array.from(set).filter((cid) => nodes.has(cid)));
  }

  // Roots = nodes that are not a child of any other node
  const roots = [];
  for (const id of nodes.keys()) {
    if (!allChildren.has(id)) roots.push(id);
  }

  return { nodes, children: childrenArr, roots, idFor };
}

function idFrom(item) {
  if (!item || typeof item !== 'object') return '';
  if (typeof item['@id'] === 'string') return item['@id'];
  if (typeof item.id === 'string') return item.id;
  if (typeof item._id === 'string') return item._id;
  const nested = item?.__rerum?.history?.id || item?.__rerum?.id;
  if (typeof nested === 'string') return nested;
  return '';
}

function previousFrom(item) {
  const prev = item?.__rerum?.history?.previous ?? item?.history?.previous ?? item?.__rerum?.previous;
  return prev;
}

function nextFrom(item) {
  const nxt = item?.__rerum?.history?.next ?? item?.history?.next ?? item?.__rerum?.next;
  return Array.isArray(nxt) ? nxt : (typeof nxt === 'string' ? [nxt] : null);
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return idFrom(value);
  return '';
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
