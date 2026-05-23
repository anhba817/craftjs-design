# Architecture

This document describes the architecture of `craftjs-design` **as of the end of Phase 3**. It explains *what the code does today*. For *what we plan to build next*, see [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md), [`PHASE1_PLAN.md`](./PHASE1_PLAN.md), [`PHASE2_PLAN.md`](./PHASE2_PLAN.md), and [`PHASE3_PLAN.md`](./PHASE3_PLAN.md).

---

## Overview

`craftjs-design` is a drag-and-drop website builder. Its central design idea is to **separate three concerns that most builders mix up**:

1. **What the user is composing** — an abstract tree of "components" (Button, Input, Box, Card…).
2. **Which UI library renders those components** — shadcn, MUI, Chakra, or a custom kit.
3. **How the tree is edited** — selection, drag/drop, undo/redo (handled by [Craft.js](https://craft.js.org/)).

Most builders couple #1 and #2: the user picks a "Button" from a palette, but that Button is hard-wired to whatever library was chosen at project setup. Swapping libraries means rebuilding documents.

Our architecture decouples them via a **Canonical Component Registry** (the abstract palette) sitting above an **Adapter SDK** (the per-library renderers). Documents reference canonical ids only. Swapping adapter ≠ migrating documents.

---

## Four-Layer Model

```
┌──────────────────────────────────────────────────────────┐
│  Editor UI            (Toolbox, Inspector, Canvas chrome)│
├──────────────────────────────────────────────────────────┤
│  Canonical Component Registry  (abstract Button, Input…) │
├──────────────────────────────────────────────────────────┤
│  Adapter Layer        (Shadcn / MUI / Chakra → canonical)│
├──────────────────────────────────────────────────────────┤
│  Craft.js kernel + Document JSON                          │
└──────────────────────────────────────────────────────────┘
```

Each layer talks only to its immediate neighbour. The discipline is enforced by the type contracts in `src/registry/types.ts` and `src/adapters/types.ts` — these are the *only* legal vocabulary between layers.

### Layer 1 — Editor UI (`src/editor/`)

The user-facing chrome. Has no opinion about *what* components exist, only about *how to edit them*: panels, toolbars, the canvas frame.

| File | Role |
|---|---|
| `Editor.tsx` | Top-level shell. Builds the resolver, mounts Craft.js, wraps the canvas in `<ThemeProvider>`, lays out the 3-column UI. `AdapterProvider` no longer takes an `adapterId` prop — it subscribes to the editor store. |
| `Toolbox.tsx` | Left panel. Reads `listComponents()` from the registry, attaches Craft `connectors.create()` per entry so each is a drag source. |
| `Inspector.tsx` | Right panel. Reads the selected node from Craft state, shows type/id, exposes Delete (root-guarded), mounts `<TypographyPanel>` for the selected node. |
| `inspector/TypographyPanel.tsx` | Phase 2's first real inspector panel. Reads `style.classes.root` via `useEditor`, parses with `parseTypography`, renders four selects (size, weight, align, color), writes via `mergeTypography` + `actions.setProp`. |
| `SaveLoadBar.tsx` | Top bar. Title, adapter switcher, theme switcher, Save/Load buttons. Save reads `activeAdapterId` + `activeThemeId` from the editor store; Load restores both alongside the Craft tree. |
| `ThemeSwitcher.tsx` | Dropdown that flips `activeThemeId` in the editor store. The `<ThemeProvider>` re-renders the canvas wrapper with the new `data-theme`. |
| `AdapterSwitcher.tsx` | Phase 3 — dropdown that flips `activeAdapterId` in the editor store. `<AdapterProvider>` subscribes, swaps the active adapter, and fires `mount`/`unmount` lifecycle hooks. |
| `Hydrator.tsx` | Renders `null`. On mount, attempts to restore from `localStorage` — deserializes the Craft tree, restores theme, restores adapter. Module-level `hydrated` flag prevents re-restore on remount (defense-in-depth — see § Wrappers compose, not switch). |

### Layer 2 — Canonical Component Registry (`src/registry/`)

The abstract palette. A `CanonicalComponent` is a *contract*, not a React component:

```ts
{
  id: 'box',                       // stable string id — used in serialization
  category: 'layout',
  displayName: 'Box',
  tags: ['container', 'div'],
  isCanvas: true,                  // can hold children?
  styleSlots: ['root'],            // named class buckets (Phase 4 inspector reads these)
  propsSchema: zod schema,         // typed props (variant, size, intent…)
  defaults: { props, style },      // initial values for new nodes
}
```

Registration is **side-effect based**: each component file imports `registerComponent` and calls it at module load.

| File | Role |
|---|---|
| `types.ts` | `CanonicalComponent`, `NodeStyle`, `CanonicalCategory`, `CanonicalId`. |
| `registry.ts` | `registerComponent`, `getComponent`, `listComponents`. In-memory map. |
| `components/index.ts` | Barrel of side-effect imports. Adding a new canonical = one line here. |
| `components/box.ts` | Generic container. Defaults use shadcn theme tokens (`border-border`, `bg-card`) so the theme swap repaints the Box. |
| `components/text.ts` | Phase 2 — text-bearing canonical for the Typography panel demo. `propsSchema = { content: string }`, defaults to `text-base text-foreground`. |
| `components/button.ts` | Phase 3 — `propsSchema = { label, intent: 'primary'|'secondary'|'destructive', disabled }`. `isCanvas: false`. Adapter-owned visual styling (default `style.classes.root` is empty). |
| `components/input.ts` | Phase 3 — `propsSchema = { type, placeholder, value, disabled }` where `type ∈ {text, email, password, number}`. Adapter-owned styling. |

### Layer 3 — Adapter Layer (`src/adapters/`)

A module that says "given a canonical id and its props/style, render this React component." Different adapters render the same canonical id with different libraries.

```ts
interface Adapter {
  id: 'shadcn'
  displayName: 'shadcn'
  components: { box: ShadcnBox /* , button: ShadcnButton, … */ }
}
```

Adapters are also registered by side-effect import.

| File | Role |
|---|---|
| `types.ts` | `Adapter`, `AdapterRenderProps`, `ClassMapFn`, `ClassMapResult`. The contract every impl receives. Phase 3 grew the `Adapter` interface with five optional fields. |
| `AdapterContext.tsx` | Module-level registry + React context + `useActiveAdapter()` hook. Phase 3 — `registerAdapter` validates manifests via Zod; `AdapterProvider` subscribes to the editor store, dispatches `mount`/`unmount` lifecycle, and wraps children in `adapter.Wrapper` if present. |
| `AdapterManifestSchema.ts` | Phase 3 — Zod schema validating adapter shape at register-time. Catches missing `id`, wrong primitive types, etc. before plugins can crash the editor. |
| `shadcn/index.ts` | Registers the shadcn adapter with `{ box, text, button, input }` impls. |
| `shadcn/components/Box.tsx` | `<div ref={rootRef} className={cn(style.classes.root)}>{children}</div>`. `cn` imported from `@/lib/utils`. |
| `shadcn/components/Text.tsx` | `<p ref={rootRef} className={cn(style.classes.root)}>{content}</p>`. |
| `shadcn/components/Button.tsx` | Wraps `@/components/ui/button`. Maps canonical `intent` → shadcn `variant` (`primary→default`, `destructive→destructive`, …). Uses a `display:contents` span to forward refs (shadcn's CLI-generated primitives aren't forwardRef wrappers in React 18 — see § shadcn ref-forwarding workaround). |
| `shadcn/components/Input.tsx` | Wraps `@/components/ui/input` with `readOnly` in editor mode. Same ref-forwarding workaround as Button. |
| `mui/index.ts` | Phase 3 — registers MUI adapter with `Wrapper: MuiWrapper`, all four canonicals (box, text, button, input). |
| `mui/Wrapper.tsx` | Renders `<ThemeProvider>` + `<div className="mui-bridge">` around the canvas when MUI is active. No CssBaseline (would reset shadcn base styles). |
| `mui/theme.ts` | `createTheme({ cssVariables: true, palette: …})` with placeholder colors. The real bridging happens in CSS — see § MUI palette bridge. |
| `mui/components/Box.tsx` | Wraps MUI `<Box>`. Passes Tailwind className through so canonical defaults still resolve through shadcn tokens. |
| `mui/components/Text.tsx` | Wraps MUI `<Typography>`. Subtle font-family shift from shadcn (Material's stack vs. Geist). |
| `mui/components/Button.tsx` | Wraps MUI `<Button variant="contained">`. Maps canonical `intent` → MUI `color` (`destructive→error`, …). No ref-forwarding span — MUI is forwardRef-native. |
| `mui/components/Input.tsx` | Wraps MUI `<TextField>` with `slotProps.input.readOnly` in editor mode. |

**`AdapterRenderProps`** is the only shape an adapter impl ever sees:

```ts
{
  canonicalId: string
  props: Record<string, unknown>     // user-set props
  style: NodeStyle                   // { classes: { root: '...' }, responsive? }
  children?: ReactNode               // Craft-managed children if canvas
  rootRef?: (el: HTMLElement | null) => void   // editor attaches this to the outermost DOM element

  // Phase 3 — populated by CanonicalNode from adapter.classMap (or default).
  // Each impl picks the field that matches its library:
  className?: string                 // Tailwind-style adapters (shadcn, plain HTML)
  sx?: Record<string, unknown>       // MUI's sx prop
  inlineStyle?: CSSProperties        // inline CSS — renamed from 'style' to avoid the NodeStyle collision
}
```

`rootRef` is how the editor wires Craft's `connect`/`drag` to the *actual rendered DOM*. Without it, nested drop-target hit-testing breaks (see [Design decision: `rootRef` on the adapter contract](#design-rootref) below).

**`Adapter`** grew five optional fields in Phase 3. The four-way fork for when to use which is documented in `PHASE3_PLAN.md`:

```ts
{
  id: string
  displayName: string
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>

  Wrapper?: ComponentType<{ children: ReactNode }>   // global React provider (MUI's ThemeProvider, …)
  themeTokens?: Record<string, string>               // CSS variables to inject (Phase 5 implementation)
  classMap?: ClassMapFn                              // canonical Tailwind → render props
  mount?: () => void                                 // imperative side effects
  unmount?: () => void                               // imperative cleanup
}
```

### Layer 4 — Craft.js kernel + bridge (`src/craft/`)

Craft.js manages the document tree, selection set, drag/drop, and history. We don't replace any of that. We just bridge our two-layer abstraction (registry + adapter) into Craft's "resolver" model.

| File | Role |
|---|---|
| `CanonicalNode.tsx` | A single React component. Given `canonicalId` + `nodeProps` + `style`, looks up the canonical def from the registry and the impl from the active adapter, then renders. Attaches Craft's `connect/drag` connectors via `rootRef`. |
| `resolver.tsx` | `buildResolver()` walks `listComponents()` and produces one Craft user-component per canonical id, each delegating to `CanonicalNode`. `getResolver()` is the cached singleton accessor. |

---

## Supporting Modules

Three additions in Phase 2 don't fit the four-layer model — they're cross-cutting infrastructure the layers depend on.

### Theme Layer (`src/themes/`)

Themes are CSS-variable token packs scoped via `[data-theme]` selectors. They're registered the same way canonicals and adapters are, so the mental model stays uniform across layers.

| File | Role |
|---|---|
| `types.ts` | `Theme` interface — `{ id, displayName, dataThemeValue }`. |
| `registry.ts` | `registerTheme` / `getTheme` / `listThemes`. Mirrors `registry/registry.ts`. |
| `default.ts` | Registers `'default'` with empty `dataThemeValue` → no attribute, `:root` defaults apply. |
| `rose.ts` | Registers `'rose'` with `dataThemeValue: 'rose'` → matches the `[data-theme="rose"]` block in `index.css`. |
| `index.ts` | Side-effect barrel — `import './default'; import './rose'`. |
| `ThemeProvider.tsx` | Reads `activeThemeId` from `editorStore`, renders `<div data-theme={…} style={{display:'contents'}}>{children}</div>`. |

Token values live in `src/index.css`:
- `:root { … }` — shadcn-default token values.
- `.dark { … }` — dark-mode override (unused so far; reserved for future).
- `[data-theme="rose"] { … }` — only the tokens that *differ* from default (`--primary`, `--ring`, sidebar siblings). Cascade handles the rest.

### Editor State (`src/state/`)

Editor-side state that lives **outside** the Craft tree.

| File | Role |
|---|---|
| `editorStore.ts` | Zustand v5 store. Today: `{ activeThemeId, setActiveTheme }`. Phase 3 will add `activeAdapterId`. |

Read patterns:
- **Components** that render based on the value → `useEditorStore((s) => s.activeThemeId)` (subscribes; re-renders on change).
- **Click handlers / effects** that just need the latest value → `useEditorStore.getState().activeThemeId` (no subscription, no re-render).

### Style Layer (`src/style/`)

Single funnel for all class-string editing. The discipline is: **anything that writes to `style.classes.root` must go through a merge function in this file.** Direct string concat in components risks dropping classes the parser doesn't recognize.

| File | Role |
|---|---|
| `tw-classes.ts` | Typed unions + parser/serializer/merge. Phase 2 ships only the typography slice; Phase 4 expands to layout / spacing / fill / border / radius / effects. |

API contract:
- `parseTypography(classString)` → `{ slice, unknownClasses }`. Recognized typography utilities populate the slice; unrecognized strings pass through as `unknownClasses`.
- `mergeTypography(original, partialSlice)` → new class string. Patch-friendly: caller passes only fields they want to change. Unknown classes always pass through.

### Shadcn-Managed Modules (`src/lib/`, `src/components/ui/`)

Files that `shadcn@4.x init` creates and that subsequent `npx shadcn add <name>` commands extend. We don't author these manually.

| Path | Role |
|---|---|
| `src/lib/utils.ts` | The `tailwind-merge`-backed `cn`. Every adapter impl imports from here. |
| `src/components/ui/` | shadcn primitives (Button, eventually Input, Dialog, etc.). Phase 3+ adapter impls will compose these inside `AdapterRenderProps`-shaped wrappers. |

---

## Directory Map

```
craftjs-design/
  components.json         # shadcn CLI config
  src/
    main.tsx              # ReactDOM root
    App.tsx               # Boot: side-effect imports for registry/adapters/themes, renders <Editor>
    index.css             # Tailwind v4 entry + @theme inline bridge + :root / .dark / [data-theme=…] blocks + .mui-bridge palette overrides + @source inline() safelist
    lib/
      utils.ts            # shadcn's tailwind-merge-backed cn
    components/
      ui/                 # shadcn primitives, managed by `npx shadcn add`
        button.tsx
        input.tsx         # Phase 3
    registry/
      types.ts
      registry.ts
      components/
        index.ts          # barrel of side-effect registrations
        box.ts
        text.ts           # Phase 2
        button.ts         # Phase 3
        input.ts          # Phase 3
    adapters/
      types.ts
      AdapterContext.tsx
      AdapterManifestSchema.ts   # Phase 3 — Zod validates adapter shape at register-time
      shadcn/
        index.ts          # registerAdapter({ id: 'shadcn', components: { box, text, button, input } })
        components/
          Box.tsx
          Text.tsx
          Button.tsx      # Phase 3 — wraps @/components/ui/button
          Input.tsx       # Phase 3 — wraps @/components/ui/input
      mui/                # Phase 3 — second adapter
        index.ts          # registerAdapter({ id: 'mui', Wrapper, components: { box, text, button, input } })
        theme.ts          # createTheme({ cssVariables: true, palette: placeholder colors })
        Wrapper.tsx       # <ThemeProvider><div className="mui-bridge">{children}</div></ThemeProvider>
        components/
          Box.tsx         # wraps MUI <Box>
          Text.tsx        # wraps MUI <Typography>
          Button.tsx      # wraps MUI <Button variant="contained">
          Input.tsx       # wraps MUI <TextField>
    themes/               # Phase 2 — theme registry + provider
      types.ts
      registry.ts
      index.ts            # side-effect barrel
      default.ts
      rose.ts
      ThemeProvider.tsx
    state/                # editor-side state outside Craft
      editorStore.ts      # { activeThemeId, activeAdapterId } + setters
    style/                # single funnel for class-string editing
      tw-classes.ts       # typography slice (Phase 4 expands)
    craft/
      CanonicalNode.tsx   # Phase 3 — invokes adapter.classMap, renders missing-impl placeholder on gaps
      resolver.tsx
    editor/
      Editor.tsx
      Toolbox.tsx
      Inspector.tsx
      SaveLoadBar.tsx
      ThemeSwitcher.tsx
      AdapterSwitcher.tsx # Phase 3
      Hydrator.tsx        # Phase 3 — module-level hydrated flag (defense-in-depth; see § Wrappers compose, not switch)
      inspector/
        TypographyPanel.tsx
    persistence/
      schema.ts           # Zod envelope around Craft's serialized JSON
      storage.ts          # localStorage I/O
```

---

## Data Flow Walkthroughs

### Boot

```
main.tsx
  └── App.tsx
        ├── import './registry/components'   ← Box, Text, Button, Input register themselves
        ├── import './adapters/shadcn'       ← shadcn adapter (all four canonicals) registers itself
        ├── import './adapters/mui'          ← MUI adapter (all four canonicals + Wrapper) registers itself
        ├── import './themes'                ← default, rose themes register themselves
        └── <Editor />
              └── <AdapterProvider>           ← subscribes to editorStore.activeAdapterId (default 'shadcn')
                    └── [adapter.Wrapper if any]
                          └── <Craft resolver={getResolver()}>
                                ├── <Hydrator/>               ← deserializes localStorage on mount, restores themeId + adapterId
                                └── <ThemeProvider>           ← reads activeThemeId from editorStore, sets data-theme
                                      └── <Frame>
                                            └── <Element is={Bound['Box']} canvas defaults… />
```

Side-effect imports MUST run before `<Editor />` renders — otherwise the registry is empty when `getResolver()` walks it. `App.tsx` is the only place that boot-orders these.

### Drag-create (dropping a new Box from the Toolbox)

1. `Toolbox.tsx` builds a `<button ref={el => connectors.create(el, <Element is={Bound} canvas={def.isCanvas} nodeProps={...} style={...} />)}>` for each canonical.
2. User mouse-down on the button → Craft starts a drag.
3. User drops on the canvas → Craft creates a new node from the `<Element>`'s shape, assigns it an id, and inserts it as a child of the drop target.
4. Craft renders that node by looking up its `displayName` (`'Box'`) in the resolver. The match is the `Bound` thunk built by `buildResolver()`.
5. `Bound` calls `<CanonicalNode canonicalId="box" {...passedProps} />`.
6. `CanonicalNode` reads:
   - The canonical def via `getComponent('box')` → tells us this is a canvas, what slots it has, what schema it follows.
   - The active adapter via `useActiveAdapter()` → gives us the React component to delegate to (`ShadcnBox`).
7. `CanonicalNode` calls `useNode()` to get Craft's `connect`/`drag` connectors, packages them into a `rootRef` callback.
8. `CanonicalNode` invokes `adapter.classMap(style.classes.root, canonicalId)` if defined; falls back to `{ className: style.classes.root }`. The result feeds `className` / `sx` / `inlineStyle` props on the impl.
9. `<ShadcnBox rootRef={...} style={style} className={...}>{children}</ShadcnBox>` renders.
10. `ShadcnBox` attaches `rootRef` to its `<div>`. Craft now sees that div as the node's DOM and routes future events (clicks → selection; mouse-over → hover; drops → child insertion) through it.

If the adapter has no impl for the canonical (Phase 3 MUI had this for Box/Text temporarily), `CanonicalNode` renders a labeled placeholder badge instead of throwing — the user can swap adapters or remove the node without crashing.

### Selection

1. User clicks a rendered Box's div.
2. The div has Craft's data attributes (from `connect` via `rootRef`). Craft's global event listener traverses up from the click target, finds those attrs, identifies the node.
3. `actions.selectNode(id)` runs. `state.events.selected` updates.
4. `Inspector.tsx`'s `useEditor((state, query) => …)` selector re-fires. It reads the first id from `state.events.selected`, calls `query.node(id).get()` for the displayName, and `query.node(id).isRoot()` for the delete-guard.
5. Inspector re-renders.

### Save

1. User clicks Save in `SaveLoadBar`.
2. `useEditorStore.getState()` reads `activeThemeId` + `activeAdapterId` (imperative — Save isn't subscribed).
3. `query.serialize()` returns Craft's tree as an opaque JSON string.
4. We wrap it: `{ version: 1, adapterId, themeId, craftJson }`.
5. `documentSchema.parse(...)` validates the envelope.
6. `localStorage.setItem('craftjs-design:doc:v1', JSON.stringify(...))`.

### Load

Either via the Load button (manual) or `Hydrator` (auto, on mount):

1. `localStorage.getItem('craftjs-design:doc:v1')` → raw string.
2. `JSON.parse` + `documentSchema.parse` → validated envelope.
3. `actions.deserialize(doc.craftJson)` → Craft replaces the entire tree.
4. `setActiveTheme(doc.themeId)` if present + `setActiveAdapter(doc.adapterId)` (required field, no conditional). Store updates trigger `ThemeProvider` and `AdapterProvider` to re-render.

`Hydrator` wraps the above in try/catch — corrupted localStorage logs and the editor boots with the default seed instead of crashing. Phase 1 documents (no `themeId` field) load fine because the schema marks it `.optional()`.

The Hydrator uses a **module-level** `hydrated` flag instead of `useRef`. With the current `AdapterProvider` design (all Wrappers always rendered) it shouldn't remount on adapter swap — but the flag is defense-in-depth against any future structural change that might reintroduce remounts. See § Wrappers compose, not switch.

### Theme swap

1. User picks "Rose" in `ThemeSwitcher`'s `<select>`.
2. `onChange` → `useEditorStore.getState().setActiveTheme('rose')`.
3. Every component subscribed via `useEditorStore((s) => s.activeThemeId)` re-renders. In practice: just `ThemeProvider` and `ThemeSwitcher` itself.
4. `ThemeProvider` looks up `getTheme('rose')`, gets `dataThemeValue: 'rose'`, renders `<div data-theme="rose" style="display:contents">`.
5. The browser's CSS selector `[data-theme="rose"]` matches the wrapper. The cascading custom properties (`--primary`, etc.) inherit through the descendant tree.
6. Every utility like `text-primary` / `bg-primary` resolves to `var(--primary)` and repaints with the rose value. **No Craft tree state changed.**

### Typography edit

1. User selects a Text node. `Inspector` mounts `<TypographyPanel nodeId={id} />`.
2. `TypographyPanel` reads `style.classes.root` from the node via `useEditor((_, query) => …)`.
3. `parseTypography` decomposes the string into `{ slice, unknownClasses }`.
4. Each `<Select>` is bound to a slice field (`slice.fontSize ?? ''`, etc.).
5. User picks "2xl" in the Size select. `update({ fontSize: '2xl' })` runs.
6. `update` calls `actions.setProp(nodeId, (props) => …)`. Inside the Immer mutator, `mergeTypography(props.style.classes.root, { fontSize: '2xl' })` runs **on the live draft value, not the render-time closure** — protects against rapid-edit races.
7. The new class string lands on `props.style.classes.root`. Craft re-renders the node. The next `useEditor` selector run picks up the new value; the panel re-renders with `Size` showing `2xl`.

### Adapter swap

1. User picks "MUI" in `AdapterSwitcher`'s `<select>`.
2. `onChange` → `useEditorStore.getState().setActiveAdapter('mui')`.
3. `AdapterProvider` (subscribed via `useEditorStore((s) => s.activeAdapterId)`) re-renders. `getAdapter('mui')` returns the MUI adapter.
4. The `useEffect([adapter])` cleanup fires `shadcn.unmount?.()` (no-op — shadcn has none), then the new effect fires `mui.mount?.()` (also no-op — MUI uses `Wrapper` instead).
5. The provider's output is structurally **unchanged** — every adapter's Wrapper is always rendered (see § Wrappers compose, not switch). Only the React context value changes; no remount happens.
6. `MuiWrapper` was already mounted (it's always rendered). The CSS context now matters because MUI components are about to be rendered as the active impls.
7. Every `CanonicalNode` inside re-renders with the new active adapter. Each looks up its impl in `adapter.components`. Nodes with an impl render; nodes without get the missing-impl placeholder.
8. MUI Button repaints as Material-style contained button. **Craft tree state survives** because nothing in the React tree shape changed.

---

## Key Design Decisions

These are the ones we actually pushed back on during Phase 1. The reasoning matters for anyone touching this code later.

### One Craft component per canonical id, not one generic

`buildResolver()` produces a distinct `Bound` thunk for every canonical id, each carrying its own `Bound.craft.displayName = def.displayName`. We could have registered a single generic `<CanonicalNode>` and stuffed `canonicalId` into props.

We didn't because Craft's resolver maps the *string* `displayName` → component, and the persisted JSON references nodes by that string. One-per-canonical means:

- Serialized JSON reads `"Box"`, `"Button"`, etc. — human-readable, stable across adapter swaps.
- Renaming a canonical id is an explicit migration, not a silent corruption.
- Craft's devtools show real names.

The cost is trivial: each `Bound` is a 3-line thunk.

### Adapter context as the swap point

The active adapter is exposed via React context (`AdapterProvider` + `useActiveAdapter`), not imported as a singleton. `CanonicalNode` looks up the impl at *render time*, not at module-load time.

This is the only reason adapter-swapping (Phase 3) doesn't require document migration: change one `adapterId` prop on `AdapterProvider`, every `CanonicalNode` re-resolves on its next render, and Craft's tree state is untouched.

### <a id="design-rootref"></a>`rootRef` on the adapter contract, not a `display:contents` wrapper

The first draft of `CanonicalNode` wrapped the adapter's output in `<div ref={connectDrag} style={{display:'contents'}}>`. That broke nested drop-targeting:

- `display: contents` makes a DOM node exist but with zero bounding box.
- Browser hit-testing on a nested Box returned the inner adapter's `<div>` (no Craft data attrs).
- Craft's lookup climbed the DOM tree and found the *root* wrapper before any nested wrapper, because the inner wrapper had no box for the cursor to ever actually be "inside."
- All drops routed to the root, regardless of where the user dropped.

The fix is the `rootRef` field on `AdapterRenderProps`. The editor passes a ref callback into the adapter; the adapter attaches it to its outermost real DOM element. Craft now sees the *visible* element as the node's DOM. Nested targeting works because each nested Box has its own connected `<div>` with a real bounding box.

The cost is a one-line change to every adapter impl (`<div ref={rootRef} ...>`). Worth it.

### Pattern A (component is the canvas), not Pattern B (named slots)

Craft.js offers two patterns for containers:

**A.** The component itself is the canvas. `<Element is={Component} canvas>` at creation marks the *node* as a canvas; the component just renders `{children}`. One drop zone per node.

**B.** The component has named sub-canvas slots inside it: `<div className="card"><Element id="header" canvas>...</Element><Element id="body" canvas>...</Element></div>`. Multiple drop zones per node.

Phase 1 uses Pattern A because Box has one slot. An earlier draft tried to *combine* both ("the component is a canvas AND has a nested canvas slot") and discovered the hard way that competing drop targets break hit-testing.

Pattern B is needed for genuine composites — Card with separate header/body/footer regions, Table with rows + columns — and lands in Phase 5+ when we add those canonicals. The architecture is ready for it: each `<Element id="...">` is a named slot the inspector can later target.

### Zod-validated envelope around opaque Craft JSON

`documentSchema` only validates the *envelope*: `{ version, adapterId, craftJson: string }`. It does **not** schema-check Craft's internal tree shape.

Craft owns its serialization format. Re-typing it on our side would either drift over time (if we hand-roll the schema) or duplicate types Craft already publishes (if we import them). Neither is worth it. The envelope gives us:

- A version literal we can switch on later if we change the envelope itself.
- An adapter pin (so Phase 3 knows which adapter to mount on load).
- Validation that "this is at least the right *kind* of thing" before we hand it to Craft.

The Phase 1 plan flagged the option to validate the Craft tree on save in a worker. Don't, until we have actual evidence saves are slow.

### Themes as `[data-theme]` CSS blocks, not JSON tokens

`PHASE2_PLAN.md` weighed two approaches: themes as static CSS blocks (`[data-theme="rose"] { --primary: …; }`) vs. themes as JSON token objects converted to CSS at runtime. Phase 2 picked CSS blocks.

Reasons:
- Theme-swap performance is zero — it's just one DOM attribute change; the browser does the rest natively.
- shadcn's themes ship as CSS blocks already. Pasting one is a 30-second job; building a runtime token compiler would be a day.
- Phase 6's plugin SDK can add JSON-driven user themes on top by injecting a `<style>` tag at runtime. The architecture isn't blocked.

### `tw-classes.ts` is the only place that touches class strings

The Typography panel doesn't edit `style.classes.root` by string concat. It parses to a typed slice, mutates the slice, and serializes back through `mergeTypography`. The merge preserves classes the parser didn't recognize (e.g., `bg-card` on a Text node) by passing them through as opaque.

This convention is the architecture's defense against a foot-gun. If any panel were to do `classes.root = "text-bold " + classes.root`, unrecognized classes get dropped the next time the parser re-serializes. The discipline is enforced by convention today — Phase 4 may add an ESLint rule banning direct writes to `classes.root`.

### Tailwind v4 needs a safelist for dynamic classes

Tailwind v4's JIT scans source for literal class strings. The Typography panel emits classes via template literals (`` `text-${size}` ``), which the scanner can't see. Without intervention, the classes land in the DOM but no CSS is generated — they fail silently.

Phase 2 ships an explicit `@source inline()` block in `index.css` listing every typography utility the panel can emit. Two notes:

- **Theme-token utilities (`text-primary`, `bg-card`, …) are auto-generated** by `@theme inline` — they don't need to be safelisted, but Phase 2 lists them anyway as a hedge against theme block restructuring.
- **Phase 4 will replace the hand-written safelist** with a generation step that reads the slice arrays from `tw-classes.ts`. With ~7 panels × dozens of utilities each, drift becomes the dominant risk; the generation step is worth its build complexity at that scale. Today (~24 typography utilities), it isn't.

### ThemeProvider's `display:contents` wrapper — different problem than Phase 1 risk #2

Phase 1's `CanonicalNode` originally used a `display:contents` wrapper to attach Craft connectors. That broke nested drop-targeting because the wrapper had no bounding box for the browser's hit-test. Phase 2's `ThemeProvider` also uses `display:contents` — but for an entirely different reason and without that failure mode:

- `ThemeProvider` has *no Craft connectors attached*. No hit-testing is involved.
- Its only job is to put `data-theme` into the DOM hierarchy.
- CSS custom-property inheritance follows the DOM tree (not the rendering tree), so an invisible wrapper still scopes the variable cascade correctly.

The payoff: the wrapper doesn't break the parent's flex layout (`<main>` remains a direct flex item of its container). Layout stays unchanged; theming becomes additive.

### MUI palette bridge — CSS-variable indirection, not adapter coordination

MUI's `cssVariables: true` mode rejects `var(--...)` strings at `createTheme()` time — the palette validator expects real color values. So we can't directly point MUI's palette at our shadcn tokens through JS.

Solution: two-layer bridging.

1. **`mui/theme.ts`**: pass valid placeholder hex colors to `createTheme`. MUI's validator is happy. These become *fallback* values if step 2 fails.
2. **`.mui-bridge` CSS block in `index.css`**: override MUI's *generated* `--mui-palette-*` variables to reference our shadcn tokens. The `<div className="mui-bridge">` in `MuiWrapper` applies these.

The cascade chain at render time:
```
<MUI Button>'s computed CSS:
  background-color: var(--mui-palette-primary-main)
    → --mui-palette-primary-main: var(--primary)        [defined on .mui-bridge]
      → --primary: oklch(0.645 0.246 16.439)            [defined on [data-theme="rose"]]
```

CSS variable resolution is **lazy** — each reference is resolved at the consuming element. So when `[data-theme="rose"]` flips `--primary`, MUI components below it repaint *without* re-creating the MUI theme. No JS coordination, no listener, no theme-recompute. The cascade does it.

Failure mode worth knowing: if MUI's actual CSS variable names ever change (camelCase vs kebab, structural changes between major versions), the bridge silently breaks. Confirm by inspecting the rendered Button's computed styles and verifying `--mui-palette-primary-main` resolves through to our `--primary`. Phase 6 worth adding a sanity test for this.

### shadcn primitives need a ref-forwarding workaround on React 18

shadcn's CLI generates `button.tsx` / `input.tsx` as plain function components:

```tsx
function Button({ className, variant, ... }) { return <button {...props} /> }
```

This targets **React 19's ref-as-prop** semantics. On React 18 (Phase 1 locked us here for Craft.js compatibility), passing `ref={…}` to a plain function component silently drops the ref with a console warning.

That breaks Craft's connect/drag for Button/Input — they need a real DOM ref to attach selection and drag handlers.

**Workaround:** in `shadcn/components/{Button,Input}.tsx`, wrap the shadcn primitive in `<span ref={rootRef} style={{display:'contents'}}>`. The span captures the ref; `display: contents` keeps it layout-transparent. Because Button/Input are **non-canvas leaves** (they don't accept drops), Phase 1 risk #2's nested-hit-testing failure doesn't apply here — that risk was specifically about *canvas* nodes nested inside other canvas nodes.

**Future cleanup:** when we upgrade to React 19 (likely Phase 6 hardening), these spans can drop.

### Missing-impl placeholder, not a thrown error

When an adapter doesn't have an impl for a canonical, `CanonicalNode` could throw. It deliberately doesn't — it renders a small destructive-colored badge: *"Button — no impl in adapter 'mui'"*. The user can:
- Swap to an adapter that covers this canonical, OR
- Delete the offending node, OR
- (For a developer) add the missing impl.

This was the load-bearing decision that made the adapter swap viable mid-development — Phase 3 originally shipped MUI with only Button + Input impls, and Box/Text rendered as placeholders until the coverage gap closed. Without the placeholder, every adapter would need to ship every canonical from day one, which is a brittle coupling.

### Wrappers compose, not switch — eliminates the adapter-swap remount

The naïve `AdapterProvider` would conditionally render the *active* adapter's Wrapper:

```tsx
return (
  <AdapterCtx.Provider value={adapter}>
    {Wrapper ? <Wrapper>{children}</Wrapper> : children}
  </AdapterCtx.Provider>
)
```

That one line produced two failure modes — both caught during Phase 3 by swapping adapters with content on the canvas:

1. **Hydrator re-fired on every swap.** The conditional changes the React element type at the child position (`Fragment`-like vs. `<MuiWrapper>`). React's reconciler treats different element types as full unmount/remount. Hydrator's effect runs again, re-reads localStorage, calls `setActiveAdapter(doc.adapterId)` — instantly reverting the user's pick to the persisted value.
2. **Frame re-seeded the canvas to empty.** The same unmount also remounts Craft's `<Frame>`. Frame seeds its initial children on mount from JSX props. Craft state gets *replaced* with the seed; user's dropped nodes vanish.

**The fix: render every registered adapter's Wrapper, always.** Inactive adapters' Wrappers (MUI's `ThemeProvider` while shadcn is active) just provide React context that no rendered component reads. The composition runs in registration order — stable across renders since adapters register at module load and never change at runtime:

```tsx
function composeAllWrappers(all, children) {
  let wrapped = children
  for (const a of all) if (a.Wrapper) wrapped = <a.Wrapper key={a.id}>{wrapped}</a.Wrapper>
  return wrapped
}
```

React's reconciler now sees the same tree shape across every adapter swap. Nothing remounts. Frame stays mounted; Craft state persists; Hydrator doesn't re-fire; user content survives.

**Implicit contract this puts on adapter authors:** Wrappers must be **pure context providers**. They can return a React provider, a styled container div, anything whose effect is scoped to its own subtree. They must NOT:
- attach `document`-level event listeners,
- inject global CSS into `<head>`,
- mutate browser APIs,
- …or anything else that would apply unconditionally even when their adapter is inactive.

Adapters that genuinely need global side effects use `mount` / `unmount` — the imperative lifecycle hooks. Those still fire only on activeAdapter change. A future adapter that violates this contract would force a different strategy (e.g., a `globalSideEffects: true` flag on the manifest, accepting remount churn for those adapters).

**Hydrator's module-level flag is now defense-in-depth.** With Wrapper composition, Hydrator shouldn't remount on adapter swap. But the flag protects against any future structural change that might reintroduce remounts (a conditional theme provider, plugin SDK additions, etc.). Cost: one boolean at module scope; benefit: a regression that re-introduces remount churn doesn't silently revert the user's adapter pick.

**State that survives adapter swap** (everything, in the current design):
- Zustand store, Craft state, module-level variables — same as before.
- React component state via `useState` / `useRef` inside the canvas subtree — **now also survives**. Inspector panels can use `useState` for transient UI state without ceremony.
- DOM refs — survive.

**Phase 6 cleanup downgraded.** The original Phase 6 plan was to split `AdapterProvider` into a context-only provider plus a separate canvas-only Wrapper renderer — primarily to fix the reset zone. With Wrappers composing instead of switching, the reset zone is gone. The Phase 6 split remains worthwhile for a different reason (chrome currently sits inside *every* adapter's Wrapper, which is a tidier mental model to fix), but it's no longer fixing a correctness bug — it's just a clarity improvement.

---

## Extension Points

These are the contracts that won't churn (much) across future phases.

### Adding a canonical component

1. Create `src/registry/components/<id>.ts`:
   ```ts
   import { z } from 'zod'
   import { registerComponent } from '../registry'

   registerComponent({
     id: 'button',
     category: 'input',
     displayName: 'Button',
     tags: ['cta', 'action'],
     isCanvas: false,
     styleSlots: ['root', 'icon'],
     propsSchema: z.object({ variant: z.enum(['primary', 'secondary']), text: z.string() }),
     defaults: {
       props: { variant: 'primary', text: 'Click me' },
       style: { classes: { root: 'px-4 py-2 rounded' } },
     },
   })
   ```
2. Add one line to `src/registry/components/index.ts`:
   ```ts
   import './button'
   ```
3. Provide an adapter impl for it (next section).

The toolbox will pick it up automatically (`Toolbox.tsx` iterates `listComponents()`).

### Adding an adapter

1. Create `src/adapters/<name>/components/<Canonical>.tsx`. Match `AdapterRenderProps`:
   ```tsx
   import type { AdapterRenderProps } from '../../types'

   export function MyButton({ props, className, sx, rootRef }: AdapterRenderProps) {
     const { label, intent, disabled } = props as { label: string; intent: string; disabled: boolean }
     return (
       <button ref={rootRef as never} className={className} style={sx as never} disabled={disabled}>
         {label}
       </button>
     )
   }
   ```
   The impl picks which output prop matches its library — `className` (Tailwind), `sx` (MUI), or `inlineStyle` (raw CSS). All three are populated by `CanonicalNode` from `adapter.classMap` or the default passthrough.
2. (Optional) Add a `Wrapper`, `themeTokens`, `classMap`, or `mount`/`unmount` if the library needs them. The four-way fork is documented in `PHASE3_PLAN.md`'s "SDK Decision" section.
3. Create `src/adapters/<name>/index.ts`:
   ```ts
   import { registerAdapter } from '../AdapterContext'
   import { MyButton } from './components/Button'

   registerAdapter({
     id: 'mylib',
     displayName: 'My Library',
     components: { button: MyButton },
     // Optional: Wrapper, themeTokens, classMap, mount, unmount
   })
   ```
   `registerAdapter` validates the manifest via Zod (`AdapterManifestSchema.ts`) and throws on missing required fields.
4. Add a side-effect import to `App.tsx` (eventually a `adapters/index.ts` barrel as the list grows).

`AdapterSwitcher` picks the new adapter up automatically (iterates `listAdapters()`). If an adapter doesn't cover every canonical, `CanonicalNode` renders the missing-impl placeholder for gaps — no crash.

### Adding a theme

1. Append a CSS block to `src/index.css`, scoped to `[data-theme="<id>"]`. Only override tokens that differ from `:root` — the cascade handles the rest:
   ```css
   [data-theme="forest"] {
     --primary: oklch(0.55 0.18 145);
     --primary-foreground: oklch(0.98 0.02 145);
   }
   ```
2. Create `src/themes/<id>.ts`:
   ```ts
   import { registerTheme } from './registry'
   registerTheme({ id: 'forest', displayName: 'Forest', dataThemeValue: 'forest' })
   ```
3. Add one line to `src/themes/index.ts`:
   ```ts
   import './forest'
   ```

The `ThemeSwitcher` picks it up automatically (iterates `listThemes()`).

---

## Persistence Format

Stored at `localStorage['craftjs-design:doc:v1']`:

```jsonc
{
  "version": 1,
  "adapterId": "shadcn",
  "themeId": "rose",                                  // Phase 2 — optional
  "craftJson": "<JSON string from query.serialize()>"
}
```

- **`version`**: literal `1` today. Bump only when the *envelope* shape changes — not when `craftJson`'s internal shape changes (Craft owns that). Phase 2 added `themeId` as **optional**, so Phase 1 documents continue to parse without a version bump.
- **`adapterId`**: pinned at save time from `useEditorStore.getState().activeAdapterId`. Hydrator + Load button restore via `setActiveAdapter` after `deserialize`. **Required** — every doc was saved with one, since Phase 1 hardcoded `'shadcn'` and Phase 3 always pulls from the store.
- **`themeId`**: pinned at save time. Optional. Hydrator restores it via `setActiveTheme` after `deserialize`. Defaults to `'default'` when absent (Phase 1 docs).
- **`craftJson`**: an opaque string. Treat it as a blob; never parse and rewrite it yourself.

The `:v1` suffix on the storage key reserves namespace for a future v2 envelope to coexist during migration.

---

## What's Out of Scope (as of Phase 3)

| Feature | Phase |
|---|---|
| Other inspector panels (Layout, Spacing, Effects, Fill/Border/Radius) | Phase 4 |
| Per-canonical panel filtering — Typography panel currently shows for every node, but its controls don't visibly apply to Button/Input (shadcn primitives use flex centering + fixed `h-*` heights that ignore Tailwind text utilities) | Phase 4 |
| Component-native canonical controls (e.g., a Size panel that maps to shadcn's `size` variant / MUI's `size` prop, not Tailwind utilities) | Phase 4 |
| Generic class parser beyond typography | Phase 4 |
| Arbitrary-value escape hatch (`text-[#hex]`, `p-[7px]`) | Phase 4 |
| Generated Tailwind safelist (replacing the hand-written `@source inline` block) | Phase 4 |
| `classMap` runtime implementation (the SDK contract field exists today; CanonicalNode invokes it; no adapter ships one yet — MUI's CSS-variable bridge made it unnecessary for Phase 3) | Phase 5 |
| `themeTokens` runtime injection (SDK field exists; no adapter ships one — MUI reads our shadcn vars directly via cssVariables mode) | Phase 5 |
| More canonical components (~20 target) | Phase 5 |
| Composites with multiple named slots (Pattern B) | Phase 5+ |
| Responsive breakpoints | Phase 4 |
| Undo/redo UI (the kernel has it; no buttons yet) | Phase 4 |
| Theme editor UI (authoring themes inside the app) | Phase 6+ |
| `AdapterProvider` split (chrome currently sits inside every adapter's `Wrapper` — tidier to move Wrapper composition deeper so it only wraps the canvas. No longer fixes a correctness bug after Phase 3's "compose all Wrappers" change; just a mental-model cleanup) | Phase 6 |
| React 19 upgrade (drops the shadcn ref-forwarding `display:contents` span workaround) | Phase 6 |
| Per-document themes / user-uploaded fonts | not on the roadmap |
| Server persistence, autosave, dirty-state | not on the roadmap |
| Tests | Phase 4, alongside the expanded class parser |

The `responsive` field on `NodeStyle` (`registry/types.ts`) is still intentionally defined-but-unread — Phase 4's responsive bar will turn it on without a document migration.
