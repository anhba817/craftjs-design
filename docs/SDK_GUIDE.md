# SDK Reference

Public surface exported from `@design/sdk`. SDK consumers MUST import only
from this path — reaching into `src/adapters/types`, `src/registry/types`,
etc. is unsupported and can break across versions.

For task-oriented walkthroughs (writing an adapter, a canonical, or a panel),
see [`TUTORIAL_ADAPTER.md`](./TUTORIAL_ADAPTER.md),
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
  canvasSlots?: readonly string[]      // Phase 6 — multi-canvas Pattern B
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
  canvas; inner slots are.

#### `NodeStyle`

```ts
interface NodeStyle {
  classes: Record<string, string>                  // slot → base class string
  responsive?: Record<string, Record<string, string>>  // bp → slot → classes
  inline?: Record<string, Record<string, string>>      // slot → cssProp → value (base)
  responsiveInline?: Record<string, Record<string, Record<string, string>>>
                                                       // bp → slot → cssProp → value
}
```

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

Post-mount registration logs a warning — hot canonical reload is not yet
supported. Register canonicals before `<Editor />` mounts.

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

## What's NOT exported

The following are internal and may change without notice:

- `CanonicalNode` — the Craft.js bridge component.
- `buildResolver` / `getResolver` — internal Craft resolver plumbing.
- The Zustand editor store (`useEditorStore`) — implementation detail.
- `tw-classes` slice helpers (`mergeTypography`, etc.) — internal style
  funnel.

If you find yourself reaching for one of these, open a discussion — the SDK
likely needs a new export.
