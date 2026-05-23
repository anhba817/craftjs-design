# Phase 4.5 — Inspector UX Polish

> Hex colors + arbitrary numeric values + visual polish. A focused mini-phase between Phase 4 and Phase 5. ~1–2 weeks.

## Goal

The Phase 4 inspector works but is rigid: colors limited to shadcn tokens, sizes/spacing limited to the predefined Tailwind scale. Real design work needs:

- **Arbitrary hex colors** (`#fa8072`) alongside token swatches.
- **Arbitrary spacing/size values** (`13px`, `50%`) alongside the token dropdowns.
- **Visual polish** — Figma-like swatch grids, custom dropdowns with previews, tight layout.

Phase 4.5 ships these without expanding Phase 5's component breadth scope. It also lays the groundwork that Phase 5 needs anyway: a clean place for arbitrary values to live in the data model.

## Exit criteria

1. Select a node, change Fill color: click a token swatch OR type a hex value. The hex value renders correctly (visible in DevTools, visible on canvas).
2. Same for text color, border color.
3. Spacing input accepts arbitrary px/%/em (`p-13px` style) AND the existing token scale. Step buttons (+/−) work for token values.
4. Theme swap still retints token-bound colors. Arbitrary colors are FIXED (don't retint — that's correct).
5. At a non-base breakpoint, hex/arbitrary inputs are disabled with a clear tooltip ("Arbitrary values supported at base breakpoint only — see Phase 5"). Token pickers remain available.
6. Native `<select>` dropdowns replaced by shadcn's `Select` for visual consistency.
7. Inspector sections can collapse/expand.

---

## Scope decisions (locked)

- **Color**: token swatch grid + hex input (no HSL sliders, no eyedropper — defer to Phase 6 polish).
- **Numeric**: type-any-value + step buttons (no drag-to-scrub — defer to Phase 6 polish).
- **Arbitrary values stored as inline CSS, not Tailwind classes.** This sidesteps the per-document-safelist build complexity. The trade-off: arbitrary values only work at the **base** breakpoint. Non-base breakpoints stay token-only.
- **Sequencing**: Phase 4.5 ships before Phase 5. Phase 5 inherits the better inspector for its new canonicals.

### Why inline CSS for arbitrary values (not Tailwind classes)

Tailwind v4's JIT compiles classes by scanning source files for literal strings. Arbitrary classes (`bg-[#fa8072]`, `p-[13px]`) emitted by the inspector live in `localStorage`, not source — Tailwind can't see them, can't generate CSS for them.

The full solution (per-document safelist generated at save time, watched by Vite, etc.) is real engineering work — easily another 1–2 weeks. The pragmatic alternative: emit arbitrary values as inline `style={{}}` on the rendered element. Inline styles always apply; no compilation needed. Trade-off: CSS `style="..."` attributes don't support media queries, so **arbitrary values at non-base breakpoints would need a different mechanism**. We defer that to Phase 5+ when the doc-safelist build pipeline lands.

### Why the responsive-bar limitation is acceptable for Phase 4.5

The 80% case is "I want this specific brand color across all breakpoints." Set at base → applies everywhere by default (no responsive override needed). The 20% case ("hex color at md but a different hex at lg") is genuinely rare; users who hit it can hand-edit the saved JSON until Phase 5+ ships proper support.

---

## Pre-flight

### 0.1 Install shadcn primitives we'll need

```
npx shadcn add select
npx shadcn add popover
npx shadcn add tooltip
```

`Select` replaces the native `<select>` for visual consistency and per-option rendering. `Popover` powers the ColorPicker overlay. `Tooltip` explains why arbitrary inputs are disabled at non-base breakpoints.

### 0.2 Decide where arbitrary values live in `NodeStyle`

Extension:

```ts
export interface NodeStyle {
  classes: Record<string, string>
  responsive?: Record<string, Record<string, string>>
  // NEW: slot → CSS-property → value, e.g. { root: { backgroundColor: '#fa8072', padding: '13px' } }
  // Inline styles. Always applied at base. Higher specificity than Tailwind classes,
  // so arbitrary values override token classes for the same property.
  inline?: Record<string, Record<string, string>>
}
```

`inline` is optional and only populated when the user picks an arbitrary value. Token picks write to `classes` and clear the matching `inline` field (so token picks override prior arbitrary picks cleanly).

---

## Target directory additions

```
src/
  style/
    inline.ts                     # NEW — pure utils for merging style.inline → React.CSSProperties
  editor/inspector/shared/
    ColorPicker.tsx               # NEW — Popover wrapping token swatch grid + hex input
    NumericInput.tsx              # NEW — token select + arbitrary text field + step buttons
    CollapsibleSection.tsx        # NEW — thin wrapper around <details>, matches Inspector visual rhythm
  components/ui/
    select.tsx                    # added by `npx shadcn add select`
    popover.tsx
    tooltip.tsx
```

No new top-level files. Five new components in `inspector/shared/`. The existing `ColorSelect` and `ValueSelect` get **deprecated** but not removed yet — Phase 5 can complete the migration if any panels still use them.

---

## Implementation steps

Thirteen steps, grouped into four phases. Each step ends with `tsc -b` + `npm test -- --run` clean.

### Group A — Data model + adapter flow (Steps 1–4)

Foundational. Enables every subsequent step.

#### Step 1 — Extend `NodeStyle.inline`

`registry/types.ts`. Adds the optional `inline?: Record<string, Record<string, string>>` field. No existing code references it; nothing breaks. The persisted document schema (`persistence/schema.ts`) doesn't need to change — `craftJson` is opaque to the envelope.

#### Step 2 — `style/inline.ts` utility

```ts
import type { NodeStyle } from '@/registry/types'

// Slot → React-style CSS object. Returns undefined when the slot has no inline
// styles (avoids passing empty objects to adapters that might re-render).
export function composeInlineStyle(style: NodeStyle, slot: string = 'root'): React.CSSProperties | undefined {
  const inline = style.inline?.[slot]
  if (!inline || Object.keys(inline).length === 0) return undefined
  return inline as React.CSSProperties
}
```

Phase 5 will extend this to merge arbitrary values from `style.responsive[bp].inline?.[slot]` once that storage exists. Phase 4.5 only reads from the base `style.inline`.

#### Step 3 — Update `CanonicalNode` to feed `inlineStyle` from `style.inline`

```tsx
const composedClassName = composeResponsive(style, 'root')
const composedInline = composeInlineStyle(style, 'root')

const styleProps: ClassMapResult = adapter.classMap
  ? adapter.classMap(composedClassName, canonicalId)
  : { className: composedClassName }

return (
  <Impl
    …
    className={styleProps.className}
    sx={styleProps.sx}
    inlineStyle={{ ...styleProps.inlineStyle, ...composedInline }}
    …
  />
)
```

`composedInline` takes precedence over `classMap`-provided `inlineStyle` because the user explicitly set an arbitrary value. Document the precedence in the comment.

#### Step 4 — Migrate adapter impls to consume `inlineStyle`

Every Tailwind-class-consuming impl gets a `style={inlineStyle}` prop on its root element:

```tsx
export function ShadcnBox({ children, rootRef, className, inlineStyle }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      {children}
    </div>
  )
}
```

MUI impls receive both `sx` (already supported) and `inlineStyle` (passed via the standard React `style` prop on MUI components). Verify MUI components accept `style` as well as `sx` — they do; `style` becomes inline CSS, `sx` becomes generated CSS rules.

Update `ARCHITECTURE.md` § Adapter impls consume rendered className: add an inline-style line to the contract.

### Group B — Color picker (Steps 5–7)

#### Step 5 — `ColorPicker.tsx`

`src/editor/inspector/shared/ColorPicker.tsx`. Uses shadcn `Popover` + `Tooltip`.

Anatomy:
```
┌─────────────────────────────────┐
│ Trigger button (current swatch) │   ← shows current color
└─────────────────────────────────┘
            ↓ click
┌─────────────────────────────────┐
│ Token swatches (grid)           │   ← 17 shadcn tokens, 6 per row
│   ▢ ▢ ▢ ▢ ▢ ▢                  │
│   ▢ ▢ ▢ ▢ ▢ ▢                  │
│   ▢ ▢ ▢ ▢ ▢                    │
│                                 │
│ ─────────────                   │
│ Hex: [#xxxxxx        ] ✓        │   ← text input + commit button
└─────────────────────────────────┘
```

API:

```ts
interface ColorPickerProps {
  value: { kind: 'token'; token: TokenColor } | { kind: 'hex'; hex: string } | { kind: 'unset' }
  cssProperty: 'backgroundColor' | 'color' | 'borderColor'   // determines class prefix
  onChange: (v: ColorPickerProps['value']) => void
  disabled?: boolean      // true at non-base breakpoints (hex mode requires base)
}
```

The parent (`AppearancePanel`, `TypographyPanel`) translates the picker's value into either:
- `kind: 'token'` → write `bg-{token}` to classes (via `mergeAppearance`), clear `style.inline.root.backgroundColor`.
- `kind: 'hex'` → write `style.inline.root.backgroundColor = '#xxx'`, clear `bg-{token}` from classes.

The picker itself stays presentation-only; doesn't know about Craft.

#### Step 6 — Wire `ColorPicker` into Appearance / Typography panels

Replace `ColorSelect` usage with `ColorPicker`. The panel's `read` step needs to look at both `style.classes` (token) and `style.inline` (arbitrary) and synthesize a `value` for the picker. The `write` step branches by `kind` and writes to the appropriate location.

At non-base breakpoints, pass `disabled` for the hex tab; show a tooltip explaining the limitation.

#### Step 7 — Deprecate `ColorSelect`

Keep the file (other panels may still import it during Phase 4.5). Add a `@deprecated` JSDoc tag pointing to ColorPicker. Phase 5 completes the migration.

### Group C — Numeric input (Steps 8–10)

#### Step 8 — `NumericInput.tsx`

`src/editor/inspector/shared/NumericInput.tsx`. Hybrid input combining:
- Text field accepting `"4"`, `"auto"`, `"50%"`, `"13px"`, `"1.5"`.
- Step buttons (+/−) that increment/decrement on the *token scale* only (numeric tokens).
- Token dropdown alternative (Popover triggered by a small chevron).

Parsing rules:
- If input matches a known token (e.g., `"4"` is in `SPACING_VALUES`): emit `kind: 'token'`.
- Else if input matches `/^\d+(\.\d+)?(px|%|em|rem)$/`: emit `kind: 'arbitrary'` with the raw value.
- Else: treat as token; if not in the scale, show a red border and reject on blur.

API:

```ts
interface NumericInputProps {
  value: { kind: 'token'; token: string } | { kind: 'arbitrary'; raw: string } | { kind: 'unset' }
  tokens: readonly string[]                     // e.g. SPACING_VALUES
  cssProperty: keyof React.CSSProperties        // 'padding', 'width', etc.
  onChange: (v: NumericInputProps['value']) => void
  disabled?: boolean
}
```

#### Step 9 — Wire `NumericInput` into Spacing / Size / Appearance panels

Spacing panel's `BoxSidesEditor` uses `NumericInput` instead of `ValueSelect` for each side. SizePanel and AppearancePanel (radius) likewise.

The data-model write logic mirrors ColorPicker:
- `kind: 'token'` → write `p-{value}` to classes.
- `kind: 'arbitrary'` → write `style.inline.root.padding = '13px'`, clear `p-{token}` from classes.

#### Step 10 — Deprecate `ValueSelect` for numeric uses

`ValueSelect` is still useful for enum-only fields (display, justify, etc.). It stays for those. Add a JSDoc note that NumericInput is preferred for numeric scales.

### Group D — Visual polish (Steps 11–13)

#### Step 11 — shadcn Select migration

Replace native `<select>` in `ValueSelect.tsx` with shadcn's `Select`. Per-option rendering enables future per-canonical icons (e.g., `flex-row` could show a tiny right-arrow). For Phase 4.5, just match the visual styling.

The hybrid behavior in `NumericInput` (where step buttons coexist with a dropdown trigger) requires careful keyboard handling — match shadcn Select's defaults.

#### Step 12 — `CollapsibleSection` component

Wrap each panel in a `<CollapsibleSection title="Layout">{panel}</CollapsibleSection>`. Default-expanded. Native `<details>` does the work; minimal CSS for the chevron.

Inspector now scrolls less because expanded panels are tighter and irrelevant ones can be collapsed.

#### Step 13 — Visual icons for layout options

LayoutPanel's FlexDir / Items / Justify selects show a small SVG indicator beside each option:
- `flex-row`: → arrow
- `flex-col`: ↓ arrow
- `items-center`: ⊕
- `justify-between`: ⇆

Use Lucide icons (already installed). One-line additions in the `ValueSelect`'s render that take an optional `icons` map.

### Group E — Tests + docs

#### Step 14 — Tests

Add a `style/inline.test.ts` block: round-trip a `NodeStyle.inline` through `composeInlineStyle`. Add ColorPicker / NumericInput integration tests if vitest's jsdom integration is straightforward; otherwise visual smoke check only.

Extend `tw-classes.test.ts` with one test: parser passes through `bg-[#xxxxxx]` and `p-[13px]` as `unknownClasses` (the parser doesn't recognize arbitrary syntax; the inspector now writes them to `style.inline` instead of `style.classes`).

#### Step 15 — Update docs

- `docs/ARCHITECTURE.md` — extend § Adapter impls consume rendered className with the `inlineStyle` requirement. Update § Style Layer with `composeInlineStyle`. Update the Persistence Format to note `style.inline`.
- `docs/DEVELOPER_GUIDE.md` — add a recipe for using ColorPicker / NumericInput in new panels. Document the "arbitrary at base, token at breakpoints" UX rule.
- Close out this plan with which scope (if any) was deferred to Phase 5.

---

## Out of scope (Phase 4.5)

| Feature | Phase |
|---|---|
| Responsive arbitrary values (`#hex` at md, different at lg) — would require per-document safelist build pipeline | Phase 5 |
| HSL / RGB sliders in ColorPicker | Phase 6 |
| Drag-to-scrub numeric inputs | Phase 6 |
| Eyedropper (browser's EyeDropper API) | Phase 6 |
| Reusable named "styles" (Figma's color/effect styles concept) | Phase 6+ |
| Gradients | Phase 6+ |
| Multiple-shadow stacking | Phase 6+ |
| Custom theme tokens authored in-app | Phase 6+ |

---

## Risks specific to Phase 4.5

1. **shadcn Select migration touches every panel.** The migration is mechanical but wide. Budget 1–2 days for it; do it after the new shared components are tested (so panels migrate to known-good controls).

2. **NumericInput parsing edge cases.** `"13px"` vs `"13 px"` vs `"13"` (token) vs `"13.5"` (also token, the `1.5` decimal exists in spacing scale). Define the parser's exact behavior up front and test it. Reject obviously-wrong input on blur with a visible red border.

3. **Specificity surprises.** Inline `style={{padding: '13px'}}` overrides Tailwind class `.p-4 { padding: 1rem }` because inline wins. This is correct, but the user might be confused if they set a Tailwind class via a different panel and don't see it apply because an arbitrary inline value was set earlier. UX mitigation: when reading state for the picker, the inline value "wins" — the dropdown shows the arbitrary value selected, not the (overridden) token.

4. **MUI impls and `style` prop.** MUI components support both `sx` (CSS-in-JS) and `style` (inline). They merge predictably but generate two style attributes; specificity is well-defined. Spot-check that arbitrary inline values applied to a Material Button override the theme's defaults.

5. **The "arbitrary at base only" UX feedback.** At non-base breakpoints, ColorPicker disables the Hex tab and NumericInput disables arbitrary entry. The tooltip text must be precise enough that the user understands the limitation without feeling like the tool is broken. Don't be vague.

6. **Persistence of `style.inline` in Craft state.** Craft serializes everything in `data.props`. Inline styles travel with the document automatically. No schema change. But verify: save → load → arbitrary values restore correctly.

---

## Definition of done

Exit-criteria checklist passes. Updated `docs/ARCHITECTURE.md` + `docs/DEVELOPER_GUIDE.md`. Close-out section in this file records: which steps slipped, which Phase 5 items moved earlier or later. Phase 5 (component breadth) starts with a polished inspector.
