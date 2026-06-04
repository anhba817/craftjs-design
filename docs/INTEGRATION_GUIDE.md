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
npm install @crafted-design/editor react@19 react-dom@19 @craftjs/core@^0.2.12
```

`@mui/material`, `@emotion/react`, and `@emotion/styled` are **optional peer
dependencies** — they are NOT bundled. Install them only if you use the full
`@crafted-design/editor` entry (which registers the MUI adapter) or import
`/adapters/mui`; the lean `/core` entry (shadcn + plain-HTML) needs no extra
peers. See *Subpath exports* below.

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

## Bundle format

The package ships **ESM only**, **unminified, with source maps**. There is no
CommonJS/UMD build and no separate `*.min.js` — both are deliberate:

- **ESM-only** avoids the dual-package hazard; modern bundlers and Node ≥ 20
  consume ESM directly.
- **Unminified** because you consume the editor through your own bundler,
  which minifies the final app. Shipping a parallel minified entry would
  double the published surface and the `exports` map for no real benefit, and
  the source maps give you readable stack traces in development.

The SDK subpath (`/sdk`) is **side-effect-free**, so a bundler tree-shakes any
authoring symbol you don't import. (Importing `/sdk` registers nothing beyond
the editor's three baseline font tokens — `sans`/`heading`/`mono`.)

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

## Pinning the adapter (host-chosen design system)

The product model is that **you** — the host — choose the design system; the
people using your editor don't. Pin it with the `adapter` prop:

```tsx
import { Editor } from '@crafted-design/editor'   // full entry registers MUI
import '@crafted-design/editor/index.css'

function App() {
  return <Editor adapter="mui" />
}
```

What pinning does:

- The active adapter is set to `mui` before first paint.
- The **AdapterSwitcher disappears** from the toolbar — end users can't change
  the design system.
- **Loading a document does not override it.** A document saved under shadcn
  still opens — documents store canonical ids, not library components, so it
  simply renders through MUI. The envelope's `adapterId` is a preference, not
  a command, while pinned.

> ⚠ **MUI requires its peers.** The MUI adapter (whether via the full entry or
> `/adapters/mui`) needs the optional peer dependencies installed:
>
> ```bash
> npm install @mui/material @emotion/react @emotion/styled
> ```
>
> Pinning `adapter="mui"` without registering the MUI adapter (or without the
> peers, which makes its import fail) logs a console warning and falls back to
> the default `shadcn`.

Want to pin a starting adapter but still let users switch? Both knobs are
independent:

```tsx
<Editor adapter="html" allowUserToSwitchAdapter />   // starts on plain HTML, switcher stays
<Editor allowUserToSwitchAdapter={false} />          // default adapter (shadcn), no switcher
<Editor />                                           // legacy behavior: switcher shows all registered adapters
```

`allowUserToSwitchAdapter` defaults to `false` when `adapter` is set, `true`
otherwise.

## Customizing the registry

The editor pre-registers 48 canonicals, the built-in adapters (shadcn + MUI +
plain-HTML on the full entry; shadcn + plain-HTML on `/core`), 7 themes,
inspector panels, and starter templates. Override any of these by calling the
SDK BEFORE rendering `<Editor />`:

> **Adapter coverage policy.** The three built-in adapters (shadcn, MUI,
> plain-HTML) implement **every** canonical — see
> [ADAPTER_MATRIX.md](./ADAPTER_MATRIX.md). The in-repo Chakra adapter is an
> *example* (a third-party-adapter demo covering a 20-canonical subset) and is
> NOT part of the published package. When a document uses a canonical the
> active adapter doesn't implement, the node renders a labeled placeholder
> (`<Name> — no impl in adapter "<adapter>"`) instead of crashing, so you
> can swap adapters or remove the node.

### Remove a built-in canonical

```tsx
import { Editor, unregisterCanonical } from '@crafted-design/editor'

unregisterCanonical('alert')  // drops Alert from the toolbox

function App() {
  return <Editor />
}
```

### Add a custom canonical

```tsx
import { z } from 'zod'
import { Editor, registerCanonical } from '@crafted-design/editor'

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
import { Editor, registerAdapter, type AdapterRenderProps } from '@crafted-design/editor'

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
import { Editor, registerPanel, useNodeClasses } from '@crafted-design/editor'

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
import { Editor, registerTheme } from '@crafted-design/editor'

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

## Rendering saved documents (production pages)

Display a saved document on a public route **without the editor** — no
toolbox/inspector/toolbar, no editing interactions, a fraction of the bundle
(~48 KB gz + your adapter vs ~256 KB for the editor):

```tsx
import { DocumentRenderer } from '@crafted-design/editor/renderer'
import '@crafted-design/editor/adapters/shadcn' // your design system
import '@crafted-design/editor/index.css'       // the stylesheet

<DocumentRenderer document={savedEnvelope} />
```

- `document` — the `EditorDocument` envelope (or its JSON string). It runs
  through the same validation + version migrations as an editor import, so
  anything the editor loads, the renderer renders.
- `adapter` — optional override of the envelope's `adapterId`. Adapters are
  **per instance**: several renderers with different adapters can coexist on
  one page.
- The envelope's `themeId` + `colorMode` apply automatically, scoped to the
  renderer's wrapper. Overlays behave as at runtime (modals open on their
  triggers, portal to `<body>`).
- A malformed document or unregistered adapter renders a small inline
  `role="alert"` fallback (and logs details) instead of crashing the page.

Rendering is identical to the editor's preview mode — same canonical
resolver, same adapter impls — so what designers previewed is what ships.

A runnable example (latest Vite + React 19 + TS, rendering a real exported
document) lives at
[`examples/renderer-host`](../examples/renderer-host) — the display-page
counterpart to `examples/minimal-host`.

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
import { exportDocument, importDocumentFromFile } from '@crafted-design/editor'

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
import { Editor, ErrorBoundary, TopShellErrorFallback } from '@crafted-design/editor'

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

The editor's own UI — toolbox, inspector, toolbar, panels, banners ("the
chrome") — is themed by the host through the `editorTheme` prop. Pass a
built-in preset or a partial token map:

```tsx
<Editor editorTheme="dark" />                                   // built-in dark
<Editor editorTheme={{ surface: '#16161e', accent: '#7aa2f7' }} /> // brand tokens
<Editor editorTheme={{ preset: 'dark', accent: '#7aa2f7' }} />   // dark + override
```

`editorTheme` is `'light'` (default) | `'dark'` | an `EditorChromeTokens`
map. A token map sets only the tokens you name; the rest fall back to the
`preset` (default `'light'`). Values are any CSS color — hex, `oklch(…)`,
or even `var(--your-host-token)`.

| Token | Role (light default) |
|---|---|
| `surface` | panel / toolbar background (white) |
| `surface2` | subtle inset / hover background (gray-50) |
| `surface3` | stronger inset / active, canvas viewport (gray-100) |
| `border` / `border2` / `borderStrong` | hairline → input → emphasized borders |
| `textStrong` / `text` / `textMuted` / `textFaint` | heading → body → secondary → disabled text |
| `accent` / `accentFg` | selection, focus rings, primary chrome buttons + their text |
| `danger` / `dangerFg` | destructive actions, error banners + their text |

Like the `adapter` prop, `editorTheme` is **host policy** — there's no
end-user chrome-theme switcher. The chrome theme is applied as CSS variables
on `<html>` (so chrome that portals to `<body>` — dropdowns, modals — is
themed too) and leaves the rest of your host page untouched.

> **This is NOT the document theme.** `editorTheme` styles the editor
> *around* the canvas. The canvas content your end users design is themed
> separately by `registerTheme` / the canvas theme switcher / `colorMode`
> (next section). The two are fully independent — a dark editor chrome
> around a light document works, Figma-style — so don't reach for
> `editorTheme` to restyle the canvas, or `registerTheme` to restyle the
> chrome.

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
document (`EditorDocument.colorMode`). This is the **document's** dark mode —
`ThemeProvider` applies `.dark` to the canvas wrapper only. It's independent
of the editor chrome theme (`editorTheme`, above): the canvas can be dark
while the chrome is light, or vice-versa.

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

The editor requires React 19. The old `display: contents` ref-forwarding
wrappers around shadcn primitives (which were React-18-era workarounds) are
gone — refs now flow directly through plain function components via React 19's
ref-as-prop semantics.

Older React 18 hosts would fail at runtime; the dist's `peerDependencies`
declare `^19`.

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
MUI adapters; MUI is roughly 290 KB gz of `index.js`. Shadcn-only hosts can
avoid paying for MUI entirely by importing `@crafted-design/editor/core`
(shadcn + plain-HTML, no MUI) — see [Subpath exports](#subpath-exports). The
Chakra adapter is an **example** and is *not* in the published bundle (only
the dogfood app registers it).

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

localStorage has a 5–10 MB quota per origin. Two UI layers surface storage
pressure before the editor silently drops a save:

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
the equivalent for inline style injection. A nonce-aware variant could be
added in future.

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
import '@crafted-design/editor/index.css'
```

The editor's Tailwind safelist is baked into this CSS. Your host app's
Tailwind config can either:

- Coexist via separate `<link>` / `<style>` tags (default — works fine).
- Merge by adding the editor's safelist to your config's `safelist` and
  building one shared Tailwind output.

### Adapter switcher shows "no impl in adapter X" placeholders

The adapter doesn't have a component impl for that canonical. Either swap
to a covering adapter (shadcn / MUI / plain-HTML cover all 48) or implement
the missing canonical in your custom adapter.

## Where to next

- `docs/ARCHITECTURE.md` — full architecture reference.
- `docs/SDK_GUIDE.md` — every public SDK function + type.
- `docs/TUTORIAL_ADAPTER.md` — step-by-step adapter authoring.
- `docs/TUTORIAL_CANONICAL.md` — step-by-step canonical authoring.
- `docs/TUTORIAL_PANEL.md` — step-by-step inspector panel authoring.
- `examples/adapter-chakra/` — reference adapter implementation.
