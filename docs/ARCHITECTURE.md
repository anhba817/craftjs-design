# Architecture

This document describes the **architecture as it stands**. For the historical/phased roadmap and per-phase implementation plans, see [`./plans/`](./plans/). For task-oriented recipes (adding a canonical, adding an adapter, conventions, gotchas), see [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md).

---

## Overview

craftjs-design is a drag-and-drop website builder. Its central design idea is to **separate three concerns that most builders mix up**:

1. **What the user is composing** — an abstract tree of "components" (Button, Input, Box, Card…).
2. **Which UI library renders those components** — shadcn, MUI, Chakra, or a custom kit.
3. **How the tree is edited** — selection, drag/drop, undo/redo (handled by [Craft.js](https://craft.js.org/)).

Most builders couple #1 and #2: the user picks a "Button" from a palette, but that Button is hard-wired to whichever library was chosen at project setup. Swapping libraries means rebuilding documents.

This architecture decouples them via a **Canonical Component Registry** (the abstract palette) sitting above an **Adapter SDK** (the per-library renderers). Documents reference canonical ids only. **Swapping adapter ≠ migrating documents.**

---

## Four-Layer Model

```
┌──────────────────────────────────────────────────────────┐
│  Editor UI            (Toolbox, Inspector, Canvas chrome)│
├──────────────────────────────────────────────────────────┤
│  Canonical Component Registry  (abstract Button, Input…) │
├──────────────────────────────────────────────────────────┤
│  Adapter Layer        (shadcn / MUI / Chakra → canonical)│
├──────────────────────────────────────────────────────────┤
│  Craft.js kernel + Document JSON                         │
└──────────────────────────────────────────────────────────┘
```

Each layer talks only to its immediate neighbor. The discipline is enforced by the type contracts in `src/registry/types.ts` and `src/adapters/types.ts` — those are the *only* legal vocabulary between layers.

### Layer 1 — Editor UI (`src/editor/`)

The user-facing chrome. Has no opinion about *what* components exist, only about *how to edit them*: panels, toolbars, the canvas frame.

| File | Role |
|---|---|
| `Editor.tsx` | Top-level shell. Builds the resolver, mounts Craft.js, wraps the canvas in `<ThemeProvider>`, lays out the 3-column UI. |
| `Toolbox.tsx` | Left panel. Reads `listComponents()` from the registry; attaches Craft `connectors.create()` per entry so each is a drag source. |
| `Inspector.tsx` | Right panel. Reads the selected node from Craft state, shows type/id, exposes Delete (root-guarded), mounts the `ResponsiveBar` + per-canonical inspector sub-panels. Panel visibility filtered by `getApplicablePanels(canonicalDef)`. |
| `inspector/ResponsiveBar.tsx` | Six breakpoint pills (`base` / `sm` / `md` / `lg` / `xl` / `2xl`). Active pill = which class slice the panels read/write. Loud "writing to: …" status line warns when an edit will only apply at and above a breakpoint. |
| `inspector/TypographyPanel.tsx` | Size / Weight / Align / Color. Backed by `parseTypography` + `mergeTypography`. |
| `inspector/LayoutPanel.tsx` | Display / FlexDir / Items / Justify / Gap. |
| `inspector/SpacingPanel.tsx` | Padding + Margin via two `BoxSidesEditor` instances (linked-corners / per-side). |
| `inspector/SizePanel.tsx` | Width / Height / Min-* / Max-*. |
| `inspector/AppearancePanel.tsx` | Fill / Border (width + style + color) / Radius. Exposes `'default'` sentinel for the bare `border` and `rounded` utilities. |
| `inspector/EffectsPanel.tsx` | Shadow / Opacity / Blur. |
| `inspector/PropsPanel.tsx` | Auto-form derived from each canonical's Zod `propsSchema`. Dispatches by Zod kind (`ZodEnum`, `ZodString`, `ZodBoolean`, `ZodNumber`); unsupported kinds render a labeled badge. |
| `inspector/shared/useNodeClasses.ts` | Read/write the active-breakpoint's class slice for a slot. Funnels all inspector class-string I/O through one place. |
| `inspector/shared/{ColorSelect,ValueSelect,BoxSidesEditor,PanelRow}.tsx` | Reused controls. |
| `SaveLoadBar.tsx` | Top bar. Title, adapter switcher, theme switcher, Save/Load buttons. |
| `ThemeSwitcher.tsx` | Dropdown that flips `activeThemeId` in the editor store. |
| `AdapterSwitcher.tsx` | Dropdown that flips `activeAdapterId` in the editor store. |
| `Hydrator.tsx` | Renders `null`. On mount, restores tree + theme + adapter from `localStorage`. Module-level `hydrated` flag prevents re-restore on any future remount. |

### Layer 2 — Canonical Component Registry (`src/registry/`)

The abstract palette. A `CanonicalComponent` is a *contract*, not a React component:

```ts
{
  id: 'box',                       // stable string id — used in serialization
  category: 'layout',
  displayName: 'Box',
  tags: ['container', 'div'],
  isCanvas: true,                  // can hold children?
  styleSlots: ['root'],            // named class buckets
  propsSchema: zod schema,         // typed props
  defaults: { props, style },      // initial values for new nodes
}
```

Registration is **side-effect based**: each component file imports `registerComponent` and calls it at module load.

A canonical may declare an explicit `applicablePanels: readonly PanelId[]` to opt into a specific subset of inspector panels. When omitted, `getApplicablePanels(c)` derives a sensible default from `category` + `isCanvas`.

| File | Role |
|---|---|
| `types.ts` | `CanonicalComponent`, `NodeStyle`, `CanonicalCategory`, `CanonicalId`, `PanelId`. |
| `registry.ts` | `registerComponent`, `getComponent`, `getComponentByDisplayName`, `listComponents`, `getApplicablePanels`. In-memory map. |
| `components/index.ts` | Barrel of side-effect imports. Adding a new canonical = one line here. |
| `components/box.ts` | Generic container. Default style uses shadcn tokens (`border-border`, `bg-card`). |
| `components/text.ts` | Text-bearing leaf. `propsSchema = { content: string }`. |
| `components/button.ts` | `propsSchema = { label, intent, disabled }`. `isCanvas: false`. Adapter-owned visual styling. Explicitly omits the typography panel (shadcn's flex-centered button doesn't respect text utilities). |
| `components/input.ts` | `propsSchema = { type, placeholder, value, disabled }`. Adapter-owned styling. |

### Layer 3 — Adapter Layer (`src/adapters/`)

A module that says "given a canonical id and its props/style, render this React component." Different adapters render the same canonical id with different libraries.

`Adapter` is the SDK contract — three required fields plus five optional capability hooks:

```ts
interface Adapter {
  id: string
  displayName: string
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>

  Wrapper?: ComponentType<{ children: ReactNode }>   // global React provider
  themeTokens?: Record<string, string>               // CSS variable declarations
  classMap?: ClassMapFn                              // canonical Tailwind → render props
  mount?: () => void                                 // imperative side effects
  unmount?: () => void                               // imperative cleanup
}
```

Adapters are registered by side-effect import. `registerAdapter` validates the manifest via Zod (`AdapterManifestSchema.ts`) before adding it to the registry — broken manifests throw at boot.

| File | Role |
|---|---|
| `types.ts` | `Adapter`, `AdapterRenderProps`, `ClassMapFn`, `ClassMapResult`. |
| `AdapterContext.tsx` | Module-level registry + React context + `useActiveAdapter()` hook + `<AdapterProvider>`. |
| `AdapterManifestSchema.ts` | Zod schema validating adapter shape at register-time. |
| `shadcn/` | Reference adapter. Wraps shadcn primitives from `src/components/ui/`. |
| `mui/` | Second adapter. Wraps Material UI components. Ships a `Wrapper` for MUI's `ThemeProvider`. |

**`AdapterRenderProps`** is the only shape an adapter impl ever sees:

```ts
{
  canonicalId: string
  props: Record<string, unknown>            // user-set props
  style: NodeStyle                          // { classes: { root: '...' }, responsive? }
  children?: ReactNode                      // Craft-managed children if canvas
  rootRef?: (el: HTMLElement | null) => void

  // Populated by CanonicalNode from adapter.classMap (or default passthrough).
  // Each impl picks the field that matches its library:
  className?: string                        // Tailwind-style adapters
  sx?: Record<string, unknown>              // MUI's sx prop
  inlineStyle?: CSSProperties               // raw inline CSS
}
```

`rootRef` is how the editor wires Craft's `connect` / `drag` to the *actual rendered DOM*. Without it, nested drop-target hit-testing breaks (see [§ rootRef on the adapter contract](#rootref-on-the-adapter-contract)).

**Adapter impls must consume `className` / `sx` / `inlineStyle` — never read `style.classes.root` directly.** `CanonicalNode` composes the base + responsive breakpoint slices into the final class string before passing it to the impl. An impl that reads `style.classes.root` instead silently drops the breakpoint prefixes (see [§ Adapter impls consume rendered className](#adapter-impls-consume-rendered-classname)).

### Layer 4 — Craft.js bridge (`src/craft/`)

Craft.js manages the document tree, selection set, drag/drop, and history. The bridge plugs our two-layer abstraction (registry + adapter) into Craft's "resolver" model.

| File | Role |
|---|---|
| `CanonicalNode.tsx` | Generic React component. Given `canonicalId` + `nodeProps` + `style`, looks up the canonical def from the registry, the impl from the active adapter, invokes `adapter.classMap` (or defaults to className passthrough), and renders. Attaches Craft's `connect/drag` via `rootRef`. Renders a labeled placeholder if the active adapter has no impl for the canonical. |
| `resolver.tsx` | `buildResolver()` walks `listComponents()` and produces one Craft user-component per canonical id, each delegating to `CanonicalNode`. `getResolver()` is the cached singleton accessor. |

---

## Supporting Modules

Cross-cutting infrastructure that doesn't fit the four-layer model but supports it.

### Theme Layer (`src/themes/`)

Themes are CSS-variable token packs scoped via `[data-theme]` selectors. Registered the same way canonicals and adapters are.

| File | Role |
|---|---|
| `types.ts` | `Theme` interface — `{ id, displayName, dataThemeValue }`. |
| `registry.ts` | `registerTheme` / `getTheme` / `listThemes`. |
| `index.ts` | Side-effect barrel. |
| `default.ts`, `rose.ts` | Theme registrations. Empty `dataThemeValue` ⇒ no attribute (use `:root` defaults). |
| `ThemeProvider.tsx` | Reads `activeThemeId` from `editorStore`, renders `<div data-theme={…} style="display:contents">{children}</div>`. |

Token values live in `src/index.css`:
- `:root { … }` — default token values.
- `[data-theme="<id>"] { … }` — overrides for non-default themes. Only override tokens that *differ* from default; the cascade handles the rest.
- `.mui-bridge { … }` — bridges MUI's generated `--mui-palette-*` variables to the same tokens (see [§ MUI palette bridge](#mui-palette-bridge)).

### Editor State (`src/state/`)

Editor-side state that lives **outside** the Craft tree.

| File | Role |
|---|---|
| `editorStore.ts` | Zustand store — `{ activeThemeId, activeAdapterId, activeBreakpoint }` + setters. `activeBreakpoint` is UI-only (not persisted; resets to `'base'` on reload). |

Read patterns:
- **Components** that render based on the value → `useEditorStore((s) => s.activeThemeId)` (subscribes; re-renders on change).
- **Click handlers / effects** that just need the latest value → `useEditorStore.getState().activeThemeId` (no subscription, no re-render).

### Style Layer (`src/style/`)

Single funnel for all class-string editing. **Anything that writes to `style.classes.root` must go through a merge function in this file.** Direct string concat in components risks dropping classes the parser doesn't recognize.

| File | Role |
|---|---|
| `tw-classes.ts` | Typed unions + parser/serializer/merge for six slices: typography, layout, spacing, size, appearance (fill + border + radius), effects. |
| `responsive.ts` | `composeResponsive(style, slot)` — merges `style.classes[slot]` (base) with each `style.responsive[bp][slot]`, prefixing breakpoint slices with `bp:`. Called by `CanonicalNode` before invoking `adapter.classMap`. |
| `safelist.generated.css` | Generated output of `scripts/gen-safelist.ts`. Listed in `.gitignore`; regenerated on every `npm run dev` / `npm run build`. |

Per-slice API contract (parametrized over slice type):
- `parse<Slice>(classString)` → `{ slice, unknownClasses }`. Recognized utilities populate the slice; unrecognized strings pass through as `unknownClasses`.
- `merge<Slice>(original, partialSlice)` → new class string. Patch-friendly: caller passes only fields they want to change. Unknown classes (including classes from *other* slices) always pass through.

Slices are independent — `parseTypography` doesn't recognize `bg-card`, `parseSpacing` doesn't recognize `flex`. Each merge function passes classes from other slices through as `unknownClasses`. The inspector panels each operate on one slice; round-trips through multiple panels preserve every class.

The **safelist** is the bridge between this single-funnel parser and Tailwind v4's JIT scanner. The inspector emits class strings via template literals (`text-${size}`, `bg-${color}`, …) that Tailwind can't see in source. `scripts/gen-safelist.ts` reads the slice arrays from `tw-classes.ts` (single source of truth) and emits `@source inline()` directives for every utility × every breakpoint prefix (~250 directives covering thousands of utility-prefix pairs). The result lands in `safelist.generated.css`, imported by `index.css`. Wired via `predev` / `prebuild` npm scripts.

### shadcn-managed code (`src/lib/`, `src/components/ui/`)

Files that the `shadcn` CLI creates and that subsequent `npx shadcn add <name>` commands extend. Not hand-authored.

| Path | Role |
|---|---|
| `src/lib/utils.ts` | The `tailwind-merge`-backed `cn`. Every adapter impl imports from here. |
| `src/components/ui/` | shadcn primitives. Adapter impls compose these inside `AdapterRenderProps`-shaped wrappers. |

---

## Directory Map

```
craftjs-design/
  components.json
  scripts/
    gen-safelist.ts             # reads tw-classes.ts slice arrays → emits safelist.generated.css
  src/
    main.tsx                    # ReactDOM root
    App.tsx                     # Boot: side-effect imports for registry/adapters/themes, renders <Editor>
    index.css                   # Tailwind v4 entry + @import safelist.generated.css + @theme inline bridge + token blocks + .mui-bridge
    lib/
      utils.ts                  # shadcn's tailwind-merge-backed cn
    components/
      ui/                       # shadcn primitives, managed by `npx shadcn add`
    registry/
      types.ts
      registry.ts
      components/
        index.ts                # barrel of side-effect registrations
        box.ts, text.ts, button.ts, input.ts
    adapters/
      types.ts
      AdapterContext.tsx
      AdapterManifestSchema.ts
      shadcn/
        index.ts                # registerAdapter
        components/
          Box.tsx, Text.tsx, Button.tsx, Input.tsx
      mui/
        index.ts
        theme.ts
        Wrapper.tsx
        components/
          Box.tsx, Text.tsx, Button.tsx, Input.tsx
    themes/
      types.ts
      registry.ts
      index.ts                  # side-effect barrel
      default.ts, rose.ts
      ThemeProvider.tsx
    state/
      editorStore.ts            # { activeThemeId, activeAdapterId, activeBreakpoint } + setters
    style/
      tw-classes.ts             # six slices: typography, layout, spacing, size, appearance, effects
      tw-classes.test.ts        # vitest — all slices + cross-slice isolation
      responsive.ts             # composeResponsive(style, slot) → Tailwind-prefixed className
      safelist.generated.css    # gitignored — emitted by scripts/gen-safelist.ts
    craft/
      CanonicalNode.tsx         # invokes composeResponsive + adapter.classMap; placeholder for missing impls
      resolver.tsx
    editor/
      Editor.tsx
      Toolbox.tsx
      Inspector.tsx
      SaveLoadBar.tsx
      ThemeSwitcher.tsx
      AdapterSwitcher.tsx
      Hydrator.tsx
      inspector/
        ResponsiveBar.tsx
        TypographyPanel.tsx, LayoutPanel.tsx, SpacingPanel.tsx
        SizePanel.tsx, AppearancePanel.tsx, EffectsPanel.tsx
        PropsPanel.tsx
        shared/
          useNodeClasses.ts
          ValueSelect.tsx, ColorSelect.tsx
          BoxSidesEditor.tsx
          PanelRow.tsx
    persistence/
      schema.ts                 # Zod envelope around Craft's serialized JSON
      storage.ts                # localStorage I/O
  docs/
    ARCHITECTURE.md             # this file
    DEVELOPER_GUIDE.md
    plans/
      *.md                      # historical/phased implementation plans
```

---

## Data Flow Walkthroughs

### Boot

```
main.tsx
  └── App.tsx
        ├── import './registry/components'   ← canonicals register themselves
        ├── import './adapters/shadcn'       ← shadcn adapter registers itself
        ├── import './adapters/mui'          ← MUI adapter registers itself
        ├── import './themes'                ← themes register themselves
        └── <Editor />
              └── <AdapterProvider>           ← composes all adapters' Wrappers
                    └── [composed Wrappers]
                          └── <Craft resolver={getResolver()}>
                                ├── <Hydrator/>     ← restores localStorage on mount
                                └── <ThemeProvider> ← reads activeThemeId, sets data-theme
                                      └── <Frame>
                                            └── <Element is={Bound['Box']} canvas defaults… />
```

Side-effect imports MUST run before `<Editor />` renders — otherwise the registries are empty when `getResolver()` walks them. `App.tsx` is the only place that boot-orders these.

Before `npm run dev` / `npm run build` even reaches Vite, the `predev` / `prebuild` hook in `package.json` runs `scripts/gen-safelist.ts`, which reads slice arrays from `src/style/tw-classes.ts` and writes `src/style/safelist.generated.css`. The CSS file is gitignored; it's a build artifact that always reflects the current parser's coverage.

### Drag-create (dropping a new component from the Toolbox)

1. `Toolbox.tsx` builds a `<button ref={el => connectors.create(el, <Element is={Bound} canvas={def.isCanvas} nodeProps={…} style={…} />)}>` for each canonical.
2. User mouse-down on the button → Craft starts a drag.
3. User drops on the canvas → Craft creates a new node from the `<Element>`'s shape, assigns it an id, inserts it as a child of the drop target.
4. Craft renders that node by looking up its `displayName` in the resolver. The match is the `Bound` thunk built by `buildResolver()`.
5. `Bound` calls `<CanonicalNode canonicalId={…} {…} />`.
6. `CanonicalNode` reads:
   - The canonical def via `getComponent(canonicalId)` — what slots, what schema, isCanvas flag.
   - The active adapter via `useActiveAdapter()` — the React component to delegate to.
7. `CanonicalNode` calls `useNode()` to get Craft's `connect` / `drag` connectors, packages them into a `rootRef` callback.
8. `CanonicalNode` invokes `adapter.classMap(style.classes.root, canonicalId)` if defined; falls back to `{ className: style.classes.root }`. The result feeds `className` / `sx` / `inlineStyle` props on the impl.
9. The adapter impl renders. It attaches `rootRef` to its outermost DOM element. Craft now sees that element as the node's DOM and routes future events (clicks → selection; mouse-over → hover; drops → child insertion) through it.

If the active adapter has no impl for the canonical, `CanonicalNode` renders a labeled placeholder badge instead of throwing — the user can swap adapters or remove the node without crashing.

### Selection

1. User clicks a rendered node's DOM element.
2. The element has Craft's data attributes (from `connect` via `rootRef`). Craft's global event listener traverses up from the click target, finds those attrs, identifies the node.
3. `actions.selectNode(id)` runs. `state.events.selected` updates.
4. `Inspector.tsx`'s `useEditor((state, query) => …)` selector re-fires. It reads the first id from `state.events.selected`, calls `query.node(id).get()` for the displayName, and `query.node(id).isRoot()` for the delete-guard.
5. Inspector re-renders and mounts inspector sub-panels for the selected node.

### Save

1. User clicks Save in `SaveLoadBar`.
2. `useEditorStore.getState()` reads `activeThemeId` + `activeAdapterId` (imperative — Save isn't subscribed).
3. `query.serialize()` returns Craft's tree as an opaque JSON string.
4. The envelope `{ version: 1, adapterId, themeId, craftJson }` is built.
5. `documentSchema.parse(...)` validates the envelope.
6. `localStorage.setItem('craftjs-design:doc:v1', JSON.stringify(...))`.

### Load

Either via the Load button (manual) or `Hydrator` (auto, on mount):

1. `localStorage.getItem('craftjs-design:doc:v1')` → raw string.
2. `JSON.parse` + `documentSchema.parse` → validated envelope.
3. `actions.deserialize(doc.craftJson)` → Craft replaces the entire tree.
4. `setActiveTheme(doc.themeId)` if present + `setActiveAdapter(doc.adapterId)`. Store updates trigger `ThemeProvider` and `AdapterProvider` consumers to re-render.

`Hydrator` wraps the above in try/catch — corrupted localStorage logs and the editor boots with the default seed instead of crashing.

### Theme swap

1. User picks a different theme in `ThemeSwitcher`.
2. `onChange` → `useEditorStore.getState().setActiveTheme(<id>)`.
3. `ThemeProvider` (subscribed via `useEditorStore((s) => s.activeThemeId)`) re-renders.
4. `ThemeProvider` looks up the theme, renders `<div data-theme={…} style="display:contents">`.
5. The browser's CSS selector matches the wrapper. The cascading custom properties (`--primary`, etc.) inherit through the descendant tree.
6. Every utility like `text-primary` / `bg-primary` resolves to `var(--primary)` and repaints with the new theme's value. **No Craft tree state changed.**

### Adapter swap

1. User picks a different adapter in `AdapterSwitcher`.
2. `onChange` → `useEditorStore.getState().setActiveAdapter(<id>)`.
3. `AdapterProvider` (subscribed via `useEditorStore((s) => s.activeAdapterId)`) re-renders. `getAdapter(<id>)` returns the chosen adapter.
4. The `useEffect([adapter])` cleanup fires the previous adapter's `unmount` (if any), then the new effect fires the new adapter's `mount` (if any).
5. The provider's output is **structurally unchanged** — every adapter's Wrapper is always rendered (see [§ Wrappers compose, not switch](#wrappers-compose-not-switch)). Only the React context value changes; no remount happens.
6. Every `CanonicalNode` inside re-renders with the new active adapter. Each looks up its impl in `adapter.components`. Nodes with an impl render; nodes without get the missing-impl placeholder.
7. The new impls' DOM replaces the previous impls' DOM in their slots. **Craft tree state survives** because nothing in the React tree shape changed.

### Typography edit

1. User selects a node. `Inspector` mounts the applicable panels (filtered by `getApplicablePanels(canonicalDef)`).
2. Each panel calls `useNodeClasses(nodeId, slot)` which returns `{ classString, writeClasses, activeBreakpoint }`. The hook reads either `style.classes[slot]` (when `activeBreakpoint === 'base'`) or `style.responsive[activeBreakpoint][slot]`.
3. The panel calls its slice's `parse*` to decompose `classString` into a typed slice, binds controls to slice fields.
4. User changes a value. The panel calls `writeClasses(mergeSlice(classString, patch))`.
5. `writeClasses` calls `actions.setProp(nodeId, (props) => …)`. Inside the Immer mutator:
   - If `activeBreakpoint === 'base'` → writes to `props.style.classes[slot]`.
   - Else → creates `props.style.responsive[bp]` if absent, writes to that slice.
6. Craft re-renders the node. `CanonicalNode` reads the new style, calls `composeResponsive(style, 'root')` to merge base + breakpoint slices into a Tailwind-prefixed className, passes it through `adapter.classMap` (or default passthrough), feeds the result to the adapter impl as the `className` prop.
7. The adapter impl renders `<elt className={cn(className)}>`. Browser's CSS cascade applies base utilities always; breakpoint-prefixed utilities apply via `@media (min-width: …)` rules from Tailwind's compiled output.

### Responsive edit (at a non-base breakpoint)

1. User clicks `md` in `ResponsiveBar`. `setActiveBreakpoint('md')`.
2. Every component using `useEditorStore((s) => s.activeBreakpoint)` re-renders — `ResponsiveBar` itself and every inspector panel via `useNodeClasses`.
3. Each panel's `useNodeClasses` re-reads from `style.responsive.md[slot]` (empty for a fresh md edit → `classString = ''`).
4. User edits a control. The panel writes the new class string to `style.responsive.md[slot]`. `style.classes[slot]` is untouched — the base value survives.
5. `composeResponsive` now emits `<base classes> md:<class1> md:<class2> …`. The browser applies the md-prefixed utilities only at viewports ≥ 768px.

---

## Key Design Decisions

These are the architectural choices and their reasoning.

### One Craft component per canonical id, not one generic

`buildResolver()` produces a distinct `Bound` thunk for every canonical id, each carrying its own `Bound.craft.displayName = def.displayName`.

The alternative would be a single generic `<CanonicalNode>` with `canonicalId` stuffed into props. That fails because Craft's resolver maps the *string* `displayName` → component, and persisted JSON references nodes by that string. One-per-canonical means:

- Serialized JSON reads `"Box"`, `"Button"`, etc. — human-readable, stable across adapter swaps.
- Renaming a canonical id is an explicit migration, not a silent corruption.
- Craft's devtools show real names.

The cost is trivial: each `Bound` is a 3-line thunk.

### Adapter context as the swap point

The active adapter is exposed via React context (`AdapterProvider` + `useActiveAdapter`), not imported as a singleton. `CanonicalNode` looks up the impl at *render time*, not at module-load time.

This is what makes adapter-swapping non-destructive: change one `activeAdapterId` in the store, every `CanonicalNode` re-resolves on its next render, and Craft's tree state is untouched.

### `rootRef` on the adapter contract

Earlier drafts wrapped the adapter's output in `<div ref={connectDrag} style={{display:'contents'}}>` inside `CanonicalNode`. That broke nested drop-targeting because the wrapper had no bounding box for the browser's hit-test — `elementsFromPoint` returned the inner adapter's `<div>` (no Craft data attrs), Craft's lookup climbed to the *root* wrapper instead of the inner one, and all drops routed to the root.

The fix: a `rootRef` field on `AdapterRenderProps`. The editor passes a ref callback into the adapter; the adapter attaches it to its outermost real DOM element. Craft sees the *visible* element as the node's DOM. Nested targeting works because each nested instance has its own connected element with a real bounding box.

The cost: a one-line change to every adapter impl (`<div ref={rootRef} …>`). Worth it.

### Container pattern: component IS the canvas

Craft.js offers two patterns for containers:

**A.** The component itself is the canvas. `<Element is={Component} canvas>` at creation marks the *node* as a canvas; the component just renders `{children}`. One drop zone per node.

**B.** The component has *named* sub-canvas slots inside it: `<div className="card"><Element id="header" canvas>…</Element><Element id="body" canvas>…</Element></div>`. Multiple drop zones per node.

This codebase uses Pattern A for single-slot containers. An earlier draft tried to *combine* both ("the component is a canvas AND has a nested canvas slot") and discovered the hard way that competing drop targets break hit-testing.

Pattern B is reserved for genuine composites — Card with separate header/body/footer regions, Table with rows + columns. The architecture is ready for it: each `<Element id="…">` is a named slot the inspector can later target.

### Zod-validated envelope around opaque Craft JSON

`documentSchema` only validates the *envelope*: `{ version, adapterId, themeId?, craftJson: string }`. It does **not** schema-check Craft's internal tree shape.

Craft owns its serialization format. Re-typing it on our side would either drift over time (if hand-rolled) or duplicate types Craft already publishes (if imported). Neither is worth it. The envelope gives us:

- A version literal to switch on later if the envelope itself changes.
- An adapter pin (so the right adapter mounts on load).
- A theme pin.
- Validation that "this is at least the right *kind* of thing" before handing it to Craft.

### Themes as `[data-theme]` CSS blocks

Themes ship as static CSS blocks scoped by `[data-theme="<id>"]` selectors, not as JSON tokens transformed at runtime.

Reasons:
- Theme-swap performance is zero — one DOM attribute change; the browser handles the rest natively.
- shadcn's themes ship as CSS blocks already. Pasting one is a 30-second job; a runtime token compiler would be a day.
- JSON-driven user themes can be added later by injecting a `<style>` tag at runtime — the architecture isn't blocked.

### `tw-classes.ts` — single funnel for class-string editing

The inspector doesn't edit `style.classes.root` by string concat. It parses to a typed slice, mutates the slice, and serializes back through `mergeTypography`. The merge preserves classes the parser didn't recognize (e.g., `bg-card` on a Text node) by passing them through as opaque.

This is the architecture's defense against a foot-gun. If any panel were to do `classes.root = "text-bold " + classes.root`, unrecognized classes get dropped the next time the parser re-serializes. The discipline is enforced by convention.

### Tailwind v4 needs an explicit safelist for dynamically-emitted classes

Tailwind v4's JIT scans source for *literal* class strings. Inspector panels emit classes via template literals (`` `text-${size}` ``), which the scanner can't see. Without intervention, the classes land in the DOM but no CSS is generated — they fail silently.

The fix: explicit `@source inline()` blocks in `src/index.css` listing every utility a dynamically-emitting panel can produce. Theme-token utilities (`text-primary`, `bg-card`, …) are auto-generated by `@theme inline` and don't need to be listed there — they're declared as theme tokens.

### MUI palette bridge — CSS-variable indirection, not adapter coordination

MUI's `createTheme` palette validator rejects `var(--…)` strings — the `cssVariables: true` mode generates MUI's *own* CSS variables from real color values; it doesn't accept CSS-variable references as input. Two-layer bridging:

1. **`mui/theme.ts`**: pass valid placeholder hex colors to `createTheme`. MUI's validator is happy. These become *fallback* values if step 2 fails.
2. **`.mui-bridge` CSS block in `index.css`**: override MUI's generated `--mui-palette-*` variables to reference our shadcn tokens. The `<div className="mui-bridge">` in `MuiWrapper` applies these.

CSS variable resolution is **lazy** — each `var()` reference is resolved at the consuming element. So when `[data-theme="rose"]` flips `--primary`, MUI components below it repaint *without* re-creating the MUI theme. No JS coordination, no listener, no theme-recompute. The cascade does it.

### Missing-impl placeholder, not a thrown error

When an adapter doesn't have an impl for a canonical, `CanonicalNode` could throw. It deliberately doesn't — it renders a small destructive-colored badge: *"Button — no impl in adapter 'mui'"*.

The user can: swap to an adapter that covers the canonical; delete the offending node; or (as a developer) add the missing impl.

This decouples adapter coverage from canonical registration. Without the placeholder, every adapter would need to ship every canonical from day one — a brittle coupling that makes incremental adapter development impossible.

### <a id="adapter-impls-consume-rendered-classname"></a>Adapter impls consume rendered `className`, never `style.classes.root`

`CanonicalNode` composes responsive breakpoint slices into a single Tailwind-prefixed class string before invoking the adapter impl. The composed string lands on the impl's `className` (or `sx` / `inlineStyle`) prop from `AdapterRenderProps`.

```tsx
// ✅ Right
export function ShadcnBox({ children, rootRef, className }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(className)}>{children}</div>
}

// ❌ Wrong — bypasses composeResponsive; breakpoint prefixes never reach the DOM
export function ShadcnBox({ style, children, rootRef }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(style.classes.root)}>{children}</div>
}
```

The wrong version still works for *base*-only editing — `style.classes.root` is what `composeResponsive` reads as its base input. The bug surfaces only once responsive variants enter play: edits at non-base breakpoints land in `style.responsive[bp][slot]`, the composer prefixes them correctly, but the impl ignores the composed output.

This convention isn't enforced by the type system — `style` is still in `AdapterRenderProps` for impls that need to read individual *slot* classes or other style metadata. Discipline-by-convention only. The developer guide spells it out.

### Wrappers compose, not switch

A naïve `AdapterProvider` would conditionally render the *active* adapter's Wrapper:

```tsx
return (
  <AdapterCtx.Provider value={adapter}>
    {Wrapper ? <Wrapper>{children}</Wrapper> : children}
  </AdapterCtx.Provider>
)
```

That changes the React tree shape on adapter swap (different element type at the same position), which makes React unmount and remount the entire children subtree. Two consequences observed in practice:

1. **Hydrator re-fires**, re-reads localStorage, and reverts the user's adapter pick.
2. **Craft's `<Frame>` re-seeds its initial children**, wiping the user's canvas content back to the empty root.

The fix: compose **every** registered adapter's Wrapper around children, always. Inactive adapters' Wrappers (e.g., MUI's `ThemeProvider` while shadcn is active) just provide React context that no rendered component reads.

```tsx
function composeAllWrappers(all, children) {
  let wrapped = children
  for (const a of all) if (a.Wrapper) wrapped = <a.Wrapper key={a.id}>{wrapped}</a.Wrapper>
  return wrapped
}
```

The React tree shape is stable across every adapter swap. Nothing remounts. Frame stays mounted; Craft state persists; user content survives.

**Implicit contract this puts on adapter authors:** Wrappers must be **pure context providers**. They can return a React provider, a styled container div, anything whose effect is scoped to its own subtree. They must NOT:
- attach `document`-level event listeners,
- inject global CSS into `<head>`,
- mutate browser APIs,
- …or anything else that would apply unconditionally even when their adapter is inactive.

Side-effecting work goes in `mount` / `unmount` — the imperative lifecycle hooks. Those fire only on activeAdapter change.

---

## Persistence Format

Stored at `localStorage['craftjs-design:doc:v1']`:

```jsonc
{
  "version": 1,
  "adapterId": "shadcn",
  "themeId": "rose",                                  // optional
  "craftJson": "<JSON string from query.serialize()>"
}
```

- **`version`**: literal `1` today. Bump only when the *envelope* shape changes — not when `craftJson`'s internal shape changes (Craft owns that).
- **`adapterId`**: pinned at save time from `useEditorStore.getState().activeAdapterId`. Hydrator restores via `setActiveAdapter`. Required.
- **`themeId`**: pinned at save time. Optional — old documents without one default to `'default'` on load.
- **`craftJson`**: an opaque string. Treat it as a blob; never parse and rewrite it directly. Each canonical node's `props.style` includes `classes` (base slot → class string) and may include `responsive` (breakpoint → slot → class string) once the user has authored breakpoint variants.

The `:v1` suffix on the storage key reserves namespace for a future v2 envelope to coexist during migration.

The `activeBreakpoint` (which breakpoint the user is currently editing) is **not** persisted — it's a UI mode, not a document property. It resets to `'base'` on every reload.

---

## Extension Points

For step-by-step recipes (adding a canonical, adding an adapter, adding a theme), see [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md). The contracts those recipes touch are stable: `CanonicalComponent`, `Adapter`, `Theme`, `AdapterRenderProps`.
