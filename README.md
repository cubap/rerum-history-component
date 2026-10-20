# RERUM History Tree Web Component

A lightweight Web Component that uses the RERUM `/history/{id}` and `/since/{id}` endpoints to display an interactive, collapsible tree of versions for a given RERUM document.

- No framework required
- Native ES modules in modern browsers
- Accessible, keyboard-navigable tree with a built-in filter
- Configurable labels and events
- Works with production and dev RERUM stores
- Exports both a web component and a data class for programmatic access

## Demo

Open `index.html` locally with a simple static server (or `npm run dev`) and paste a full document URI (one containing `/id/`).

- Example ID: `https://store.rerum.io/v1/id/689e4322e25481fd578a61c7`
- Dev store example: `https://devstore.rerum.io/v1/id/68dc90337d4bc92f40a7c9b2`

`demo-data-class.html` shows how to use the `RerumHistoryData` class directly.

## Usage

```html
<script type="module" src="./src/rerum-history-tree.js"></script>

<!-- The component derives the /history and /since endpoints from the document URI -->
<rerum-history-tree
  document-uri="https://store.rerum.io/v1/id/689e4322e25481fd578a61c7"
  node-label-key="label">
</rerum-history-tree>
```

### Attributes / properties

| Attribute | Property | Description |
| --- | --- | --- |
| `document-uri` | `documentUri` | (required) The full ID URL of the RERUM document, e.g. `https://store.rerum.io/v1/id/689e...`. Must contain an `/id/` path segment; the component derives the `/history/` and `/since/` endpoints by replacing that segment. |
| `node-label-key` | `nodeLabelKey` | (optional) Property to use as the display label for each version. Defaults to trying `label`, then `name`, then the last segment of `@id`/`id`. |
| `filter` | `filter` | (optional) Initial text for the built-in search box. Setting it filters the tree to matching versions (shown as a flat, timestamp-sorted list). |

Setting `document-uri` (via attribute or property) triggers a fetch and re-render.

### Methods

- `refresh()` — Re-fetch and re-render the current `document-uri`. Returns a promise.

## Events

All events bubble.

- `loaded`: Fired after data is fetched and rendered.
  - `event.detail = { count, roots }`
- `error`: Fired if fetch or rendering fails.
  - `event.detail = { error }`
- `versionselected`: Fired when a version is selected (click, or Enter/Space with keyboard focus).
  - `event.detail = { id, item }`

Selecting a version highlights it and shows its properties in a details panel inside the component. It does **not** automatically change `document-uri`; listen for `versionselected` if you want to navigate or react to the selection yourself.

```javascript
const tree = document.querySelector('rerum-history-tree')
tree.addEventListener('versionselected', (e) => {
  console.log('Selected', e.detail.id, e.detail.item)
})
```

## Programmatic Access with RerumHistoryData

In addition to the web component, this library exports a `RerumHistoryData` class for programmatic access to version history data:

```javascript
import { RerumHistoryData } from 'rerum-history-component'

const historyData = new RerumHistoryData('https://store.rerum.io/v1/id/689e4322e25481fd578a61c7')

// Fetch the history data
await historyData.fetch()

// Get all version items
const items = historyData.getItems()

// Get the version graph structure
const graph = historyData.getGraph()

// Get root versions (versions with no parent)
const roots = historyData.getRoots()

// Get all version nodes as a Map (id -> item)
const nodes = historyData.getNodes()

// Get the children map (parent id -> array of child ids)
const children = historyData.getChildren()

// Get a summary for a specific version
const summary = historyData.getSummary('https://store.rerum.io/v1/id/689e...', 'label')
// Returns: { id, label, item, children: [...], parent }

// Get summaries for all versions
const allSummaries = historyData.getAllSummaries('label')
```

### RerumHistoryData API

- `constructor(documentUri)` - Create a new instance with a RERUM document URI
- `async fetch()` - Fetch and process history data from RERUM endpoints
- `getItems()` - Returns array of all version items
- `getGraph()` - Returns graph structure: `{ nodes: Map, children: Map, roots: Array, idFor: Function }`
- `getRoots()` - Returns array of root version IDs
- `getNodes()` - Returns Map of version ID -> version object
- `getChildren()` - Returns Map of parent ID -> array of child IDs
- `getSummary(id, labelKey?)` - Returns summary object for a specific version
- `getAllSummaries(labelKey?)` - Returns array of summary objects for all versions
- `abort()` - Cancel any ongoing fetch operation

## Installation & packaging

```bash
npm install rerum-history-component
```

- **Bundler / ES modules:** `import 'rerum-history-component'` registers the `<rerum-history-tree>` element. `import { RerumHistoryData } from 'rerum-history-component'` gives you the data class.
- **CDN (prebuilt bundle):**
  ```html
  <script type="module" src="https://unpkg.com/rerum-history-component/dist/rerum-history-tree.js"></script>
  ```
- **TypeScript:** Type declarations ship in `types/index.d.ts` and are wired through the package `exports`.

Build scripts:

- `npm run build` — builds the demo site (Vite).
- `npm run build:lib` — builds the distributable ES library bundle to `dist/rerum-history-tree.js`.

## Heuristics and Data Shape

The component fetches both the history (all previous versions) and since (all later versions) endpoints to build a complete version tree:

- `GET {root}/history/{ENCODED_DOCUMENT_ID}`
- `GET {root}/since/{ENCODED_DOCUMENT_ID}`

The `/since` endpoint may return a 404 if there are no future versions, which is handled gracefully.

It attempts to infer the version tree from common RERUM history shapes:
- Version identity: `@id` or `id` or `_id` (falls back to `__rerum.history.id`/`__rerum.id`)
- Parent linkage: `__rerum.history.previous` (string or object with id-like fields)
- Forward linkage: `__rerum.history.next` (array of ids)
- Roots: nodes flagged with `__rerum.history.prime === 'root'`, or (as a fallback) nodes with no parent

If the service returns an array of bare strings (IDs), the component normalizes them to `{ "@id": "..." }`. If neither linkage appears, items render as a flat list (rooted).

## Accessibility & keyboard navigation

- The tree uses native `details/summary` elements with `role="tree"`, `aria-level`, and `aria-current` on the selected node.
- A built-in search input filters versions; the live match count is announced via an `aria-live` status region.
- Keyboard support within the tree:
  - `ArrowUp` / `ArrowDown` — move focus between visible nodes (roving tabindex)
  - `ArrowLeft` — collapse the focused node (or move to its parent); `ArrowRight` — expand it
  - `Home` / `End` — jump to the first / last visible node
  - `Enter` / `Space` — select the focused version
- Focus is drawn with a visible outline for keyboard users.

## Development

- Node 18+ recommended

```bash
npm install
npm run dev      # starts a Vite dev server
npm run build    # builds the demo site
npm run build:lib # builds the distributable library bundle
npm test         # runs the Vitest suite (jsdom)
npm run test:watch
npm run lint
```

Open http://localhost:5173 (default) and use the small control panel in `index.html` to try different IDs.

## License

MIT
