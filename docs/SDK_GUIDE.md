# SDK Reference

Public surface exported from `@crafted-design/editor/sdk` (alias
`@design/sdk` in this repo). SDK consumers MUST import only from these
paths — reaching into `src/adapters/types`, `src/registry/types`, etc. is
unsupported and can break across versions. ESLint's
`no-restricted-imports` rule enforces this for `examples/**`.

This document is the **narrative reference** — what each surface is for,
how it composes, and why the boundaries are drawn where they are. For
authoritative function signatures + parameter tables, see the
auto-generated TypeDoc reference at [`docs/api/`](./api/README.md). The
TypeDoc reference is regenerated from JSDoc on each `npm run docs`; if
the prose below contradicts the reference, the reference wins.

For task-oriented walkthroughs (writing an adapter, a canonical, or a
panel), see [`TUTORIAL_ADAPTER.md`](./TUTORIAL_ADAPTER.md),
[`TUTORIAL_CANONICAL.md`](./TUTORIAL_CANONICAL.md),
[`TUTORIAL_PANEL.md`](./TUTORIAL_PANEL.md).

---

## Adapter surface

Adapters wrap a UI library and render canonical components.

### Types

#### `Adapter`

Top-level adapter manifest. Three required fields, five optional.

```ts
interface Adapter {
  id: string
  displayName: string
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>

  Wrapper?: ComponentType<{ children: ReactNode }>
  themeTokens?: Record<string, string>
  classMap?: ClassMapFn
  mount?: () => void
  unmount?: () => void
}
```

- `id` — stable string identifier. Persisted in saved documents.
- `displayName` — shown in the AdapterSwitcher.
- `components` — map of canonical id → React renderer.
- `Wrapper` — global provider (theme, locale). **Must be a pure context
  provider.** No document listeners, no global CSS, no browser API mutation.
- `themeTokens` — CSS variable declarations to inject when active.
- `classMap` — rewrites canonical Tailwind classes into adapter-native
  render props (mostly used by `sx`-style libraries like MUI).
- `mount` / `unmount` — imperative side-effect hooks.

#### `AdapterRenderProps`

Every adapter component receives this shape.

```ts
interface AdapterRenderProps {
  canonicalId: CanonicalId
  props: Record<string, unknown>       // user-set component props
  style: NodeStyle                     // raw style data
  children?: ReactNode
  rootRef?: (el: HTMLElement | null) => void

  // Pattern A — single root slot
  className?: string
  sx?: Record<string, unknown>
  inlineStyle?: CSSProperties

  // Pattern B — per-slot maps
  composedClasses?: Record<string, string>
  composedInlineStyles?: Record<string, CSSProperties>
  slotChildren?: Record<string, ReactNode>
}
```

Rules of thumb:
- **Pattern A impls** read `className`, `inlineStyle`. Forward `rootRef` to
  the outermost real DOM element so Craft's connectors attach.
- **Pattern B impls** read `composedClasses[slot]`,
  `composedInlineStyles[slot]`, and `slotChildren[slot]` per named region.

### Functions

| Name | Purpose |
|---|---|
| `registerAdapter(adapter)` | Register an adapter at module load. Validated via Zod manifest. |
| `listAdapters()` | All registered adapters in registration order. |
| `useActiveAdapter()` | React hook returning the currently-active adapter. |

---

## Canonical surface

Canonicals are abstract palette entries — Box, Button, etc. — that adapters
render concretely.

### Types

#### `CanonicalComponent<Props>`

```ts
interface CanonicalComponent<Props = Record<string, unknown>> {
  id: CanonicalId
  category: CanonicalCategory
  displayName: string
  tags: readonly string[]
  isCanvas: boolean
  styleSlots: readonly string[]
  canvasSlots?: readonly string[] | ((props: Props) => readonly string[])
                                       // multi-canvas Pattern B
  propsSchema: z.ZodType<Props>
  defaults: { props: Props; style: NodeStyle }
  applicablePanels?: readonly PanelId[]
}
```

- `isCanvas` — true if the **outer** node itself is a canvas (Pattern A).
  False for leaves AND for Pattern B composites where named sub-slots are
  the canvases.
- `styleSlots` — named buckets for class strings. `['root']` for Pattern A;
  more for Pattern B.
- `canvasSlots` — when set, CanonicalNode generates one `<Element canvas>`
  wrapper per slot and passes them via `slotChildren`. Outer is NOT a
  canvas; inner slots are. **Function form**: supply
  `(props) => readonly string[]` for dynamic counts — Tabs uses this to
  expose one canvas per `props.tabs` entry. Adding/removing entries via
  PropsPanel updates the canvas list on next render.

#### `NodeStyle`

```ts
interface NodeStyle {
  classes: Record<string, string>                  // slot → base class string
  responsive?: Record<string, Record<string, string>>  // bp → slot → classes
  inline?: Record<string, Record<string, string>>      // slot → cssProp → value (base)
  responsiveInline?: Record<string, Record<string, Record<string, string>>>
                                                       // bp → slot → cssProp → value
  // pseudo-class states, composing with breakpoints
  // (state ∈ 'hover' | 'focus' | 'active'):
  states?: Record<string, Record<string, string>>      // state → slot → classes
  stateResponsive?: Record<string, Record<string, Record<string, string>>>
                                                       // bp → state → slot → classes
  stateInline?: Record<string, Record<string, Record<string, string>>>
                                                       // state → slot → cssProp → value
  stateResponsiveInline?: Record<string, Record<string, Record<string, Record<string, string>>>>
                                                       // bp → state → slot → cssProp → value
}
```

A runtime Zod schema for this shape (`nodeStyleSchema`) backs the semantic
document validation pass.

#### `CanonicalCategory`

`'layout' | 'input' | 'display' | 'navigation' | 'feedback' | 'media' | 'content'`

#### `PanelId`

`'layout' | 'spacing' | 'size' | 'typography' | 'appearance' | 'effects' | 'componentProps'`

### Functions

| Name | Purpose |
|---|---|
| `registerCanonical(def)` | Register a canonical. Preferred SDK name. |
| `registerComponent(def)` | Identical alias kept for backwards compatibility. |
| `unregisterCanonical(id)` | Remove a canonical. Useful when overriding a built-in. |
| `listComponents()` | All registered canonicals. |
| `getComponent(id)` | One canonical by id. |
| `getComponentByDisplayName(name)` | One canonical by displayName. |
| `getApplicablePanels(def)` | Legacy helper returning panel ids; prefer `getPanelsFor` for new code. |
| `getCanvasSlots(def)` | Resolves canvas slots (explicit `canvasSlots`, or `['root']` if `isCanvas`, else `[]`). |

**Hot canonical reload**: `registerCanonical` / `unregisterCanonical`
called AFTER the editor mounts bump an internal version counter; the Toolbox
+ Craft's internal resolver pick up the change without a reload. Existing
canvas content keeps rendering — unaffected canonicals stay live; nodes
referencing a *removed* canonical fall back to the missing-impl placeholder.
Hot-replacing a canonical (`unregister` → `register` with the same id +
different `propsSchema`) does NOT re-validate existing node props —
documents may carry stale prop shapes.

---

## Inspector panel surface

Panels render inside the Inspector for selected nodes. Built-ins register
themselves at module load; SDK consumers add custom panels the same way.

### Types

#### `PanelDefinition`

```ts
interface PanelDefinition {
  id: string
  displayName: string
  order: number                                       // sort key; built-ins use 10–70
  applicableTo: (def: CanonicalComponent) => boolean
  component: ComponentType<{ nodeId: string; slot: string }>
}
```

Resolution: if the canonical sets `applicablePanels`, that list is a
whitelist — only panels with those ids render. Otherwise each panel's
`applicableTo` predicate decides.

### Functions

| Name | Purpose |
|---|---|
| `registerPanel(def)` | Register an inspector panel. Re-registering replaces. |
| `unregisterPanel(id)` | Remove by id. Returns true if removed. |
| `listPanels()` | All panels, sorted by `order`. |
| `getPanelsFor(canonicalDef)` | Resolved list for a specific canonical. |

---

## Font tokens

The Typography panel's Font dropdown reads from a registry. Built-ins
(`sans`, `heading`, `mono`) seed at boot; SDK consumers add more.

### Types

#### `FontToken`

```ts
interface FontToken {
  id: string         // lowercase + digits + hyphens; used as `font-<id>` class
  name: string       // display name in the Typography dropdown
  family: string     // CSS font-family value
  url?: string       // optional @font-face source for hosted webfonts
}
```

### Functions

| Name | Purpose |
|---|---|
| `registerFontToken(token)` | Add a font. URL-backed tokens inject `@font-face`; all tokens inject `.font-<id> { font-family: ... }` into `document.head`. |
| `unregisterFontToken(id)` | Remove. Returns true if a token was removed. |

`registerFontToken` validates the id (lowercase, digits, hyphens only) —
throws on invalid input. Re-registering the same id overwrites.

```ts
import { registerFontToken } from '@crafted-design/editor/sdk'

registerFontToken({
  id: 'inter',
  name: 'Inter',
  family: '"Inter Variable", sans-serif',
  url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
})
```

After registration, "Inter" appears in the Typography panel's Font
dropdown on next render (the panel re-captures the registry on selection
change — full hot-reload isn't supported yet).

## ColorPicker gradient values

The `ColorPickerValue` discriminated union extended with a `gradient`
variant. Adapters / custom panels that render the color picker can opt in
to gradients via the `allowGradient` prop.

```ts
type ColorPickerValue =
  | { kind: 'token'; token: TokenColor }
  | { kind: 'hex'; hex: string }
  | { kind: 'gradient'; gradient: Gradient }
  | { kind: 'unset' }

interface Gradient {
  type: 'linear' | 'radial'
  angle: number                             // linear only: 0–360°
  position: { x: number; y: number }        // radial only: 0–100 (%)
  stops: GradientStop[]                     // 2–8 entries
}

interface GradientStop {
  color: string                             // hex
  position: number                          // 0–100
}
```

Gradient values serialize via `gradientToCss(g)` and persist to
`style.inline[slot].background` (CSS longhand). The built-in AppearancePanel
demonstrates the routing — `Fill` accepts gradients, `Border Color`
doesn't (border-image would require a different rendering path).

## Hooks

#### `useNodeClasses(nodeId, slot = 'root')`

Read/write helper for a node's slot. Returns:

```ts
{
  classString: string                  // active-breakpoint class string for the slot
  inlineStyle: Record<string, string>  // base-breakpoint inline (slot scoped)
  writeClasses(next: string): void
  writeInline(cssProperty: string, value: string | undefined): void
  activeBreakpoint: 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}
```

Routes reads/writes between `style.classes` / `style.inline` (base) and
`style.responsive` / `style.responsiveInline` (non-base) based on the
editor's current `activeBreakpoint`. Use this hook in custom panels instead
of poking Craft state directly.

---

## Theme tokens, color variables, fonts, safelist (0.3.0)

### Theme token API

`registerTheme` accepts a small `tokens` map (and optional `darkTokens`);
`deriveTokens` fills the full shadcn core set and the `[data-theme]`
(+ `.dark[data-theme]`) CSS block is generated and injected for you — no
hand-written CSS.

```ts
import { registerTheme } from '@crafted-design/editor/sdk'

registerTheme({
  id: 'forest',
  displayName: 'Forest',
  tokens: { primary: 'oklch(0.55 0.18 145)', primaryForeground: 'oklch(0.98 0.02 145)' },
  darkTokens: { primary: 'oklch(0.7 0.16 145)' },
})
```

Exports: `registerTheme`, `unregisterTheme`, `getTheme`, `listThemes`,
`deriveTokens`, `themeTokensToCss`; types `Theme`, `ThemeInput`,
`ThemeTokens`, `ColorScheme`. `dataThemeValue` defaults to the id.

### Color-variable source

Surface host CSS custom properties in the ColorPicker:

```tsx
import { EditorColorVariablesProvider } from '@crafted-design/editor/sdk'

<EditorColorVariablesProvider variables={[{ name: 'brand-blue', label: 'Brand Blue' }]}>
  <Editor />
</EditorColorVariablesProvider>
```

Picking one writes `var(--brand-blue)`. Exports: `EditorColorVariablesProvider`,
`useColorVariables`; types `ColorVariable`, `EditorColorVariablesValue`.

### Curated fonts (without uploading)

`registerSystemFonts()` adds OS font stacks (no network);
`registerGoogleFonts()` adds popular Google fonts via one combined CDN
`<link>` (opt-in). Both register tokens that appear in the Font dropdown.
Exports: `registerSystemFonts`, `registerGoogleFonts`, `SYSTEM_FONTS`,
`GOOGLE_FONTS`, `googleFontsHref`; type `GoogleFont`. (In-editor upload is
built in via the "Fonts" panel — no host code needed.)

### Safelist Vite plugin (optional)

A separate, node-only subpath — `@crafted-design/editor/vite-plugin`:

```ts
import { craftedDocumentSafelist } from '@crafted-design/editor/vite-plugin'

export default defineConfig({
  plugins: [craftedDocumentSafelist({
    documents: ['./saved/home.json', './saved/about.json'],
    outFile: './src/safelist.docs.css', // @import this from your CSS
  })],
})
```

Scans saved documents for the arbitrary classes their inline values map to
and emits `@source inline(…)`. Opt-in — the runtime `<style>` injection
path stays the zero-config default.

---

## Overlays + dynamic canvases (0.4.0)

### `useIsEditing()` — the overlay editor-mode contract

```ts
import { useIsEditing } from '@crafted-design/editor/sdk'

function MyOverlay({ props, children }: AdapterRenderProps) {
  const editing = useIsEditing() // true while authoring; false in preview / runtime
  if (editing) return <InlinePreview>{children}</InlinePreview>
  return <RealDialogPrimitive>{children}</RealDialogPrimitive>
}
```

`useIsEditing()` returns Craft's `state.options.enabled`. The built-in
overlay canonicals (Modal / Drawer / Toast / Tooltip / Popover) follow a
contract that custom overlay canonicals should mirror:

- **Editing mode** — render an inline, always-open preview so the content
  is a normal drop target the designer can drop into and style. The
  built-ins portal this preview into the **Overlay Stage** (the right-side
  panel) via `createPortal` to `#craftjs-overlay-stage`, but a custom
  overlay can render inline in place if that fits better.
- **Preview / runtime** — render the library's real overlay (Dialog,
  Drawer, Snackbar, Tooltip, Popover) with its own open / hover / dismiss
  behavior. Open state for click-toggle overlays lives in the overlay
  runtime store, keyed by the canonical's `name` prop; triggering
  components (Button, Icon, …) flip it via their `triggers: string[]`.

The top-bar **Preview** toggle flips `state.options.enabled`, so a designer
can switch between the two branches without leaving the editor.

### Overlay authoring seam (0.9.0)

The pieces the built-in overlay impls use are public, so a custom overlay
canonical gets the same editor-stage + runtime behavior:

```ts
import {
  useOverlayRuntime,   // the zustand open/close store (toggle/set/state/…)
  readOverlayOpen,     // resolve a named overlay's open state from store state
  useOverlayStageTarget, // the #craftjs-overlay-stage portal target (or null)
  OverlayCard,         // labeled wrapper for the editor-mode preview
} from '@crafted-design/editor/sdk'
import { createPortal } from 'react-dom'

function MyOverlay({ props }: AdapterRenderProps) {
  const editing = useIsEditing()
  const stage = useOverlayStageTarget()
  if (editing && stage) {
    return createPortal(<OverlayCard label="My overlay" name={props.name}>…</OverlayCard>, stage)
  }
  // runtime: gate on the store
  const open = readOverlayOpen(useOverlayRuntime((s) => s.state), props.name, props.defaultOpen)
  return open ? <RealDialog>…</RealDialog> : null
}
```

### Class-merge util + per-canonical prop types

- **`cn`** — clsx + tailwind-merge, the helper the built-in adapters use to
  compose a canonical's `className` with their own (later classes win).
  `import { cn } from '@crafted-design/editor/sdk'`.
- **Per-canonical prop types** — every canonical's props type
  (`ButtonProps`, `ModalProps`, `TableProps`, …) is exported from the SDK so
  an adapter impl can narrow its `props`: `props as ButtonProps`. Type-only.

### Carousel / dynamic-canvas slot helper

```ts
import { slideSlotKeys, SLIDE_SLOT_PREFIX } from '@crafted-design/editor/sdk'
import type { CarouselProps } from '@crafted-design/editor/sdk'

// In a custom Carousel adapter impl: look up each slide's canvas child.
const keys = slideSlotKeys(props.slides)
return keys.map((k, i) => <Slide key={k}>{slotChildren[k]}</Slide>)
```

`slideSlotKeys` mirrors `tabSlotKeys` (§ Canonical surface): it derives the
per-slide canvas slot keys that `CanonicalNode` allocates from the Carousel
canonical's `canvasSlots(props)` function, so a third-party adapter reads
the right entries out of `slotChildren`. Both helpers are the pattern for
**any** dynamic-canvas canonical — a canonical whose `canvasSlots` is a
`(props) => readonly string[]` function rather than a static list.

The other two dynamic-canvas built-ins export the same kind of helpers:

- **Stepper** — `stepperSlotKey(i)` / `stepperSlotKeys(count)`.
- **Table** — `tableCellSlotKey(r, c)` / `tableCellSlotKeys(rows, cols, merges)`,
  plus the merge-geometry helpers `containingMerge` / `isCellCovered` and the
  `TableMerge` type, so a custom Table adapter can render merged cells the way
  the built-ins do.

---

## Persistence backend + code export (0.5.0)

### `setStorageAdapter` — plug your own backend

Documents persist to IndexedDB by default (with a localStorage fallback).
To store them in your backend instead, implement `StorageAdapter` and
register it **before** `<Editor />` mounts:

```ts
import { setStorageAdapter } from '@crafted-design/editor/sdk'
import type { StorageAdapter } from '@crafted-design/editor/sdk'

const myAdapter: StorageAdapter = {
  async readIndex() { return fetch('/api/docs').then((r) => r.json()) },
  async writeIndex(index) {
    await fetch('/api/docs', { method: 'PUT', body: JSON.stringify(index) })
    return { ok: true }
  },
  async readDocument(id) { /* … */ return null },
  async writeDocument(id, doc) { /* … */ return { ok: true } },
  async deleteDocument(id) { /* … */ },
  async estimateUsage() { return { usedBytes: 0, totalBytes: Infinity, percent: 0 } },
}
setStorageAdapter(myAdapter)
```

All methods are async. `WriteResult` is `{ ok: true } | { ok: false; kind:
'quota' | 'schema' | 'unknown'; error }` — return `kind: 'quota'` so the
editor's storage-full UI fires. Optional: `init()` (one-time setup, awaited
before the first read), and the version trio `listVersions` /
`readVersion` / `writeVersion` (omit them and the version-history UI hides
itself). `getStorageAdapter()` returns the active adapter.

> Export to React/JSX **source code** is intentionally not part of this
> library (it's a runtime editor + document model, not a design-to-code
> generator). There is no `exportDocumentAsJsx`. Portability is JSON
> export (`exportDocument`), import, and share-by-URL — round-tripping the
> document model, which the chosen adapter renders live.

---

## What's NOT exported

The following are internal and may change without notice:

- `CanonicalNode` — the Craft.js bridge component.
- `buildResolver` / `getResolver` — internal Craft resolver plumbing.
- The Zustand editor store (`useEditorStore`) — implementation detail.
- `tw-classes` slice helpers (`mergeTypography`, etc.) — internal style
  funnel.

If you find yourself reaching for one of these, open a discussion — the SDK
likely needs a new export.

---

## Public API stability

The public runtime surface is **frozen and enforced**. `src/sdk/surface.test.ts`
holds the exact list of exported names for both entry points and fails CI if
any export is added, removed, or renamed — so the surface can't drift silently.
Treat that test as the authoritative inventory.

- **`@crafted-design/editor/sdk`** — the authoring surface (register* /
  unregister* / list* / get* functions, author hooks, the slot-key helpers,
  provider components, and their types).
- **`@crafted-design/editor`** (and `/core`) — re-exports the entire SDK
  surface **plus** the editor-only runtime: `Editor`, `ErrorBoundary` /
  `TopShellErrorFallback`, the host stores (`useEditorStore`,
  `useDocumentStore`), and the document import/export helpers.

### What the SemVer promise covers (at 1.0)

- The **existence and call signatures** of every exported name in the frozen
  list. Removing or renaming one, or making a breaking signature change, is a
  **major** bump with a CHANGELOG entry.
- The **document envelope** (`EditorDocument`) shape — changed only with a
  migration shipped in `src/persistence/migrations.ts`.
- The **canonical ids** of built-in components (saved documents reference them).

### What it does NOT cover

- **Rendered HTML / CSS classes / visual output.** Adapters and styling evolve;
  don't assert on the editor's DOM structure or class strings.
- **Internal modules** under `src/` that aren't re-exported here (see *What's
  NOT exported* above) — reaching past the entry points is unsupported.
- **Bundle size / file layout / chunk names** — `check:size` budgets these but
  they aren't an API.
- **Craft.js bridge types** beyond the ones explicitly re-exported.

### Deprecation path

To remove or rename a public export after 1.0: ship the replacement first, mark
the old one `@deprecated` (with the JSDoc pointer to the replacement) for at
least one minor, then remove it in the next major — updating the frozen list +
CHANGELOG in that commit.

### Since 1.0

`1.0.0` (the first stable release, on the `latest` dist-tag) put the surface
under the full SemVer promise above. New exports may still be **added** in
minors — every addition updates the frozen list + the CHANGELOG — but nothing
is removed or renamed outside a major.
