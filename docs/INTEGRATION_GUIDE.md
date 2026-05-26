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

Two entry points:

| Import path | What you get |
|---|---|
| `@crafted-design/editor` | Full `<Editor />` component + the editor's own dependencies. Pull this when you want to render the editor itself. |
| `@crafted-design/editor/sdk` | SDK-only surface (`registerAdapter`, `registerCanonical`, `registerPanel`, `registerTheme`, `registerTemplate`, `registerFontToken`, `useNodeClasses`, all the matching types). No editor UI — use this when authoring a canonical / adapter / panel without pulling in `<Editor />`. |
| `@crafted-design/editor/index.css` | Tailwind CSS bundle. Import once per page; no JS overhead. |

`.d.ts` files ship alongside both JS entries so TypeScript hosts resolve
types without configuration.

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

The editor pre-registers 20 canonicals, 3 adapters (shadcn / MUI / Chakra
example), 2 themes, 7 inspector panels, and 3 starter templates. Override
any of these by calling the SDK BEFORE rendering `<Editor />`:

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

The editor's default storage is localStorage under
`craftjs-design:doc-index:v2` + `craftjs-design:doc:<id>:v2`. Integration
hosts that want their own backend can:

1. **Read/write the active document directly** via `useDocumentStore`:

   ```tsx
   import { useDocumentStore } from '@design/editor'

   // Save to your backend whenever the user clicks Save
   const handleSave = async () => {
     const doc = useDocumentStore.getState().loadActiveDocument()
     if (doc) await myApi.saveDocument(doc)
   }
   ```

2. **Bypass the store** entirely with the lower-level helpers:

   ```tsx
   import {
     exportDocument,
     importDocumentFromFile,
   } from '@design/editor'

   // Blob → host backend
   const blob = exportDocument(myEnvelope)
   await myApi.upload(blob)

   // File from host → editor
   const env = await importDocumentFromFile(file)
   ```

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

## Caveats

### React version

The editor requires React 19. The Phase-1 `display: contents` ref-forwarding
wrappers around shadcn primitives (which were React-18-era workarounds) are
gone — refs now flow directly through plain function components via React 19's
ref-as-prop semantics.

Older React 18 hosts would fail at runtime; the dist's `peerDependencies`
declare `^19`. To use the editor in a React 18 host, downgrade the editor to
a pre-Phase-9 version.

### Bundle size

Measured at end of Phase 9 (`npm run build:dist`, no minification, with
sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist-lib/index.js` | 1.6 MB | 336 KB |
| `dist-lib/index.css` | 390 KB | 114 KB |
| Combined | 2.0 MB | **450 KB gzipped** |

Phase 9 net delta: roughly +100 KB raw JS / +10 KB gzipped from the
reliability infrastructure (axe-init for dev, async error handler,
malformed-doc recovery, storage quota tracking, concurrent-edit
watcher, canvas keyboard nav). axe-init is dev-only via
`import.meta.env.DEV` and tree-shakes out of the production bundle —
the +100 KB is the production-shipping reliability surface itself.

The CSS is large because the Tailwind safelist covers every utility × every
breakpoint that the inspector can emit (270+ `@source inline()` directives).
Hosts running their own Tailwind build can dedupe by sharing the safelist;
see the Tailwind troubleshooting section above.

The dist build doesn't minify by default — your host's bundler should
handle that. Minifying `index.js` cuts it roughly in half.

The Chakra example adapter is included by default; remove it via
`unregisterAdapter('chakra-example')` if you don't need it (saves ~5 KB).

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
