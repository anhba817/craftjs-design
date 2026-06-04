# @crafted-design/editor

A pluggable drag-and-drop website builder built on [Craft.js](https://craft.js.org/).
Pick your design system — shadcn/ui, MUI, or plain HTML (or write your own
adapter) — drop the editor into a React app, and ship. Documents are plain
JSON, rendered live by the active adapter.

**[Try it live](https://anhba817.github.io/craftjs-design/try/)** ·
**[Component gallery](https://anhba817.github.io/craftjs-design/gallery/)** ·
**[Docs](https://anhba817.github.io/craftjs-design/)**

> **Stable.** `1.0.0` is the first stable release. The public SDK surface is
> frozen under SemVer — removing or renaming an export is a breaking,
> major-version change. See the [CHANGELOG](./CHANGELOG.md).

## Highlights

- **48 canonical components** — layout, content, data display, navigation,
  overlays, feedback, time, media — each rendered by a chosen adapter.
- **Three built-in adapters** (shadcn, MUI, and dependency-free plain HTML)
  behind one canonical model; the active adapter is swappable at runtime, and
  you can register your own.
- **Style depth** — a breakpoint × pseudo-state matrix, transforms, filters,
  transitions, gradients, token-driven themes with light/dark.
- **Host-themable editor chrome** — match the editor UI to your app with
  `<Editor editorTheme="dark" />` or a brand token map; independent of the
  document theme your users design.
- **Multi-document persistence** on IndexedDB (with a localStorage fallback)
  behind a host-replaceable `StorageAdapter`; versioned schema migrations and
  document snapshots.
- **Standalone rendering** — display saved documents on production pages with
  `<DocumentRenderer />` (`/renderer`, no editor chrome, ~5× smaller), and
  build/edit/validate documents server-side with the `/headless` API.
- **SDK** for authoring canonicals, adapters, inspector panels, themes, and
  templates without forking — with a `scaffold` CLI that generates a wired-up,
  test-passing skeleton (`npx @crafted-design/editor scaffold adapter my-ds`).

## Install

```bash
npm install @crafted-design/editor react@19 react-dom@19 @craftjs/core@^0.2.12
```

React 19, React-DOM 19, and `@craftjs/core` are peer dependencies (the host
provides them). The package is **ESM-only**.

## Quickstart

```tsx
import { Editor } from '@crafted-design/editor'
import '@crafted-design/editor/index.css'

export function App() {
  return <Editor />
}
```

That mounts the full editor with all built-in canonicals, the shadcn + MUI +
plain-HTML adapters, themes, and templates pre-registered (the full entry needs
the `@mui/material` + `@emotion/*` peers — use `@crafted-design/editor/core`
to skip MUI). **Pin your design system** so end users can't switch it:

```tsx
<Editor adapter="mui" />   // host chooses; hides the adapter switcher
```

(For `adapter="mui"`, install the peers: `npm install @mui/material
@emotion/react @emotion/styled`.) **Theme the editor UI** to match your app —
`<Editor editorTheme="dark" />` or a brand token map (separate from the
document theme your users design). Customize **before** rendering `<Editor />`
via the SDK:

```tsx
import { registerCanonical, registerAdapter, setStorageAdapter } from '@crafted-design/editor/sdk'
```

## Documentation

| Guide | What it covers |
|---|---|
| [INTEGRATION_GUIDE](./docs/INTEGRATION_GUIDE.md) | Embedding the editor, customizing the registry, persistence backends, telemetry, CSP, bundle. |
| [SDK_GUIDE](./docs/SDK_GUIDE.md) | The public `@crafted-design/editor/sdk` surface. |
| [DEVELOPER_GUIDE](./docs/DEVELOPER_GUIDE.md) | In-tree contribution recipes (canonicals, adapters, panels, migrations, storage adapters). |
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | How the pieces fit (canonical model, adapters, Craft bridge). |
| [TUTORIAL_ADAPTER / CANONICAL / PANEL](./docs/) | Step-by-step authoring walkthroughs. |
| API reference | Generated from the SDK types — `npm run docs` (published to GitHub Pages). |
| [SECURITY](./SECURITY.md) · [CONTRIBUTING](./CONTRIBUTING.md) | Security policy + threat model · how to contribute. |

## Scripts

```bash
npm run dev          # run the dogfood editor app
npm test             # vitest
npm run lint         # eslint
npm run build:dist   # build the publishable library (dist-lib/)
npm run check:size   # bundle-size budget
npm run analyze      # emit bundle-stats.html treemap
npm run docs         # generate the API reference
```

## License

MIT — see [LICENSE](./LICENSE).
