# Phase 2 — Detailed Implementation Plan

> Theme + Tailwind class storage. Adopts the shadcn token convention, ships two visibly-different themes, and proves the class-edit round-trip via a single Typography panel.

## Goal

Land the **token system** and the **first real inspector panel**. By the end of Phase 2 the editor can:

1. Swap themes at runtime — the canvas re-paints with new colors, the saved JSON is unchanged.
2. Edit a node's typography classes (size, weight, align, color) via UI; save/load round-trips them faithfully.

This is also where the codebase adopts shadcn's CSS-variable conventions (`--background`, `--primary`, `--border`, …) and replaces the Phase 1 stub `utils/cn.ts` with shadcn's `tailwind-merge`-backed version.

## Exit criteria

1. Theme dropdown in the editor chrome lists **Default** and **Rose** (both from shadcn registries — different primaries).
2. Dropping a Text node and setting its color to `text-primary` makes it visibly recolor when the theme switches — *without re-serializing the node*.
3. Selecting any node shows a working **Typography** inspector panel with font-size, weight, alignment, and color controls.
4. Typography edits persist through Save → reload via the Hydrator.
5. The Typography panel **preserves unknown classes**: if a node has `bg-card font-bold`, changing weight to `font-medium` produces `bg-card font-medium` (not `font-medium` alone).
6. Saved JSON before vs. after a theme swap is byte-identical.

---

## Scope decisions (locked)

- **Text canonical added in Phase 2.** Adding `text.ts` to the registry and `ShadcnText` to the adapter is part of this phase — the Typography panel needs a text-bearing component to demo against. Phase 5 (breadth) inherits a working Text rather than adding it.
- **Theme pair: shadcn `default` + shadcn `rose`.** Both pulled from shadcn's published theme registries. Different primaries make the swap obvious; no hand-rolled tokens to debug.
- **Themes defined as CSS blocks with `[data-theme]` selectors** in `index.css`. Browser-native cascade, zero runtime cost. JSON-driven user themes are deferred to Phase 6 plugin SDK.
- **No version bump on `documentSchema`** — `themeId` is added as an *optional* field, so old Phase 1 documents still parse.
- **Class parser scope: typography only.** A single `style/tw-classes.ts` utility ships with `parseTypography` / `serializeTypography` / `mergeTypography`. Phase 4 expands the same file to layout, spacing, etc.

---

## Pre-flight — adopt shadcn conventions

> The Phase 2 plan's original Step 0 draft was based on older shadcn CLI behavior. The steps below reflect what `shadcn@4.x` (Tailwind v4 era) actually does. Material divergences are called out inline.

### 0.1 Run `npx shadcn init`

```
cd craftjs-design
npx shadcn@latest init
```

Accept the defaults. The CLI creates:
- `components.json` at the project root (`style: radix-nova`, `baseColor: neutral`, aliases pointing at `@/lib/utils` / `@/components` / `@/components/ui` / `@/hooks`).
- `src/lib/utils.ts` — the `tailwind-merge`-backed `cn`.
- `src/components/ui/button.tsx` — a sample component the CLI seeds for you.
- Path alias `@/*` added to **root `tsconfig.json`** (note: this is a project-references shell, not where it actually takes effect — see Step 0.2).
- `src/index.css` rewritten with: imports for `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/geist`; `@custom-variant dark`; a big `@theme inline` bridge mapping shadcn variables to Tailwind v4 token names; `:root { ... }` defaults; `.dark { ... }` dark-mode overrides; and a base `@layer` applying `border-border`, `bg-background`, `text-foreground`, `font-sans`.

Dependencies added: `shadcn`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tw-animate-css`, `radix-ui`, `@fontsource-variable/geist`.

> **Divergences from older shadcn versions / tutorials**:
> - The `cn` util lands at `@/lib/utils` (a *new* file), **not** as a replacement for any pre-existing `src/utils/cn.ts`. The Phase 1 stub survives the init and must be deleted manually.
> - `tw-animate-css` (Tailwind v4-native rewrite) replaces `tailwindcss-animate`.
> - One unified `radix-ui@1.x` package replaces the family of `@radix-ui/*` packages.
> - An additional `@import "shadcn/tailwind.css"` ships Tailwind config that previously lived in `tailwind.config.js`.

### 0.2 Wire path aliases into the right configs

The CLI puts `paths` into the **root `tsconfig.json`**, but that file has `"files": []` and is just a project-references shell — its `compilerOptions` are ignored during builds. You need `paths` in **two** places (yes, duplicated — it's worth it):

```jsonc
// tsconfig.json — root config. shadcn CLI reads this to resolve `@/*` when
// writing files. Without paths here, `npx shadcn add` writes to a literal
// directory named `@/` at the project root instead of `src/`. Keep paths here
// even though they don't affect builds — they affect *future* CLI runs.
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

```jsonc
// tsconfig.app.json — the config `tsc -b` actually uses for `src/`.
// Drop `baseUrl` — TypeScript 6 deprecated it; paths now resolve relative to
// the tsconfig file itself.
{
  "compilerOptions": {
    /* …existing options… */
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

Vite needs its own runtime resolver — the CLI does not touch `vite.config.ts`:

```ts
// vite.config.ts
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

Without all three (root config, app config, vite config), one of the following will break: `tsc -b` (no paths in app config), the dev server (no resolve.alias), or future `npx shadcn add` calls (no paths in root config). The CLI bug manifests as a literal `@/` directory written at the project root — silently — until you discover the missing component.

### 0.3 Reconcile with Phase 1 tokens

The init does **not** delete our Phase 1 `@theme { --color-canvas-bg; --color-canvas-border }` block — it appends new content alongside it. Manual cleanup:

- **Delete** the old `@theme` block from `src/index.css`.
- **Delete** `src/utils/cn.ts` (the Phase 1 clsx-only stub) and the empty `src/utils/` directory — `@/lib/utils` is now the single source.
- **Migrate Box defaults** in `src/registry/components/box.ts`: `border-canvas-border` → `border-border bg-card`. The `bg-card` addition makes the theme swap visible on Box even without typography work.
- **Migrate the canvas wrapper** in `src/editor/Editor.tsx`: `bg-canvas-bg` → `bg-muted`.
- **Migrate the adapter Box import** in `src/adapters/shadcn/components/Box.tsx`: `from "../../../utils/cn"` → `from "@/lib/utils"`.

Confirm nothing else references the dropped tokens: `grep -rn "bg-canvas-bg\|border-canvas-border" src/`.

### 0.4 Add the Rose theme block

shadcn's themes (https://ui.shadcn.com/themes) emit a CSS block per palette. Append the rose variant to `src/index.css` scoped to `[data-theme="rose"]` (not `:root`):

```css
[data-theme="rose"] {
  --primary: oklch(0.645 0.246 16.439);
  --primary-foreground: oklch(0.969 0.015 12.422);
  --ring: oklch(0.645 0.246 16.439);
  --sidebar-primary: oklch(0.645 0.246 16.439);
  --sidebar-primary-foreground: oklch(0.969 0.015 12.422);
  --sidebar-ring: oklch(0.645 0.246 16.439);
}
```

Only the tokens that *differ* from default need overriding — the cascade handles the rest. If you want a more dramatic swap, also override `--background` / `--card`. Default stays on `:root`; no `data-theme` attribute = default theme.

### 0.5 Verify

- `npx tsc -b` clean.
- `npm run dev` boots cleanly.
- Open localhost in the browser → root Box renders with shadcn-neutral border and a card background.

---

## Target directory additions

Only the *new* paths — Phase 1 layout stays intact.

```
craftjs-design/
  components.json                 # shadcn CLI config (auto-generated)
  src/
    themes/                       # NEW
      types.ts                    # Theme interface
      registry.ts                 # register/get/list, mirroring registry/registry.ts
      ThemeProvider.tsx           # sets data-theme on its child wrapper
      index.ts                    # side-effect imports for theme registrations
      default.ts                  # registers 'default' (no-op CSS class — uses :root)
      rose.ts                     # registers 'rose' (cssClass = 'rose')
    state/                        # NEW
      editorStore.ts              # Zustand: activeThemeId
    style/                        # NEW
      tw-classes.ts               # parse/serialize/merge — typography slice for Phase 2
    registry/components/
      text.ts                     # NEW — canonical Text
    adapters/shadcn/components/
      Text.tsx                    # NEW — adapter impl
    editor/
      inspector/                  # NEW folder — Phase 4 will fill it
        TypographyPanel.tsx
      ThemeSwitcher.tsx           # NEW — dropdown wired to Zustand
```

---

## Implementation steps

Ordered for incremental merge. Each step ends in a working dev server.

### Step 1 — Theme registry + types

Mirror the canonical-component registry pattern so the mental model stays consistent.

```ts
// src/themes/types.ts
export interface Theme {
  id: string                  // stored in documents (e.g. 'rose')
  displayName: string         // shown in the switcher
  // The value set on data-theme. Empty string = no attribute (use :root defaults).
  dataThemeValue: string
}
```

```ts
// src/themes/registry.ts
const themes = new Map<string, Theme>()
export function registerTheme(t: Theme) { /* dup-guard + set */ }
export function getTheme(id: string) { return themes.get(id) }
export function listThemes() { return [...themes.values()] }
```

```ts
// src/themes/default.ts
import { registerTheme } from './registry'
registerTheme({ id: 'default', displayName: 'Default', dataThemeValue: '' })
```

```ts
// src/themes/rose.ts
import { registerTheme } from './registry'
registerTheme({ id: 'rose', displayName: 'Rose', dataThemeValue: 'rose' })
```

```ts
// src/themes/index.ts — side-effect barrel
import './default'
import './rose'
```

`App.tsx` imports `./themes` alongside `./registry/components` and `./adapters/shadcn` so themes register at boot.

### Step 2 — Zustand store for editor-side state

```ts
// src/state/editorStore.ts
import { create } from 'zustand'

interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  activeThemeId: 'default',
  setActiveTheme: (id) => set({ activeThemeId: id }),
}))
```

This is the home for editor-side state that **isn't part of the Craft tree** — active theme today, active adapter id in Phase 3, etc. Keep it small.

### Step 3 — ThemeProvider

```tsx
// src/themes/ThemeProvider.tsx
import { useEditorStore } from '../state/editorStore'
import { getTheme } from './registry'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useEditorStore((s) => s.activeThemeId)
  const theme = getTheme(themeId) ?? getTheme('default')!
  return <div data-theme={theme.dataThemeValue || undefined}>{children}</div>
}
```

The `|| undefined` makes default theme set *no* `data-theme` attribute, letting `:root` styles apply. Rose sets `data-theme="rose"`.

### Step 4 — Wire ThemeProvider into the canvas only

In `Editor.tsx`, wrap the `<main>` (canvas area) with `<ThemeProvider>`. **Not** the whole shell — toolbox/inspector chrome stays on default theme.

```tsx
<main className="...">
  <ThemeProvider>
    <Frame>...</Frame>
  </ThemeProvider>
</main>
```

### Step 5 — ThemeSwitcher in the chrome

```tsx
// src/editor/ThemeSwitcher.tsx
import { useEditorStore } from '../state/editorStore'
import { listThemes } from '../themes/registry'

export function ThemeSwitcher() {
  const themeId = useEditorStore((s) => s.activeThemeId)
  const setActiveTheme = useEditorStore((s) => s.setActiveTheme)
  return (
    <select value={themeId} onChange={(e) => setActiveTheme(e.target.value)}>
      {listThemes().map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
    </select>
  )
}
```

Mount in `SaveLoadBar.tsx` between the title and the Save/Load buttons.

### Step 6 — Persist themeId in the document

Extend the document envelope without bumping `version`:

```ts
// src/persistence/schema.ts
export const documentSchema = z.object({
  version: z.literal(1),
  adapterId: z.string(),
  themeId: z.string().optional(),   // NEW — Phase 1 docs load fine without it
  craftJson: z.string(),
})
```

Update `SaveLoadBar.handleSave` to read `useEditorStore.getState().activeThemeId` and include it in the envelope. Update `Hydrator` to call `setActiveTheme(doc.themeId)` after `deserialize`, defaulting to `'default'` if absent.

### Step 7 — Text canonical + ShadcnText impl

```ts
// src/registry/components/text.ts
import { z } from 'zod'
import { registerComponent } from '../registry'

export const textPropsSchema = z.object({ content: z.string() })
export type TextProps = z.infer<typeof textPropsSchema>

registerComponent<TextProps>({
  id: 'text',
  category: 'content',
  displayName: 'Text',
  tags: ['text', 'paragraph'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: textPropsSchema,
  defaults: {
    props: { content: 'Text' },
    style: { classes: { root: 'text-base text-foreground' } },
  },
})
```

```tsx
// src/adapters/shadcn/components/Text.tsx
export function ShadcnText({ props, style, rootRef }: AdapterRenderProps) {
  return <p ref={rootRef} className={cn(style.classes.root)}>{(props as { content: string }).content}</p>
}
```

Add `import './text'` to `registry/components/index.ts` and add Text to the shadcn adapter's components map.

### Step 8 — Class parser/serializer (typography slice)

This is the load-bearing piece. Keep the contract narrow.

```ts
// src/style/tw-classes.ts

export interface TypographySlice {
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  fontWeight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  textColor?: string   // token name e.g. 'foreground' | 'primary' | 'muted-foreground'
}

// Strict prefix-based recognition. Anything we don't recognize is passed through.
const FONT_SIZE_RE = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/
const FONT_WEIGHT_RE = /^font-(light|normal|medium|semibold|bold)$/
const TEXT_ALIGN_RE = /^text-(left|center|right|justify)$/
const TEXT_COLOR_RE = /^text-(foreground|primary|secondary|muted-foreground|destructive|accent-foreground)$/

export function parseTypography(classString: string): {
  slice: TypographySlice
  unknownClasses: string[]
} {
  const slice: TypographySlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    let m
    if ((m = FONT_SIZE_RE.exec(cls))) slice.fontSize = m[1] as TypographySlice['fontSize']
    else if ((m = FONT_WEIGHT_RE.exec(cls))) slice.fontWeight = m[1] as TypographySlice['fontWeight']
    else if ((m = TEXT_ALIGN_RE.exec(cls))) slice.textAlign = m[1] as TypographySlice['textAlign']
    else if ((m = TEXT_COLOR_RE.exec(cls))) slice.textColor = m[1]
    else unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeTypography(slice: TypographySlice): string[] {
  const out: string[] = []
  if (slice.fontSize) out.push(`text-${slice.fontSize}`)
  if (slice.fontWeight) out.push(`font-${slice.fontWeight}`)
  if (slice.textAlign) out.push(`text-${slice.textAlign}`)
  if (slice.textColor) out.push(`text-${slice.textColor}`)
  return out
}

// The merge function the inspector funnels through. NEVER mutate raw class strings
// outside this file.
export function mergeTypography(original: string, updates: TypographySlice): string {
  const { unknownClasses } = parseTypography(original)
  return [...unknownClasses, ...serializeTypography(updates)].join(' ')
}
```

**One regex collision to flag:** both `text-center` (align) and `text-foreground` (color) match `text-*`. The patterns are listed in disambiguating order — `TEXT_ALIGN_RE` is checked before `TEXT_COLOR_RE` because alignments are a closed enumerable set, and the color regex doesn't include those tokens. If Phase 4 adds arbitrary `text-[#hex]` support, the disambiguation logic moves to `tw-classes` and gains tests.

**Optional but recommended:** introduce `vitest` here. The class parser is the kind of code where a 30-line test file averts hours of debugging in Phase 4. Single file: `src/style/tw-classes.test.ts`. Not strictly required for Phase 2 exit, but cheap and bordering on irresponsible to skip.

### Step 9 — Typography inspector panel

```tsx
// src/editor/inspector/TypographyPanel.tsx
import { useEditor } from '@craftjs/core'
import { mergeTypography, parseTypography } from '../../style/tw-classes'
import type { TypographySlice } from '../../style/tw-classes'

export function TypographyPanel({ nodeId }: { nodeId: string }) {
  const { actions, classString } = useEditor((_, query) => ({
    classString: query.node(nodeId).get().data.props.style?.classes?.root ?? '',
  }))
  const { slice } = parseTypography(classString)

  const update = (patch: Partial<TypographySlice>) => {
    actions.setProp(nodeId, (props: { style: { classes: { root: string } } }) => {
      props.style.classes.root = mergeTypography(classString, { ...slice, ...patch })
    })
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold uppercase text-gray-500">Typography</div>
      {/* 4 controls: select for size, select for weight, segmented for align, select for color */}
      {/* — wire each onChange to update({ fontSize: ... }) etc. — */}
    </section>
  )
}
```

Wire into `Inspector.tsx`: when `selected` is non-null, render `<TypographyPanel nodeId={selected.id} />` underneath the existing Type/Id/Delete block.

Make the controls token-friendly: the color dropdown lists `foreground`, `primary`, `muted-foreground`, `destructive` — *theme tokens*, not arbitrary hex. (Phase 4 adds an arbitrary-value escape hatch.)

### Step 10 — Update Box defaults to demo theme awareness

Change the Box default style so it uses theme-token-backed classes:

```ts
// src/registry/components/box.ts
defaults: {
  props: {},
  style: { classes: { root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card' } },
}
```

When the theme switches to Rose, the Box's `bg-card` and `border-border` repaint — visible without typography work. Combined with Text's `text-foreground`, the exit-criteria check is immediate.

### Step 11 — Exit verification (manual)

- [ ] Dev server boots, root canvas renders with default theme.
- [ ] Theme dropdown shows **Default** and **Rose**.
- [ ] Drop a Text → it reads "Text" in default foreground color.
- [ ] Select Text, set color to `primary` → it turns shadcn's default primary.
- [ ] Switch theme to Rose → the Text recolors to rose's primary; the Box's `bg-card` shifts subtly.
- [ ] Open DevTools → Application → Local Storage. Save the document. Switch theme. Save again. Diff the two values: only `themeId` differs; the `craftJson` blob is byte-identical.
- [ ] Set font-size on Text to `lg`, weight to `bold`, align to `center`. Save → reload → all three persist.
- [ ] On a node that has both `bg-card` and a typography class, change just the typography → `bg-card` survives in the new class string.

---

## Out of scope (Phase 2)

| Feature | Phase |
|---|---|
| Other inspector panels (Layout, Spacing, Effects, Fill/Border/Radius) | Phase 4 |
| Responsive bar / breakpoint editing | Phase 4 |
| Generic class parser (anything beyond typography) | Phase 4 |
| Arbitrary-value escape hatch (`text-[#hex]`, `p-[7px]`) | Phase 4 |
| Theme editor UI (let users author themes inside the app) | Phase 6+ |
| Per-document themes (different themes for different pages) | Not on roadmap |
| User-uploaded fonts / custom font stacks | Not on roadmap |
| Migrating Phase 1 `bg-canvas-bg` / `border-canvas-border` references in any external place | n/a — Phase 1 was self-contained |

---

## Risks specific to Phase 2

1. **`shadcn init` for Tailwind v4 maturity.** shadcn's CLI originally targeted v3; v4 support landed iteratively. If the init fails or produces a malformed `index.css`, the fallback is to manually copy the four CSS blocks from https://ui.shadcn.com/themes (default `:root`, `.dark`, plus the rose `:root`-equivalent block re-scoped to `[data-theme="rose"]`) and install `tailwind-merge` / `class-variance-authority` by hand. Budget half a day for this risk.

2. **`@theme inline` vs. `@theme` semantics.** Phase 1's `index.css` used `@theme { --color-canvas-bg: ... }` which auto-generates `bg-canvas-bg` utilities. shadcn's setup uses `@theme inline` which *references* CSS variables instead of inlining values. This affects what `bg-primary` resolves to at runtime. If the rose theme block doesn't visually take effect, double-check that the bridge in `@theme inline` is referencing `var(--primary)` (which `[data-theme="rose"]` then overrides), not the literal value from `:root`.

3. **`text-foreground` vs. inherited color.** A Text inside a Box doesn't inherit `text-foreground` automatically — each canonical's defaults must set its own text color, or text inherits the browser's `color` cascade from the canvas root. Spot-check: drop Text inside a Box, swap theme. If Text doesn't recolor, the cascade missed it; check that Text's defaults include `text-foreground`.

4. **`actions.setProp` mutator vs. immutable update.** Craft.js's `setProp` uses Immer under the hood — the function receives a draft you mutate, *not* a new value to return. Easy to get wrong. The Phase 1 codebase never used it; Step 9 introduces the pattern. If state stops updating, this is the first thing to check.

5. **`mergeTypography` losing classes.** The merge function preserves unknown classes by passing them through. If anything edits `style.classes.root` outside `mergeTypography`, those edits race the inspector and can drop classes. The discipline is: **only `mergeTypography` (and its future siblings for other slices) writes to `classes.root`**. Add a code comment to `tw-classes.ts` to that effect.

---

## Definition of done

Exit checklist passes, `ARCHITECTURE.md` gains a new "Theme Layer" section documenting:
- How tokens are organized (shadcn `@theme inline` bridge + `:root` defaults + `[data-theme="x"]` overrides).
- Where `data-theme` is mounted in the tree (canvas only, not chrome).
- The `style/tw-classes.ts` contract: parse → slice, edit slice, `mergeTypography` to a new class string. Phase 4 extends.

Then Phase 3 — adapter SDK + a second adapter — is unblocked.
