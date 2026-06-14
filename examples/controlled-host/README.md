# Controlled host — embed `<Editor>` as a controlled component

A Vite + React 19 + TS app that embeds **`<Editor>` as a controlled
component** — the host owns the document in its own state and drives the editor
through the standard controlled contract. No iframe, no `postMessage`, no custom
`StorageAdapter`, no DOM-clicking a Save button.

The whole integration is `src/App.tsx`:

```tsx
import { Editor, type EditorHandle } from '@crafted-design/editor/core'
import type { EditorDocument } from '@crafted-design/editor/core'

const [doc, setDoc] = useState<EditorDocument>(seed)
const ref = useRef<EditorHandle>(null)

<Editor
  ref={ref}
  adapter="shadcn"
  value={doc}                      // single source of truth
  onChange={(next) => setDoc(next)} // debounced; fires on prop/style + structural edits
  persistence={false}              // editor never touches its own IndexedDB
  hideChrome                       // no built-in Save/Load bar — render your own
/>
```

- **`value`** makes the editor controlled — re-seed by changing it (the example's
  "Re-seed via value" button). Edits round-trip `onChange → setState → value`
  without looping (the editor dedupes the echo).
- **`onChange`** gives you the live `EditorDocument` to persist
  (`JSON.stringify(doc)` for your backend).
- **`ref`** (`EditorHandle`) reads / replaces the document imperatively:
  `ref.current.getDocument()` and `ref.current.setDocument(doc)`.
- A live **`<DocumentRenderer document={doc} />`** preview shows the same state
  the host holds.

`defaultValue` is the uncontrolled alternative: a one-time seed (edits stay
internal, still surfaced via `onChange`) — use it when you don't want to hold the
document in state.

> **CSS isolation:** this example imports the **scoped** stylesheet
> `@crafted-design/editor/index.scoped.css` — every rule is prefixed with
> `.crafted-design-scope`, so the editor embeds **inline** in an app already
> running Tailwind v4 with no double preflight and no token clobbering (no
> iframe). A non-Tailwind / standalone host can use the global `index.css`
> instead.

## Run it

```bash
npm install
npm run dev
```
