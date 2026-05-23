# Phase 4 — Detailed Implementation Plan

> Inspector buildout. Six style panels + Component Props panel + responsive bar across six breakpoints. Replace hand-written safelist with generation. First test suite lands here.

## Goal

By the end of Phase 4, a user can build a **non-trivial landing page entirely from the inspector** — hero section, multi-column features, CTA buttons, responsive variants for mobile/tablet/desktop, theme-safe colors. No JSON editing, no hand-written code.

The Phase 2 inspector shipped one panel (Typography); Phase 4 extends that to seven (six style + one props) with first-class responsive support.

## Exit criteria

1. Drop a hero: Box (container) → Text (headline) → Text (subhead) → Box (CTA row) → Button + Button.
2. Apply **layout** via inspector: hero is flex-column, CTA row is flex-row with gap.
3. Apply **typography** to headline + subhead.
4. Apply **appearance**: hero gets `bg-muted` background, CTAs use `intent: primary` / `destructive`.
5. Apply **responsive variants**: stacked on base, side-by-side on `md`, larger headline on `lg`.
6. Configure **component props** via UI: change Button labels from defaults.
7. Save → hard refresh → all edits persist (style + responsive + canonical props).
8. Switch theme to **Rose** → every token-bound color repaints; responsive layout unchanged.
9. Inspector hides panels that don't apply per canonical (Button doesn't get Layout; Text doesn't get the canvas-only Layout controls).
10. `npm test` runs `tw-classes` test suite — all slices pass round-trip parse/serialize tests.
11. `npm run dev` regenerates `safelist.generated.css` from `tw-classes.ts` slice arrays before Vite starts.

---

## Scope decisions (locked)

- **Six panels**, not seven. Fill + Border + Radius combined into one **Appearance** panel.
- **Token enum colors only.** No arbitrary hex/oklch escape hatch in Phase 4. Color dropdowns list shadcn-token names (`primary`, `card`, `muted-foreground`, etc.). Phase 5/6 adds the escape hatch.
- **Six breakpoints:** Base + `sm` + `md` + `lg` + `xl` + `2xl`. Maximum design flexibility; bigger safelist.
- **Component Props panel ships in Phase 4.** Auto-generates form fields from each canonical's Zod `propsSchema`. Required for exit criterion #6.

---

## Scope-reduction valves

If timeline slips, these can be deferred without invalidating the architecture:

- **Valve A — defer Effects panel** (shadow/opacity/blur). Drop to five style panels. Exit criterion 1–9 still achievable; landing pages just look flatter.
- **Valve B — reduce breakpoint count to Base + `md` + `lg`** (3 instead of 6). Cuts safelist size 2×. Inspector still hits the mobile/tablet/desktop sweet spot.
- **Valve C — auto-form Component Props panel falls back to manual** per-canonical UI. Skip the Zod-schema-derived form generator; hand-write a control per canonical. More boilerplate, less risk.
- **Valve D — skip safelist generation script.** Keep hand-written `@source inline()` blocks in `index.css`. Painful for six breakpoints × hundreds of utilities, but mechanically simple.

Decide which (if any) valves to pull mid-phase, not up front. The plan ships everything; the valves exist as fallbacks.

---

## Pre-flight

### 0.1 Install vitest

```sh
npm install -D vitest @vitest/ui
```

Add to `package.json`:

```jsonc
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  // ...
}
```

Vitest reads `vite.config.ts` directly — no separate config file needed. If TS picks a fight with vitest's globals, add `"types": ["vite/client", "vitest/globals"]` to `tsconfig.app.json`.

### 0.2 Decide commit vs. gitignore for the generated safelist

**Recommendation: gitignore** `src/style/safelist.generated.css`.

- Pro: no merge conflicts when slice arrays in `tw-classes.ts` change; the file rebuilds from source on every `npm run dev` and `npm run build`.
- Con: fresh clones need `npm run gen-safelist` (or just `npm run dev`) before Tailwind can compile properly.

Either decision is fine. **Add the safelist generation as a `predev` and `prebuild` hook** so the file always exists when Vite needs it.

```jsonc
"scripts": {
  "gen-safelist": "tsx scripts/gen-safelist.ts",
  "predev": "npm run gen-safelist",
  "prebuild": "npm run gen-safelist",
  "dev": "vite",
  "build": "tsc -b && vite build",
}
```

Install `tsx` if not present: `npm install -D tsx`.

---

## Target directory additions

```
craftjs-design/
  scripts/
    gen-safelist.ts                # NEW — reads tw-classes.ts slice arrays, emits CSS
  src/
    style/
      tw-classes.ts                # EXTEND — add layout, spacing, size, fill, border, radius, effects slices
      tw-classes.test.ts           # NEW — vitest tests for all slices
      responsive.ts                # NEW — merge base + breakpoint slices → Tailwind-prefixed classNames
      safelist.generated.css       # NEW (gitignored) — emitted by gen-safelist.ts
    state/
      editorStore.ts               # EXTEND — gain activeBreakpoint
    registry/
      types.ts                     # EXTEND — CanonicalComponent.applicablePanels?
    editor/
      inspector/
        TypographyPanel.tsx        # existing
        LayoutPanel.tsx            # NEW
        SpacingPanel.tsx           # NEW
        SizePanel.tsx              # NEW
        AppearancePanel.tsx        # NEW (fill + border + radius)
        EffectsPanel.tsx           # NEW
        PropsPanel.tsx             # NEW
        ResponsiveBar.tsx          # NEW
        shared/
          ColorSelect.tsx          # NEW — reused by Typography color + Appearance fill/border
          ValueSelect.tsx          # NEW — reused by Spacing, Size, Radius
          BoxSidesEditor.tsx       # NEW — linked-corners editor for padding/margin/radius
    craft/
      CanonicalNode.tsx            # EXTEND — invoke composeResponsive() on style data
```

---

## Implementation steps

Twenty steps, grouped into four phases. Each step ends with `tsc -b` clean and `npm test` passing (once Step 3 lands).

### Group A — Foundation (Steps 1-7)

Pure-code work. No new UI. Sets up the parser, tests, safelist generation, responsive composition.

#### Step 1 — vitest scaffolding

Pre-flight 0.1 done. Add a sanity test in `src/style/tw-classes.test.ts` (just `expect(1 + 1).toBe(2)`) to verify `npm test` works.

#### Step 2 — Per-canonical `applicablePanels` metadata

Extend `CanonicalComponent`:

```ts
export type PanelId =
  | 'layout' | 'spacing' | 'size' | 'typography' | 'appearance' | 'effects' | 'componentProps'

export interface CanonicalComponent<Props = …> {
  // …existing fields
  applicablePanels?: readonly PanelId[]   // explicit list; undefined → default rules apply
}
```

Add a `defaultPanelsForCanonical(c)` helper in `registry/registry.ts`:

```ts
export function getApplicablePanels(c: CanonicalComponent): PanelId[] {
  if (c.applicablePanels) return [...c.applicablePanels]
  const panels: PanelId[] = ['spacing', 'size', 'appearance', 'effects', 'componentProps']
  if (c.isCanvas) panels.push('layout')
  if (c.category === 'content' || c.category === 'layout') panels.push('typography')
  return panels
}
```

Update existing canonicals: leave `applicablePanels` undefined to use defaults. Add explicit declarations only when the defaults don't fit (Button — drop `typography` because shadcn's flex centering ignores text utilities; see the existing PHASE3 limitation in PHASE3_PLAN.md).

```ts
// button.ts
registerComponent<ButtonProps>({
  // …
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
```

#### Step 3 — Extend `tw-classes.ts` with new slices

Add the six remaining slices, mirroring the typography pattern. Export the value arrays so the safelist generator can consume them.

```ts
// LAYOUT slice
export const DISPLAYS = ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'hidden'] as const
export const FLEX_DIRS = ['row', 'col', 'row-reverse', 'col-reverse'] as const
export const ITEMS = ['start', 'center', 'end', 'stretch', 'baseline'] as const
export const JUSTIFY = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const
export const GAPS = ['0', '1', '2', '3', '4', '6', '8', '12', '16'] as const

export interface LayoutSlice {
  display?: typeof DISPLAYS[number]
  flexDirection?: typeof FLEX_DIRS[number]
  alignItems?: typeof ITEMS[number]
  justifyContent?: typeof JUSTIFY[number]
  gap?: typeof GAPS[number]
}

// SPACING slice (padding + margin, each with x/y/4-side options)
export const SPACING = ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '16', '20', '24', '32'] as const
export interface SpacingSlice {
  p?: typeof SPACING[number]; px?; py?; pt?; pr?; pb?; pl?
  m?: typeof SPACING[number]; mx?; my?; mt?; mr?; mb?; ml?
}

// SIZE slice
export const SIZES = ['auto', 'full', '1/2', '1/3', '2/3', '1/4', '3/4', '0', '8', '12', '16', '24', '32', '48', '64', '96', '128'] as const
export interface SizeSlice {
  w?: typeof SIZES[number]
  h?: typeof SIZES[number]
  minW?; minH?; maxW?; maxH?
}

// APPEARANCE slice (fill + border + radius)
export const COLORS = ['foreground', 'primary', 'secondary', 'muted-foreground', 'destructive', 'accent-foreground',
                      'background', 'card', 'muted', 'accent', 'border', 'input', 'ring'] as const
export const BORDER_WIDTHS = ['0', '1', '2', '4', '8'] as const
export const RADII = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const
export const BORDER_STYLES = ['solid', 'dashed', 'dotted'] as const

export interface AppearanceSlice {
  bg?: typeof COLORS[number]
  borderColor?: typeof COLORS[number]
  borderWidth?: typeof BORDER_WIDTHS[number]
  borderStyle?: typeof BORDER_STYLES[number]
  rounded?: typeof RADII[number]
}

// EFFECTS slice
export const SHADOWS = ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'] as const
export const OPACITIES = ['0', '25', '50', '75', '100'] as const
export const BLURS = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const

export interface EffectsSlice {
  shadow?: typeof SHADOWS[number]
  opacity?: typeof OPACITIES[number]
  blur?: typeof BLURS[number]
}
```

Each slice gets its own `parse*`, `serialize*`, `merge*` trio with the same patch-friendly semantics as Phase 2's typography slice.

#### Step 4 — Tests for every slice

`src/style/tw-classes.test.ts`. One describe block per slice. Each block tests:
- Round-trip: parse → serialize → string matches input order-insensitively.
- Unknown class passthrough: parse "bg-card text-foreground custom-class" → unknownClasses includes "custom-class".
- Merge patch: original "text-base text-foreground", patch { fontSize: '2xl' } → output keeps `text-foreground`, replaces `text-base` with `text-2xl`.
- Regex disambiguation (the `text-align` vs `text-color` case): `text-center` is align, `text-foreground` is color, both must coexist.

This is the test suite Phase 2 deferred. Expect ~150 lines per slice; ~1000 lines total. Worth every minute against the bug class it prevents.

#### Step 5 — Generated safelist script

`scripts/gen-safelist.ts`. Reads slice arrays from `tw-classes.ts`, emits `src/style/safelist.generated.css`.

```ts
import { writeFileSync } from 'node:fs'
import {
  FONT_SIZES, FONT_WEIGHTS, TEXT_ALIGNS, COLORS as TEXT_COLORS, // typography
  DISPLAYS, FLEX_DIRS, ITEMS, JUSTIFY, GAPS,                    // layout
  SPACING,                                                       // spacing
  SIZES,                                                         // size
  COLORS as BG_COLORS, BORDER_WIDTHS, RADII, BORDER_STYLES,     // appearance
  SHADOWS, OPACITIES, BLURS,                                     // effects
} from '../src/style/tw-classes'

const BREAKPOINTS = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:']

function expand(prefix: string, classes: readonly string[]): string {
  const list = classes.join(',')
  return BREAKPOINTS
    .map((bp) => `@source inline("${bp}${prefix}{${list}}");`)
    .join('\n')
}

const blocks = [
  '/* AUTO-GENERATED by scripts/gen-safelist.ts — do not edit. */',
  '/* Source: src/style/tw-classes.ts. Re-run via `npm run gen-safelist`. */',
  '',
  '/* Typography */',
  expand('text-', FONT_SIZES),
  expand('font-', FONT_WEIGHTS),
  expand('text-', TEXT_ALIGNS),
  expand('text-', TEXT_COLORS),
  '',
  '/* Layout */',
  expand('', DISPLAYS),
  expand('flex-', FLEX_DIRS),
  expand('items-', ITEMS),
  expand('justify-', JUSTIFY),
  expand('gap-', GAPS),
  '',
  '/* Spacing */',
  expand('p-', SPACING),
  expand('px-', SPACING), expand('py-', SPACING),
  expand('pt-', SPACING), expand('pr-', SPACING), expand('pb-', SPACING), expand('pl-', SPACING),
  expand('m-', SPACING),
  // …and so on
  '',
  // Size, Appearance, Effects blocks…
].join('\n')

writeFileSync('src/style/safelist.generated.css', blocks)
```

Wire `predev` / `prebuild` per Pre-flight 0.2. Update `src/index.css` to `@import "./style/safelist.generated.css";` (replacing the existing hand-written `@source inline()` block).

**Heads-up on `@source inline()` brace expansion:** Tailwind v4 supports `@source inline("text-{xs,sm,md}")` for class brace expansion. Verify whether nested expansion (`@source inline("{md:,lg:}text-{xs,sm}")`) works in your installed v4 version — if not, emit one `@source` per breakpoint (the script above already does this; we never rely on nested expansion).

#### Step 6 — Responsive composition

`src/style/responsive.ts`. Given `NodeStyle` and a slot name, produce a single Tailwind className string with breakpoint prefixes correctly applied:

```ts
export function composeResponsive(style: NodeStyle, slot: string): string {
  const base = style.classes[slot] ?? ''
  const bpClasses: string[] = []
  if (style.responsive) {
    for (const [bp, slots] of Object.entries(style.responsive)) {
      const sliced = slots[slot]
      if (!sliced) continue
      for (const cls of sliced.split(/\s+/).filter(Boolean)) {
        bpClasses.push(`${bp}:${cls}`)
      }
    }
  }
  return [base, ...bpClasses].filter(Boolean).join(' ')
}
```

Update `CanonicalNode.tsx` to use `composeResponsive(style, 'root')` when invoking the default classMap fallback (the `{ className: style.classes.root }` line). Adapters with their own classMap can use `composeResponsive` too.

#### Step 7 — Active breakpoint in Zustand

Extend `editorStore`:

```ts
type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface EditorStore {
  // …existing
  activeBreakpoint: Breakpoint
  setActiveBreakpoint: (bp: Breakpoint) => void
}
```

Default `'base'`. Persistence: NOT persisted (it's a UI editing tool; resets on reload).

### Group B — Reusable controls (Steps 8-10)

Build the shared UI before the panels.

#### Step 8 — `ColorSelect` shared component

`src/editor/inspector/shared/ColorSelect.tsx`:

```tsx
import { COLORS } from '@/style/tw-classes'
import type { TokenColor } from '@/style/tw-classes'

export function ColorSelect({
  value, onChange,
}: {
  value: TokenColor | ''
  onChange: (v: TokenColor | undefined) => void
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value as TokenColor)}>
      <option value="">—</option>
      {COLORS.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  )
}
```

Add a small color swatch next to each option using `style={{backgroundColor: `var(--${color})`}}` — gives the user a visual indicator.

#### Step 9 — `ValueSelect` shared component

Same shape as ColorSelect but generic over option arrays. Used by Spacing, Size, Radius, Effects.

```tsx
export function ValueSelect<T extends string>({
  value, options, onChange,
}: {
  value: T | ''
  options: readonly T[]
  onChange: (v: T | undefined) => void
}) { /* ... */ }
```

#### Step 10 — `BoxSidesEditor` shared component

Linked-corners editor used by Spacing (padding/margin) and Appearance (border-radius). Visual: a small box with four side values (top/right/bottom/left) and a link button.

When linked: editing any side updates all four to the same value, emits `p-{value}`.
When unlinked: each side is independent, emits `pt-{}`, `pr-{}`, `pb-{}`, `pl-{}`.

The link state lives in component-local `useState` — no Zustand needed (per `ARCHITECTURE.md` § Wrappers compose, not switch — inspector panel state is safe to use local state now).

### Group C — Panels (Steps 11-17)

#### Step 11 — Responsive bar

`src/editor/inspector/ResponsiveBar.tsx`. Top of the inspector, above the panels:

```tsx
export function ResponsiveBar() {
  const active = useEditorStore((s) => s.activeBreakpoint)
  const set = useEditorStore((s) => s.setActiveBreakpoint)
  const breakpoints: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl']
  return (
    <div className="flex gap-1 border-b p-2">
      {breakpoints.map((bp) => (
        <button key={bp} onClick={() => set(bp)}
                className={cn('px-2 py-1 text-xs rounded',
                              active === bp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
          {bp}
        </button>
      ))}
    </div>
  )
}
```

Active pill = which `responsive[bp]` slice the panels read/write. Base is the default `style.classes.root`.

#### Step 12 — Panel read/write helper

Every panel reads from and writes to the *active breakpoint's* class slice:

```ts
// src/editor/inspector/shared/useNodeClasses.ts
export function useNodeClasses(nodeId: string, slot: string = 'root') {
  const { actions, classString } = useEditor((_, query) => {
    const style = (query.node(nodeId).get().data.props as NodeProps).style
    const bp = useEditorStore.getState().activeBreakpoint
    const cs = bp === 'base'
      ? style.classes[slot] ?? ''
      : style.responsive?.[bp]?.[slot] ?? ''
    return { classString: cs }
  })

  const writeClasses = (next: string) => {
    actions.setProp(nodeId, (props: NodeProps) => {
      const bp = useEditorStore.getState().activeBreakpoint
      if (bp === 'base') {
        props.style.classes[slot] = next
      } else {
        props.style.responsive ??= {}
        props.style.responsive[bp] ??= {}
        props.style.responsive[bp][slot] = next
      }
    })
  }

  return { classString, writeClasses }
}
```

Every panel uses this — single funnel for read/write across breakpoints.

#### Step 13 — Refactor `TypographyPanel` to use `useNodeClasses`

Phase 2's panel reads `style.classes.root` directly; update to use the new hook. No functional change for base breakpoint; gains responsive support for free.

#### Step 14 — `LayoutPanel`

Controls: Display (dropdown), Flex Direction (segmented row|col), Items (start/center/end/stretch), Justify (start/center/between/around), Gap (dropdown).

Reads via `useNodeClasses` + `parseLayout`, writes via `mergeLayout`.

#### Step 15 — `SpacingPanel`

Controls: Padding (BoxSidesEditor with linked/unlinked), Margin (same). Uses ValueSelect with `SPACING` values.

#### Step 16 — `SizePanel`

Controls: Width, Height, Min/Max for each. Uses ValueSelect with `SIZES`.

#### Step 17 — `AppearancePanel`

Combines fill, border, radius:
- Background color: ColorSelect.
- Border: width (ValueSelect), style (segmented solid/dashed/dotted), color (ColorSelect).
- Radius: BoxSidesEditor across four corners.

#### Step 18 — `EffectsPanel`

Controls: Shadow (ValueSelect with `SHADOWS`), Opacity (ValueSelect with `OPACITIES`), Blur (ValueSelect with `BLURS`).

#### Step 19 — `PropsPanel`

Auto-generates a form from the canonical's `propsSchema`. Walks the Zod schema:

```tsx
function PropsPanel({ nodeId }: { nodeId: string }) {
  const { displayName, props } = useEditor((_, q) => {
    const node = q.node(nodeId).get()
    return { displayName: node.data.displayName, props: node.data.props.nodeProps }
  })
  const def = getComponentByDisplayName(displayName) // small helper to add
  if (!def) return null

  return (
    <section>
      {Object.entries(def.propsSchema.shape).map(([key, schema]) => (
        <PropField key={key} fieldName={key} schema={schema} value={props[key]}
                   onChange={(v) => actions.setProp(nodeId, (p) => { p.nodeProps[key] = v })} />
      ))}
    </section>
  )
}

function PropField({ fieldName, schema, value, onChange }) {
  // dispatch on Zod schema kind:
  // ZodEnum → Select
  // ZodString → text input
  // ZodBoolean → checkbox
  // ZodNumber → number input
  // (fallback: stringify and show as readonly)
}
```

Use Zod's internal `_def.typeName` to dispatch. The mapping is small: 4 cases for Phase 4. Phase 5 can extend with array/object types if needed.

### Group D — Integration (Steps 20-22)

#### Step 20 — Wire panels into Inspector with per-canonical filtering

`Inspector.tsx` queries `getApplicablePanels(canonicalDef)` for the selected node. Mounts only the allowed panels.

```tsx
const panels = getApplicablePanels(def)
return (
  <aside>
    {/* type/id/delete block */}
    <ResponsiveBar />
    {panels.includes('layout') && <LayoutPanel nodeId={selected.id} />}
    {panels.includes('size') && <SizePanel nodeId={selected.id} />}
    {panels.includes('spacing') && <SpacingPanel nodeId={selected.id} />}
    {panels.includes('typography') && <TypographyPanel nodeId={selected.id} />}
    {panels.includes('appearance') && <AppearancePanel nodeId={selected.id} />}
    {panels.includes('effects') && <EffectsPanel nodeId={selected.id} />}
    {panels.includes('componentProps') && <PropsPanel nodeId={selected.id} />}
  </aside>
)
```

#### Step 21 — Exit verification

Manual checklist matching the exit criteria above. Drop a hero, edit it across breakpoints, save/reload/theme-swap. Record screenshots of the landing page in default + rose themes at base + md breakpoints.

#### Step 22 — Update docs

- `docs/ARCHITECTURE.md`: extend the "Style Layer" supporting module section with the new slices, the responsive composition function, and the generated safelist.
- `docs/DEVELOPER_GUIDE.md`: add the "Adding an inspector panel" recipe in full (TypographyPanel as the template was placeholder; now there are six concrete examples).
- `docs/plans/PHASE4_PLAN.md` (this file): close out with which valves (A–D) were pulled and why.

---

## Out of scope (Phase 4)

| Feature | Phase |
|---|---|
| Arbitrary value escape hatch (`text-[#hex]`, `p-[7px]`) | Phase 5 |
| Per-document safelist at save time (for arbitrary values) | Phase 5 |
| Visual color picker (HSL wheel, eye-dropper) | Phase 5/6 |
| Drag-to-resize handles on canvas | Phase 5/6 |
| Undo/redo UI buttons (the Craft kernel has it; just no buttons yet) | Phase 5/6 |
| `AdapterProvider` split (mental-model cleanup) | Phase 6 |
| React 19 upgrade | Phase 6 |
| Plugin SDK public surface | Phase 6 |
| Tests beyond `tw-classes` (E2E, component tests) | Phase 6 |

---

## Risks specific to Phase 4

1. **Safelist size at 6 breakpoints × all slices.** Conservative estimate: ~500 base utilities × 6 prefixes = ~3000 generated utilities. Tailwind v4's JIT is fast but the resulting CSS bundle grows by ~50–100KB. Mitigation: check the dev/build CSS sizes after Step 5; if bloat is unacceptable, fall back to Valve B (3 breakpoints) or implement per-document safelisting in Phase 5.

2. **`@source inline()` brace-expansion edge cases.** Tailwind v4 supports `@source inline("text-{xs,sm}")` but documentation on nested expansion or modifier prefixes is thin. The generator emits one `@source` per breakpoint to avoid this risk entirely — if you're tempted to optimize with nested expansion, validate against the active Tailwind version first.

3. **`useNodeClasses` write-on-active-breakpoint isn't always what the user wants.** Edge case: user is on `md` breakpoint, edits Typography Color — but they actually wanted to change Base color too. The model says "edit at the active breakpoint only." Make the ResponsiveBar's active state visually loud (highlighted, with a "writing to: md" label) so users don't accidentally write breakpoint-specific overrides.

4. **`PropsPanel`'s Zod introspection is brittle.** Zod's `_def.typeName` is internal API. If Zod 5/6 changes that shape, the form generator breaks silently. Mitigation: cover the dispatch with tests in `tw-classes.test.ts`-adjacent file (or use the existing `propsSchema.parse(testData)` to validate at runtime). When Zod major-bumps, run the test suite first.

5. **CSS specificity / order between `:root`, `[data-theme=…]`, `.mui-bridge`, and the new `safelist.generated.css`.** The generated file emits *utility declarations*, not value overrides — should layer cleanly under everything else. But verify after Step 5 that nothing in `safelist.generated.css` accidentally outranks the theme token blocks. Easiest check: theme swap on Rose still repaints a `bg-primary` Box.

6. **Panel UI grows the inspector vertically.** Seven panels × multiple controls = a tall right sidebar. Phase 4 ships them all expanded; consider collapsible sections (`<details>` is one-line, no library needed) if it gets unwieldy. Out-of-the-box collapse-by-default UX is a polish item; pull as Valve E if needed.

7. **Phase 4 is 4 weeks of plan in 1 file.** Realistic completion: 5-6 weeks if everything goes smoothly, 8+ weeks if any of the above risks bite. Build in checkpoint demos after each Group (A–D) so progress is visible even if the end keeps slipping. Pull valves early if a checkpoint slips by more than a week.

---

## Definition of done

Exit-criteria checklist passes. `docs/ARCHITECTURE.md` and `docs/DEVELOPER_GUIDE.md` updated. Which valves (A–D) were pulled, and why, recorded in the conclusion of this file. Phase 5 — component breadth + arbitrary value escape hatch — is unblocked.

---

## Close-out

**Valves pulled:** none. Phase 4 shipped at full scope:
- All 6 style panels (Layout, Size, Spacing, Typography, Appearance, Effects) + Props panel = 7 panels.
- All 6 breakpoints in the responsive bar (Base / sm / md / lg / xl / 2xl).
- Auto-derived `PropsPanel` from Zod schemas (no manual per-canonical fallback needed).
- Generated safelist (246 `@source` directives) replacing the hand-written block.

**Bugs caught during integration that surfaced architectural lessons:**

1. **`useEditor` collector closure staleness.** `useEditor` only re-runs its collector on Craft state changes, not on Zustand state changes (like `activeBreakpoint`). The original `useNodeClasses` captured `activeBreakpoint` in the collector closure and read stale values at non-base breakpoints. Fix: compute derived values (like `classString`) in the hook *body*, not the collector. The collector subscribes to props changes only; the body recomputes on every render including Zustand-triggered ones. Documented as a convention in `docs/DEVELOPER_GUIDE.md` § Common gotchas.

2. **Adapter impls reading `style.classes.root` directly.** `ShadcnBox` and `ShadcnText` were written in Phase 1/2 before `CanonicalNode` started composing responsive class strings. They read the raw base classes and ignored the composed `className` prop. The bug was invisible until Phase 4 added responsive variants because Phase 1–3 only had base-breakpoint editing. Fix: migrate all adapter impls to consume `className` from `AdapterRenderProps`. Documented as a convention in both `ARCHITECTURE.md` § Adapter impls consume rendered className and `DEVELOPER_GUIDE.md` § Conventions.

Phase 5 (component breadth + arbitrary value escape hatch) is unblocked.
