# Developer Guide

Task-oriented guide for working in this codebase. For the why-and-how-it's-structured, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Getting started

```sh
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Type-check + production build
npm run build

# Type-check only
npx tsc -b

# Lint
npm run lint
```

The dev server uses Vite. HMR is on; most edits show up in the browser without a reload.

---

## Project layout (high-level)

```
src/
  registry/              Canonical components — the abstract palette
  adapters/              Per-library renderers — shadcn, mui
  themes/                CSS-variable token packs scoped by [data-theme]
  state/                 Zustand store for editor-side state
  style/                 Class-string parser/serializer (tw-classes.ts)
  craft/                 Craft.js bridge (CanonicalNode, resolver)
  editor/                Editor UI shell (Toolbox, Inspector, SaveLoadBar, …)
  persistence/           Zod envelope + localStorage I/O
  lib/utils.ts           shadcn-managed cn (tailwind-merge)
  components/ui/         shadcn primitives (managed by `npx shadcn add`)
  App.tsx                Boot: side-effect imports → <Editor />
  main.tsx               ReactDOM root
  index.css              Tailwind v4 + token blocks + safelist
```

Full architectural breakdown in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Recipes

### Adding a canonical component (Pattern A — single slot)

Canonicals are the abstract palette. Each one has a stable id, a Zod prop schema, and defaults. Adapters provide the actual rendering.

1. Create `src/registry/components/<id>.ts`:

   ```ts
   import { z } from 'zod'
   import { registerComponent } from '../registry'

   export const tooltipPropsSchema = z.object({
     label: z.string(),
     placement: z.enum(['top', 'right', 'bottom', 'left']),
   })
   export type TooltipProps = z.infer<typeof tooltipPropsSchema>

   registerComponent<TooltipProps>({
     id: 'tooltip',                      // stable — persisted in documents
     category: 'feedback',
     displayName: 'Tooltip',             // shown in Toolbox; persisted as Craft resolver key
     tags: ['hint', 'popover'],
     isCanvas: false,
     styleSlots: ['root'],               // Pattern A — one slot; see Pattern B recipe below for multi-slot
     propsSchema: tooltipPropsSchema,
     defaults: {
       props: { label: 'Tooltip', placement: 'top' },
       style: { classes: { root: 'px-2 py-1 rounded-md bg-popover text-popover-foreground' } },
     },
   })
   ```

2. Add one line to `src/registry/components/index.ts`:

   ```ts
   import './tooltip'
   ```

3. Provide an adapter impl for it — see "Adding an adapter impl for an existing canonical" below.

The toolbox picks it up automatically (iterates `listComponents()` and groups by `category`).

**Heads-up:** the canonical's default `style.classes.root` is what new instances start with. If the inspector's panels can later set classes outside this default's vocabulary, make sure those utilities are in the Tailwind safelist (see [§ Tailwind safelist](#tailwind-safelist)).

### Adding a Pattern B canonical (multiple style slots)

Use this pattern when a canonical has visually-distinct regions the user should style independently — Card has `header`/`body`/`footer`, Tabs has `tabs`/`content`. The mechanics are an extension of Pattern A: declare multiple `styleSlots`, and the inspector's `SlotPicker` exposes them as pills above the class-editing panels.

1. Declare the slots in the canonical:

   ```ts
   registerComponent<DialogProps>({
     id: 'dialog',
     // ...
     styleSlots: ['root', 'header', 'body', 'actions'],   // 'root' must be first
     defaults: {
       props: { /* ... */ },
       style: {
         // Provide an entry per slot, even if empty — keeps Inspector reads from
         // returning undefined for newly-added slots.
         classes: { root: '', header: '', body: '', actions: '' },
       },
     },
   })
   ```

2. Write the adapter impl. Consume `composedClasses[slot]` and `composedInlineStyles[slot]` per region. The root slot is duplicated to the legacy `className` / `inlineStyle` fields for Pattern A compat, so you can also read those for the root region if you prefer.

   ```tsx
   export function ShadcnDialog({
     children, rootRef,
     composedClasses = {},
     composedInlineStyles = {},
   }: AdapterRenderProps) {
     return (
       <div ref={rootRef} className={cn(composedClasses.root)} style={composedInlineStyles.root}>
         <header className={cn(composedClasses.header)} style={composedInlineStyles.header}>
           {/* header content */}
         </header>
         <section className={cn(composedClasses.body)} style={composedInlineStyles.body}>
           {children}
         </section>
         <footer className={cn(composedClasses.actions)} style={composedInlineStyles.actions}>
           {/* action buttons */}
         </footer>
       </div>
     )
   }
   ```

3. No changes needed in Inspector or panels — `SlotPicker` shows automatically when `styleSlots.length > 1`, and every class-editing panel already accepts a `slot` prop.

**Limitation (Phase 5):** Pattern B is *styling-only multi-slot*. The Craft canvas (drop target) is still single per node — Card body is the canvas; header and footer can't accept dropped children. True multi-canvas Pattern B is a Phase 6 item.

### Adding an adapter

A new adapter wraps a UI library and provides impls for some or all canonicals. Missing impls render a labeled placeholder — the user can swap to a covering adapter or remove the node.

1. Create `src/adapters/<name>/components/<Canonical>.tsx` for each canonical you want to support. Match `AdapterRenderProps`:

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

   Pick which output prop matches your library: `className` (Tailwind-style), `sx` (MUI-style), or `inlineStyle` (raw CSS). Each is populated by `CanonicalNode` from `adapter.classMap` or the default passthrough.

2. (Optional) Provide capability hooks. The `Adapter` interface accepts five optional fields:

   - **`Wrapper`** — a React component rendered around the canvas. Use for global providers (theme, locale, library reset). **Must be a pure context provider**: no `document` listeners, no global CSS injection, no browser API mutation. See § Wrappers must be pure context providers below.
   - **`themeTokens`** — CSS variable declarations the adapter wants injected when active.
   - **`classMap`** — `(canonicalClasses, canonicalId) => { className?, sx?, inlineStyle? }`. Rewrites canonical Tailwind classes into adapter-native render props.
   - **`mount` / `unmount`** — imperative side effects on adapter swap. Use these for global state your library needs.

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

   `registerAdapter` validates the manifest via Zod (`AdapterManifestSchema.ts`). Missing required fields throw at boot with a readable error.

4. Add a side-effect import to `src/App.tsx`:

   ```ts
   import './adapters/mylib'
   ```

   `AdapterSwitcher` picks the new adapter up automatically (iterates `listAdapters()`).

### Adding an adapter impl for an existing canonical

If the canonical already exists and you just need to fill a coverage gap in an adapter:

1. Create `src/adapters/<name>/components/<Canonical>.tsx` matching `AdapterRenderProps`.
2. Add it to the adapter's `components` map in `src/adapters/<name>/index.ts`.

The next render of any node with that canonical id picks up the new impl. No further wiring.

### Adding a theme

1. Append a CSS block to `src/index.css`, scoped to `[data-theme="<id>"]`. Only override tokens that *differ* from `:root` — the cascade handles the rest:

   ```css
   [data-theme="forest"] {
     --primary: oklch(0.55 0.18 145);
     --primary-foreground: oklch(0.98 0.02 145);
     --ring: oklch(0.55 0.18 145);
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

`ThemeSwitcher` picks it up automatically.

### Adding an inspector panel

The inspector mounts per-node sub-panels filtered by each canonical's `applicablePanels`. Seven panels ship today (Typography, Layout, Spacing, Size, Appearance, Effects, Props). To add an eighth — say, a custom "Animation" panel — follow this template, copying from `TypographyPanel.tsx` as the canonical example.

1. **Add a slice to `src/style/tw-classes.ts`** if your panel edits Tailwind classes. Each slice is a self-contained block: const arrays + slice interface + regex patterns + `parse*` / `serialize*` / `merge*` trio. Slices must be independent — `parseX` should pass through every class that's not in X's prefix family as `unknownClasses`. See the typography block as a template.

   ```ts
   export const ANIMATIONS = ['none', 'spin', 'pulse', 'bounce'] as const
   export type Animation = typeof ANIMATIONS[number]

   export interface AnimationSlice { animate?: Animation }

   const ANIMATE_RE = new RegExp(`^animate-(${ANIMATIONS.join('|')})$`)

   export function parseAnimation(classString: string): {
     slice: AnimationSlice; unknownClasses: string[]
   } { /* … */ }

   export function serializeAnimation(slice: AnimationSlice): string[] { /* … */ }
   export function mergeAnimation(original: string, updates: Partial<AnimationSlice>): string { /* … */ }
   ```

2. **Add a test block** in `src/style/tw-classes.test.ts`. Five tests per slice is typical: extract all fields, unknown passthrough, disambiguation (if applicable), merge patch preserves other slices, round-trip stability.

3. **Add a `PanelId` to `src/registry/types.ts`** and extend `getApplicablePanels` defaults if useful. If the panel applies only to specific canonicals, leave the default rule alone and let canonicals opt in via explicit `applicablePanels`.

4. **Build the panel** in `src/editor/inspector/<Name>Panel.tsx`. Use the shared building blocks. The Inspector wraps each panel in a `CollapsibleSection`, so don't render your own title:

   ```tsx
   import { mergeAnimation, parseAnimation, ANIMATIONS } from '@/style/tw-classes'
   import type { Animation, AnimationSlice } from '@/style/tw-classes'
   import { PanelRow } from './shared/PanelRow'
   import { ValueSelect } from './shared/ValueSelect'
   import { useNodeClasses } from './shared/useNodeClasses'

   // `slot` defaults to 'root' so Pattern A canonicals can pass nothing.
   // Pattern B canonicals' Inspector passes the active slot from SlotPicker.
   export function AnimationPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
     const { classString, writeClasses } = useNodeClasses(nodeId, slot)
     const { slice } = parseAnimation(classString)
     const update = (patch: Partial<AnimationSlice>) => {
       writeClasses(mergeAnimation(classString, patch))
     }
     return (
       <section className="space-y-2">
         <PanelRow label="Animate">
           <ValueSelect
             value={slice.animate ?? ''}
             options={ANIMATIONS}
             onChange={(v) => update({ animate: v as Animation | undefined })}
           />
         </PanelRow>
       </section>
     )
   }
   ```

   **Shared controls available**: `ValueSelect` (enum dropdown with optional icons via `renderOption`), `ColorPicker` (token swatches + react-colorful visual picker + hex), `NumericInput` (token + arbitrary CSS value + step buttons), `BoxSidesEditor` (linked/unlinked 4-side editor), `PanelRow` (label-left layout).

   `useNodeClasses` is the single I/O funnel — returns `{ classString, inlineStyle, writeClasses, writeInline, activeBreakpoint }`. Reads/writes target the *active breakpoint's* class slice; inline reads/writes target the base `style.inline[slot]`. Your panel gets responsive support for free.

   **Read the live class string at write time** by passing the current `classString` into `merge*` — that's the closure-captured value, refreshed on every render via `useNodeClasses`. Don't call `parseAnimation` separately just before writing; the merge function already does it.

5. **If the panel supports arbitrary values via ColorPicker/NumericInput**, follow the token-vs-arbitrary mutual-exclusion pattern (see Conventions). Disable arbitrary entry at non-base breakpoints via `arbitraryDisabledHint`:

   ```tsx
   const hexHint =
     activeBreakpoint !== 'base'
       ? 'Arbitrary values supported at base breakpoint only.'
       : undefined

   <ColorPicker value={color} onChange={setColor} hexDisabledHint={hexHint} />
   <NumericInput value={width} tokens={SIZE_VALUES} onChange={setWidth}
                 arbitraryDisabledHint={hexHint} />
   ```

6. **Update `Inspector.tsx`** to mount the panel conditionally wrapped in a `CollapsibleSection`. Pass `slot={activeSlot}` so the panel works for both Pattern A and Pattern B canonicals:

   ```tsx
   {panels.includes('animation') && (
     <CollapsibleSection title="Animation">
       <AnimationPanel nodeId={selected.id} slot={activeSlot} />
     </CollapsibleSection>
   )}
   ```

7. **Add the slice's utilities to `scripts/gen-safelist.ts`** so Tailwind compiles them. The script reads slice arrays from `tw-classes.ts` — add `expand('animate-', ANIMATIONS)` and Tailwind will see every breakpoint-prefixed combination.

   Without the safelist entry, your classes will land in the DOM but Tailwind won't generate CSS for them. Silent failure.

### Adding a `shadcn` primitive

```sh
npx shadcn add <component-name>
```

This writes to `src/components/ui/<component-name>.tsx`. The adapter impl wraps it.

**Watch out:** if the shadcn CLI writes to `./@/components/ui/<name>.tsx` instead, your `tsconfig.json` is missing the `@/*` path aliases (the CLI reads root tsconfig). Fix per [§ tsconfig path aliases](#tsconfig-path-aliases).

---

## Conventions

### Class-string editing

Anything that writes to a node's `style.classes.root` **must go through a merge function in `src/style/tw-classes.ts`** (`mergeTypography`, `mergeLayout`, `mergeSpacing`, `mergeSize`, `mergeAppearance`, `mergeEffects`). Direct string concatenation drops classes the parser doesn't recognize on the next round-trip.

Inspector panels go through `useNodeClasses` rather than calling `actions.setProp` directly — see [§ Adding an inspector panel](#adding-an-inspector-panel).

```ts
// ✅ Right — funnel through the slice's merge function
import { mergeTypography } from '@/style/tw-classes'
const { classString, writeClasses } = useNodeClasses(nodeId)
writeClasses(mergeTypography(classString, { fontSize: 'lg' }))

// ❌ Wrong — drops classes from other slices silently
actions.setProp(nodeId, (props) => {
  props.style.classes.root = 'text-lg ' + props.style.classes.root
})
```

### Token + arbitrary mutual exclusion

When a panel sets a token (via classes) for a CSS property, it must clear the matching inline arbitrary value — and vice versa. Otherwise both end up on the node and inline silently wins via CSS specificity, leading to confused state.

```ts
// ✅ Right — token pick clears the corresponding inline property
const setFill = (v: ColorPickerValue) => {
  if (v.kind === 'token') {
    update({ bg: v.token })
    writeInline('backgroundColor', undefined)   // <-- clear inline
  } else if (v.kind === 'hex') {
    update({ bg: undefined })                   // <-- clear token
    writeInline('backgroundColor', v.hex)
  } else {
    update({ bg: undefined })
    writeInline('backgroundColor', undefined)
  }
}
```

This pattern repeats across every panel that supports both tokens and arbitrary values (TypographyPanel for color, AppearancePanel for fill + border-color + radius, SpacingPanel for padding/margin shorthands, SizePanel for every dimension). Don't shortcut it.

### Adapter impls consume composed render props — never `style.classes.root` directly

`AdapterRenderProps` carries `style` (raw `NodeStyle`), plus the composed render-side fields. Reading `style.classes.root` directly bypasses both `composeResponsive` and `composeInlineStyle`.

**Pattern A (single slot)** — read `className` / `inlineStyle`:

```tsx
// ✅ Right
export function MyBox({ children, rootRef, className, inlineStyle }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</div>
}

// ❌ Wrong — drops md:* utilities AND the user's arbitrary hex / px picks
export function MyBox({ children, rootRef, style }: AdapterRenderProps) {
  return <div ref={rootRef} className={cn(style.classes.root)}>{children}</div>
}
```

**Pattern B (multiple slots)** — read `composedClasses[slot]` / `composedInlineStyles[slot]` per region:

```tsx
// ✅ Right — each slot gets its own composed classes + inline styles
export function MyCard({ composedClasses = {}, composedInlineStyles = {}, children, rootRef }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn(composedClasses.root)} style={composedInlineStyles.root}>
      <header className={cn(composedClasses.header)} style={composedInlineStyles.header}>…</header>
      <section className={cn(composedClasses.body)} style={composedInlineStyles.body}>{children}</section>
    </div>
  )
}
```

The root entries of `composedClasses` / `composedInlineStyles` always mirror `className` / `inlineStyle`, so Pattern A impls don't need to care about the maps. The `style` prop is still on `AdapterRenderProps` for impls that need raw access (rare).

### `cn` from `@/lib/utils`

Use shadcn's `cn` for class composition. It handles tailwind-merge conflict resolution.

```ts
import { cn } from '@/lib/utils'

className={cn('base classes', conditional && 'more classes', incomingClassName)}
```

### `rootRef` on adapter impls

Adapter impls must attach the `rootRef` callback to their outermost real DOM element. Without it, Craft's `connect` / `drag` can't attach to a real DOM node — selection and dragging silently break.

```tsx
// ✅ Right — ref on the visible element
<div ref={rootRef} className={className}>{children}</div>

// ❌ Wrong — Craft can't find a DOM node to attach to
<div className={className}>{children}</div>
```

### `useEditorStore` — subscribe vs. snapshot

| Where you read | Use |
|---|---|
| In render, displaying or reacting to the value | `useEditorStore((s) => s.activeThemeId)` (subscribes; re-renders on change) |
| In an event handler / `useEffect` that just needs the latest value | `useEditorStore.getState().activeThemeId` (no subscription, no re-render) |

Click handlers that read state but don't display it should use `getState()` to avoid unnecessary re-renders.

### Side-effect imports for registration

Canonicals, adapters, and themes all register themselves at module load. They're imported for *side effects* in `App.tsx`:

```ts
import './registry/components'   // canonicals
import './adapters/shadcn'       // shadcn adapter
import './adapters/mui'          // mui adapter
import './themes'                // themes
```

**Order matters once:** side-effect imports MUST run before `<Editor />` renders, otherwise the registries are empty when `getResolver()` walks them. `App.tsx` is the only place that boot-orders these.

### Toolbox preferences live in their own localStorage key

Favorites + recently-used canonicals persist to `localStorage['craftjs-design.toolbox']` — a **separate** namespace from the document envelope (`craftjs-design:doc:v1`). They're *user-level*, not *document-level*: they survive document switches and aren't part of saved documents.

When wiping local state during development, decide which you want to clear:

```js
// In the browser DevTools console
localStorage.removeItem('craftjs-design:doc:v1')      // clear the current document
localStorage.removeItem('craftjs-design.toolbox')     // clear toolbox prefs (favorites, recents)
```

If you're adding a new piece of user-level UI state, follow the same pattern — its own localStorage key, read/written outside the document envelope. Don't accidentally stuff user preferences into the document.

### Form components are non-interactive in editor mode

The shadcn / MUI impls for Select, Checkbox, Radio, Switch, and Textarea pass no-op `onChange` (or `onCheckedChange` / `onValueChange`) handlers and use `readOnly` where applicable. This is deliberate: a Checkbox that toggles state when the user is *editing* would corrupt the prop store every click.

If you're adding a new form-like canonical, do the same:

```tsx
// ✅ Right — controlled, no-op handler, optionally disabled
<Checkbox checked={checked} disabled={disabled} onCheckedChange={() => {}} />

// ❌ Wrong — real state mutation happens during editing
const [c, setC] = useState(checked)
<Checkbox checked={c} onCheckedChange={setC} />
```

This non-interactive behavior lives in the **adapter impl**, not the canonical contract. A future "preview" or "publish" mode can swap in real handlers without touching the canonical definition.

---

## Common gotchas

### Tailwind safelist

**Symptom:** an inspector control writes a class like `text-2xl` to the DOM, you can see it in DevTools, but the styling doesn't change.

**Cause:** Tailwind v4's JIT scans source for *literal* class strings. Classes built via template literals (`` `text-${size}` ``) are invisible to the scanner — no CSS is generated.

**Fix:** `scripts/gen-safelist.ts` reads the slice arrays from `src/style/tw-classes.ts` and emits `src/style/safelist.generated.css` with `@source inline()` directives for every utility × every breakpoint. Runs automatically via `predev` / `prebuild` hooks. **If you added a new slice or new values to an existing slice, run `npm run gen-safelist` (or just `npm run dev`) — the generated file is gitignored and rebuilt from source on every dev/build cycle.**

Theme-token utilities (`text-primary`, `bg-card`, …) are auto-generated by `@theme inline` — they don't need to be safelisted, but the generator includes them anyway as a hedge.

### `className` lands but doesn't apply

**Symptom:** DevTools shows `md:flex-row` in a node's className, but resizing the browser to ≥ 768px doesn't change layout.

**Cause:** likely your adapter impl is reading `style.classes.root` directly rather than the composed `className` prop from `AdapterRenderProps`. `style.classes.root` only contains the base-breakpoint slice; the prefixed responsive utilities live in `style.responsive[bp][slot]`. `CanonicalNode` merges them into `className` for you — impls must consume that.

**Fix:** see [§ Adapter impls consume `className`](#adapter-impls-consume-className--never-styleclassesroot-directly).

### shadcn primitives need a ref-forwarding workaround on React 18

**Symptom:** Craft can't select or drag a dropped Button/Input.

**Cause:** The new shadcn CLI generates primitives as plain function components, not `forwardRef` wrappers — they assume React 19's ref-as-prop semantics. We're on React 18, where refs on plain function components are silently dropped (with a console warning).

**Fix:** in the adapter impl, wrap the shadcn primitive with a `display: contents` span that captures the ref:

```tsx
<span ref={rootRef} style={{ display: 'contents' }}>
  <ShadcnButtonImpl variant="default">…</ShadcnButtonImpl>
</span>
```

`display: contents` keeps the wrapper layout-transparent. Safe for non-canvas leaves (Button, Input) — they don't accept drops, so the Phase 1 nested-hit-testing concern doesn't apply.

When this project upgrades to React 19, the spans can drop.

### `actions.setProp` is an Immer mutator, not an immutable update

Craft uses Immer for `setProp`. You receive a *draft* — mutate it in place, don't return a new object.

```ts
// ✅ Right
actions.setProp(nodeId, (props) => { props.title = 'New title' })

// ❌ Wrong — returns are ignored
actions.setProp(nodeId, (props) => ({ ...props, title: 'New title' }))
```

### Adapter Wrappers must be pure context providers

All registered adapters' Wrappers are always mounted (composed around the canvas), even when their adapter isn't active. A Wrapper that injects global CSS, attaches document-level event listeners, or otherwise leaks side effects would apply unconditionally — including when its adapter is inactive.

Side-effecting work goes in `mount` / `unmount` instead. Those fire only on active-adapter change.

### MUI's color validator rejects CSS variables

**Symptom:** `MUI: Unsupported var(--primary) color.` at `createTheme` time.

**Cause:** MUI's `cssVariables: true` mode generates MUI's *own* CSS variables from real color values; it doesn't accept CSS-variable *references* as input.

**Fix (in this codebase, already applied):** pass valid placeholder colors to `createTheme` and override the generated `--mui-palette-*` variables via CSS. The `.mui-bridge` block in `index.css` redirects them to our shadcn tokens. See [`ARCHITECTURE.md` § MUI palette bridge](./ARCHITECTURE.md#mui-palette-bridge--css-variable-indirection-not-adapter-coordination).

### tsconfig path aliases

`@/*` paths must live in **two** places:

- `tsconfig.json` (root config) — the shadcn CLI reads this when resolving `@/*` to write files.
- `tsconfig.app.json` (the actual app config) — `tsc -b` reads this; without it, builds break.

`vite.config.ts` needs its own `resolve.alias` for runtime resolution:

```ts
import path from 'node:path'

export default defineConfig({
  // …
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

If `npx shadcn add` writes a literal `@/` directory at the project root, the root tsconfig is missing the paths block.

### `baseUrl` is deprecated in TypeScript 6+

`paths` resolves relative to the tsconfig file itself; no `baseUrl` needed. Older shadcn CLI versions emit `baseUrl: "."` — drop it when reconciling.

### Inspector panel visible for a canonical where its controls don't apply

The inspector mounts each panel only when `getApplicablePanels(canonicalDef).includes(<panelId>)`. By default, panels are derived from the canonical's `category` + `isCanvas`:

- Containers (`isCanvas: true`) get the Layout panel.
- `content` / `layout` category canonicals get the Typography panel.
- Every canonical gets Spacing / Size / Appearance / Effects / Props.

Canonicals can override the default with an explicit `applicablePanels: readonly PanelId[]` field. **Button does this** — it omits Typography because shadcn's button primitive uses `inline-flex` centering and `h-*` size variants that ignore Tailwind text utilities.

If a panel's controls don't visibly affect some canonical, drop that PanelId from that canonical's `applicablePanels` (or extend `getApplicablePanels`'s default rule if multiple canonicals share the issue).

### `useEditor` collector reads stale non-Craft state

**Symptom:** an inspector hook depends on both Craft node state AND non-Craft state (Zustand, props, etc.). When the non-Craft state changes, the hook still reads old values until Craft state changes too.

**Cause:** `useEditor`'s collector only re-runs on Craft state changes. The collector closure captures its other dependencies at the previous Craft state change.

**Fix:** compute the derived value in the hook *body*, not the collector. Use the collector to subscribe to the right slice of Craft state (e.g., return `{ props }` so it re-runs when props change), but compute final outputs in the body where every re-render reads fresh values.

```ts
const { actions, props } = useEditor((_, q) => ({ props: q.node(id).get().data.props }))
// activeBreakpoint is fresh on each render via Zustand subscription:
const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
// classString combines both — body-level computation:
const classString = activeBreakpoint === 'base'
  ? props.style.classes[slot] ?? ''
  : props.style.responsive?.[activeBreakpoint]?.[slot] ?? ''
```

See `src/editor/inspector/shared/useNodeClasses.ts` for the canonical example.

---

## Persistence

Documents are saved to `localStorage['craftjs-design:doc:v1']` with the envelope shape:

```jsonc
{
  "version": 1,
  "adapterId": "shadcn",
  "themeId": "rose",                            // optional
  "craftJson": "<query.serialize() output>"
}
```

Validated via Zod (`persistence/schema.ts`). The `craftJson` field is opaque — never parse/rewrite it directly.

**Wipe local state during development:**

```js
// In the browser DevTools console
localStorage.removeItem('craftjs-design:doc:v1')
```

Or call `clearDocument()` from `persistence/storage.ts`.

---

## Testing

Vitest is wired in:

```sh
npm test              # watch mode
npm run test -- --run # single-pass (CI-style)
npm run test:ui       # vitest UI in browser
```

The test suite currently covers `style/tw-classes.ts` — every parser/serializer/merge across all six slices plus cross-slice isolation. When adding a new slice (see [§ Adding an inspector panel](#adding-an-inspector-panel)), add the matching test block.

The pattern is consistent: for each slice, test
1. **Extraction** — every recognized field parses correctly.
2. **Unknown passthrough** — classes from other slices land in `unknownClasses`.
3. **Disambiguation** (where applicable) — e.g., `text-center` (align) vs `text-foreground` (color).
4. **Merge patch** — changes only the patched field; other slices' classes survive.
5. **Round-trip stability** — `merge(input, {})` yields a token-set equal to the input.

UI components and panels aren't covered by unit tests. Verify visually in the browser when adding new panels.

---

## Debugging tips

### A dropped component doesn't render

- **"No impl in adapter"** placeholder visible: the active adapter doesn't cover that canonical. Either swap adapter or add the impl (see § Adding an adapter impl for an existing canonical).
- Console error from Zod: an adapter manifest is malformed. The error message includes the adapter id and the failing field.

### Class lands in the DOM but styling doesn't change

Two possible causes:

1. **Tailwind safelist** — class isn't in `safelist.generated.css`. Run `npm run gen-safelist`; check the slice arrays in `tw-classes.ts`. See § Tailwind safelist above.
2. **Adapter impl reading `style.classes.root` directly** — see § `className` lands but doesn't apply above.

### Responsive variant doesn't apply when the viewport crosses a breakpoint

If `md:flex-row` is in the className but resizing to ≥ 768px doesn't change layout, check that Tailwind compiled CSS for `.md\:flex-row`:

```sh
curl -s "http://localhost:5173/src/index.css?direct" | grep "md\\\\:flex-row"
```

If the rule is missing, the safelist's breakpoint multiplier didn't include this utility. If the rule is present, browser DevTools should show it under the `@media (min-width: 48rem)` block in Computed Styles — if `flex-direction: row` isn't applied, there's a specificity conflict with another rule.

### Theme swap doesn't affect MUI components

Inspect a MUI component's computed styles in DevTools. The `--mui-palette-primary-main` etc. should resolve through `var(--primary)` from `[data-theme="<id>"]`. If MUI's generated names differ from what's in `.mui-bridge`, update the bridge block.

### Adapter swap loses canvas content

Should not happen. If it does, the React tree shape between adapters is changing. Check that `AdapterProvider.composeAllWrappers` is running and rendering ALL adapters' Wrappers, not just the active one. See [`ARCHITECTURE.md` § Wrappers compose, not switch](./ARCHITECTURE.md#wrappers-compose-not-switch).

### Hydrator restoring state on every adapter swap

Should not happen with the `hydrated` module-level flag in `Hydrator.tsx`. If you see this, the module reloaded — typically Vite HMR resetting module state. Reload the page; production builds don't HMR.

---

## When to update this guide

Update when you:
- Change a public-facing contract (adapter, canonical, theme manifest).
- Discover a non-obvious gotcha worth saving the next person from.
- Add a new file pattern other devs will replicate (a new inspector panel type, a new layer).

Don't update for:
- Internal refactors with no API change.
- Phase-tracked progress — that's the implementation plan's job.
