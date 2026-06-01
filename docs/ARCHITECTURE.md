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
| `Editor.tsx` | Top-level shell. Builds the resolver, mounts Craft.js, wraps the canvas in `<ThemeProvider>`, lays out the 3-column UI. On mount, calls `_markEditorMounted()` so the registry can warn about post-mount canonical registrations. |
| `Toolbox.tsx` | Left panel. Reads `listComponents()` from the registry; renders entries grouped by `category` with a search input, a "Favorites" section (toggle via star icon), and a "Recently used" section. Favorites + recents persist to `localStorage['craftjs-design.toolbox']` — user-level state, separate from the document envelope. Attaches Craft `connectors.create()` per entry; mousedown on a button records use into the recents LRU. |
| `Inspector.tsx` | Right panel. Reads the selected node from Craft state, shows type/id, exposes Delete (root-guarded), mounts the `ResponsiveBar`, mounts a `SlotPicker` when the canonical declares more than one style slot, and renders panels from the panel registry (`getPanelsFor(def)`). Tracks `activeSlot` (`'root'` by default). Resize handles are rendered as a canvas overlay (see `canvas/ResizeOverlay.tsx`), not inside the inspector. |
| `canvas/ResizeOverlay.tsx` | Phase 7 — fixed-position overlay rendered over the selected node's bounding rect. Four corner handles. Mutates `dom.style.width/height` directly during drag (60fps), commits final px to `style.inline.root.{width,height}` via `setProp` on release. Tracks node position on selection change, scroll (capture phase), window resize, and `ResizeObserver` ticks. |
| `documents/DocumentMenu.tsx` | Phase 7 — top-bar dropdown showing the active document's name + chevron. Inline rename, duplicate, delete actions for the active doc; "New blank document", nested `<TemplatePicker />`, and a "Switch to" list of other documents. |
| `documents/TemplatePicker.tsx` | Nested popover listing registered starter templates (name + description). Clicking a template invokes the supplied `onPick` and closes. |
| `documents/useDocumentSwitcher.ts` | Hook orchestrating runtime document switches. `switchTo(id)` / `createBlank(name)` / `createFromTemplate(id, name)`. Each one snapshots the current canvas via `query.serialize()`, persists to the active doc, swaps `activeId`, loads the target's blob (or the Empty template seed), calls `actions.deserialize`, and applies theme + adapter. |
| `ResolverUpdater.tsx` | Phase 7 — side-effect component rendered inside `<Craft>`. Subscribes to the registry version counter via `useSyncExternalStore` and calls `actions.setOptions((opts) => { opts.resolver = getResolver() })` on every bump. Powers hot canonical reload — `registerCanonical` at runtime updates Craft's internal resolver without remounting. |
| `ShareButton.tsx` | Toolbar Share button. Popover renders the encoded URL ready to copy. Over the 30 KB cap, switches to "Copy as JSON" with a paste-into-importer message. |
| `inspector/ResponsiveBar.tsx` | Six breakpoint pills (`base` / `sm` / `md` / `lg` / `xl` / `2xl`). Active pill = which class slice the panels read/write. Loud "writing to: …" status line warns when an edit will only apply at and above a breakpoint. |
| `inspector/SlotPicker.tsx` | Pill bar above the panels for Pattern B canonicals (`styleSlots.length > 1`). Switches `activeSlot` (`'root'`, `'header'`, `'body'`, `'footer'`, etc.). Resets to `'root'` on selection change. |
| `inspector/panel-registry.ts` | Pluggable panel registry. `registerPanel` / `unregisterPanel` / `listPanels` / `getPanelsFor`. Inspector reads from this — both built-ins and SDK-authored panels live here. |
| `inspector/built-in-panels.ts` | Side-effect module that registers the 7 built-in panels (Layout / Size / Spacing / Typography / Appearance / Effects / Properties) via `registerPanel` at module load. Imported from `App.tsx`. |
| `inspector/{Typography,Layout,Spacing,Size,Appearance,Effects}Panel.tsx` | The 6 class-editing panels. Each accepts `{ nodeId, slot }`. Backed by the matching `tw-classes` slice parse/merge pair. |
| `inspector/PropsPanel.tsx` | Auto-form derived from each canonical's Zod `propsSchema`. Top-level component dispatches one `PropField` per schema entry; recursive `PropField` handles `ZodEnum` / `ZodString` / `ZodBoolean` / `ZodNumber` / `ZodArray` / `ZodObject`. Unsupported kinds render a labeled badge. |
| `inspector/fields/PropField.tsx` | Recursive Zod-kind dispatcher extracted from PropsPanel. Used at the top level by PropsPanel and recursively by ArrayField / ObjectField when descending into nested element schemas. |
| `inspector/fields/ArrayField.tsx` | `z.array(z.object/scalar)` editor — stacked item cards with `↑ / ↓ / 🗑` controls and a "+ Add" button. Caps at one level: `z.array(z.array(…))` shows "unsupported deep nesting". |
| `inspector/fields/ObjectField.tsx` | `z.object` editor used by ArrayField when the element is an object. Renders the sub-schema's fields recursively via PropField. |
| `inspector/fields/defaults.ts` | `defaultValueFor(schema)` — seeds new items when the "+ Add" button fires. |
| `inspector/shared/useNodeClasses.ts` | Read/write helper. Signature: `useNodeClasses(nodeId, slot = 'root')`. Returns `classString` (active breakpoint, scoped to the slot), `inlineStyle` (active-breakpoint arbitrary CSS for the slot), `writeClasses`, `writeInline`. At non-base, reads/writes route through `style.responsiveInline[bp][slot]`. Funnels every inspector style I/O through one place. |
| `inspector/shared/ColorPicker.tsx` | Popover with three sections: token swatch grid, `react-colorful` visual picker (sat/lightness + hue), hex text input. Tagged-union `ColorPickerValue` (`token` / `hex` / `unset`). Works at every breakpoint — Phase 6 lifted the base-only restriction. |
| `inspector/shared/NumericInput.tsx` | Hybrid text input accepting tokens or arbitrary CSS values (`13px`, `50%`, `1.5rem`). Step buttons walk the token scale; Popover dropdown for picking. Works at every breakpoint. |
| `inspector/shared/BoxSidesEditor.tsx` | Linked-corners editor (padding / margin). Linked mode uses `NumericInput`; per-side mode uses `ValueSelect` (token-only). |
| `inspector/shared/CollapsibleSection.tsx` | Native `<details>`/`<summary>` wrapper used by Inspector to make each panel collapsible. |
| `inspector/shared/ValueSelect.tsx` | Generic typed Select (Radix-backed shadcn Select) for closed enums. Supports per-item `renderOption` for icons/swatches. |
| `inspector/shared/ColorSelect.tsx` | **Deprecated** — superseded by ColorPicker. Token-only native `<select>` retained for transition; remove once nothing imports it. |
| `inspector/shared/PanelRow.tsx` | Label-on-left layout helper for consistent row rhythm. |
| `SaveLoadBar.tsx` | Top bar. Mounts `<DocumentMenu />` (replaces the static title), undo/redo, adapter switcher, theme switcher, Share, Import, Export, Save, Load. |
| `UndoRedo.tsx` | Undo/redo toolbar buttons wired to `actions.history.undo/redo`. Subscribes to `query.history.canUndo/canRedo` for disabled state. Installs a global Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z keyboard handler (skipped when target is an editable element). |
| `ThemeSwitcher.tsx` | Dropdown that flips `activeThemeId` in the editor store. |
| `AdapterSwitcher.tsx` | Dropdown that flips `activeAdapterId` in the editor store. |
| `Hydrator.tsx` | Renders `null`. On mount: if the URL has `#doc=…`, decodes the shared document and creates a new "Shared document" entry; otherwise loads the active document from `documentStore`. Module-level `hydrated` flag prevents re-restore on any future remount. Load passes through `migrateDocument` (Phase-5 Card props, Phase-6/7 Tabs content). |

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

**48 canonicals ship today**, grouped by `category`. (This list is the live
registry — regenerate it from `listComponents()` / `npm run docs:matrix`
rather than hand-editing; the matrix's left column is the authoritative set.)

| Category | Canonicals |
|---|---|
| `layout` (8) | Box, Card, Container, Divider, Grid, Section, Spacer, Stack |
| `content` (2) | Heading, Text |
| `input` (10) | Button, Checkbox, Date Picker, Date Range, Input, Radio, Select, Switch, Textarea, Time Picker |
| `display` (9) | Avatar, Badge, Code, Data List, Data List Item, Icon, Skeleton, Table, Table Cell |
| `navigation` (7) | Breadcrumb, Link, Nav Item, Nav Menu, Pagination, Stepper, Tabs |
| `feedback` (8) | Alert, Drawer, Modal, Popover, Progress, Spinner, Toast, Tooltip |
| `media` (4) | Audio, Carousel, Image, Video |

A canonical's render shape is one of:

- **Pattern A — leaf** (no drop zone): `isCanvas: false`, no `canvasSlots`.
  Buttons, inputs, text, badges, etc.
- **Pattern A — single canvas** (one `'root'` drop zone): `isCanvas: true`,
  no `canvasSlots`. Children arrive through Craft's `children` prop. Box,
  Stack, Grid, Container, Section, Data List, Nav Menu/Item, and the overlay
  bodies (Modal, Drawer, Popover) + Table Cell.
- **Pattern B — multi-canvas** (named sub-slots, each its own drop zone):
  `canvasSlots` is set (a static list or a `(props) => string[]` function).
  `CanonicalNode` generates one `<Element canvas id={slot}>` per slot and
  hands the adapter impl `slotChildren[slot]` to place each region. Five
  canonicals: **Card** (`header`/`body`/`footer`, static), **Table**
  (per-cell, dynamic from `rows×cols`), **Tabs** (per-tab), **Stepper**
  (per-step), **Carousel** (per-slide). The dynamic ones derive their slot
  ids from props via the function form — add a tab/slide in the inspector and
  a new drop zone appears immediately. Slot ids are stable per entry (`tab.id`
  / slide id), so renaming a tab's `value` no longer orphans its canvas.

`styleSlots` (which the inspector can style independently) is a separate axis:
a Pattern-A canonical can still expose multiple `styleSlots` without multiple
canvases. The Inspector's `SlotPicker` exposes the named slots as pills above
the class-editing panels; the `activeSlot` mode routes every panel write into
`style.classes[slot]` (or `style.responsive[bp][slot]`).

| File | Role |
|---|---|
| `types.ts` | `CanonicalComponent` (with optional `canvasSlots: readonly string[] \| ((props) => readonly string[])`), `NodeStyle` (with optional `responsive` + `inline` + `responsiveInline`), `CanonicalCategory`, `CanonicalId`, `PanelId`. |
| `registry.ts` | `registerComponent` / `registerCanonical` (aliases), `unregisterCanonical`, `getComponent`, `getComponentByDisplayName`, `listComponents`, `getApplicablePanels`, `getCanvasSlots(def, nodeProps?)`, `getRegistryVersion`, `subscribeRegistry`, `_markEditorMounted`. Phase 7 — post-mount registrations bump the version counter; Editor subscribers re-resolve. In-memory map. |
| `components/index.ts` | Barrel of side-effect imports. Adding a new canonical = one line here. |
| `components/{box,text,button,input}.ts` | Phase 3 canonicals. Button explicitly omits the typography panel (shadcn's flex-centered primitive doesn't respect text utilities). |
| `components/{heading,link,image,stack,divider,icon,badge,avatar,alert}.ts` | Phase 5 Pattern A breadth — content, navigation, media, display, and feedback canonicals. |
| `components/{select,checkbox,radio,switch,textarea}.ts` | Phase 5 form canonicals. Their adapter impls render with no-op `onChange` handlers (and `readOnly` for Textarea) so the editor preview is visually faithful but interactively inert. |
| `components/{card,tabs}.ts` | Phase 5 Pattern B composites. Multiple `styleSlots`; impls consume `composedClasses[slot]` and `composedInlineStyles[slot]`. |

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
  style: NodeStyle                          // { classes, responsive?, inline?, responsiveInline? }
  children?: ReactNode                      // Craft-managed children if Pattern A canvas
  rootRef?: (el: HTMLElement | null) => void

  // Populated by CanonicalNode. Pattern A impls use the root-slot fields:
  className?: string                        // composed responsive class string for the root slot
  sx?: Record<string, unknown>              // MUI's sx prop (from adapter.classMap)
  inlineStyle?: CSSProperties               // composed inline CSS for the root slot (base only — responsive inline is class-promoted)

  // Pattern B impls read per-slot maps. Pattern A impls can ignore these.
  composedClasses?: Record<string, string>          // slot → composed responsive class string
  composedInlineStyles?: Record<string, CSSProperties>  // slot → composed inline CSS (base only)
  slotChildren?: Record<string, ReactNode>          // Phase 6 — slot → <Element canvas/> wrapper for multi-canvas Pattern B
}
```

`rootRef` is how the editor wires Craft's `connect` / `drag` to the *actual rendered DOM*. Without it, nested drop-target hit-testing breaks (see [§ rootRef on the adapter contract](#rootref-on-the-adapter-contract)).

**Pattern A impls consume `className` / `sx` / `inlineStyle` and use the `children` prop.** Pattern B impls consume `composedClasses[slot]` / `composedInlineStyles[slot]` per region AND consume `slotChildren[slot]` (the `<Element canvas>` wrapper) for each canvas slot. Either way, impls must *never* read `style.classes.root` directly — `CanonicalNode` composes base + responsive breakpoint slices into the final class string AND merges arbitrary inline values from `style.inline[slot]` before passing to the impl. The root entries of `composedClasses` / `composedInlineStyles` always mirror `className` / `inlineStyle`. See [§ Adapter impls consume rendered className](#adapter-impls-consume-rendered-classname), [§ Pattern B slot routing](#pattern-b-slot-routing), and [§ Multi-canvas via canvasSlots](#multi-canvas-via-canvasslots).

### Layer 4 — Craft.js bridge (`src/craft/`)

Craft.js manages the document tree, selection set, drag/drop, and history. The bridge plugs our two-layer abstraction (registry + adapter) into Craft's "resolver" model.

| File | Role |
|---|---|
| `CanonicalNode.tsx` | Generic React component. Given `canonicalId` + `nodeProps` + `style`, looks up the canonical def from the registry, the impl from the active adapter, and iterates `def.styleSlots`: for each slot, calls `composeResponsive(style, slot)` + `composeInlineStyle(style, slot)` and stores the result in `composedClasses[slot]` / `composedInlineStyles[slot]`. When `def.canvasSlots` is set, calls `getCanvasSlots(def, nodeProps)` (passes the node's current props so the function form of `canvasSlots` can return a dynamic slot list — e.g., Tabs returns one per tab), then generates one `<Element id={slot} is="div" canvas/>` wrapper per slot and passes them via `slotChildren`. When `style.responsiveInline` has entries for a slot, calls `composeResponsiveInline` to generate a hash-keyed CSS class with `@media` rules, appends the class to `composedClasses[slot]`, and renders an inline `<style>` block sibling to the impl. The root-slot results are mirrored to `className` / `inlineStyle` for Pattern A backwards compat. Attaches Craft's `connect/drag` via `rootRef`. Renders a labeled placeholder if the active adapter has no impl for the canonical. |
| `resolver.tsx` | Builds and caches the Craft.js resolver — one user-component per canonical id. Phase 7 — cache is keyed by `getRegistryVersion()`; calls after a `registerCanonical` / `unregisterCanonical` post-mount return a freshly-built resolver. Identity stays stable when no registry mutation has happened. |
| `resolver.tsx` | `buildResolver()` walks `listComponents()` and produces one Craft user-component per canonical id, each delegating to `CanonicalNode`. `getResolver()` is the cached singleton accessor. |

---

## Supporting Modules

Cross-cutting infrastructure that doesn't fit the four-layer model but supports it.

### Error handling (`src/editor/errors/`)

Two parallel surfaces, by failure-mode:

- **`ErrorBoundary`** (`ErrorBoundary.tsx`) catches errors thrown during a
  React render. Four boundary layers — top-shell (`App.tsx`), canvas,
  toolbox, and per-panel (`Inspector.tsx`) — each with its own typed
  fallback in `fallbacks.tsx`. Inner boundaries keep their layer alive
  when sibling layers fail; the top-shell catches truly unrecoverable
  cases.
- **`useGlobalErrorHandler` + `AsyncErrorBanner`** (`asyncError.ts`,
  `useGlobalErrorHandler.ts`, `AsyncErrorBanner.tsx`) catches what the
  boundaries miss: errors thrown inside effects, event handlers, or
  unhandled promise rejections (`window.error` /
  `window.unhandledrejection`). One toast appears at bottom-right with
  the message + a Dismiss button; the user keeps working. Critical
  async failures (Hydrator deserialize) are designed to bubble through
  the boundary instead, so this handles the long tail of non-fatal
  issues.
- **`useConcurrentEditWatcher` + `ConcurrentEditBanner`**
  (`src/editor/persistence/`) detect when another browser tab modifies
  the active document or the doc-index. The hook attaches a
  `window.storage` listener (which only fires for writes from OTHER
  tabs by spec). Three outcomes, decided by the pure
  `decideStorageEvent(event, activeId)` helper:
  1. Doc-index changed → `documentStore.reloadIndexFromStorage()`
     re-reads the index in place so the document menu reflects the
     external rename / delete / create.
  2. Active doc's blob changed and parses cleanly → the remote
     envelope lands in `editorStore.concurrentEditConflict`, and
     `ConcurrentEditBanner` shows two actions: Reload (apply remote
     via `applyEnvelopeSafely`) or Overwrite (save local snapshot
     back, blowing away the remote write).
  3. Everything else (unparseable / unrelated / inactive doc) →
     ignored. Inactive docs' freshest version is naturally picked up
     by `useDocumentSwitcher` next time the user switches to them.
- **`StorageQuotaBanner` + `StorageQuotaErrorModal`**
  (`src/editor/persistence/`, backed by editorStore's
  `storageQuotaPercent` / `storageQuotaDismissed` /
  `storageSaveFailed`) warn the user about localStorage pressure.
  `documentRegistry.getStorageUsage()` sums every `craftjs-design:*`
  key and reports a percentage against a conservative 5 MB ceiling.
  `documentStore.reportWrite` calls this after every save / index
  write; usage ≥ 80% surfaces the banner under the header, and a
  `QuotaExceededError` from `localStorage.setItem` (now caught and
  reported via the `WriteResult` returned by `writeDocument` /
  `writeDocumentIndex`) raises a blocking modal. The banner's
  dismiss state lives in sessionStorage so it survives a reload but
  resets between tabs.
- **`applyEnvelopeSafely` + `MalformedDocumentBanner`**
  (`craftJsonIntegrity.ts`, `applyEnvelopeSafely.ts`,
  `MalformedDocumentBanner.tsx`) guards document-load failures.
  Both Hydrator (boot) and `useDocumentSwitcher` (runtime switch) route
  every `actions.deserialize` call through `applyEnvelopeSafely`.
  Before deserialize, the integrity check validates the craftJson:
  parses as an object, has ROOT, every `parent` / `nodes` /
  `linkedNodes` ref resolves, every type is either `'div'` or a
  registered canonical. Either path of failure (pre-check OR
  deserialize throw) sets `editorStore.malformedDocument`; the editor
  shell swaps the Frame for `MalformedDocumentBanner`. The banner
  offers Show raw JSON, Export raw, and Reset to empty — the last
  archives the broken envelope under
  `craftjs-design:doc:<id>:broken:<timestamp>` before writing the
  Empty template into the doc's slot.

Normalisation lives in `asyncError.ts` — pure helpers (`normalizeErrorEvent`,
`normalizeRejectionEvent`) that turn the browser event into a stable
`AsyncErrorInfo` shape. Tested in isolation.

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

Single funnel for all node-style editing. **Anything that writes to `style.classes.root` or `style.inline[slot]` must go through this layer.** Direct string concat / inline-style mutation in components risks dropping classes the parser doesn't recognize or losing the token/arbitrary mutual-exclusion invariant.

| File | Role |
|---|---|
| `tw-classes.ts` | Typed unions + parser/serializer/merge for six slices: typography, layout, spacing, size, appearance (fill + border + radius), effects. |
| `responsive.ts` | `composeResponsive(style, slot)` — merges `style.classes[slot]` (base) with each `style.responsive[bp][slot]`, prefixing breakpoint slices with `bp:`. Called by `CanonicalNode` before invoking `adapter.classMap`. |
| `inline.ts` | `composeInlineStyle(style, slot)` — returns `style.inline[slot]` as `React.CSSProperties` for inline injection. Used by `CanonicalNode` to merge arbitrary user picks onto the impl's `inlineStyle` prop **when the slot has no responsive inline entries**. When responsive inline IS present, the base inline is promoted into the generated CSS class instead — see `responsive-inline.ts`. |
| `responsive-inline.ts` | `composeResponsiveInline(style, slot)` — returns `{ className, css, consumesBaseInline }`. When the slot has any `style.responsiveInline[bp][slot]` entry, generates a hash-keyed CSS class (e.g., `ri-3jvn7`) covering BOTH base and responsive declarations via plain rules + `@media` blocks. CanonicalNode appends the class to the slot's composed string and renders the CSS inside an inline `<style>` sibling. Empty result when no responsive entry — caller keeps the inline-style fast path. |
| `safelist.generated.css` | Generated output of `scripts/gen-safelist.ts`. Listed in `.gitignore`; regenerated on every `npm run dev` / `npm run build`. |

Per-slice API contract (parametrized over slice type):
- `parse<Slice>(classString)` → `{ slice, unknownClasses }`. Recognized utilities populate the slice; unrecognized strings pass through as `unknownClasses`.
- `merge<Slice>(original, partialSlice)` → new class string. Patch-friendly: caller passes only fields they want to change. Unknown classes (including classes from *other* slices) always pass through.

Slices are independent — `parseTypography` doesn't recognize `bg-card`, `parseSpacing` doesn't recognize `flex`. Each merge function passes classes from other slices through as `unknownClasses`. The inspector panels each operate on one slice; round-trips through multiple panels preserve every class.

**Arbitrary CSS values** (hex colors, custom `13px` spacing) bypass the Tailwind class system entirely. At the **base breakpoint**, the inspector writes them to `style.inline[slot][cssProperty]`; `CanonicalNode` emits them via the React `style` prop (fast path). At **non-base breakpoints**, writes go to `style.responsiveInline[bp][slot][cssProperty]`; `CanonicalNode` generates a per-node CSS class with `@media` rules covering base + responsive and renders the class via an inline `<style>` block. Either way, token picks and arbitrary picks are mutually exclusive at the panel level: picking a token clears the matching inline property, and vice versa.

The **safelist** is the bridge between this single-funnel parser and Tailwind v4's JIT scanner. The inspector emits class strings via template literals (`text-${size}`, `bg-${color}`, …) that Tailwind can't see in source. `scripts/gen-safelist.ts` reads the slice arrays from `tw-classes.ts` (single source of truth) and emits `@source inline()` directives for every utility × every breakpoint prefix (~250 directives covering thousands of utility-prefix pairs). The result lands in `safelist.generated.css`, imported by `index.css`. Wired via `predev` / `prebuild` npm scripts.

### Public SDK boundary (`src/sdk/`)

Phase 6 carved out a public boundary for external authors. Anything in `src/sdk/*` is part of the contract; everything else is internal and can change without notice. The SDK is consumed via the `@design/sdk` path alias (wired in `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`).

| File | Role |
|---|---|
| `index.ts` | Main entry — re-exports the full surface from the topical modules below. |
| `adapter.ts` | `Adapter`, `AdapterRenderProps`, `ClassMapFn`, `ClassMapResult` types + `registerAdapter`, `listAdapters`, `useActiveAdapter`. |
| `canonical.ts` | `CanonicalComponent`, `CanonicalCategory`, `CanonicalId`, `PanelId` types + `registerCanonical` / `registerComponent`, `unregisterCanonical`, `getComponent`, `getComponentByDisplayName`, `listComponents`, `getCanvasSlots`, `getApplicablePanels`. |
| `style.ts` | `NodeStyle`. |
| `hooks.ts` | `useNodeClasses` for panel authors. |
| `panel.ts` | `PanelDefinition` type + `registerPanel`, `unregisterPanel`, `listPanels`, `getPanelsFor`. |
| `boundary.test.ts` | Asserts every expected name is exported AND that internal symbols (`CanonicalNode`, resolver helpers) are NOT leaked. |

Internal adapters (shadcn, MUI) dogfood the boundary — their `index.ts` files import `registerAdapter` from `@design/sdk`. The Chakra example at `examples/adapter-chakra/` imports ONLY via the SDK; that subtree is included in `tsconfig.app.json` so it type-checks but isn't bundled into `src/`.

User-facing docs:
- `docs/SDK_GUIDE.md` — full reference.
- `docs/TUTORIAL_ADAPTER.md` — Chakra walkthrough.
- `docs/TUTORIAL_CANONICAL.md` — adding a Stepper canonical.
- `docs/TUTORIAL_PANEL.md` — adding a custom inspector panel.

### Persistence (`src/persistence/`)

Phase 7 reshaped this layer from a single-active-doc store into a multi-document index with import/export/share affordances.

| File | Role |
|---|---|
| `schema.ts` | Zod-validated `EditorDocument` envelope: `{ version, adapterId, themeId?, craftJson }`. Opaque `craftJson` — Craft owns its serialization. |
| `migrations.ts` | `migrateDocument(doc)` walks the Craft JSON and applies idempotent migration steps. Phase 6 added Card-prop strip; Phase 7 added Tabs `content`-field strip. New canonical shape changes add a step here. |
| `documentRegistry.ts` | Pure storage layer over `localStorage`. CRUD + the v1 → v2 migration. No module state — tests stub `localStorage` per-case. |
| `documentStore.ts` | Zustand wrapper exposing `createDocument` / `renameDocument` / `duplicateDocument` / `deleteDocument` / `saveActiveDocument` / `loadActiveDocument` / `setActiveId`. UI subscribers re-render on changes. |
| `exportDocument.ts` | `exportDocument(doc): Blob` (pure) + `downloadDocument(doc, name): void` (synthesizes a `<a download>` click). |
| `importDocument.ts` | `parseDocumentJson(raw): EditorDocument` (pure) + `importDocumentFromFile(file): Promise<EditorDocument>`. Typed `ImportError` for the two failure modes (invalid JSON, schema mismatch). |
| `share.ts` | URL-fragment encoding via lz-string. `encodeDocument(doc)` / `decodeDocument(encoded)` / `shareUrlFor(doc, baseUrl)` / `readSharedFragment(hash)` / `clearSharedFragment()`. `SHARE_URL_MAX_PAYLOAD = 30_000` is the conservative threshold for "fits in a browser URL." |
| `templates/registry.ts` | Template registry: `registerTemplate` / `getTemplate` / `listTemplates`. |
| `templates/builder.ts` | `buildTemplate({ root, adapterId?, themeId? })` walks a `NodeSpec` tree and emits a Craft-shaped serialized envelope. Reads canonical defaults from the registry; deterministic node ids (`node-0`, `node-1`, …) for reproducible JSON. |
| `templates/{empty,landing-page,form}.ts` | Three starter templates shipped Phase 7. Pattern-A-only — multi-canvas templates are a Phase 8 item. |
| `templates/index.ts` | Side-effect barrel importing all template modules so they register at boot. |

Storage shape (v2):

```
craftjs-design:doc-index:v2  → { documents: [{ id, name, created, updated }], activeId }
craftjs-design:doc:<id>:v2   → EditorDocument
```

Plus the user-level Toolbox preferences (favorites / recents) at `craftjs-design.toolbox` — separate namespace.

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
    main.tsx                    # ReactDOM root (dev — Vite app)
    App.tsx                     # Dev boot: side-effect imports + top-shell ErrorBoundary
    main-app.tsx                # Phase 8 dist entry — same side-effects + re-exports for integration consumers
    index.css                   # Tailwind v4 entry + @import safelist.generated.css + @theme inline bridge + token blocks + .mui-bridge
    lib/
      utils.ts                  # shadcn's tailwind-merge-backed cn
    components/
      ui/                       # shadcn primitives (button, input, select, popover, tooltip), managed by `npx shadcn add`
    registry/
      types.ts
      registry.ts
      components/
        index.ts                # barrel of side-effect registrations
        *.ts                    # 48 canonical defs across Phases 3–13
                                #   (layout/content/input/display/navigation/
                                #    feedback/media). dynamic-slots.ts holds the
                                #   pure Tabs/Carousel slot-key helpers.
    adapters/
      types.ts
      AdapterContext.tsx
      AdapterManifestSchema.ts
      shadcn/                   # default adapter — bundled, no external peer
        index.ts                # registerAdapter for all 48 canonicals
        components/             # one .tsx per canonical
      mui/                      # opt-in — optional @mui/material + emotion peers
        index.ts                # registerAdapter for all 48 canonicals
        theme.ts
        Wrapper.tsx
        components/             # one .tsx per canonical (parity with shadcn)
      html/                     # Phase 16 — dependency-free, semantic HTML
        index.ts                # registerAdapter for all 48 canonicals
        components.tsx          # all 48 impls in one file, no UI library
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
      inline.ts                 # composeInlineStyle(style, slot) → React.CSSProperties from style.inline
      responsive-inline.ts      # composeResponsiveInline(style, slot) → CSS class + @media rules
      responsive-inline.test.ts
      safelist-extract.ts       # Phase 8 — pure extractArbitraryClasses(tree) helper
      safelist-extract.test.ts
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
      UndoRedo.tsx                # toolbar buttons + Cmd+Z global handler
      ShareButton.tsx             # Phase 7 — toolbar Share popover (URL or copy-as-JSON)
      ResolverUpdater.tsx         # Phase 7 — hot canonical reload bridge
      canvas/
        ResizeOverlay.tsx         # Phase 7 — fixed-position resize handles overlay
        snap.ts                   # Phase 8 — snapToSizeToken(px) helper
        snap.test.ts
      errors/                     # Phase 8 — 4-layer error boundaries
        ErrorBoundary.tsx         # generic class component (componentDidCatch)
        ErrorBoundary.test.tsx
        fallbacks.tsx             # TopShell / Canvas / Panel / Toolbox typed fallbacks
      documents/
        DocumentMenu.tsx          # Phase 7 — top-bar dropdown (replaces title)
        TemplatePicker.tsx        # Phase 7 — nested popover for starter templates
        useDocumentSwitcher.ts    # Phase 7 — switchTo/createBlank/createFromTemplate
      inspector/
        ResponsiveBar.tsx
        SlotPicker.tsx              # Pattern B canonicals only (>1 slot)
        panel-registry.ts           # registerPanel / unregisterPanel / getPanelsFor
        built-in-panels.ts          # side-effect — registers the 7 built-ins
        TypographyPanel.tsx, LayoutPanel.tsx, SpacingPanel.tsx
        SizePanel.tsx, AppearancePanel.tsx, EffectsPanel.tsx
        PropsPanel.tsx              # top-level Zod schema → form
        fields/
          PropField.tsx             # recursive Zod-kind dispatcher
          ArrayField.tsx            # z.array(...) editor — DnD reorder + add/remove
          ObjectField.tsx           # z.object recursion for nested element schemas
          defaults.ts               # defaultValueFor(schema) for seeded "Add" items
          defaults.test.ts
          arrayOps.ts               # Phase 7 — pure helpers (reorder/swap/removeAt/setAt)
          arrayOps.test.ts
        shared/
          color-conversions.ts    # Phase 8 — hex / rgb / hsl pure helpers
          color-conversions.test.ts
          RgbSliders.tsx, HslSliders.tsx
          EyedropperButton.tsx    # Phase 8 — feature-gated EyeDropper API
          gradient.ts             # Phase 8 — Gradient types + parse / serialize
          gradient.test.ts
          GradientEditor.tsx      # Phase 8 — popover-rendered gradient editor
        shared/
          useNodeClasses.ts       # reads/writes classes + inline; subscribes to activeBreakpoint
          ColorPicker.tsx         # tokens + react-colorful visual picker + hex input
          NumericInput.tsx        # tokens + arbitrary CSS values (px/%/em/…) + step buttons
          BoxSidesEditor.tsx
          CollapsibleSection.tsx
          ValueSelect.tsx         # shadcn Select wrapper with optional renderOption
          ColorSelect.tsx         # deprecated; kept for transition
          PanelRow.tsx
    persistence/
      schema.ts                 # Zod envelope around Craft's serialized JSON
      migrations.ts             # walk-the-tree migrations applied on load
      migrations.test.ts
      documentRegistry.ts       # pure localStorage CRUD + v1→v2 migration
      documentRegistry.test.ts
      documentStore.ts          # Zustand wrapper exposing the multi-doc API
      exportDocument.ts         # Blob/download helpers
      exportDocument.test.ts
      importDocument.ts         # file/JSON parse + ImportError
      importDocument.test.ts
      share.ts                  # lz-string URL-fragment encoding
      share.test.ts
      storage.ts                # empty marker — legacy single-doc API removed
      templates/
        registry.ts             # registerTemplate / listTemplates / getTemplate
        registry.test.ts
        builder.ts              # buildTemplate(NodeSpec) → EditorDocument
        builder.test.ts
        index.ts                # side-effect barrel
        empty.ts, landing-page.ts, form.ts
    sdk/                          # Public boundary — see § SDK boundary
      index.ts                  # re-export entry
      adapter.ts, canonical.ts, style.ts, hooks.ts, panel.ts
      boundary.test.ts          # asserts expected exports + no internal leakage
  examples/                     # SDK consumer examples — sibling to src/
    adapter-chakra/             # Phase 6 — Chakra adapter walkthrough
      index.ts                  # registerAdapter via @design/sdk
      lib.tsx                   # mock primitives (swap for @chakra-ui/react)
      components/               # Box, Heading, Button, Stack, Card impls
      README.md
  docs/
    ARCHITECTURE.md             # this file
    DEVELOPER_GUIDE.md
    SDK_GUIDE.md                # public surface reference
    TUTORIAL_ADAPTER.md         # walkthrough — building an adapter
    TUTORIAL_CANONICAL.md       # walkthrough — adding a canonical
    TUTORIAL_PANEL.md           # walkthrough — adding an inspector panel
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

Either via `Hydrator` (auto, once on mount) or `useDocumentSwitcher` (runtime). Both paths route through `applyEnvelopeSafely`:

1. Read the envelope (`documentRegistry.readDocument(id)` for the registry path, `decodeDocument(fragment)` for the shared-URL path).
2. `validateCraftJson(envelope.craftJson)` — pre-check parses JSON, requires ROOT, verifies every `parent` / `nodes` / `linkedNodes` ref resolves, every `type.resolvedName` is `'div'` or a registered canonical.
3. `actions.deserialize(...)` — Craft replaces the tree.
4. Apply theme + adapter from the envelope.

**Race conditions (§ 1.10).** `applyEnvelopeSafely` returns a `Promise<ApplyEnvelopeResult>`. Work runs through a module-level promise queue + generation counter:

- Each call increments a global generation number; the work is enqueued behind any in-flight apply.
- When the work fires (next microtask), it compares its captured generation to the current global one. If newer calls have come in, the work returns `{ ok: true, superseded: true }` without touching Craft.
- Rapid-fire applies (e.g., user clicks doc B while doc A is mid-load) collapse to "latest wins" — only the final envelope reaches `deserialize`, so the user never sees intermediate canvases.
- A failing apply doesn't block the queue — the `catch` swallows rejections at the queue level so a broken envelope can't strand subsequent loads.

**Two boot paths.** Hydrator's module-level `hydrated` flag is intentionally narrow: it gates **the initial restore from localStorage on first mount**, nothing else. Document switching goes through `useDocumentSwitcher` exclusively (snapshot-current → `setActiveId` → load target → apply). The two paths share the same `applyEnvelopeSafely` queue so they can't race against each other either.

**Failure handling.** If the integrity check fails OR `actions.deserialize` throws, `applyEnvelopeSafely` sets `editorStore.malformedDocument` — `Editor.tsx` swaps the canvas Frame for `<MalformedDocumentBanner>` and the user can inspect, export, or reset. Resetting archives the broken envelope under `craftjs-design:doc:<id>:broken:<timestamp>` before writing the Empty template.

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

### Inspector edit (token value)

1. User selects a node. `Inspector` mounts the applicable panels (filtered by `getApplicablePanels(canonicalDef)`).
2. Each panel calls `useNodeClasses(nodeId, slot)` which returns `{ classString, inlineStyle, writeClasses, writeInline, activeBreakpoint }`. The hook reads either `style.classes[slot]` (base) or `style.responsive[activeBreakpoint][slot]`.
3. The panel calls its slice's `parse*` to decompose `classString` into a typed slice, binds controls to slice fields.
4. User changes a value (e.g., picks `primary` in ColorPicker, picks `'4'` in NumericInput). The panel calls `writeClasses(mergeSlice(classString, patch))` AND clears any matching inline property via `writeInline(cssProp, undefined)` — tokens and arbitrary values stay mutually exclusive.
5. `writeClasses` calls `actions.setProp(nodeId, (props) => …)`. The Immer mutator writes to `props.style.classes[slot]` (base) or `props.style.responsive[bp][slot]` (non-base).
6. Craft re-renders. `CanonicalNode` reads the new style, calls `composeResponsive(style, 'root')` + `composeInlineStyle(style, 'root')`, passes the result through `adapter.classMap` (or default), feeds `className` + `inlineStyle` to the adapter impl.
7. Adapter impl renders `<elt className={cn(className)} style={inlineStyle}>`.

### Inspector edit (arbitrary value)

1. User opens ColorPicker, drags the visual picker or types a hex. NumericInput accepts `13px` and commits on Enter.
2. The panel detects the value isn't in the token enum (or comes from the picker's onChange) and calls `writeInline(cssProperty, value)` AND `writeClasses(mergeSlice(classString, { <field>: undefined }))` — clearing any matching token class.
3. `writeInline` writes to `props.style.inline[slot][cssProperty]`. Always base-level — Phase 4.5 doesn't store responsive arbitrary values.
4. Craft re-renders. `composeInlineStyle` returns the new inline map. The impl receives it as `inlineStyle` and applies it via the rendered element's `style` attribute.
5. Theme swaps don't affect this value (inline style is fixed). That's correct semantically: the user picked a specific color, not a token reference.

### Responsive edit (at a non-base breakpoint)

1. User clicks `md` in `ResponsiveBar`. `setActiveBreakpoint('md')`.
2. Every component using `useEditorStore((s) => s.activeBreakpoint)` re-renders — `ResponsiveBar` itself and every inspector panel via `useNodeClasses`.
3. Each panel's `useNodeClasses` re-reads from `style.responsive.md[slot]` (empty for a fresh md edit → `classString = ''`). The `inlineStyle` read still returns the base inline (Phase 4.5 doesn't store responsive arbitrary).
4. ColorPicker's hex section and NumericInput's arbitrary mode both disable themselves and show "Arbitrary values supported at base breakpoint only." Token pickers remain interactive.
5. User edits a control with a token. The panel writes the new class string to `style.responsive.md[slot]`. `style.classes[slot]` is untouched — the base value survives.
6. `composeResponsive` now emits `<base classes> md:<class1> md:<class2> …`. The browser applies the md-prefixed utilities only at viewports ≥ 768px.

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

This codebase uses Pattern A for single-slot containers. An earlier draft tried to *combine* both ("the component is a canvas AND has a nested canvas slot") and discovered the hard way that competing drop targets break hit-testing — so a Pattern-B node's *outer* element is NOT a canvas; only its named sub-slots are.

**True multi-canvas Pattern B is live** (shipped Phase 6, extended through Phase 13). A canonical declares `canvasSlots` — a static `string[]` or a `(props) => string[]` function — and `CanonicalNode` generates one `<Element canvas id={slot}>` per slot, handing the adapter impl `slotChildren[slot]` to place each independently-droppable region. Five canonicals use it:

- **Card** — static `canvasSlots: ['header', 'body', 'footer']`. Three real drop zones; the inspector also styles each via `styleSlots`.
- **Table** — dynamic, one cell slot per `rows × cols` (with merge handling).
- **Tabs** — dynamic, one slot per tab (keyed by the stable `tab.id`, so renaming a tab's `value` no longer orphans its canvas).
- **Stepper** — dynamic, one slot per step.
- **Carousel** — dynamic, one slot per slide.

`styleSlots` (independently *styleable* regions) is a separate axis from `canvasSlots` (independently *droppable* regions): a Pattern-A canonical can expose several `styleSlots` without any sub-canvas.

### <a id="pattern-b-slot-routing"></a>Pattern B slot routing — `composedClasses` + `composedInlineStyles`

When a canonical's `styleSlots` has more than one entry, the inspector and the adapter impl coordinate via per-slot maps:

1. **Inspector side**: `SlotPicker` exposes the slots as a pill bar. `Inspector` tracks `activeSlot` in local state (resets to `'root'` on selection change). Every class-editing panel receives `slot` as a prop, which it threads into `useNodeClasses(nodeId, slot)`. The hook reads from / writes to `style.classes[slot]` (base) or `style.responsive[bp][slot]` (non-base).

2. **Render side**: `CanonicalNode` iterates `def.styleSlots` and computes `composedClasses[slot]` + `composedInlineStyles[slot]` for each. These maps are passed to the adapter impl alongside the root-slot `className` / `inlineStyle` (which are duplicates of the root entries, kept for Pattern A backwards compat).

3. **Adapter side**: Pattern B impls read the maps:

   ```tsx
   export function ShadcnCard({ composedClasses = {}, composedInlineStyles = {}, ... }) {
     return (
       <Card className={composedClasses.root} style={composedInlineStyles.root}>
         <CardHeader className={composedClasses.header} style={composedInlineStyles.header}>…</CardHeader>
         <CardContent className={composedClasses.body} style={composedInlineStyles.body}>{children}</CardContent>
         <CardFooter className={composedClasses.footer} style={composedInlineStyles.footer}>…</CardFooter>
       </Card>
     )
   }
   ```

The Inspector's `Delete` action always deletes the *node*, never the slot — slots aren't first-class deletable entities; they're styling regions of the same node.

### Toolbox UX — categories, search, favorites, recents

The Toolbox is more than a flat list of components. It's the user's primary index into the registry and gets the UX time accordingly.

**Categories**: components are grouped by `def.category` (`layout`, `content`, `navigation`, `media`, `display`, `input`, `feedback`) with a fixed display order in `Toolbox.tsx`'s `CATEGORY_ORDER`. Anything with an unrecognized category falls into "Other" at the bottom — defensive, so new categories don't silently disappear.

**Search**: a single text input filters by `displayName`, `id`, or any tag (case-insensitive substring). The Favorites and Recents sections also filter — an empty result hides them rather than showing empty stub sections.

**Favorites**: per-component star icon toggles a canonical id in the user's favorites set. Favorites render in their own section at the top.

**Recents**: tracks the last 5 dragged canonicals via an LRU on the button's `onMouseDown` (fires whether or not the drag completes — approximates "intent to use"). The LRU lives in user state alongside favorites.

**Persistence**: both favorites and recents persist to `localStorage['craftjs-design.toolbox']` — a *separate* key from the document envelope (`craftjs-design:doc:v1`). Toolbox preferences are user-level; they survive document switches and aren't part of the saved document.

### <a id="multi-canvas-via-canvasslots"></a>Multi-canvas Pattern B via `canvasSlots`

The Container Pattern decision (above) describes Pattern A — outer node is the single canvas — and earlier reserved Pattern B for genuine composites. Phase 6 ships Pattern B for Card.

The contract: a canonical declares `canvasSlots: readonly string[]`. When set, `CanonicalNode` generates one `<Element id={slot} is="div" canvas/>` wrapper per slot and passes the wrappers via `slotChildren: Record<string, ReactNode>`. Each wrapper becomes a linked Craft child node — its own drop zone with its own subtree. The outer canonical node is NOT a canvas (declaring `isCanvas: false`); declaring both would create competing drop targets and break hit-testing.

The adapter impl places each wrapper inside its corresponding DOM region:

```tsx
function ShadcnCard({ slotChildren = {}, composedClasses = {} }: AdapterRenderProps) {
  return (
    <Card className={composedClasses.root}>
      <CardHeader className={composedClasses.header}>{slotChildren.header}</CardHeader>
      <CardContent className={composedClasses.body}>{slotChildren.body}</CardContent>
      <CardFooter className={composedClasses.footer}>{slotChildren.footer}</CardFooter>
    </Card>
  )
}
```

Empty slot wrappers are invisible by default (zero height when their `<Element>`'s linked node has no children). The `.canvas-slot` class on each wrapper + `:empty` CSS in `src/index.css` give them a min-height + a dashed outline + a "Drop here" hint when empty. Disappears the moment the slot has children.

`getCanvasSlots(def)` is the single resolution function:
- Explicit `canvasSlots: [...]` → Pattern B multi-canvas.
- `canvasSlots` unset, `isCanvas: true` → Pattern A (legacy single canvas via `['root']`).
- `canvasSlots` unset, `isCanvas: false` → no canvas (leaf).

Tabs stays props-driven in Phase 6 — its canvas count varies with `props.tabs.length`, which is a different complexity class from Card's fixed three slots. Phase 7 will revisit.

### <a id="responsive-arbitrary-via-runtime-style-injection"></a>Responsive arbitrary inline via runtime `<style>` injection

Phase 4.5 limited arbitrary CSS values (hex colors, custom `13px` spacing) to the base breakpoint because the inline-style HTML attribute can't carry `@media` queries. Phase 6 lifts the limit using runtime CSS injection rather than a Vite-time safelist.

For each slot that has at least one entry in `style.responsiveInline[bp][slot]`, `CanonicalNode`:

1. Calls `composeResponsiveInline(style, slot)`, which content-hashes the slot's combined inline (base + responsive) into a stable class id like `ri-3jvn7`.
2. Generates CSS rules — base declarations + one `@media (min-width: …)` block per breakpoint.
3. Appends the class id to `composedClasses[slot]`.
4. Emits the CSS inside an inline `<style>` element rendered as a sibling of the impl.
5. **Skips** `composedInlineStyles[slot]` for that slot — base inline now lives inside the class so the inline-style attribute's higher specificity doesn't beat the `@media` class rule.

The content-hash means two nodes with identical responsive styling share the same class id; the browser dedups identical rules across multiple `<style>` tags effectively. No collector, no coordination, no flash-of-unstyled-content.

Compared to a Vite-time safelist this approach trades a small per-node `<style>` cost for simplicity. The full Vite safelist option was kept on the table but not pulled — runtime injection is sufficient for current document sizes.

### <a id="sdk-boundary"></a>SDK boundary — public surface in `src/sdk/`

Phase 6 carved out `src/sdk/` as the public boundary for adapter / canonical / panel authors. Two motivations:

1. **Stability.** Internal types in `src/adapters/types.ts`, `src/registry/types.ts`, etc. evolve as the editor's internals shift. A pinned public surface insulates SDK consumers from those moves.
2. **Discoverability.** A single import path (`@design/sdk`) is documentable in a way "import from this file or that file deep inside the project" is not.

The boundary is **mostly social** — the lint rule (when added) catches accidental cross-boundary imports in `examples/`, the boundary test catches accidental export removal, and ongoing review catches "would an SDK consumer reach for this?" That triad together is enough; full per-package separation would slow internal refactors without proportional benefit.

The path alias `@design/sdk` is wired in three places (must stay in sync):
- `tsconfig.json` (root) — for tooling that reads the root config (shadcn CLI, etc.).
- `tsconfig.app.json` — for `tsc -b`.
- `vite.config.ts` — for runtime resolution.

Internal adapters dogfood the boundary — `src/adapters/{shadcn,mui}/index.ts` import `registerAdapter` from `@design/sdk`. The Chakra example at `examples/adapter-chakra/` imports ONLY from the SDK, proving an external author can build an adapter without touching internal modules.

### <a id="panel-registry"></a>Pluggable inspector panels

Phase 6 replaced the Inspector's hardcoded `panels.includes('layout') && <LayoutPanel/>` cascade with a panel registry. `PanelDefinition` describes a panel:

```ts
interface PanelDefinition {
  id: string                                    // 'layout' | 'spacing' | ... | custom
  displayName: string
  order: number                                 // sort key; built-ins use 10–70
  applicableTo: (def: CanonicalComponent) => boolean
  component: ComponentType<{ nodeId: string; slot: string }>
}
```

The 7 built-ins (Layout, Size, Spacing, Typography, Appearance, Effects, Properties) register themselves at module load via `src/editor/inspector/built-in-panels.ts`. External panels register the same way via `registerPanel` from `@design/sdk`.

Resolution (`getPanelsFor(def)`):
1. If `def.applicablePanels` is set, that's a whitelist — only registered panels whose id appears in the list render. Preserves the legacy semantics where Button explicitly excludes typography.
2. Otherwise, each panel's `applicableTo(def)` predicate decides.

Inspector iterates the resolved list, sorts by `order`, and renders each via `<panel.component nodeId={...} slot={activeSlot} />` wrapped in a `CollapsibleSection`. The PropsPanel passes `slot` but ignores it (it edits canonical props, not slot classes).

### <a id="document-lifecycle"></a>Document lifecycle (Phase 7)

The Phase-6 editor had one document. Phase 7 turned that into a vocabulary — designers create, name, switch, duplicate, share, import, export.

**Storage.** Two key shapes:
- `craftjs-design:doc-index:v2` — the index. `{ documents: [{id,name,created,updated}], activeId }`.
- `craftjs-design:doc:<id>:v2` — one envelope per document.

Old Phase-5/6 documents stored at `:doc:v1` migrate to a single "Untitled" entry in the v2 index on first read. The legacy key is removed after migration; subsequent reads see the v2 state.

**Boot flow:** `Hydrator` runs once on mount. Two branches:
1. **Shared URL** — if `window.location.hash` matches `#doc=<encoded>`, decode via `share.decodeDocument`, create a new "Shared document" entry via `documentStore.createDocument`, deserialize into Craft, clear the fragment. Non-destructive: the user's previous active doc stays in the index.
2. **Active doc** — otherwise `documentStore.loadActiveDocument()` returns the active blob; `actions.deserialize` replaces the Craft tree; theme + adapter restore from the envelope.

**Switch flow:** `useDocumentSwitcher.switchTo(id)` snapshots the current canvas via `query.serialize()` + `saveActiveDocument`, swaps `activeId`, loads the target's blob (or falls back to the Empty template seed for never-saved docs), and `deserialize`s. Auto-save before switch means in-progress changes never vanish silently.

**Import / Export.** `exportDocument(env)` returns a Blob; `downloadDocument(env, name)` triggers a download. `importDocumentFromFile(file)` reads + validates + migrates. The SaveLoadBar Import button overwrites the active doc; the Hydrator's shared-URL branch creates a new doc. Two gestures, two defaults — see the close-out section in `PHASE7_PLAN.md`.

**Share.** `share.shareUrlFor(env, baseUrl)` produces a URL with the lz-string-compressed envelope in the fragment. The `ShareButton` popover renders the URL ready to copy. Encoded payloads over `SHARE_URL_MAX_PAYLOAD` (30 KB) flip to a "Copy as JSON" fallback — the user pastes into another editor's Import. Documents shared via URL are visible to anyone with the link AND to anyone with browser history access; documented as a privacy note in the popover.

**Templates.** Three starter templates ship: Empty, Landing page, Sign-up form. Each is built via `buildTemplate({ root: NodeSpec })` which produces a valid Craft envelope from a TS-authored spec (better than hand-typed JSON — type-checked against the live canonical registry). Templates register at module load via `App.tsx`'s side-effect import.

**Hot canonical reload (Phase 7 polish).** `registerCanonical` post-mount bumps `registryVersion`. The Toolbox subscribes via `useSyncExternalStore` and re-renders to show the new entry. A side-effect `<ResolverUpdater />` inside `<Craft>` calls `actions.setOptions((opts) => { opts.resolver = getResolver() })` on every bump, so Craft's internal resolver picks up new canonical ids for dragging + deserialization. Existing canvases that reference a *removed* canonical fall back to the missing-impl placeholder.

### <a id="drag-resize-overlay"></a>Drag-resize via canvas overlay

Phase 6 shipped resize as an Inspector toggle (CSS `resize: both` on the selected node's DOM, captured on toggle-off). Phase 7 replaced it with a fixed-position canvas overlay (`<ResizeOverlay />`).

The overlay sits outside the Craft `<Frame>` tree, positioned over the selected node's bounding rect. Four corner handles. The position recomputes on selection change, window resize, scroll (capture phase, to catch the canvas `<main>`'s independent scroller), and `ResizeObserver` ticks on the node DOM.

Mousedown on a handle stops propagation (defense against any document-level Craft listener) and starts a drag loop: mousemove writes directly to `dom.style.width/height` (no React render → smooth 60fps), mouseup commits the final px to `style.inline.root.{width,height}` via `actions.setProp`. The setProp re-render passes the same value back through React's style prop pipeline, so there's no visible jump.

Craft drag-connector conflict: the handles aren't inside any Craft node's DOM (the overlay is its own subtree, rendered as a sibling of `<Frame>`), so Craft's per-node mousedown listeners never see the handle's pointer events. `e.stopPropagation()` is belt-and-suspenders for future Craft versions.

### <a id="selection-model"></a>Selection model — editorStore is the UI source of truth (Phase 11)

Multi-select (Phase 11 § 3.3) split selection into two stores with a one-way bridge:

- **`editorStore.selection: string[]`** is the source of truth for the UI — Inspector, Layer tree, breadcrumbs, secondary-selection outlines all subscribe here.
- **Craft's `events.selected`** stays the source of truth for the document/connector layer (resize overlay, default left-click connector, drag).
- **`useSelectionSync`** mirrors Craft → editorStore one-way: when Craft's single-node selection changes (left-click connector, etc.), it resets `editorStore.selection = [id]`.

Every user-initiated selection entry point (layer-tree click, keyboard arrow-nav, canvas search jump, modifier-click) writes `editorStore.setSelection(...)` **synchronously via `flushSync`** and *then* calls `actions.selectNode`. This is load-bearing: `useSelectionSync`'s mirror runs in a passive `useEffect` (after paint), so relying on it alone left the editorStore-backed surfaces one frame behind the canvas — visible as off-by-one layer-tree clicks and laggy arrow-nav. `flushSync` commits the editorStore subscribers in the same frame as the Craft-backed canvas outline. Modifier-click semantics (toggle / range) are pure functions in `editor/selection/modifierSelection.ts`.

### <a id="layer-tree"></a>Layer tree placement — tab-toggle, not a third sidebar (Phase 11 § 3.4)

The layout had two `<aside>` + one `<main>`. A third always-on sidebar for the layer tree would have eaten canvas width. **Decision: toggle-replace** — a tab strip at the top of the existing left aside switches between `Components` (Toolbox) and `Layers` (`<LayerTree>`); the choice persists in localStorage (`craftjs-design.left-aside-tab:v1`). Designers rarely need component-search and the layer tree open simultaneously, so toggling preserves real estate. `buildTreeShape` flattens the Craft tree into a DFS pre-order list (pure, testable) consumed by both plain rendering and `@tanstack/react-virtual` (engaged past 50 visible rows). Drag-reorder uses HTML5 DnD with a `wouldCreateCycle` guard.

### <a id="alignment-guides"></a>Alignment guides — visual-only over Craft's drag (Phase 11 § 3.6)

Smart guides depend on a drag *coordinate* model, but Craft uses native HTML5 drag-and-drop: the source element doesn't move during a drag (the browser renders a "drag image" ghost), and there's no `pointermove` stream — only `dragover` on drop targets, committed via insertion-index `actions.move`. The two escalation paths to true coordinate-snap — (1) a custom pointermove drag layer that bypasses Craft for in-document moves, or (2) forking `@craftjs/core` for a `beforeMove` hook — are each a weeks-scale rewrite and would force absolute positioning onto canvas nodes that currently live in flex flow.

**Decision: visual-only for v1.** `useDragGuides` listens to `dragover`, builds a "dragged rect" centered on the pointer, and runs the pure `alignmentMatches` math against same-parent sibling rects. Matching edges draw red guide lines (`<GuideOverlay>`, ≤2 lines, 4px threshold); Alt bypasses; guides are suppressed inside Pattern B multi-canvas slots. The drop still commits through Craft's normal insertion-index move — no coordinate snap. Designers get the alignment *hint* (the high-value half of the Figma behavior) without the drag-layer rewrite. Coordinate snap is a documented Phase 12+ stretch.

### <a id="image-provider"></a>Asset backend — host-pluggable image provider (Phase 11 § 3.10)

`<EditorImageProvider>` is a React context with `{ upload, list, delete?, canList }`. Hosts wrap the editor to route uploads to their backend; absent a wrapper, a default provider inlines base64 data URLs and remembers session uploads in module scope (so the library lists all uploads, not just whatever `src` currently sits on a node). `canList` gates the host-only `AssetLibraryPanel` (the Inspector calls `useEditorImageProvider()` unconditionally and filters the panel out when false — `applicableTo` can't read context). The `ImagePicker` (Image `src` field) shows the union of provider `list()` + a document scan of existing Image `src` values.

### <a id="hot-canonical-reload"></a>Hot canonical reload — version counter + setOptions

`registry.ts` exposes a monotonic `registryVersion` counter that increments on every `registerCanonical` / `unregisterCanonical` *after the Editor has mounted* (`editorMounted` flag flipped by `Editor.tsx`'s `useEffect`). Pre-mount registrations don't bump — they're part of the initial resolver build and there are no subscribers yet.

Two consumers subscribe via `subscribeRegistry`:
- **Toolbox** — `useSyncExternalStore` triggers a re-render → `listComponents()` returns the new set → palette updates.
- **ResolverUpdater** — same `useSyncExternalStore` pattern → `actions.setOptions((opts) => { opts.resolver = getResolver() })` swaps Craft's internal resolver to a fresh build. New canonical ids are now resolvable for drag-create + deserialization.

The cached resolver in `craft/resolver.tsx` is keyed by `cachedAtVersion`; renders that don't move the version reuse the cache.

Caveats documented in the SDK:
- Existing nodes referencing a *removed* canonical render the missing-impl placeholder (same path as cross-adapter coverage gaps).
- Hot-replacing a canonical (same id, different `propsSchema`) doesn't re-validate existing node props. Old props on the new schema can produce unexpected behavior.

### Form components are non-interactive in editor mode

Select, Checkbox, Radio, Switch, and Textarea would be unusable in the editor if they responded to clicks: every click on a checkbox during *editing* would toggle the prop's stored value, and the user can't actually edit the prop visibly. The adapter impls render them with `onChange` / `onCheckedChange` / `onValueChange` set to no-ops (`() => {}`), and Textarea uses native `readOnly`. The canonical's stored `checked` / `value` / `defaultValue` props drive what's shown; the user edits them via PropsPanel.

This is **only** a property of the editor preview — when the same document is rendered outside the editor (e.g., a future "preview" or "publish" mode), no-op handlers can be replaced with real ones. The non-interactive behavior lives in the adapter impls' editor-mode code, not in the canonical contract.

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

### <a id="adapter-impls-consume-rendered-classname"></a>Adapter impls consume rendered `className` + `inlineStyle`, never `style.classes.root`

`CanonicalNode` composes responsive breakpoint slices into a single Tailwind-prefixed class string AND merges arbitrary inline values from `style.inline[slot]` before invoking the adapter impl. The composed string lands on `className` (or `sx`); the inline style lands on `inlineStyle`.

```tsx
// ✅ Right
export function ShadcnBox({ children, rootRef, className, inlineStyle }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</div>
}

// ❌ Wrong — bypasses composeResponsive AND composeInlineStyle
export function ShadcnBox({ style, children, rootRef }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(style.classes.root)}>{children}</div>
}
```

The wrong version works for *base*-only editing with token-only values — that's exactly what `style.classes.root` contains. The bug surfaces only when (a) responsive variants enter play, or (b) the user picks an arbitrary value via ColorPicker / NumericInput. In both cases the wrong-version impl silently drops the additions.

This convention isn't enforced by the type system — `style` is still in `AdapterRenderProps` for impls that need to read individual *slot* classes or other style metadata. Discipline-by-convention only. The developer guide spells it out.

### Arbitrary values stored as inline CSS, not Tailwind classes

Tailwind v4's JIT compiles classes by scanning source files for *literal* strings. Inspector-emitted classes (`text-${size}`, `bg-${color}`) are caught by the generated safelist because their value sets are known. But truly **arbitrary** values — `bg-[#fa8072]`, `p-[13px]` — can't be safelisted; the input space is infinite. The full solution (per-document safelist generated at save time, watched by Vite, regenerated on doc load) is a real engineering project.

The pragmatic alternative ColorPicker and NumericInput use: write arbitrary values as inline `style={{...}}` instead of Tailwind classes. Inline styles always apply; no compilation needed.

**Trade-off:** inline `style="..."` attributes don't support `@media` queries. So arbitrary values only work at the **base** breakpoint. Non-base breakpoints lock to token-only via the inspector's disabled state (ColorPicker hex section greys out; NumericInput rejects arbitrary on commit). The user is informed via hint text on the disabled controls.

Tokens and arbitrary values are **mutually exclusive** per CSS property at the panel level — picking a token clears the matching `inline[cssProperty]`, and vice versa. The two never coexist for the same property on the same node, so there's no specificity confusion.

Inline-style storage shape:

```ts
interface NodeStyle {
  classes: Record<string, string>
  responsive?: Record<string, Record<string, string>>
  inline?: Record<string, Record<string, string>>   // slot → CSS prop → value
}
```

`composeInlineStyle(style, 'root')` reads `style.inline.root` and returns it as `React.CSSProperties` for the adapter. Empty/undefined returns undefined (so React doesn't take a no-op style-prop change).

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

### The style "dimension" — breakpoint × state (Phase 12)

A node's styling is addressed along two orthogonal axes: **breakpoint**
(`base`, `sm`…`2xl`) and **pseudo-class state** (`base`, `hover`, `focus`,
`active`). Their cross-product yields four storage quadrants for classes
and four for inline values on `NodeStyle`:

| | base state | pseudo-state |
|---|---|---|
| base bp | `classes` / `inline` | `states` / `stateInline` |
| named bp | `responsive` / `responsiveInline` | `stateResponsive` / `stateResponsiveInline` |

The complexity is funneled through one dispatch table (`src/style/dimensions.ts`):
`read/writeBucketClasses` and `read/writeBucketInline` take
`(slot, breakpoint, state)` and land in the right quadrant. Panels never
see the quadrants — they call `useNodeClassesMulti`, which reads
`editorStore.activeBreakpoint` + `activeState` and routes accordingly.
Composition (`responsive.ts`, `responsive-inline.ts`) emits classes in
breakpoint-outermost order (`md:hover:…`) and promotes state inline values
into generated `.cls:hover` rules (an inline `style` attribute would
otherwise beat a pseudo-class rule by specificity). The selected node
previews a non-base state on the canvas by applying that quadrant's styles
unprefixed (`CanonicalNode`).

### Theme token derivation (Phase 12)

Themes are authored from a small `tokens` map (often just `primary`).
`deriveTokens(tokens, scheme)` (`src/themes/tokens.ts`) is a pure function
that fills the full shadcn core set: neutrals from scheme defaults
(light/dark), `card`/`popover` from `background`, `ring` from `primary`,
each `*-foreground` via a lightness-contrast heuristic, sidebar accents in
step. `themeTokensToCss` renders a `[data-theme]` block (+ optional
`.dark[data-theme]`), injected into one `<style data-craftjs-theme-tokens>`
element — the same runtime-injection mechanism as font tokens. The visual
theme editor reuses this exact derivation for its live preview, so what a
designer previews is what `registerTheme` produces. Color mode
(`light`/`dark`/`system`) lives in `editorStore`, persists in the document,
and `ThemeProvider` applies `.dark` to the canvas wrapper only.

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
- **`craftJson`**: an opaque string. Treat it as a blob; never parse and rewrite it directly. Each canonical node's `props.style` carries up to three fields: `classes` (base slot → class string), `responsive` (breakpoint → slot → class string) once the user has authored breakpoint variants, and `inline` (slot → CSS property → value) once the user has picked arbitrary hex colors or px sizes.

The `:v1` suffix on the storage key reserves namespace for a future v2 envelope to coexist during migration.

The `activeBreakpoint` (which breakpoint the user is currently editing) is **not** persisted — it's a UI mode, not a document property. It resets to `'base'` on every reload.

**Migrations (`src/persistence/migrations.ts`).** `documentRegistry.readDocument` pipes the deserialized envelope through `migrateDocument` before handing back. Each migration step walks the opaque Craft JSON and mutates node shapes in place. Steps are idempotent; running them on an already-current document is a no-op. Phase 6 added one step (Card-prop strip + `isCanvas` flip). Phase 7 added one step (Tabs `content`-field strip per tab). Add a new migration step when bumping the envelope shape OR when changing a canonical's persisted shape in a way the current code can't read.

---

## Extension Points

For step-by-step recipes (adding a canonical, adding an adapter, adding a theme), see [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md). The contracts those recipes touch are stable: `CanonicalComponent`, `Adapter`, `Theme`, `AdapterRenderProps`.
