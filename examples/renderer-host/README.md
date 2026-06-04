# Renderer host — display a saved document, no editor

The production-page counterpart to [`minimal-host`](../minimal-host): a
Vite + React 19 + TS app that renders a saved editor document with
**`<DocumentRenderer />`** — no toolbox/inspector/toolbar, no editing, a
fraction of the editor bundle (~48 KB gz + the adapter).

`src/document.json` is a real document exported from the editor
(Export → `.json`). The whole integration is `src/App.tsx`:

```tsx
import { DocumentRenderer } from '@crafted-design/editor/renderer'
import '@crafted-design/editor/adapters/shadcn' // render with shadcn
import '@crafted-design/editor/index.css'       // the stylesheet
import documentJson from './document.json?raw'  // a string → validated + migrated on load

<DocumentRenderer document={documentJson} />
```

The envelope's `themeId` / `colorMode` apply automatically, scoped to the
renderer. Want a different design system? Import another adapter and pin it:

```tsx
import '@crafted-design/editor/adapters/html'
<DocumentRenderer document={documentJson} adapter="html" />
```

## Run it

```bash
git clone https://github.com/anhba817/craftjs-design
cd craftjs-design/examples/renderer-host
npm install
npm run dev
```

> Requires `@crafted-design/editor` ≥ 1.3.0 (the `/renderer` entry).
> Its source is typechecked against the built package in CI
> (`npm run check:example`), so this integration can't drift from the
> real API.
