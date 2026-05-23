# Phase 1 — Detailed Implementation Plan

> Kernel + first canonical component. Establishes every architectural seam from `IMPLEMENTATION_PLAN.md` even though only one component flows through it.

## Goal

Stand up the four-layer architecture (Editor UI → Canonical Registry → Adapter → Craft.js kernel) end-to-end with a single canonical component (**Box**), a single adapter (**shadcn**), and JSON save/load to localStorage.

## Exit criteria

1. `pnpm dev` (or `npm run dev`) starts the editor; the page shows a left toolbox, center canvas, right inspector.
2. Drag the **Box** entry from the toolbox onto the canvas → a Box renders.
3. Nest a Box inside another Box (the canonical Box is a container with `<Element canvas>` semantics).
4. Click a Box → the inspector shows its canonical id and node id, plus a working **Delete** button.
5. Click **Save** → the serialized document is written to `localStorage`.
6. Reload the browser → the canvas restores the same tree.
7. A Zod parse rejects a corrupted document on load (verify by hand-editing localStorage).

Anything beyond this — class editing, themes, second adapter, more components — is explicitly deferred.

---

## Scope decisions (locked)

- **Plan location:** this file (`PHASE1_PLAN.md`) at repo root, alongside `IMPLEMENTATION_PLAN.md`.
- **Inspector in Phase 1:** minimal — selected canonical type, node id, delete button. No Tailwind class editor (Phase 4).
- **React version:** downgrade the fresh Vite scaffold from React 19 → React 18 to match Craft.js's official peer range. Avoid runtime surprises before we have a test harness.
- **Single document:** one page, single root frame. No multi-page, no theme switching.

---

## Pre-flight — project setup

All work happens inside `craftjs-design/` (the Vite project folder), not the repo root.

### 0.1 Downgrade React 19 → 18

Edit `craftjs-design/package.json`:

```diff
- "react": "^19.2.6",
- "react-dom": "^19.2.6"
+ "react": "^18.3.1",
+ "react-dom": "^18.3.1"
...
- "@types/react": "^19.2.14",
- "@types/react-dom": "^19.2.3",
+ "@types/react": "^18.3.12",
+ "@types/react-dom": "^18.3.1",
```

Delete `node_modules/` and any lockfile, reinstall.

### 0.2 Install runtime + tooling dependencies

```
npm i @craftjs/core zustand zod clsx
npm i -D tailwindcss @tailwindcss/vite
```

Notes:
- `@craftjs/core` 0.2.x is the kernel — no other Craft.js packages needed in Phase 1.
- `clsx` for class composition; `tailwind-merge` is deferred until the inspector lands.
- Tailwind v4 uses the Vite plugin, not the legacy PostCSS pipeline.

### 0.3 Tailwind v4 wiring

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css` — replace the Vite default content with:

```css
@import "tailwindcss";

@theme {
  /* Placeholder tokens; Phase 2 fills these in. Phase 1 just needs the block to exist. */
  --color-canvas-bg: #f6f7f9;
  --color-canvas-border: #e5e7eb;
}

html, body, #root { height: 100%; }
body { margin: 0; }
```

### 0.4 Strip the scaffold cruft

- Delete `src/App.css`, `src/assets/`, default logos.
- Reduce `src/App.tsx` to a single `<Editor />` import.
- Keep `src/main.tsx` minimal (`ReactDOM.createRoot(...).render(<App />)`).

### 0.5 Verify

`npm run dev` boots without errors. Browser shows a blank page with the canvas background color from the `@theme` block applied via a Tailwind class. This is the green light to start Step 1.

---

## Target directory layout

Create incrementally as each step demands a file — don't pre-create empty folders.

```
craftjs-design/src/
  editor/                    # Editor UI shell (Layer 1)
    Editor.tsx               # Top-level <Editor> + 3-column layout
    Canvas.tsx               # <Frame> root + root <Element canvas is={Box}>
    Toolbox.tsx              # Left panel — draggable component entries
    Inspector.tsx            # Right panel — minimal Phase 1 version
    SaveLoadBar.tsx          # Top chrome with Save/Load buttons
  registry/                  # Canonical Component Registry (Layer 2)
    types.ts
    registry.ts
    components/
      box.ts                 # canonical Box definition (no React)
  adapters/                  # Adapter SDK + impls (Layer 3)
    types.ts
    AdapterContext.tsx
    shadcn/
      index.ts               # registers the shadcn adapter
      components/
        Box.tsx              # adapter impl for canonical 'box'
  craft/                     # Craft.js bindings (Layer 4 bridge)
    CanonicalNode.tsx        # generic Craft user-component
    resolver.ts              # builds the Craft resolver from registry
  state/
    editorStore.ts           # zustand: active adapter id, dirty flag
  persistence/
    schema.ts                # Zod document schema
    storage.ts               # save/load to localStorage
  utils/
    cn.ts                    # tiny clsx wrapper
  App.tsx
  main.tsx
  index.css
```

---

## Implementation steps

Steps are ordered so each one is mergeable on its own and unblocks the next. Aim to commit per step.

### Step 1 — Type contracts (`registry/types.ts`, `adapters/types.ts`)

The four-layer architecture is only worth anything if the interfaces between layers are stable. Lock them down in Phase 1 — they'll grow, but the *shape* shouldn't churn later.

```ts
// registry/types.ts
import type { z } from 'zod'

export type CanonicalId = string

export interface NodeStyle {
  classes: Record<string, string>         // slot → tailwind class string
  responsive?: Record<string, Record<string, string>>  // breakpoint → slot → classes
}

export interface CanonicalComponent<Props = Record<string, unknown>> {
  id: CanonicalId
  category: 'layout' | 'input' | 'display' | 'navigation' | 'feedback' | 'media' | 'content'
  displayName: string
  tags: string[]
  isCanvas: boolean                       // does it accept Craft children?
  styleSlots: readonly string[]
  propsSchema: z.ZodType<Props>
  defaults: {
    props: Props
    style: NodeStyle
  }
}
```

```ts
// adapters/types.ts
import type { ComponentType, ReactNode } from 'react'
import type { CanonicalId, NodeStyle } from '../registry/types'

export interface AdapterRenderProps {
  canonicalId: CanonicalId
  props: Record<string, unknown>
  style: NodeStyle
  children?: ReactNode
}

export interface Adapter {
  id: string
  displayName: string
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>
}
```

The `responsive` field exists in the type from day one even though no Phase 1 code reads it — it locks the shape in localStorage so Phase 2 doesn't have to migrate.

### Step 2 — Canonical registry (`registry/registry.ts`, `registry/components/box.ts`)

```ts
// registry/registry.ts
const components = new Map<CanonicalId, CanonicalComponent>()

export function registerComponent(def: CanonicalComponent) {
  if (components.has(def.id)) throw new Error(`duplicate canonical id: ${def.id}`)
  components.set(def.id, def)
}
export function getComponent(id: CanonicalId) { return components.get(id) }
export function listComponents() { return [...components.values()] }
```

```ts
// registry/components/box.ts
import { z } from 'zod'
import { registerComponent } from '../registry'

export const boxPropsSchema = z.object({})  // no props in Phase 1

registerComponent({
  id: 'box',
  category: 'layout',
  displayName: 'Box',
  tags: ['container', 'div', 'frame'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: boxPropsSchema,
  defaults: {
    props: {},
    style: {
      classes: { root: 'min-h-16 p-4 border border-dashed border-[var(--color-canvas-border)] rounded-md' },
    },
  },
})
```

Importing `registry/components/box.ts` at boot is what wires Box into the registry. Do that import in `App.tsx`.

### Step 3 — Adapter context & SDK (`adapters/AdapterContext.tsx`)

```tsx
const adapters = new Map<string, Adapter>()
export function registerAdapter(a: Adapter) { adapters.set(a.id, a) }
export function getAdapter(id: string) { return adapters.get(id) }

const Ctx = createContext<Adapter | null>(null)

export function AdapterProvider({ adapterId, children }: { adapterId: string; children: ReactNode }) {
  const adapter = getAdapter(adapterId)
  if (!adapter) throw new Error(`unknown adapter: ${adapterId}`)
  return <Ctx.Provider value={adapter}>{children}</Ctx.Provider>
}

export function useActiveAdapter() {
  const a = useContext(Ctx)
  if (!a) throw new Error('AdapterProvider missing')
  return a
}
```

Phase 1 ships only the shadcn adapter, but the indirection has to be real now — Phase 3 swaps adapters by toggling this provider's prop, and that only works if no consumer reaches around it.

### Step 4 — Shadcn adapter, Box impl (`adapters/shadcn/components/Box.tsx`, `adapters/shadcn/index.ts`)

Box in shadcn is just a styled `div`; there's no real Radix primitive here. That's fine — it still exercises the adapter wiring.

```tsx
// adapters/shadcn/components/Box.tsx
import { cn } from '../../../utils/cn'
import type { AdapterRenderProps } from '../../types'

export function ShadcnBox({ style, children }: AdapterRenderProps) {
  return <div className={cn(style.classes.root)}>{children}</div>
}
```

```ts
// adapters/shadcn/index.ts
import { registerAdapter } from '../AdapterContext'
import { ShadcnBox } from './components/Box'

registerAdapter({
  id: 'shadcn',
  displayName: 'shadcn',
  components: { box: ShadcnBox },
})
```

### Step 5 — Craft bridge (`craft/CanonicalNode.tsx`, `craft/resolver.ts`)

This is the load-bearing piece. The decision: **register one Craft user-component per canonical id**, each delegating to a shared `CanonicalNode` renderer. Reasoning:

- Craft.js's resolver maps a string `displayName` → component. Persisted nodes carry that string.
- If we registered a single generic `CanonicalNode` and stuffed `canonicalId` into props, swapping/renaming canonical ids would force document migrations and break Craft devtools' name display.
- One-component-per-canonical-id keeps serialization stable and devtools readable. The duplication is trivial because each generated component is a 3-line thunk.

```tsx
// craft/CanonicalNode.tsx
import { useNode, Element } from '@craftjs/core'
import { getComponent } from '../registry/registry'
import { useActiveAdapter } from '../adapters/AdapterContext'
import type { NodeStyle } from '../registry/types'

interface Props {
  canonicalId: string
  nodeProps: Record<string, unknown>
  style: NodeStyle
  children?: React.ReactNode
}

export function CanonicalNode({ canonicalId, nodeProps, style, children }: Props) {
  const def = getComponent(canonicalId)
  if (!def) throw new Error(`canonical id not in registry: ${canonicalId}`)
  const adapter = useActiveAdapter()
  const Impl = adapter.components[canonicalId]
  if (!Impl) throw new Error(`adapter '${adapter.id}' missing impl for '${canonicalId}'`)

  const { connectors: { connect, drag } } = useNode()

  const body = (
    <Impl canonicalId={canonicalId} props={nodeProps} style={style}>
      {def.isCanvas ? <Element is="div" canvas>{children}</Element> : children}
    </Impl>
  )

  return <div ref={(el) => el && connect(drag(el))} style={{ display: 'contents' }}>{body}</div>
}

CanonicalNode.craft = {
  displayName: 'CanonicalNode',
  props: { canonicalId: '', nodeProps: {}, style: { classes: {} } },
}
```

```ts
// craft/resolver.ts
import { CanonicalNode } from './CanonicalNode'
import { listComponents } from '../registry/registry'

// Generate one Craft user-component per canonical id, each delegating to CanonicalNode.
// Returns the resolver object Craft.Editor expects.
export function buildResolver() {
  const resolver: Record<string, React.ComponentType<any>> = {}
  for (const def of listComponents()) {
    const Bound = (p: any) => <CanonicalNode canonicalId={def.id} {...p} />
    Bound.craft = {
      displayName: def.displayName,
      props: { nodeProps: def.defaults.props, style: def.defaults.style },
    }
    resolver[def.displayName] = Bound
  }
  return resolver
}
```

**Caveat to watch:** the `style: { display: 'contents' }` wrapper above is a known Craft.js pattern to let drag/select target the rendered element without breaking layout. If selection feels off in step 8, the fix usually lives here — switch to a real wrapper div with `inline-block` or pass `connect(drag(...))` directly to the impl's root via a ref forward.

### Step 6 — Editor shell (`editor/Editor.tsx`, `editor/Canvas.tsx`)

```tsx
// editor/Editor.tsx
import { Editor as Craft, Frame, Element } from '@craftjs/core'
import { AdapterProvider } from '../adapters/AdapterContext'
import { buildResolver } from '../craft/resolver'
import { getComponent } from '../registry/registry'
import { Toolbox } from './Toolbox'
import { Inspector } from './Inspector'
import { SaveLoadBar } from './SaveLoadBar'

export function Editor() {
  const resolver = buildResolver()
  const boxDef = getComponent('box')!
  const boxDisplayName = boxDef.displayName

  return (
    <AdapterProvider adapterId="shadcn">
      <Craft resolver={resolver}>
        <div className="flex flex-col h-screen">
          <SaveLoadBar />
          <div className="flex flex-1 min-h-0">
            <Toolbox />
            <main className="flex-1 overflow-auto bg-[var(--color-canvas-bg)] p-8">
              <Frame>
                <Element is={resolver[boxDisplayName]} canvas
                         nodeProps={boxDef.defaults.props}
                         style={boxDef.defaults.style} />
              </Frame>
            </main>
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}
```

App.tsx imports `./registry/components/box` and `./adapters/shadcn` for their side effects, then renders `<Editor />`.

### Step 7 — Toolbox (`editor/Toolbox.tsx`)

```tsx
import { useEditor } from '@craftjs/core'
import { listComponents } from '../registry/registry'

export function Toolbox() {
  const { connectors } = useEditor()
  return (
    <aside className="w-56 border-r p-3 space-y-2">
      <div className="text-xs font-semibold opacity-70">Components</div>
      {listComponents().map((def) => (
        <button
          key={def.id}
          ref={(el) => el && connectors.create(el,
            <Element is={def.displayName} canvas={def.isCanvas}
                     nodeProps={def.defaults.props} style={def.defaults.style} />)}
          className="w-full text-left px-2 py-1.5 rounded border hover:bg-gray-50"
        >
          {def.displayName}
        </button>
      ))}
    </aside>
  )
}
```

The `connectors.create(el, <Element …>)` pattern is how Craft.js wires a drag source to a ghost element instance.

### Step 8 — Selection + minimal inspector (`editor/Inspector.tsx`)

```tsx
import { useEditor } from '@craftjs/core'

export function Inspector() {
  const { selected, actions } = useEditor((state, query) => {
    const [id] = state.events.selected
    const node = id ? query.node(id).get() : null
    return {
      selected: node && { id, displayName: node.data.displayName },
    }
  })

  return (
    <aside className="w-72 border-l p-3">
      {!selected ? (
        <div className="text-sm opacity-60">Nothing selected.</div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs opacity-60">Selected</div>
          <div className="text-sm">
            <div><b>Type:</b> {selected.displayName}</div>
            <div><b>Id:</b> <code>{selected.id}</code></div>
          </div>
          <button
            className="text-red-600 text-sm underline"
            onClick={() => actions.delete(selected.id)}
          >
            Delete
          </button>
        </div>
      )}
    </aside>
  )
}
```

That's the whole Phase 1 inspector. Resist the urge to add a className textarea — Phase 4 owns class editing, and a half-built version will leak.

### Step 9 — Persistence (`persistence/schema.ts`, `persistence/storage.ts`)

```ts
// persistence/schema.ts
import { z } from 'zod'

export const documentSchema = z.object({
  version: z.literal(1),
  adapterId: z.string(),
  craftJson: z.string(),   // opaque to us; Craft.js owns its serialization shape
})
export type EditorDocument = z.infer<typeof documentSchema>

export const STORAGE_KEY = 'craftjs-design:doc:v1'
```

```ts
// persistence/storage.ts
import { documentSchema, STORAGE_KEY, type EditorDocument } from './schema'

export function saveDocument(doc: EditorDocument) {
  const parsed = documentSchema.parse(doc)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
}

export function loadDocument(): EditorDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return documentSchema.parse(JSON.parse(raw))
}
```

```tsx
// editor/SaveLoadBar.tsx
import { useEditor } from '@craftjs/core'
import { saveDocument, loadDocument } from '../persistence/storage'

export function SaveLoadBar() {
  const { actions, query } = useEditor()
  return (
    <div className="border-b px-3 py-2 flex gap-2 items-center">
      <span className="text-xs font-semibold opacity-70">craftjs-design</span>
      <div className="flex-1" />
      <button className="text-sm border rounded px-2 py-1"
              onClick={() => saveDocument({ version: 1, adapterId: 'shadcn', craftJson: query.serialize() })}>
        Save
      </button>
      <button className="text-sm border rounded px-2 py-1"
              onClick={() => { const d = loadDocument(); if (d) actions.deserialize(d.craftJson) }}>
        Load
      </button>
    </div>
  )
}
```

Auto-load on mount: in `Editor.tsx`, after the `<Craft>` mounts, hydrate from localStorage using a small `useEffect` that calls `actions.deserialize(...)` if a document exists. The serialized Craft JSON references components by their `displayName`, so the resolver must already be built — which it is, since `buildResolver()` runs synchronously.

### Step 10 — Exit verification (manual)

Tick this checklist before declaring Phase 1 done. No automated tests in Phase 1 — they come with the class parser in Phase 4.

- [ ] `npm run dev` starts cleanly; no console errors.
- [ ] Toolbox shows a single **Box** entry.
- [ ] Drag a Box onto the canvas — it renders with the dashed border placeholder.
- [ ] Drag a second Box *into* the first — nested children work.
- [ ] Click each Box — inspector updates to show its type and id.
- [ ] Click **Delete** in the inspector — that node disappears.
- [ ] Click **Save** — `localStorage` has the `craftjs-design:doc:v1` key with a parseable JSON envelope.
- [ ] Hard-refresh the page — the previous tree restores.
- [ ] Manually corrupt the localStorage value → reload → Zod throws (visible in console). Don't trap the error in Phase 1; just confirm validation runs.

---

## Explicitly out of scope for Phase 1

Deferring these is the whole point of phased work — write them down so reviewers (and you, later) don't expect them.

- Tailwind class editing in the inspector → **Phase 4**.
- Theme tokens beyond two placeholder vars → **Phase 2**.
- A second adapter or adapter switcher → **Phase 3**.
- More than one canonical component → **Phase 5**.
- Undo/redo *UI* (Craft.js's history works via `actions.history.undo/redo`, but there are no buttons yet).
- Multi-page documents, server persistence, autosave, dirty-state indicators.
- Responsive breakpoints (the `responsive` field is in the type but unread).
- Tests (Phase 4 introduces them alongside the class parser, which is the first piece worth testing).

---

## Risks specific to Phase 1

1. **Craft.js + the latest TS in the scaffold.** The Vite scaffold has TS `~6.0.2` and `verbatimModuleSyntax: true`. Craft.js's types may not love this. Mitigation: if compile breaks, drop the project to `typescript@5.6.x` (still well within Vite + React 18 support) before debugging Craft typings — this is the cheapest fix.

2. **`<Element canvas>` semantics for nested Boxes.** The bridge wraps children in `<Element is="div" canvas>` to delegate to Craft. If drops don't land inside a child Box, the wrapper is likely the cause — switch the inner wrapper to `<Element is={resolver[def.displayName]} canvas>` so the child container *is* a canonical node, not a plain div.

3. **localStorage tree-walk on reload race.** `actions.deserialize` must run after the `<Frame>` has mounted its initial tree. If you call it in a `useEffect` outside the editor, the Frame's first render will overwrite your load. Put the hydration in a small `<Hydrator />` component rendered *inside* the `<Craft>` provider.

4. **Zod parse on every save.** Cheap now, but if the document grows large in later phases, move validation to a worker or skip on save and only validate on load. Don't optimize this yet — just be aware.

---

## Definition of done

When the exit-criteria checklist is fully ticked **and** the code structure matches the target layout, Phase 1 is shippable. The next move is Phase 2 — theme tokens + a Typography panel — which will exercise the `style.classes` map for real.
