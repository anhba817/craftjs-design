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

### Adding a canonical component

Canonicals are the abstract palette. Each one has a stable id, a Zod prop schema, and defaults. Adapters provide the actual rendering.

1. Create `src/registry/components/<id>.ts`:

   ```ts
   import { z } from 'zod'
   import { registerComponent } from '../registry'

   export const cardPropsSchema = z.object({
     title: z.string(),
     elevation: z.number().int().min(0).max(5),
   })
   export type CardProps = z.infer<typeof cardPropsSchema>

   registerComponent<CardProps>({
     id: 'card',                         // stable — persisted in documents
     category: 'layout',
     displayName: 'Card',                // shown in Toolbox; persisted as Craft resolver key
     tags: ['container', 'panel'],
     isCanvas: true,                     // accepts children
     styleSlots: ['root'],               // expand if you add named sub-canvases later
     propsSchema: cardPropsSchema,
     defaults: {
       props: { title: 'Card', elevation: 1 },
       style: { classes: { root: 'p-4 rounded-md border border-border bg-card' } },
     },
   })
   ```

2. Add one line to `src/registry/components/index.ts`:

   ```ts
   import './card'
   ```

3. Provide an adapter impl for it — see "Adding an adapter impl for an existing canonical" below.

The toolbox picks it up automatically (it iterates `listComponents()`).

**Heads-up:** the canonical's default `style.classes.root` is what new instances start with. If the inspector's panels can later set classes outside this default's vocabulary, make sure those utilities are in the Tailwind safelist (see [§ Tailwind safelist](#tailwind-safelist)).

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

The inspector mounts per-node sub-panels under the type/id/delete block. Today there's one: `TypographyPanel`. Adding more follows the same pattern.

1. Create `src/editor/inspector/<Name>Panel.tsx`. Take `nodeId: string` as a prop. Use `useEditor` to read the node's relevant state, and `actions.setProp` to write:

   ```tsx
   import { useEditor } from '@craftjs/core'

   export function MyPanel({ nodeId }: { nodeId: string }) {
     const { actions, value } = useEditor((_, query) => {
       const data = query.node(nodeId).get().data
       return { value: (data.props as { /* shape */ }).whatever }
     })

     const update = (next: string) => {
       actions.setProp(nodeId, (props: { /* shape */ }) => {
         props.whatever = next
       })
     }

     // …render controls, call update() on change
   }
   ```

2. If your panel edits classes, route every write through `style/tw-classes.ts`. See [§ Class-string editing](#class-string-editing).

3. Mount the panel in `src/editor/Inspector.tsx`'s selected-node branch. Decide whether to gate visibility on canonical category or id — see the existing `TypographyPanel` for the basic pattern.

   **Recommended:** filter by canonical category. Typography panel applies to `content` and `layout` canonicals; input-category canonicals (Button, Input) generally have library-native controls instead of Tailwind utilities.

### Adding a `shadcn` primitive

```sh
npx shadcn add <component-name>
```

This writes to `src/components/ui/<component-name>.tsx`. The adapter impl wraps it.

**Watch out:** if the shadcn CLI writes to `./@/components/ui/<name>.tsx` instead, your `tsconfig.json` is missing the `@/*` path aliases (the CLI reads root tsconfig). Fix per [§ tsconfig path aliases](#tsconfig-path-aliases).

---

## Conventions

### Class-string editing

Anything that writes to a node's `style.classes.root` **must go through a merge function in `src/style/tw-classes.ts`**. Direct string concatenation drops classes the parser doesn't recognize on the next round-trip.

```ts
// ✅ Right
import { mergeTypography } from '@/style/tw-classes'
actions.setProp(nodeId, (props) => {
  props.style.classes.root = mergeTypography(props.style.classes.root, { fontSize: 'lg' })
})

// ❌ Wrong — drops unknown classes silently
actions.setProp(nodeId, (props) => {
  props.style.classes.root = 'text-lg ' + props.style.classes.root
})
```

Read the live class string **inside the `setProp` mutator**, not from the render-time closure — protects against rapid-edit races.

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

---

## Common gotchas

### Tailwind safelist

**Symptom:** an inspector control writes a class like `text-2xl` to the DOM, you can see it in DevTools, but the styling doesn't change.

**Cause:** Tailwind v4's JIT scans source for *literal* class strings. Classes built via template literals (`` `text-${size}` ``) are invisible to the scanner — no CSS is generated.

**Fix:** add the utility family to the `@source inline()` block in `src/index.css`:

```css
@source inline("text-{xs,sm,base,lg,xl,2xl,3xl,4xl}");
@source inline("font-{light,normal,medium,semibold,bold}");
```

Theme-token utilities (`text-primary`, `bg-card`, …) are auto-generated by `@theme inline` — they don't need to be safelisted.

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

### Inspector panels showing for canonicals where their controls don't visibly apply

`TypographyPanel`'s controls (text-align, font-size) land in the DOM regardless of canonical, but Button/Input ignore them because shadcn's primitives use flex centering and `h-*` size variants that don't respect Tailwind text utilities.

Filter panels by canonical category in `Inspector.tsx` if you add controls that don't apply universally.

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

No test suite is set up yet. When tests come online, the highest-value first target is `style/tw-classes.ts` — the class parser/serializer/merge. Set up `vitest`, add `tw-classes.test.ts`, and round-trip every utility family the parser knows about.

---

## Debugging tips

### A dropped component doesn't render

- **"No impl in adapter"** placeholder visible: the active adapter doesn't cover that canonical. Either swap adapter or add the impl (see § Adding an adapter impl for an existing canonical).
- Console error from Zod: an adapter manifest is malformed. The error message includes the adapter id and the failing field.

### Class lands in the DOM but styling doesn't change

Tailwind safelist — see § Tailwind safelist above.

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
