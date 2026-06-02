# FAQ / Troubleshooting

Quick answers to the questions hosts hit first. For embedding mechanics see
[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) (which also has a Troubleshooting
section); for the authoring surface see [SDK_GUIDE.md](./SDK_GUIDE.md).

### Which entry point should I import?

- **`@crafted-design/editor/core`** — the editor with shadcn + plain-HTML. No
  MUI, no extra peers. Start here.
- **`@crafted-design/editor`** — the same, plus the MUI adapter. Requires the
  `@mui/material` + `@emotion/*` peers installed.
- **`@crafted-design/editor/sdk`** — authoring functions/types only, no editor
  UI. For building a canonical / adapter / panel package.

Full matrix: [INTEGRATION_GUIDE.md → Subpath exports](./INTEGRATION_GUIDE.md#subpath-exports).

### Do I have to install MUI?

No. Import `/core` and you need no UI-library peers — shadcn and plain-HTML are
built in. You only install `@mui/material` + `@emotion/react` + `@emotion/styled`
if you use the full entry or import `/adapters/mui`.

### Why is there no CommonJS / UMD build? Is it minified?

The package is **ESM-only** (avoids the dual-package hazard; modern bundlers and
Node ≥ 20 consume ESM directly) and ships **unminified with source maps** — your
bundler minifies the final app. See
[INTEGRATION_GUIDE.md → Bundle format](./INTEGRATION_GUIDE.md#bundle-format).

### Can I export my design to React/JSX source code?

No — and it's not planned. The editor is a runtime component + a JSON document
model; a source-code generator isn't part of that model. Persist and re-render
the document instead (it's portable JSON).

### How do I save documents to my own backend?

Implement the `StorageAdapter` interface and register it with
`setStorageAdapter` before rendering `<Editor />`. The default is IndexedDB →
localStorage. See [COOKBOOK.md → Server-backed storage](./COOKBOOK.md#server-backed-storage).

### Does importing the SDK pull the whole editor into my bundle?

No. `/sdk` is side-effect-free and tree-shakable — a bundler keeps only the
symbols you import. (Importing it registers nothing beyond the editor's three
baseline font tokens.) Enforced by `src/sdk/side-effect-free.test.ts`.

### The editor renders but my custom component shows a placeholder.

That's the **missing-renderer placeholder**: the active adapter has no renderer
for that canonical id. Provide one in your adapter, or switch to an adapter that
covers it. Per-adapter coverage is in
[ADAPTER_MATRIX.md](./ADAPTER_MATRIX.md).

### Are the TypeScript types reliable / is the API stable?

`.d.ts` files ship for every entry. The public runtime surface is **frozen and
enforced** (`src/sdk/surface.test.ts`) — exports can't be added/removed without
a deliberate, CHANGELOG-noted change. The 1.0 SemVer promise is described in
[SDK_GUIDE.md → Public API stability](./SDK_GUIDE.md#public-api-stability).

### Styling / responsive / state edits don't show up.

The editor relies on Tailwind utilities being present in the CSS. If you build
your own Tailwind pipeline, run the safelist plugin
(`@crafted-design/editor/vite-plugin`) so dynamically-composed classes are
generated. See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).
