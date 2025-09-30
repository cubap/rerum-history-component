# RERUM History Tree Web Component

A lightweight Web Component that uses the RERUM `/history/{id}` endpoint to display an interactive, collapsible tree of versions for a given RERUM document.

- No framework required
- Native ES modules in modern browsers
- Accessible nested `details/summary` structure
- Configurable labels and events
- Works with production and dev RERUM stores

## Live Demo

Try the component at [https://cubap.github.io/rerum-history-component/](https://cubap.github.io/rerum-history-component/)

The demo is automatically deployed from the `main` branch via GitHub Pages.

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

It attempts to infer the version tree from common RERUM history shapes:
- Version identity: `@id` or `id` or `_id` (falls back to `__rerum.history.id`/`__rerum.id`)
- Parent linkage: `__rerum.history.previous` (string or object with id-like fields)
- Forward linkage: `__rerum.history.next` (array of ids)

If the service returns an array of bare strings (IDs), the component normalizes them to `{ "@id": "..." }`. If neither linkage appears, items render as a flat list (rooted).

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
