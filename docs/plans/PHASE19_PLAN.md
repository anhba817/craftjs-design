# Phase 19 — Host-themable editor chrome

**Status:** planned
**Cuts as:** the next release after `1.0.1` (additive feature — minor/patch per
the CHANGELOG bump policy; `1.1.0` recommended since it's a visible new
capability).
**Audience:** whoever makes the editor's own UI — toolbox, inspector, toolbar,
panels, banners ("the chrome") — themable by the HOST, so the editor can match
the host app's brand. This is explicitly NOT the existing theme system:
`registerTheme` / the ThemeSwitcher / `colorMode` theme the **canvas /
document content** that end users design; this phase themes the **editor
around the canvas**, and only the host controls it (same product intent as the
host-pinned adapter).

## Where things stand

- The chrome is **hardcoded**: 391 occurrences of `bg-white` / `*-gray-*`
  Tailwind utilities across 50 files under `src/editor/`. The vocabulary is
  small — ~15 distinct values (`text-gray-700/600/500/400`, `border-gray-300/200`,
  `bg-gray-50`, `bg-white`, …) — so each maps deterministically to a semantic
  token.
- The chrome also **borrows canvas-theme tokens** in places (`bg-muted` on the
  canvas viewport, `text-muted-foreground`, `bg-primary` accents) — today the
  editor UI subtly changes with the *document* theme. That's a latent bug this
  phase resolves: chrome gets its own tokens, decoupled from the document.
- Scoping is safe: canvas themes apply via `data-theme` on the canvas wrapper
  (`ThemeProvider`); `colorMode` flips canvas `.dark` tokens only. Chrome
  tokens scoped to the editor's root `<div>` (`Editor.tsx`) can't collide.
- Tailwind v4's `@theme inline` block in `index.css` is the established
  pattern for mapping CSS variables to utilities (`--color-x` → `bg-x`).

## Goal

```tsx
<Editor adapter="mui" editorTheme="dark" />
<Editor editorTheme={{ surface: '#16161e', accent: '#7aa2f7' }} />
```

The host picks the chrome theme — a built-in preset (`'light'` default,
`'dark'`) or a partial token map — and the entire editor UI follows, while the
canvas keeps rendering the document's own theme (dark chrome around a light
document, like Figma). Zero visual change for hosts that pass nothing.

## In-scope

| Group | Theme |
|---|---|
| A | Chrome token system (CSS variables + Tailwind utilities, light = today's look) |
| B | The sweep — replace all 391 hardcoded utilities with token utilities |
| C | Host API — `editorTheme` prop + the built-in `dark` preset |
| D | Polish — contrast/a11y pass on dark, stragglers, dogfood toggle |
| E | Docs + close-out |

A is the foundation; B is the bulk (mechanical); C is the feature; D/E close.

## Resolved decisions

### 1. CSS variables + utility mapping, not a `dark:`-style variant

A parallel set of scoped CSS custom properties (`--ed-*`) mapped to Tailwind
utilities via `@theme inline` (`--color-ed-surface: var(--ed-surface)` →
`bg-ed-surface`). Components reference semantic tokens; presets and host
overrides only change variable values on the editor root. Rejected: a
`[data-editor-theme=dark]` CSS override sheet fighting 391 hardcoded utilities
(unmaintainable), and Tailwind `dark:` variants (couples chrome to the
document's color scheme).

### 2. The token vocabulary is semantic and SMALL (~10 tokens)

Deterministic mapping from today's values — light preset is pixel-identical:

| Token | Light default | Replaces |
|---|---|---|
| `--ed-surface` | `#ffffff` | `bg-white` |
| `--ed-surface-2` | gray-50 | `bg-gray-50` |
| `--ed-surface-3` | gray-100 | `bg-gray-100` |
| `--ed-border` | gray-200 | `border-gray-200` |
| `--ed-border-2` | gray-300 | `border-gray-300` |
| `--ed-border-strong` | gray-400/500 | `border-gray-400/500` |
| `--ed-text-strong` | gray-800/900 | `text-gray-800/900` |
| `--ed-text` | gray-700 | `text-gray-700` |
| `--ed-text-muted` | gray-500/600 | `text-gray-500/600` |
| `--ed-text-faint` | gray-300/400 | `text-gray-300/400` |
| `--ed-accent` (+`-fg`) | current primary look | chrome `bg-primary` accents |

Collapsing near-duplicate grays (500+600 → muted, etc.) is deliberate — it's
what makes a coherent dark preset possible. Reviewed case-by-case where the
collapse changes contrast relationships.

### 3. Host API = `editorTheme` prop on `EditorProps` (no new runtime export)

`editorTheme?: 'light' | 'dark' | EditorChromeTokens` (partial token map;
token map may also extend a preset: `{ preset: 'dark', accent: '…' }` —
settled in Group C). Applied as `data-editor-theme` + inline CSS variables on
the editor's root div — scoped, so the host page and multiple editors are
unaffected. `EditorChromeTokens` is a type-only export → the frozen runtime
surface (`surface.test.ts`) is untouched. No `registerEditorTheme` registry —
two presets + a token map covers the need without growing the API; a registry
can come later if real demand appears.

### 4. Chrome decouples from canvas tokens

Chrome spots that borrow document-theme tokens today (`bg-muted` viewport,
`text-muted-foreground`, `bg-primary` accents in panels) move to `--ed-*`
equivalents. Exception: anything INSIDE the canvas (node outlines may stay
canvas-relative — reviewed per spot in Group B). Result: switching the
document theme no longer shifts the editor UI, and vice versa.

---

## Group A — Chrome token system

**Land**

1. `--ed-*` variable definitions in `index.css`, scoped to a class on the
   editor root (e.g. `.cd-editor-chrome`), with light defaults matching
   today's exact gray values; a `[data-editor-theme='dark']` block for the
   dark preset (authored in Group C, stubbed here).
2. `@theme inline` mappings so `bg-ed-surface`, `text-ed-text-muted`,
   `border-ed-border`, etc. compile as utilities.
3. The scope class + default `data-editor-theme` wired onto the editor root
   div in `Editor.tsx`.

**Output** — tokens exist and render identically to today; nothing consumes
them yet.

## Group B — The sweep

**Land**

1. Codemod the 391 hardcoded utilities across the 50 `src/editor/` files to
   the token utilities per the Decision-2 table (same mechanical-replace
   approach as the Phase 18 adapter-import codemod; the mapping is
   deterministic so it's scriptable).
2. Hand-review the non-mechanical cases: `text-white` on colored controls,
   focus rings, shadows, the chrome spots borrowing canvas tokens
   (Decision 4), and `src/editor` CSS not expressed as utilities (e.g. the
   `.canvas-slot` hints in `index.css` — those are canvas-side, leave).
3. Add a **guard** (lint rule or a grep-based check in CI, like
   `check:size`) that forbids new `gray-*`/`bg-white` literals under
   `src/editor/` so the chrome can't silently regress to hardcoded colors.

**Output** — chrome renders pixel-identical in light; every color flows
through a token. (Runtime-verified against the dogfood app side-by-side.)

## Group C — Host API + dark preset

**Land**

1. `EditorProps.editorTheme` — preset name or token map; applied pre-paint in
   the same `useLayoutEffect` pattern as the `adapter` prop. Type-only
   `EditorChromeTokens` export.
2. Author the **`dark` preset** values (warm dark grays, accessible accent).
3. Interplay rules documented in code: chrome theme is independent of the
   document theme + `colorMode`; the canvas viewport keeps the document's
   background.

**Output** — `<Editor editorTheme="dark" />` and custom token maps work.

## Group D — Polish + a11y

**Land**

1. Contrast pass on the dark preset (reuse the § 4.14 contrast tooling
   mindset): text-on-surface pairs ≥ AA, focus rings visible.
2. Stragglers: scrollbars, native `<select>`/inputs in panels, the toolbox
   tile icons, drag previews, modals/banners, the docs of `EditableText`
   contrast.
3. Dogfood: a chrome-theme toggle in the dev `App.tsx` (host-level, NOT in the
   editor toolbar — end users don't get this control either).

**Output** — dark chrome is production-quality, verified at runtime.

## Group E — Docs + close-out

**Land**

1. INTEGRATION_GUIDE — "Theming the editor chrome" section: the `editorTheme`
   prop, the token reference table, and an explicit "this is NOT
   `registerTheme`" disambiguation (chrome vs document theming).
2. FAQ — "Can I make the editor match my app's dark UI?"; README highlight
   line; `EditorProps` JSDoc.
3. CHANGELOG entry; docs site regenerated; version cut.

**Output** — phase complete; release cut.

---

## Out of scope

| Item | Why |
|---|---|
| `registerEditorTheme` registry / named custom presets | Two presets + a token map covers it; add later on demand (additive). |
| End-user chrome theme switcher in the toolbar | Product intent: the HOST themes the editor, not its users. |
| Auto-following the host page's `prefers-color-scheme` | Host can do `editorTheme={matchMedia(…) ? 'dark' : 'light'}` themselves; baking it in adds lifecycle complexity. |
| Re-theming the CANVAS / document themes | Already shipped (`registerTheme`, Phase 12). |
| Chrome layout customization (panel sizes/positions) | Different feature entirely. |

## Risks + mitigations

1. **391-replacement sweep introduces visual regressions.** Mitigation: light
   token values are byte-identical to today's grays; the codemod mapping is
   deterministic; side-by-side runtime verification of every editor surface
   (toolbox, inspector panels, color picker, layer tree, modals, banners)
   before commit, per the standing gate.
2. **Gray-collapse (500+600 → muted) changes a contrast relationship
   somewhere.** Mitigation: the codemod output is hand-reviewed per file for
   the collapsed pairs; anywhere the distinction mattered gets the closest
   token, not a blind merge.
3. **Dark preset has poor contrast in corners we forget.** Mitigation: Group D
   contrast checklist over every chrome surface; dogfood toggle makes it easy
   to flip constantly during review.
4. **Token names ossify under the SemVer freeze.** `EditorChromeTokens` is
   type-only (no runtime surface change), but renaming a token later still
   breaks hosts' maps — choose the ~10 names carefully in Group A; they're
   API.

## Definition of done

Every chrome color flows through a scoped `--ed-*` token (no hardcoded
`gray-*`/`bg-white` under `src/editor/`, CI-guarded); `<Editor />` renders
exactly as today; `<Editor editorTheme="dark" />` ships a polished, accessible
dark chrome; a partial token map customizes either preset; the canvas remains
document-themed and fully decoupled; docs disambiguate chrome vs document
theming; release cut.
