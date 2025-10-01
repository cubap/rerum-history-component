# RERUM History Tree Web Component

A lightweight Web Component that uses the RERUM `/history/{id}` endpoint to display an interactive, collapsible tree of versions for a given RERUM document.

- No framework required
- Native ES modules in modern browsers
- Accessible nested `details/summary` structure
- Configurable labels and events
- Works with production and dev RERUM stores
- Exports both a web component and a data class for programmatic access

## Demo

Open `index.html` locally with a simple static server (or `npm run dev`) and set your `api-base` and `document-id`.

- Example ID: `https://store.rerum.io/v1/id/689e4322e25481fd578a61c7`
- Its history includes: `https://store.rerum.io/v1/id/11111`

## Usage

```html
<script type="module" src="./src/rerum-history-tree.js"></script>

<!-- Use the RERUM ID base; the component derives the /history endpoint -->
<rerum-history-tree
  api-base="https://store.rerum.io/v1/id"
  document-id="https://store.rerum.io/v1/id/689e4322e25481fd578a61c7"
  node-label-key="label">
</rerum-history-tree>
```

- `api-base` (required): The RERUM ID base, typically ending in `/id`.
  - Production: `https://store.rerum.io/v1/id`
  - Dev: `https://devstore.rerum.io/v1/id`
  The component uses `GET {api-root}/history/{encodeURIComponent(document-id)}`, where `api-root` is derived from `api-base` (replace trailing `/id` with `/history`).
- `document-id` (required): The full ID URL of the RERUM document (e.g., `https://store.rerum.io/v1/id/689e...`).
- `node-label-key` (optional): Property to use as display label for each version. Defaults to try `label`, then `name`, then last segment of `@id`/`id`.
- `history-base` (optional): Override the derived history base. If provided, the component uses `GET {history-base}/{encodeURIComponent(document-id)}`.

## Programmatic Access with RerumHistoryData

In addition to the web component, this library exports a `RerumHistoryData` class for programmatic access to version history data:

```javascript
import { RerumHistoryData } from './src/rerum-history-tree.js'

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

## Events

- `loaded`: Fired after data is fetched and rendered.
  - `event.detail = { count, roots }`
- `error`: Fired if fetch or rendering fails.
  - `event.detail = { error }`
- `nodeclick`: Fired when a node is clicked.
  - `event.detail = { id, item }`

## Heuristics and Data Shape

The component fetches:
- `GET {history-base or derived}/{$ENCODED_DOCUMENT_ID}`
- `GET {since-base or derived}/{$ENCODED_DOCUMENT_ID}`

The component fetches both the history (all previous versions) and since (all later versions) endpoints to build a complete version tree. The /since endpoint may return a 404 if there are no future versions, which is handled gracefully.

It attempts to infer the version tree from common RERUM history shapes:
- Version identity: `@id` or `id` or `_id` (falls back to `__rerum.history.id`/`__rerum.id`)
- Parent linkage: `__rerum.history.previous` (string or object with id-like fields)
- Forward linkage: `__rerum.history.next` (array of ids)

If the service returns an array of bare strings (IDs), the component normalizes them to `{ "@id": "..." }`. If neither linkage appears, items render as a flat list (rooted).

Clicking on any node in the tree will navigate to that version by updating the `document-uri` attribute, which triggers a refresh to display the tree for that version.

## Development

- Node 18+ recommended

```bash
npm install
npm run dev   # starts a Vite dev server
npm run build
npm run preview
```

Open http://localhost:5173 (default) and use the small control panel in `index.html` to try different IDs.

## Accessibility

- Tree uses native `details/summary` for expand/collapse.
- First two levels open by default; adjust by editing `depth` logic in `src/rerum-history-tree.js`.

## License

MIT
