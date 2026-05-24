# Integration Guide

How to embed the editor in your own React app.

The shipped artifact is a Vite library-mode bundle: an ES module exporting
`<Editor />` plus the full SDK. React, React DOM, and Craft.js are
externalized as peer dependencies — your host app provides them.

This guide assumes a Vite + React 18 host. React 19 hosts work via Craft.js's
`peerDependencies` (which accept `^16.8.0 || ^17 || ^18 || ^19`), but the
editor's own dev environment is React 18 today. See `PHASE8_PLAN.md`'s
close-out for the React 19 status.

## Install

```bash
npm install @design/editor   # placeholder — package name TBD at publish
```

Peer dependencies:

```bash
npm install react@^18 react-dom@^18 @craftjs/core@^0.2.12
```

## Minimal embed

```tsx
import { Editor } from '@design/editor'
import '@design/editor/dist-lib/index.css' // Tailwind CSS bundle

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

### React 19 status

The editor's dev environment is React 18.3 today. Craft.js's
`peerDependencies` accept React 19, so technically the dist runs in a React
19 host — but the editor team hasn't done a full smoke test in that
environment. Phase 9 ships the React 19 upgrade with a verified test pass.

If you're on React 19 and hit issues, the most likely cause is the
`display: contents` ref-forwarding workaround in adapter impls (added for
React 18's `forwardRef` constraints). Those wrappers can be removed once
React 19 is officially supported.

### Bundle size

Measured Phase 8 baseline (`npm run build:dist`, no minification, with
sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist-lib/index.js` | 1.5 MB | 326 KB |
| `dist-lib/index.css` | 390 KB | 114 KB |
| Combined | 1.9 MB | **440 KB gzipped** |

The CSS is large because the Tailwind safelist covers every utility × every
breakpoint that the inspector can emit (270+ `@source inline()` directives).
Hosts running their own Tailwind build can dedupe by sharing the safelist;
see the Tailwind troubleshooting section above.

The dist build doesn't minify by default — your host's bundler should
handle that. Minifying `index.js` cuts it roughly in half.

The Chakra example adapter is included by default; remove it via
`unregisterAdapter('chakra-example')` if you don't need it (saves ~5 KB).

### Document storage quota

localStorage has a 5–10 MB quota per origin. The editor uses it by default;
documents that exceed quota fail silently (logged to console). For larger
designs, use the `useDocumentStore` API to read documents into memory and
persist to your own backend (IndexedDB, server-side).

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
