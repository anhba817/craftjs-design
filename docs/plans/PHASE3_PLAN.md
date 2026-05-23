# Phase 3 — Detailed Implementation Plan

> Formalize the Adapter SDK, build MUI as a second adapter, prove documents survive an adapter swap unchanged.

## Goal

By the end of Phase 3, the user can:

1. Drop a Button or Input on the canvas (new canonicals).
2. Switch the active adapter from **shadcn** to **MUI** via a dropdown.
3. Watch the canvas re-paint with Material Design styling — **same document JSON**, same node ids, same canonical prop values.
4. Save the document; the adapter id and theme id both persist; reload restores everything.
5. Build a third adapter (or distribute one as a plugin) against a Zod-validated, documented manifest.

This is the architecture's central thesis getting its real test. Phase 1 made adapters *theoretical* (one adapter, one trivial component). Phase 3 makes them *load-bearing* — two adapters with materially different rendering models, and a formal SDK plugins can target.

## Exit criteria

1. Toolbox shows **Box**, **Text**, **Button**, **Input**.
2. Drop a Button + Input on the canvas with the shadcn adapter active. They render with shadcn styling.
3. Open the adapter dropdown, pick **MUI**. The canvas re-renders: Button becomes a Material-style raised button; Input becomes a Material TextField. **The canvas's tree state (Craft JSON) is byte-identical before/after.**
4. Switch back to shadcn → repaints back. Round-trip stable.
5. Inspector edits the canonical `intent` prop on a Button → both adapters render the new value with their respective variant names.
6. Save → hard refresh → adapter id and theme id both restore.
7. A deliberately-broken adapter manifest (missing `id`, wrong `components` type) throws a Zod error at `registerAdapter` time with a readable field path.
8. The new adapters/SDK section in `ARCHITECTURE.md` documents adding a third adapter — and *that recipe is what a Phase 6 plugin author will follow*.

---

## Scope decisions (locked)

- **Second adapter: MUI (Material UI v6+).** Bigger jump than Radix-only; brings its own theming engine and CSS-in-JS layer. The visual diff is unmistakable, and the friction surfaces every leaky assumption in the SDK.
- **Minimal canonical schemas.** `Button = { label, intent: 'primary'|'secondary'|'destructive', disabled }`. `Input = { type: 'text'|'email'|'password'|'number', placeholder, value, disabled }`. Each adapter maps these to its library's variant/color names.
- **Full SDK formalization.** All four: Zod manifest validation, `themeTokens`, `classMap`, lifecycle hooks (`mount` / `unmount`). A fifth field — a declarative `Wrapper` component — is added because MUI needs it (see [SDK Decision: declarative `Wrapper` vs. imperative `mount`](#design-wrapper) below).

### Scope-reduction valves

This scope is ambitious for one phase. Two valves to pull if MUI gets brittle or the timeline slips:

- **Valve A — defer `classMap`** to Phase 5+. Phase 3 ships adapters that visually diverge naturally (MUI ignores Tailwind classes on its components and uses its own theme); the inspector's typography panel only affects Text/Box, not MUI Button/Input. This is acceptable for the swap demo. The SDK contract still *has* the field; we just don't implement the bridge logic.
- **Valve B — defer `themeTokens` injection** to Phase 5+. If MUI's `cssVariables: true` mode works out of the box (reads our shadcn `--primary` etc. directly), the explicit `themeTokens` injection isn't needed in Phase 3.

Track which valves are pulled — both have follow-on consequences for plugin authors.

---

## Pre-flight

### 0.1 Install MUI

```
npm install @mui/material@^6 @emotion/react @emotion/styled
```

Skip `@mui/icons-material` for Phase 3 — icons aren't part of the minimal Button/Input schemas. Phase 5 adds it when icon-bearing components land.

MUI v6+ introduces `cssVariables: true` mode in `createTheme`, which makes MUI's palette resolve to CSS variables instead of inline JS values. This is the bridge that lets our shadcn CSS variables drive MUI styling — without it, MUI would re-implement theming on top of ours.

### 0.2 Confirm React/peer-dep compatibility

MUI v6 supports React 18 and 19. We're on 18 (Phase 1 downgrade). `npm install` should succeed without `--legacy-peer-deps`. If it doesn't, that's a Phase 3 risk — record what conflicted.

### 0.3 Add `npx shadcn add input` for shadcn's Input primitive

```
npx shadcn add input
```

Lands `src/components/ui/input.tsx`. The shadcn adapter's `Input` impl wraps this. (`button.tsx` was already added by `shadcn init`.)

### 0.4 Update Tailwind safelist

Append to the existing `@source inline()` block in `src/index.css` the utilities canonical Button/Input defaults can emit:

```css
@source inline("bg-{primary,secondary,destructive,muted}");
@source inline("rounded-{none,sm,md,lg,xl,full}");
@source inline("h-{8,9,10,11,12}");
@source inline("px-{2,3,4,6,8} py-{1,1.5,2,3}");
```

Yes, this is getting unwieldy. **Phase 4's generated safelist** lands right after Phase 3 for exactly this reason.

---

## Target directory additions

```
craftjs-design/src/
  adapters/
    types.ts                          # extended: themeTokens, classMap, Wrapper, mount, unmount
    AdapterContext.tsx                # gains: lifecycle dispatch on adapterId change
    AdapterManifestSchema.ts          # NEW — Zod validates the Adapter shape
    shadcn/
      components/
        Button.tsx                    # NEW — wraps src/components/ui/button.tsx
        Input.tsx                     # NEW — wraps src/components/ui/input.tsx
    mui/                              # NEW
      index.ts                        # registerAdapter({ id:'mui', ...})
      theme.ts                        # MUI theme with cssVariables:true bridging shadcn vars
      Wrapper.tsx                     # MUI's ThemeProvider + CacheProvider as a Wrapper component
      classMap.ts                     # canonical Tailwind → MUI sx (Valve A scope)
      components/
        Button.tsx
        Input.tsx
  registry/components/
    button.ts                         # NEW
    input.ts                          # NEW
  state/editorStore.ts                # gains activeAdapterId, setActiveAdapter
  editor/
    AdapterSwitcher.tsx               # NEW
```

---

## Implementation steps

Ten steps, ordered for incremental merge. Each step ends in a working dev server with at least the previous step's functionality intact.

### Step 1 — Add canonical Button + Input

```ts
// src/registry/components/button.ts
export const buttonPropsSchema = z.object({
  label: z.string(),
  intent: z.enum(['primary', 'secondary', 'destructive']),
  disabled: z.boolean(),
})

registerComponent<ButtonProps>({
  id: 'button',
  category: 'input',
  displayName: 'Button',
  tags: ['cta', 'action'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: buttonPropsSchema,
  defaults: {
    props: { label: 'Button', intent: 'primary', disabled: false },
    style: { classes: { root: '' } },   // adapter owns visual styling for now
  },
})
```

```ts
// src/registry/components/input.ts
export const inputPropsSchema = z.object({
  type: z.enum(['text', 'email', 'password', 'number']),
  placeholder: z.string(),
  value: z.string(),
  disabled: z.boolean(),
})

registerComponent<InputProps>({
  id: 'input',
  category: 'input',
  displayName: 'Input',
  tags: ['form', 'field'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: inputPropsSchema,
  defaults: {
    props: { type: 'text', placeholder: 'Enter text…', value: '', disabled: false },
    style: { classes: { root: '' } },
  },
})
```

Add `import './button'` and `import './input'` to `src/registry/components/index.ts`.

**Note:** `style.classes.root` defaults to empty. Adapters render their library's *default* visual presentation; the inspector's typography/spacing panels (Phase 4) write into this slot if the user wants overrides. This is intentional — over-defaulting visual classes makes adapter swap less honest.

### Step 2 — Extend the Adapter SDK contract

```ts
// src/adapters/types.ts
import type { CSSProperties, ComponentType, ReactNode } from 'react'

export interface AdapterRenderProps {
  canonicalId: CanonicalId
  props: Record<string, unknown>
  style: NodeStyle
  children?: ReactNode
  rootRef?: (el: HTMLElement | null) => void
}

export interface ClassMapResult {
  className?: string
  sx?: Record<string, unknown>     // MUI's sx prop shape
  style?: CSSProperties
}

export type ClassMapFn = (canonicalClasses: string, canonicalId: CanonicalId) => ClassMapResult

export interface Adapter {
  id: string
  displayName: string
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>

  // ----- All new in Phase 3 -----

  // Declarative wrapper rendered around the entire canvas when this adapter is
  // active. Use for adapters that need a global provider (MUI's ThemeProvider,
  // Chakra's CSSReset, etc.). Returns its children unchanged for adapters that
  // don't need one.
  Wrapper?: ComponentType<{ children: ReactNode }>

  // CSS variables this adapter wants injected into the canvas root when active.
  // Injected via a generated <style> tag scoped to [data-active-adapter="<id>"].
  // Cleaner than themeTokens-as-classMap; survives theme swap.
  themeTokens?: Record<string, string>

  // Optional: rewrite canonical Tailwind classes into adapter-native render
  // props. CanonicalNode invokes this once per render, passes the result into
  // the adapter impl alongside the standard render props. Adapters that don't
  // provide one (shadcn, plain HTML) get className passthrough by default.
  classMap?: ClassMapFn

  // Imperative one-shot hooks. Most adapters won't need these — prefer Wrapper.
  // Use these for side effects that can't be expressed declaratively (e.g.,
  // imperatively calling a library's init function with a global side effect).
  mount?: () => void
  unmount?: () => void
}
```

`CanonicalNode` is updated to consume the new fields:

```tsx
export function CanonicalNode({ canonicalId, nodeProps, style, children }: CanonicalNodeProps) {
  const def = getComponent(canonicalId)!
  const adapter = useActiveAdapter()
  const Impl = adapter.components[canonicalId]!

  const { connectors: { connect, drag } } = useNode()

  // classMap is optional — fall back to className passthrough.
  const styleProps = adapter.classMap
    ? adapter.classMap(style.classes.root, canonicalId)
    : { className: style.classes.root }

  return (
    <Impl
      canonicalId={canonicalId}
      props={nodeProps}
      style={style}
      rootRef={(el) => { if (el) connect(drag(el)) }}
      {...styleProps}      // className | sx | style — adapter impl uses what it understands
    >
      {children}
    </Impl>
  )
}
```

`AdapterRenderProps` grows accordingly (`className?`, `sx?`, `style?`). Adapter impls pick the field that matches their library.

### Step 3 — Zod manifest validation

```ts
// src/adapters/AdapterManifestSchema.ts
import { z } from 'zod'

export const adapterManifestSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  components: z.record(z.string(), z.unknown()),   // values are React components — Zod can't introspect those
  Wrapper: z.unknown().optional(),
  themeTokens: z.record(z.string(), z.string()).optional(),
  classMap: z.unknown().optional(),
  mount: z.unknown().optional(),
  unmount: z.unknown().optional(),
})
```

Update `registerAdapter`:

```ts
export function registerAdapter(adapter: Adapter): void {
  const result = adapterManifestSchema.safeParse(adapter)
  if (!result.success) {
    throw new Error(
      `invalid adapter manifest for '${adapter.id ?? '<no id>'}': ${result.error.message}`,
    )
  }
  if (adapters.has(adapter.id)) throw new Error(`duplicate adapter id: ${adapter.id}`)
  adapters.set(adapter.id, adapter)
}
```

The `z.unknown()` for components/Wrapper/etc. is deliberate — Zod can't validate that a value is a React component without rendering it. The schema catches *structural* errors (missing `id`, wrong types for primitives), which is the failure mode plugins actually hit.

### Step 4 — Zustand `activeAdapterId`

```ts
// src/state/editorStore.ts — extended
interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void

  activeAdapterId: string                // NEW
  setActiveAdapter: (id: string) => void  // NEW
}

export const useEditorStore = create<EditorStore>()((set) => ({
  activeThemeId: 'default',
  setActiveTheme: (id) => set({ activeThemeId: id }),
  activeAdapterId: 'shadcn',
  setActiveAdapter: (id) => set({ activeAdapterId: id }),
}))
```

### Step 5 — `AdapterProvider` reads from Zustand + dispatches lifecycle

`Editor.tsx` changes from `<AdapterProvider adapterId="shadcn">` to `<AdapterProvider />` (or pass nothing — the provider reads from the store).

`AdapterProvider` gains:
- Subscribes to `activeAdapterId` from the store.
- On id change: calls previous adapter's `unmount()` (if defined), new adapter's `mount()` (if defined).
- Wraps children in the new adapter's `Wrapper` component if present.

```tsx
export function AdapterProvider({ children }: { children: ReactNode }) {
  const adapterId = useEditorStore((s) => s.activeAdapterId)
  const adapter = getAdapter(adapterId) ?? getAdapter('shadcn')
  if (!adapter) throw new Error('no adapter registered')

  // Lifecycle dispatch on activeAdapter change
  const prevRef = useRef<Adapter | null>(null)
  useEffect(() => {
    prevRef.current?.unmount?.()
    adapter.mount?.()
    prevRef.current = adapter
    return () => { adapter.unmount?.() }
  }, [adapter])

  const Wrapper = adapter.Wrapper ?? Fragment
  return (
    <AdapterCtx.Provider value={adapter}>
      <Wrapper>{children}</Wrapper>
    </AdapterCtx.Provider>
  )
}
```

**Risk to watch:** `mount`/`unmount` running on every render of AdapterProvider would be a disaster. The `useRef` + `useEffect([adapter])` pattern fires hooks only when the adapter *changes*, which is what we want.

### Step 6 — `AdapterSwitcher` + persistence

Mirror `ThemeSwitcher`:

```tsx
// src/editor/AdapterSwitcher.tsx
export function AdapterSwitcher() {
  const activeAdapterId = useEditorStore((s) => s.activeAdapterId)
  const setActiveAdapter = useEditorStore((s) => s.setActiveAdapter)
  return (
    <select value={activeAdapterId} onChange={(e) => setActiveAdapter(e.target.value)}>
      {listAdapters().map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
    </select>
  )
}
```

Mount in `SaveLoadBar` next to the theme switcher.

Save handler reads `useEditorStore.getState().activeAdapterId` into the envelope (already there as `adapterId`). Hydrator restores via `setActiveAdapter` after `deserialize`. The schema already supports this; just wire the Zustand side.

### Step 7 — shadcn Button + Input impls

```tsx
// src/adapters/shadcn/components/Button.tsx
import { Button as ShadcnButtonImpl } from '@/components/ui/button'

const INTENT_TO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
}

export function ShadcnButton({ props, style, rootRef, className }: AdapterRenderProps & { className?: string }) {
  const { label, intent, disabled } = props as { label: string; intent: string; disabled: boolean }
  return (
    <ShadcnButtonImpl
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      disabled={disabled}
      className={cn(style.classes.root, className)}
    >
      {label}
    </ShadcnButtonImpl>
  )
}
```

Same shape for `Input` wrapping shadcn's `<Input>`. Register both in `shadcn/index.ts`.

### Step 8 — MUI theme.ts + Wrapper

```ts
// src/adapters/mui/theme.ts
import { createTheme } from '@mui/material/styles'

// cssVariables: true makes MUI's palette read CSS variables instead of inline
// values. Since our :root and [data-theme=...] blocks already define --primary
// etc., MUI's theme just references them — adapter swap doesn't fight theme swap.
export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: 'var(--primary)', contrastText: 'var(--primary-foreground)' },
    secondary: { main: 'var(--secondary)', contrastText: 'var(--secondary-foreground)' },
    error: { main: 'var(--destructive)' },
    background: { default: 'var(--background)', paper: 'var(--card)' },
    text: { primary: 'var(--foreground)', secondary: 'var(--muted-foreground)' },
  },
})
```

```tsx
// src/adapters/mui/Wrapper.tsx
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { muiTheme } from './theme'

export function MuiWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={muiTheme}>
      {/* No CssBaseline — it would reset our shadcn base styles. MUI components
          handle their own resets internally; we don't need the global one. */}
      {children}
    </ThemeProvider>
  )
}
```

`CacheProvider` for Emotion: not required for client-only Vite dev. If we add SSR later, this is where it lands.

### Step 9 — MUI Button + Input impls

```tsx
// src/adapters/mui/components/Button.tsx
import MuiButton from '@mui/material/Button'

const INTENT_TO_COLOR: Record<string, 'primary' | 'secondary' | 'error'> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'error',
}

export function MaterialButton({ props, rootRef, sx }: AdapterRenderProps & { sx?: Record<string, unknown> }) {
  const { label, intent, disabled } = props as { label: string; intent: string; disabled: boolean }
  return (
    <MuiButton
      ref={rootRef as never}
      variant="contained"
      color={INTENT_TO_COLOR[intent] ?? 'primary'}
      disabled={disabled}
      sx={sx}
    >
      {label}
    </MuiButton>
  )
}
```

Same pattern for `MaterialInput` wrapping MUI's `TextField`. Note: `sx` flows in via `classMap` output. If `classMap` is deferred (Valve A), `sx` is always undefined and MUI just uses its default styling.

### Step 10 — Register the MUI adapter

```ts
// src/adapters/mui/index.ts
import { registerAdapter } from '../AdapterContext'
import { MuiWrapper } from './Wrapper'
import { MaterialButton } from './components/Button'
import { MaterialInput } from './components/Input'

registerAdapter({
  id: 'mui',
  displayName: 'MUI',
  Wrapper: MuiWrapper,
  components: {
    button: MaterialButton,
    input: MaterialInput,
    // No box/text impls — when MUI is active, Box and Text fall back to a
    // "missing impl" error from CanonicalNode. That error is the honest signal
    // that this adapter doesn't render those canonicals. Phase 5 fills gaps.
  },
})
```

Add `import './adapters/mui'` to `src/App.tsx` after `import './adapters/shadcn'`.

**Adapter coverage:** MUI is initially Button + Input only. Selecting MUI while a Box is on the canvas will throw because `CanonicalNode` looks up the impl and fails. Either (a) accept the constraint and prevent the user from selecting MUI when incompatible nodes exist, (b) make `CanonicalNode` render a placeholder for missing impls, or (c) push every canonical into every adapter from day one. The plan recommends **(b)** — a small fallback impl in `CanonicalNode` that renders a labeled placeholder when the adapter is missing the impl. This is forgiving and doesn't constrain the user's UI flow.

---

## <a id="design-wrapper"></a>SDK Decision: declarative `Wrapper` vs. imperative `mount`

You picked all four SDK items. They overlap. Here's how they fit:

| Need | Use |
|---|---|
| Global React provider this adapter needs around the canvas | `Wrapper` |
| One-shot side effect when adapter activates (e.g., a global polyfill) | `mount` |
| CSS variables this adapter wants injected as styles | `themeTokens` |
| Translate canonical Tailwind classes into adapter-native render props | `classMap` |

For **MUI specifically**: `Wrapper` is what we actually use (it renders MUI's ThemeProvider). `mount` exists but isn't called. `themeTokens` isn't called either — MUI's `cssVariables: true` mode reads our existing tokens directly. `classMap` is implemented but optional (Valve A allows deferring it).

This is a deliberate redundancy. Two non-obvious reasons to ship all four anyway:

- **A future Chakra adapter might want `themeTokens`** to register Chakra's own tokens that don't overlap with shadcn's, without needing a Wrapper.
- **A future analytics adapter** (overlay-only, no UI swap) might need only `mount` to wire up event listeners.

Phase 3 ships the field surface so plugins don't pick the wrong tool because the tool didn't exist. Phase 6 documents the four-way fork in the plugin SDK docs.

---

## Out of scope (Phase 3)

| Feature | Phase |
|---|---|
| ~~Adapter coverage parity (MUI ships Box + Text impls)~~ — **completed in Phase 3** after the missing-impl placeholder proved disruptive on canvases with existing Box/Text. `MaterialBox` wraps MUI `<Box>`, `MaterialText` wraps MUI `<Typography>`. Both pass Tailwind className through, so the canonical's shadcn-token styles keep working. | ~~Phase 5~~ done |
| classMap implementation (canonical Tailwind → MUI sx) if Valve A is pulled | Phase 5 |
| themeTokens injection (CSS variables from adapter manifest) if Valve B is pulled | Phase 5 |
| The other inspector panels (Layout, Spacing, etc.) | Phase 4 |
| Generated Tailwind safelist | Phase 4 |
| Public plugin documentation site, plugin distribution mechanism | Phase 6 |
| Adapter hot-reload (load adapters at runtime from URLs) | Phase 6 |
| Adapter-level undo (e.g., revert adapter swap as a history entry) | not on the roadmap |
| Per-canonical inspector panel filtering — Typography panel currently shows for every selected node, but several controls (text-align, font-size) don't visibly apply to Button/Input because shadcn's primitives use `inline-flex` centering and `h-*` size variants that ignore Tailwind text utilities. Class lands in the DOM; layout doesn't change. Documented as a known limitation; user can still edit, just won't see effect on those controls for these canonicals. | Phase 4 |

---

## Risks specific to Phase 3

1. **MUI's CSS variables mode and shadcn's CSS variables coexistence.** Both define color tokens but with different names (`--primary` vs. `palette.primary.main`). MUI v6's `cssVariables: true` should bridge cleanly — but if MUI generates conflicting `--mui-palette-primary-main` selectors, the cascade gets messy. Mitigation: spot-check the computed CSS for a Button under each theme; if MUI's own CSS variables override ours, scope MUI's theme via a wrapper.

2. **The Wrapper component fires on every render of AdapterProvider.** Each time React re-renders `AdapterProvider`, `<MuiWrapper>` mounts/unmounts… no, it only does that if the *adapter* object identity changes. As long as `getAdapter(activeAdapterId)` returns the same object, React's reconciler keeps the Wrapper mounted. Verify by adding a console.log in MuiWrapper and watching it fire only on adapter swap.

3. **Lifecycle hook firing order.** Step 5's `useEffect([adapter])` calls `prev.unmount()` then `new.mount()`. If `unmount` throws, `mount` still runs and the new adapter is half-active. Wrap both in try/catch and surface errors to the inspector or a toast.

4. **`actions.setProp` doesn't know about the new schemas.** When the inspector (Phase 4) lets the user pick a Button's `intent`, the setProp mutator writes to the Immer draft. If a plugin adapter's component reads a different prop shape (e.g., uses `props.kind` instead of `props.intent`), the inspector writes a value the adapter ignores. Until Phase 4, this is hand-curated; document that the canonical's `propsSchema` is the authoritative shape.

5. **Adapter swap during in-flight drag.** If the user is mid-drag and switches adapters, Craft's connectors are attached to DOM elements from the previous render. After swap, those refs point to elements that no longer exist. Most likely it works by accident (React tears down + remounts; Craft re-registers connectors via fresh refs). Watch for orphaned drag operations during testing.

6. **MUI v6 + React 18 peer-dep edge cases.** MUI v6 supports React 18 officially but some Emotion versions are picky. If `npm install` complains, `--legacy-peer-deps` is acceptable for Phase 3; record what was overridden and revisit in Phase 6 hardening.

---

## Definition of done

Exit-criteria checklist passes. `ARCHITECTURE.md` gains an "Adapter SDK" section documenting:

- The five fields (`components`, `Wrapper`, `themeTokens`, `classMap`, `mount`/`unmount`) and the four-way fork for when to use which.
- The Zod manifest validation flow.
- A worked example: "Adding the Radix-only adapter as a third adapter."
- Which valves (A/B) were pulled and why.

Phase 4 — inspector buildout + generated safelist — is unblocked.
