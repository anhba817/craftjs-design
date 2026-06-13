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
if you use the full entry or import `/adapters/mui` (including when you pin
`<Editor adapter="mui" />` — the MUI adapter won't work without its peers).

### Can my end users switch the design system?

Only if you let them. The host picks the adapter: `<Editor adapter="mui" />`
pins it, hides the toolbar AdapterSwitcher, and makes loaded documents render
through your adapter regardless of which adapter they were saved under
(documents are canonical-id based). Use `allowUserToSwitchAdapter` to control
the switcher independently; with no props, the legacy behavior (switcher
visible) is kept. See
[INTEGRATION_GUIDE.md → Pinning the adapter](./INTEGRATION_GUIDE.md#pinning-the-adapter-host-chosen-design-system).

### Can an AI build designs with this?

Yes — `crafted-design-mcp` is an MCP server that exposes the component registry
+ document model as tools, so an AI client (Claude Code / Claude Desktop) can
author and edit `EditorDocument`s programmatically. Connect it with:

```bash
claude mcp add crafted-design -- npx -y @crafted-design/editor crafted-design-mcp
```

The generated document loads straight into `<Editor />` or
`<DocumentRenderer />`. See [MCP_GUIDE.md](./MCP_GUIDE.md).

### How do I start a new adapter / canonical / panel?

Scaffold one — the CLI emits a typed skeleton already wired to
`@crafted-design/editor/sdk`, with a passing smoke test:

```bash
npx @crafted-design/editor scaffold adapter   my-design-system
npx @crafted-design/editor scaffold canonical pricing-table
npx @crafted-design/editor scaffold panel     seo-meta
```

Then fill in the generated files and add the side-effect import before you
render `<Editor />`. The
[tutorials](./TUTORIAL_ADAPTER.md) walk through what each skeleton contains.

### Can I make the editor UI match my app's (dark) theme?

Yes — `<Editor editorTheme="dark" />`, or pass a partial token map to brand
it: `<Editor editorTheme={{ accent: '#7aa2f7', surface: '#16161e' }} />`.
This themes the editor **chrome** (toolbox, inspector, toolbar, panels) and
is host policy — there's no end-user chrome switcher. It's separate from the
document theme: `registerTheme` / the canvas theme switcher / `colorMode`
style the content your users design, and stay independent (dark chrome around
a light page is fine). See
[INTEGRATION_GUIDE.md → Theming the editor chrome](./INTEGRATION_GUIDE.md#theming-the-editor-chrome).

### Why is there no CommonJS / UMD build? Is it minified?

The package is **ESM-only** (avoids the dual-package hazard; modern bundlers and
Node ≥ 20 consume ESM directly) and ships **unminified with source maps** — your
bundler minifies the final app. See
[INTEGRATION_GUIDE.md → Bundle format](./INTEGRATION_GUIDE.md#bundle-format).

### Can I export my design to React/JSX source code?

No — and it's not planned. The editor is a runtime component + a JSON document
model; a source-code generator isn't part of that model. Persist the document
(it's portable JSON) and display it with the standalone renderer instead:

```tsx
import { DocumentRenderer } from '@crafted-design/editor/renderer'
<DocumentRenderer document={savedEnvelope} />
```

No editor chrome, a fraction of the editor's bundle — see
[INTEGRATION_GUIDE.md → Rendering saved documents](./INTEGRATION_GUIDE.md#rendering-saved-documents-production-pages).

### How do I save documents to my own backend?

Two ways:

1. **Controlled component (1.6.0)** — own the document in your own state and use
   `onChange` (or the imperative `ref.getDocument()`): `JSON.stringify(doc)` is
   what you persist; pass it back via `value` to restore. No editor persistence
   involved (`persistence={false}`). See
   [INTEGRATION_GUIDE → Embedding as a controlled component](./INTEGRATION_GUIDE.md#embedding-as-a-controlled-component-160).
2. **StorageAdapter** — keep the editor's built-in document lifecycle but point
   it at your backend: implement the `StorageAdapter` interface and register it
   with `setStorageAdapter` before rendering `<Editor />`. The default is
   IndexedDB → localStorage. See
   [COOKBOOK.md → Server-backed storage](./COOKBOOK.md#server-backed-storage).

### How do I read the design document in code?

If the editor is **controlled**, you already have it — it's the `value` you hold
in state, kept current by `onChange`. Otherwise pass a `ref` and call
`ref.current.getDocument()` for an on-demand `EditorDocument` envelope (the same
shape `Export` writes). To build or transform a document **without** an editor
mounted, use the headless [`buildDocument`](./SDK_GUIDE.md) /
`renderDocumentToHtml`. See
[INTEGRATION_GUIDE → Embedding as a controlled component](./INTEGRATION_GUIDE.md#embedding-as-a-controlled-component-160).

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
