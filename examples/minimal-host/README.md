# Minimal host app

The smallest real integration: install → render `<Editor />` → it persists,
saves, loads, and shares on its own. Uses the lean **`/core`** entry, so no MUI
in the bundle and nothing extra to install. Copy these three files into a fresh
Vite + React 19 + TS app.

> Not built by this repo's CI — it's a copy-pasteable reference using the
> published import paths. For the in-tree authoring examples see
> [`examples/adapter-chakra`](../adapter-chakra) and
> [`examples/sdk-smoke`](../sdk-smoke).

## Install

```bash
npm create vite@latest my-editor -- --template react-ts
cd my-editor
npm install @crafted-design/editor@next react@19 react-dom@19 @craftjs/core@^0.2.12
```

shadcn + plain-HTML need no other peers. (Want MUI too? `npm install
@mui/material @emotion/react @emotion/styled` and import
`@crafted-design/editor` instead of `/core`.)

## `package.json` (relevant bits)

```jsonc
{
  "type": "module",
  "dependencies": {
    "@crafted-design/editor": "next",
    "@craftjs/core": "^0.2.12",
    "react": "^19",
    "react-dom": "^19"
  }
}
```

## `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## `src/App.tsx`

```tsx
// Lean entry: editor + shadcn + plain-HTML adapters, no MUI.
import { Editor } from '@crafted-design/editor/core'
import '@crafted-design/editor/index.css'

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Editor />
    </div>
  )
}
```

That's the whole integration. `<Editor />` ships its own toolbar — **save,
load, download (`.json`), and share-by-URL** — and persists automatically
through the built-in storage adapter (IndexedDB, falling back to localStorage),
so a refresh restores the last document. No host wiring required.

## Persisting to your own backend

Don't reach for the `exportDocument` helpers to bolt on persistence — point the
editor's storage seam at your backend instead. Implement the `StorageAdapter`
interface and register it **before** rendering `<Editor />`:

```ts
import { setStorageAdapter } from '@crafted-design/editor/core'
import type { StorageAdapter } from '@crafted-design/editor/sdk'

setStorageAdapter(myServerAdapter) // load/save/list against your API
```

Full walkthrough in [`docs/COOKBOOK.md`](../../docs/COOKBOOK.md) "Server-backed
storage" and [`docs/SDK_GUIDE.md`](../../docs/SDK_GUIDE.md) "Persistence
backend". The `exportDocument` / `downloadDocument` / `importDocumentFromFile`
helpers exist for one-off file export/import, not as the persistence path.

## Going further

- Add a design system, custom canonical, panel, or theme — the
  [`docs/TUTORIAL_*`](../../docs/) guides + [`docs/COOKBOOK.md`](../../docs/COOKBOOK.md).
- Entry-point + peer-dependency matrix —
  [`docs/INTEGRATION_GUIDE.md`](../../docs/INTEGRATION_GUIDE.md).
