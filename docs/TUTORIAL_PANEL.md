# Tutorial — adding an inspector panel

Goal: add a custom inspector panel that appears for selected nodes. We'll
build a "Notes" panel — a free-text annotation stored on each node as a
synthetic prop.

The seven built-in panels (Layout, Size, Spacing, Typography, Appearance,
Effects, Properties) register themselves the same way. SDK consumers add
custom panels via `registerPanel` — they show in the Inspector alongside
the built-ins, sorted by `order`.

## Step 1 — Author the panel component

A panel is a React component that receives `{ nodeId, slot }`. For panels
that edit canonical props (not slot classes), `slot` is harmless to ignore.

```tsx
// src/editor/inspector/NotesPanel.tsx
import { useEditor } from '@craftjs/core'

export function NotesPanel({ nodeId }: { nodeId: string }) {
  const { actions, notes } = useEditor((_, q) => ({
    notes: (q.node(nodeId).get().data.props as { __notes?: string }).__notes ?? '',
  }))

  const setNotes = (value: string) => {
    actions.setProp(nodeId, (props: { __notes?: string }) => {
      props.__notes = value || undefined  // undefined removes the key
    })
  }

  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Designer notes for this node…"
      rows={4}
      className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
    />
  )
}
```

For panels that edit slot classes, use the `useNodeClasses` hook:

```tsx
import { useNodeClasses } from '@crafted-design/editor/sdk'

export function CustomClassPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId, slot)
  return (
    <textarea
      value={classString}
      onChange={(e) => writeClasses(e.target.value)}
    />
  )
}
```

`useNodeClasses` is the single I/O funnel — it routes reads/writes between
the base breakpoint and the responsive buckets (`style.responsive`,
`style.responsiveInline`) based on the editor's `activeBreakpoint`. Your
panel gets responsive support for free.

## Step 2 — Register the panel

```ts
import { registerPanel } from '@crafted-design/editor/sdk'
import { NotesPanel } from './NotesPanel'

registerPanel({
  id: 'notes',                          // unique id; matches applicablePanels entries
  displayName: 'Notes',                 // section header in the Inspector
  order: 100,                           // after every built-in (10–70)
  applicableTo: () => true,             // every canonical
  component: NotesPanel,
})
```

Place the registration in a module that loads at boot — e.g., a new file
`src/editor/inspector/custom-panels.ts` imported as a side-effect from
`src/App.tsx`.

### Resolution rules

When the Inspector renders for a selected node:

1. If the canonical declares `applicablePanels` (a whitelist), only panels
   with ids in that list render. Custom panel ids not in the whitelist are
   excluded.
2. Otherwise, each panel's `applicableTo(def)` predicate decides.

In practice: if you want your custom panel to apply universally, set
`applicableTo: () => true`. Canonicals using the legacy `applicablePanels`
whitelist (Button, all 5 form canonicals) won't show your panel unless they
add its id to their whitelist.

## Step 3 — Verify

1. Reload the editor.
2. Select any non-form node on the canvas.
3. Inspector shows a "Notes" section below "Properties" (order=100 > 70).
4. Type some notes. Select away, then back — the notes persist.
5. Save the document, reload — notes survive.

## Step 4 — Replacing a built-in

To swap out a built-in (e.g., a custom Typography panel with HSL color
sliders), `registerPanel` with the same id:

```ts
registerPanel({
  id: 'typography',                     // same id as built-in
  displayName: 'Typography (HSL)',
  order: 40,                            // keep built-in's order
  applicableTo: (def) => def.category === 'content' || def.category === 'layout',
  component: TypographyHSLPanel,
})
```

The second `registerPanel` call overwrites the first — same id, replaced
definition. The built-in `id: 'typography'` registers at App.tsx
side-effect-import time; your replacement registers after that.

Order matters: your registration must run *after* `import './editor/inspector/built-in-panels'`.
Place your side-effect import below it in `App.tsx`.

## Step 5 — Panel hooks reference

Custom panels typically need to read / write node state. The SDK exposes:

- `useNodeClasses(nodeId, slot)` — class string + inline style read/write,
  responsive-aware.
- `useEditor()` (from `@craftjs/core`, not the SDK) — direct access to
  Craft's `actions` and `query`. Use for cases the SDK doesn't cover.

For setting canonical props (synthetic or schema-typed), use Craft's
`actions.setProp(nodeId, (props) => { ... })`. The mutator receives an
Immer draft — mutate in place, don't return.

## Where to next

- **Panel that reads the canonical definition.** Use
  `getComponentByDisplayName(displayName)` from `@crafted-design/editor/sdk`
  to look up the canonical's metadata (e.g., to show the schema in a debug
  pane).
- **Panel that interacts with multiple nodes.** `useEditor` exposes
  `state.events.selected` — your panel can react to selection changes.
- **Panel scoped to specific canonicals.** Narrow `applicableTo`:
  `(def) => def.id === 'card'`.
