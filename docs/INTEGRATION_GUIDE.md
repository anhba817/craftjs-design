# Integration Guide

How to embed the editor in your own React app.

The shipped artifact is a Vite library-mode bundle: an ES module exporting
`<Editor />` plus the full SDK. React, React DOM, and Craft.js are
externalized as peer dependencies — your host app provides them.

This guide assumes a Vite + React 19 host (the editor's own development
target). Older React versions are not supported — the React 19 ref-as-prop
semantics + the unified `Fragment` are load-bearing.

## Install

```bash
# Initial `0.1.0` preview lives behind the `next` dist-tag — opt in
# explicitly to avoid surprises until Phase 11 promotes it to `latest`.
npm install @crafted-design/editor@next react@19 react-dom@19 @craftjs/core@^0.2.12
```

`@emotion/react`, `@emotion/styled`, and `@mui/material` are bundled into
the editor build — you don't need to install them separately. If you
strip the Chakra example or MUI adapter from your fork, you can also
omit the matching peer chain.

## Subpath exports

Since `0.7.0` the package is modular — pick the entry that matches the
adapters you want, so you don't bundle a UI library you never render:

| Import path | What you get | External peers |
|---|---|---|
| `@crafted-design/editor` | **Full** `<Editor />` — registers editor + shadcn + plain-HTML **+ MUI**. The batteries-included default. | requires `@mui/material`, `@emotion/react`, `@emotion/styled` |
| `@crafted-design/editor/core` | **Lean** `<Editor />` — registers editor + shadcn + plain-HTML, **no MUI**. Same full export surface (Editor, SDK, stores, doc helpers). | none |
| `@crafted-design/editor/adapters/shadcn` | Side-effect import that registers just the shadcn adapter. | none |
| `@crafted-design/editor/adapters/html` | Registers just the plain-HTML adapter (no UI library). | none |
| `@crafted-design/editor/adapters/mui` | Registers just the MUI adapter. | `@mui/material`, `@emotion/react`, `@emotion/styled` |
| `@crafted-design/editor/sdk` | SDK-only surface (`registerAdapter`, `registerCanonical`, `registerPanel`, `registerTheme`, `registerTemplate`, `registerFontToken`, `useNodeClasses`, all the matching types). No editor UI — use when authoring a canonical / adapter / panel without pulling in `<Editor />`. | none |
| `@crafted-design/editor/index.css` | Tailwind CSS bundle. Import once per page; no JS overhead. | none |

Typical setups:

```ts
// shadcn-only host — no MUI in the bundle, nothing extra to install
import { Editor } from '@crafted-design/editor/core'
import '@crafted-design/editor/index.css'

// want MUI too — install the peers, use the full entry
//   npm install @mui/material @emotion/react @emotion/styled
import { Editor } from '@crafted-design/editor'

// lean core + opt into one extra adapter explicitly
import { Editor } from '@crafted-design/editor/core'
import '@crafted-design/editor/adapters/mui' // side-effect: registers MUI
```

Opt-in is at the **import boundary**, not at runtime: importing an adapter
registers it before `<Editor />` mounts. (Registering an adapter after mount
would reshape the provider tree and remount the canvas, so it isn't
supported.) `.d.ts` files ship alongside every JS entry, so TypeScript hosts
resolve types without configuration. See
[ADAPTER_VERSIONING.md](./ADAPTER_VERSIONING.md) for the peer-dependency
policy and [ADAPTER_MATRIX.md](./ADAPTER_MATRIX.md) for per-adapter coverage.

## Minimal embed

```tsx
import { Editor } from '@crafted-design/editor'
import '@crafted-design/editor/index.css'

function App() {
  return <Editor />
}

export default App
```

The editor takes 100% of its parent's height (it uses `h-screen` internally).
Wrap in a container if you want it to share screen real estate:

```tsx
function App() {
  return (
    <div className="grid grid-cols-[1fr_300px]">
      <Editor />
      <YourHostSidebar />
    </div>
  )
}
```

## Customizing the registry

The editor pre-registers 48 canonicals, 3 adapters (shadcn / MUI / Chakra
example), 7 themes, inspector panels, and starter templates. Override
any of these by calling the SDK BEFORE rendering `<Editor />`:

> **Adapter coverage policy.** shadcn and MUI implement **every** canonical.
> The Chakra adapter is an *example* — a third-party-adapter demo that
> renders a representative subset (Box, Heading, Button, Stack, Card,
> and the basic inputs). It deliberately does **not** track every new
> canonical. When a document uses a canonical the active adapter doesn't
> implement, the node renders a labeled placeholder
> (`<Name> — no impl in adapter "<adapter>"`) instead of crashing, so you
> can swap adapters or remove the node. If you ship a production Chakra
> adapter, fill the gaps the same way shadcn / MUI do.

### Remove a built-in canonical

```tsx
import { Editor, unregisterCanonical } from '@design/editor'

unregisterCanonical('alert')  // drops Alert from the toolbox

function App() {
  return <Editor />
}
```

### Add a custom canonical

```tsx
import { z } from 'zod'
import { Editor, registerCanonical } from '@design/editor'

registerCanonical({
  id: 'callout',
  category: 'feedback',
  displayName: 'Callout',
  tags: ['alert', 'banner'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: z.object({
    intent: z.enum(['info', 'warning', 'success']),
  }),
  defaults: {
    props: { intent: 'info' },
    style: { classes: { root: 'p-4 rounded-md border' } },
  },
})

// (Add adapter impls for your supported adapters too.)
```

### Add a custom adapter

```tsx
import { Editor, registerAdapter, type AdapterRenderProps } from '@design/editor'

function MyBox({ children, rootRef, className }: AdapterRenderProps) {
  return <div ref={rootRef} className={className}>{children}</div>
}

registerAdapter({
  id: 'mylib',
  displayName: 'My Library',
  components: { box: MyBox },
})
```

### Add a custom inspector panel

```tsx
import { Editor, registerPanel, useNodeClasses } from '@design/editor'

function NotesPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  return (
    <textarea
      value={classString}
      onChange={(e) => writeClasses(e.target.value)}
      placeholder="Designer notes…"
    />
  )
}

registerPanel({
  id: 'notes',
  displayName: 'Notes',
  order: 100,                     // after every built-in (10–70)
  applicableTo: () => true,
  component: NotesPanel,
})
```

### Add a custom theme

```tsx
import { Editor, registerTheme } from '@design/editor'

// Add the CSS block to your host's global stylesheet:
// [data-theme="forest"] { --primary: oklch(...); }

registerTheme({
  id: 'forest',
  displayName: 'Forest',
  dataThemeValue: 'forest',
})
```

## Asset backends

The Image canonical's `src` field is edited through an `<ImagePicker>`
(Upload / Library / URL). Where uploaded images actually live is the
host's decision, wired through `<EditorImageProvider>`.

Without a provider, the editor uses a **default base64 provider**:
uploads are encoded to inline `data:` URLs and embedded directly in
the document. This keeps the editor self-contained for demos and
local use, but inline bytes bloat the saved envelope and can blow the
localStorage quota — the provider warns in the console above 500 KB.
The default provider can't enumerate inline URLs, so the Inspector's
**Assets** panel is hidden and the picker's Library tab falls back to
scanning the current document's existing Image nodes.

To route uploads to a real backend, wrap the editor:

```tsx
import { Editor } from '@crafted-design/editor'
import { EditorImageProvider } from '@crafted-design/editor/sdk'

const backend = {
  // Persist a file, return its canonical URL.
  async upload(file: File) {
    const { url } = await myApi.upload(file)
    return { url }                       // optionally { url, thumbnail }
  },
  // Previously-uploaded assets for the Library grid + Assets panel.
  async list() {
    return (await myApi.listImages()).map((url) => ({ url }))
  },
  // Optional — enables a delete affordance.
  async delete(url: string) {
    await myApi.deleteImage(url)
  },
  // Defaults to true when `list` is supplied; pass false to opt out
  // of the Library grid + Assets panel.
  // canList: true,
}

function App() {
  return (
    <EditorImageProvider value={backend}>
      <Editor />
    </EditorImageProvider>
  )
}
```

The `EditorImageProviderValue` contract:

| Field | Type | Notes |
|---|---|---|
| `upload` | `(file: File) => Promise<{ url, thumbnail? }>` | Required. Resolves to the URL written into the node's `src`. |
| `list` | `() => Promise<{ url, thumbnail? }[]>` | Required. Powers the Library grid + Assets inspector panel. |
| `delete` | `(url: string) => Promise<void>` | Optional. Surfaces a delete button when present. |
| `canList` | `boolean` | Defaults to `true` when you pass a custom provider. Set `false` to hide the Library grid / Assets panel. |

Read the active provider from a custom panel or component with
`useEditorImageProvider()`.

## Persistence

The editor persists documents to **IndexedDB by default** (0.5.0+), behind
a `StorageAdapter` seam, with an automatic fallback to localStorage where
IndexedDB is unavailable (private mode, locked-down browsers). Integration
hosts that want their own backend implement the adapter and register it
**before** `<Editor />` mounts — this is the recommended path:

```tsx
import { setStorageAdapter } from '@crafted-design/editor/sdk'
import type { StorageAdapter } from '@crafted-design/editor/sdk'

const apiAdapter: StorageAdapter = {
  async readIndex() {
    return myApi.getIndex() // { documents: DocumentSummary[], activeId }
  },
  async writeIndex(index) {
    await myApi.putIndex(index)
    return { ok: true } // or { ok: false, kind: 'quota' | 'schema' | 'unknown', error }
  },
  async readDocument(id) {
    return myApi.getDoc(id) // EditorDocument | null
  },
  async writeDocument(id, doc) {
    await myApi.putDoc(id, doc)
    return { ok: true }
  },
  async deleteDocument(id) {
    await myApi.deleteDoc(id)
  },
  async estimateUsage() {
    return { usedBytes: 0, totalBytes: Infinity, percent: 0 }
  },
  // Optional: init() for one-time setup (awaited before the first read);
  // listVersions / readVersion / writeVersion to enable the version-history
  // UI (omit them and it stays hidden).
}

setStorageAdapter(apiAdapter)
```

All methods are **async**. Return `{ ok: false, kind: 'quota' }` from a
write to trigger the editor's storage-full UI. The document store reads the
index synchronously into memory after bootstrap (so the UI subscribes the
usual way) but document blobs are loaded through the adapter on demand —
`useDocumentStore.getState().loadActiveDocument()` returns a `Promise`.

For one-off blob round-trips outside the store, the lower-level helpers
still exist:

```tsx
import { exportDocument, importDocumentFromFile } from '@design/editor'

const blob = exportDocument(myEnvelope)        // → JSON Blob
const env = await importDocumentFromFile(file) // File → validated envelope
```

> **Note:** the library does not generate framework source code from a
> document — it's a runtime editor whose documents are JSON rendered live
> by the chosen adapter. Portability is the JSON envelope (export / import /
> share-by-URL) + embedding `<Editor />`.

## Error handling

The editor ships four layers of error boundaries (top shell, canvas, toolbox,
per-inspector-panel). The top-shell boundary catches anything that bubbles
out of the rest. You can supply your own telemetry handler:

```tsx
import { Editor, ErrorBoundary, TopShellErrorFallback } from '@design/editor'

function App() {
  return (
    <ErrorBoundary
      fallback={TopShellErrorFallback}
      onError={(error, info) => {
        // Ship to your error tracker — Sentry, Bugsnag, etc.
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
      }}
    >
      <Editor />
    </ErrorBoundary>
  )
}
```

The editor's internal boundaries already log to console.error by default;
the top-shell `onError` is the integration point for app-level telemetry.

### Telemetry (errors + metrics)

Wrapping `onError` on the top-shell boundary only catches what bubbles all
the way up. To receive errors from **every** boundary (canvas, toolbox,
layers, each inspector panel) plus opt-in perf metrics, install a
`TelemetryProvider` — one handler pair the whole editor feeds. The editor
collects nothing by default; these handlers only fire if you install them.

```tsx
import { Editor } from '@crafted-design/editor'
import { TelemetryProvider } from '@crafted-design/editor/sdk'

function App() {
  return (
    <TelemetryProvider
      onError={(err, info) =>
        // info.boundary = 'canvas' | 'toolbox' | 'layers' | 'panel' | …
        Sentry.captureException(err, { extra: info })
      }
      onMetric={(m) =>
        // m.name e.g. 'document.apply' / 'document.bootstrap'; m.durationMs
        posthog.capture(m.name, m)
      }
    >
      <Editor />
    </TelemetryProvider>
  )
}
```

An explicit `onError` prop on a specific `ErrorBoundary` still takes
precedence over the provider for that boundary. Imperative hosts (no React
wrapper) can call `setTelemetry({ onError, onMetric })` before mount.
Emitted metrics today: `document.bootstrap` (first index read) and
`document.apply` (deserialize on load / switch) — both carry `durationMs`.

## Theming the editor chrome

The editor's UI chrome (toolbar, toolbox, inspector) inherits from your host
app's CSS — specifically the shadcn theme tokens (`--primary`,
`--background`, etc.). Override these to match your design system:

```css
/* host-app.css */
:root {
  --primary: oklch(0.6 0.25 280);  /* purple */
  --background: oklch(0.98 0 0);
  /* ...etc */
}
```

The editor's `[data-theme="<id>"]` blocks only affect the canvas — chrome
stays on `:root`. See `docs/ARCHITECTURE.md` § Themes for details.

## Token themes, dark mode, color variables, safelist (0.3.0)

**Token themes (no hand-written CSS).** Pass a `tokens` map to
`registerTheme`; the editor derives the full token set and injects the
`[data-theme]` block. Add `darkTokens` for a `.dark[data-theme]` variant.

```ts
import { registerTheme } from '@crafted-design/editor/sdk'
registerTheme({ id: 'forest', displayName: 'Forest',
  tokens: { primary: 'oklch(0.55 0.18 145)' },
  darkTokens: { primary: 'oklch(0.7 0.16 145)' } })
```

**Dark mode.** A Light / Dark / Auto toggle ships in the top bar; `Auto`
follows `prefers-color-scheme`. The chosen mode persists in the saved
document (`EditorDocument.colorMode`). The `ThemeProvider` applies `.dark`
to the canvas wrapper only — your chrome theming is unaffected.

**Your design tokens in the color picker.** Wrap the editor so designers
can pick your CSS variables alongside the theme tokens:

```tsx
import { EditorColorVariablesProvider } from '@crafted-design/editor/sdk'
<EditorColorVariablesProvider variables={[{ name: 'brand-blue' }]}>
  <Editor />
</EditorColorVariablesProvider>
```

Define the variables in your CSS (`:root { --brand-blue: … }`) so the
swatches and applied colors resolve.

**Fonts.** Designers upload fonts in the built-in "Fonts" panel (storage
routes through your `EditorImageProvider`). To also offer popular fonts
without uploading, call `registerSystemFonts()` and/or
`registerGoogleFonts()` at startup.

**Optional production-CSS trim (safelist plugin).** By default the editor
injects arbitrary inline-value CSS at runtime — zero config. For
production pages you can trim Tailwind's output to exactly what your saved
documents use:

```ts
// vite.config.ts
import { craftedDocumentSafelist } from '@crafted-design/editor/vite-plugin'
export default defineConfig({
  plugins: [craftedDocumentSafelist({
    documents: ['./content/*.json'],
    outFile: './src/safelist.docs.css',
  })],
})
```

Then `@import "./safelist.docs.css";` from your stylesheet. Purely an
upgrade — skipping it changes nothing.

## Caveats

### React version

The editor requires React 19. The Phase-1 `display: contents` ref-forwarding
wrappers around shadcn primitives (which were React-18-era workarounds) are
gone — refs now flow directly through plain function components via React 19's
ref-as-prop semantics.

Older React 18 hosts would fail at runtime; the dist's `peerDependencies`
declare `^19`. To use the editor in a React 18 host, downgrade the editor to
a pre-Phase-9 version.

### Module format + bundle size

**ESM only.** The package ships ES modules (no CommonJS/UMD). React 19 and
the adapter stack are ESM-first, and a dual package risks two copies of the
registry singletons (the dual-package hazard). Consume it from an ESM-aware
bundler (Vite, Next, Rollup, esbuild, modern webpack).

**Two entry points** (`package.json` `exports`):

| Import | Builds to | Gzipped | Contains |
|---|---|---|---|
| `@crafted-design/editor` | `dist-lib/index.js` (+ `index.css`) | ~414 KB JS / ~124 KB CSS | the full editor + the shadcn **and** MUI adapters + all 48 canonicals |
| `@crafted-design/editor/sdk` | `dist-lib/sdk.js` | ~44 KB | the authoring SDK only (register\* helpers, hooks, types) — **no** editor UI, no adapter impls |

So a host that only authors canonicals/adapters/panels against the SDK
pays ~44 KB, not the full editor — the entries are separate chunks and the
SDK surface doesn't pull the editor or MUI in.

**MUI weight.** The full-editor entry eagerly bundles *both* the shadcn and
MUI adapters; MUI is roughly 290 KB gz of `index.js`. Splitting the heavy
adapter onto its own opt-in subpath entry (so shadcn-only hosts don't pay
for MUI) is a queued optimization (PRODUCTION_READINESS § 8.3). The Chakra
adapter is an **example** and is *not* in the published bundle (only the
dogfood app registers it).

**Minification.** The dist is intentionally **not** minified (easier to
debug post-install, smaller diffs in sourcemaps); your bundler minifies it
as part of your app build — minifying `index.js` roughly halves it. Run
`npm run analyze` to emit an interactive treemap (`bundle-stats.html`) of
what's in the bundle.

**CSS size.** The CSS is large because the Tailwind safelist covers every
utility × breakpoint the inspector can emit (270+ `@source inline()`
directives). Hosts running their own Tailwind build can dedupe by sharing
the safelist; see the Tailwind troubleshooting section above, and the
optional `@crafted-design/editor/vite-plugin` safelist generator.

### Document storage quota

localStorage has a 5–10 MB quota per origin. Phase 9 added two UI layers
that surface storage pressure before the editor silently drops a save:

- `<StorageQuotaBanner>` appears once `documentRegistry.getStorageUsage()`
  reports ≥ 80 % of a conservative 5 MB ceiling. Dismissable; the
  dismiss state lives in sessionStorage so it survives a reload but
  resets across tabs.
- `<StorageQuotaErrorModal>` is blocking. It fires when
  `writeDocument` / `writeDocumentIndex` catches a `QuotaExceededError`
  from `localStorage.setItem`. The save did NOT complete; the user
  must delete a document via the toolbar Documents menu or accept that
  subsequent edits won't be persisted.

For larger designs, use the `useDocumentStore` API to read documents into
memory and persist to your own backend (IndexedDB, server-side). The
`documentRegistry.writeDocument` API returns a typed `WriteResult` so
custom backends can react to per-write failures rather than relying on
the built-in banner / modal.

### Cross-tab edit safety

When two tabs edit the same document, `useConcurrentEditWatcher`
listens to `window.storage` events from sibling tabs. Index changes
auto-sync; active-doc blob changes raise `<ConcurrentEditBanner>` with
two actions: Reload (apply the other tab's version, discarding
unsaved local changes) or Overwrite (save your snapshot, blowing
away the other tab's write). Tests live in
`src/editor/persistence/concurrentEditWatcher.test.ts` and exercise
the `decideStorageEvent` helper without a DOM.

### Async error handling

`window.error` and `window.unhandledrejection` are caught by
`useGlobalErrorHandler` and surfaced via `<AsyncErrorBanner>` — a
toast at bottom-right with a Dismiss button. Critical async failures
(Hydrator deserialize, adapter mount) still bubble through the four
`<ErrorBoundary>` layers; the global handler only catches the long
tail (event handlers, fetch promises, third-party scripts).

### Keyboard navigation

The canvas region is a single tab stop; arrow keys move the selection
directly. Toolbox implements the WAI-ARIA toolbar pattern with roving
tabindex. See `docs/ACCESSIBILITY.md` for the full key map.

### Custom font tokens at runtime

`registerFontToken` injects `<style data-craftjs-fonts>` into
`document.head`. If your host CSP forbids inline `<style>`, this won't work
— host apps need a CSP that allows `style-src 'self' 'unsafe-inline'` or
the equivalent for inline style injection. Phase 9 polish could ship a
nonce-aware variant.

## Troubleshooting

### "Invalid hook call" errors

Almost always a duplicate React. Verify your host app's React version is
the SAME instance the editor's bundle expects (the externalized peer dep).
Common fixes:

```bash
# Force a single React resolution in your host app's package.json
{
  "overrides": {
    "react": "^18.3.1"
  }
}
```

### Tailwind classes don't apply

Make sure you import the editor's CSS:

```tsx
import '@design/editor/dist-lib/index.css'
```

The editor's Tailwind safelist is baked into this CSS. Your host app's
Tailwind config can either:

- Coexist via separate `<link>` / `<style>` tags (default — works fine).
- Merge by adding the editor's safelist to your config's `safelist` and
  building one shared Tailwind output.

### Adapter switcher shows "no impl in adapter X" placeholders

The adapter doesn't have a component impl for that canonical. Either swap
to a covering adapter (shadcn / MUI cover all 20) or implement the missing
canonical in your custom adapter.

## Where to next

- `docs/ARCHITECTURE.md` — full architecture reference.
- `docs/SDK_GUIDE.md` — every public SDK function + type.
- `docs/TUTORIAL_ADAPTER.md` — step-by-step adapter authoring.
- `docs/TUTORIAL_CANONICAL.md` — step-by-step canonical authoring.
- `docs/TUTORIAL_PANEL.md` — step-by-step inspector panel authoring.
- `examples/adapter-chakra/` — reference adapter implementation.
