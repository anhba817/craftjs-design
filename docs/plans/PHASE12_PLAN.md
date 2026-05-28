# Phase 12 — Style depth

**Status:** planned
**Timeline:** no deadline; ship when every in-scope Section 4 item is correctly done
**Audience:** designers who've outgrown the basics — they want pseudo-states, transforms, filters, real theming, and accessible color
**Scope discipline:** every non-Stretch item in `PRODUCTION_READINESS.md` § 4 ships. The two Stretch-tagged items (conic/mesh/animated gradients 4.7, OKLCH/wide-gamut picker 4.8) are explicitly out of scope and queued for a later phase. Sections 5+ remain out of scope.

## Goal

`0.2.0` (Phase 11) made daily editing *feel* like a real design tool. Phase 12 raises the **design ceiling**: the set of styles a designer can express without dropping to raw class strings, and the control they have over the document's theme. Every non-Stretch item in PRODUCTION_READINESS.md § 4 — Style depth — is delivered:

- Structured panels for **transforms, filters, and transitions** (4.4, 4.5, 4.3).
- **Pseudo-class states** (`:hover` / `:focus` / `:active`) as a first-class style dimension (4.2).
- **Background images** + repeat/size/position, and HSL/RGB sliders on gradient stops (4.6, 4.16).
- A real **theming system**: token-driven `registerTheme`, more built-in themes, a CSS-variable picker, per-theme dark mode, a visual theme editor, and live color-contrast checking (4.9–4.14).
- Drag-drop **font upload** in the editor (4.15).
- A build-time **Tailwind safelist plugin** replacing runtime `<style>` injection (4.1).

Cut as `0.3.0` at the close-out commit.

## Cross-cutting concerns established up front

These recur across groups; deciding them once avoids per-group churn.

1. **Safelist growth.** Every new structured panel emits a new Tailwind utility family (`rotate-*`, `brightness-*`, `transition-*`, `hover:*`, …). The `gen-safelist` generator (`scripts/`) must gain each family as the panel that needs it lands. Group A extends the generator's surface; later groups add their own families.
2. **The style model has dimensions, not just slots.** Today: base `classes`, `responsive[bp]`, `inline`, `responsiveInline[bp]`. Pseudo-states (Group B) add a **state dimension** that fully composes with breakpoints (**decided: full `breakpoint × state` matrix** — `md:hover:bg-primary` is expressible). `useNodeClasses` is the single funnel that routes reads/writes to the active `(breakpoint, state)` bucket — panels stay dimension-agnostic, exactly as they're already breakpoint-agnostic.
3. **Color surfaces converge on one picker.** Background-image fill, gradient-stop editing, CSS-variable tokens, and contrast checking all extend the existing `ColorPicker` / `useNodeClasses` plumbing rather than forking new ones.

---

## Group A — Transforms + Filters + Transitions panels (§ 4.4, 4.5, 4.3)

Three structured panels of the same shape: parse a Tailwind utility family out of the slot's class string, render typed controls, merge edits back. Modeled on the existing Size / Spacing / Layout panels (slice parse + merge in `tw-classes.ts`). Lands first because it exercises the safelist-generator extension that every later panel reuses.

**Land**

1. **`tw-classes.ts` slices + parsers + mergers** for three new families:
   - Transforms: `rotate-{n}`, `scale-{n}`, `translate-x/y-{n}`, `skew-x/y-{n}`. Arbitrary values (`rotate-[17deg]`) route to inline like Size already does.
   - Filters: extend the existing Effects parse to add `brightness/contrast/grayscale/invert/saturate/sepia` + `drop-shadow-{size}`. (`blur` / `shadow` already exist — don't regress them.)
   - Transitions: `transition-{none|all|colors|…}`, `duration-{n}`, `ease-{linear|in|out|in-out}`, `delay-{n}`.
2. **Three panels** (`TransformsPanel`, extend `EffectsPanel` for filters or split a `FiltersPanel`, `TransitionsPanel`), registered as built-ins via `registerPanel`. Multi-mode aware (`useNodeClassesMulti` → "— Mixed") like every Phase 11 panel.
3. **Safelist generator** extension covering the three families × breakpoints (and later × states).
4. **Reduced-motion interaction:** transitions a designer authors are *content*, not chrome — they are NOT wrapped by the global `prefers-reduced-motion` rule (that rule targets editor chrome via `index.css`; document nodes render their authored classes). Document this distinction so it isn't "fixed" later.

**Output**

- Transforms / Filters / Transitions editable without raw class strings.
- ~12 tests over the new parse/merge slices (the panels' pure half).

---

## Group B — Pseudo-class states (§ 4.2)

The architectural item. Adds a **state dimension** to the style model — fully composing with breakpoints — so any panel can edit `:hover` / `:focus` / `:active` variants at any breakpoint.

**Resolved (decision):** full `breakpoint × state` matrix. `md:hover:bg-primary` is a first-class, expressible combination. The selector is 2-axis (pick a breakpoint AND a state); the storage adds the two missing quadrants so all four `(bp ∈ {base, …}) × (state ∈ {base, hover, focus, active})` combinations have a home:

```
NodeStyle (classes side; inline side mirrors it)
  classes                              (base bp, base state)     — today
  responsive[bp][slot]                 (non-base bp, base state) — today
  states[state][slot]                  (base bp, non-base state) — NEW
  stateResponsive[bp][state][slot]     (non-base bp, non-base state) — NEW
```

CSS composition: Tailwind variant prefixes stack as `<bp>:<state>:<util>` (e.g. `md:hover:bg-primary`). The emitted prefix order is fixed (breakpoint outermost) so the safelist + parser agree.

**Land**

1. **Schema + migration.** Add `states` / `stateInline` / `stateResponsive` / `stateResponsiveInline` to `NodeStyle` (all optional → no envelope migration needed; absent = today's behavior). Bump the doc-integrity allowlist.
2. **`editorStore.activeState: 'base'|'hover'|'focus'|'active'`** (parallel to `activeBreakpoint`). A **`<StateBar>`** in the inspector beside `<ResponsiveBar>`; the two together pick the active `(bp, state)` bucket.
3. **`useNodeClasses` / `useNodeClassesMulti` routing.** Reads/writes target the `(activeBreakpoint, activeState)` quadrant via a single dispatch table:
   - `(base, base)` → `classes` / `inline`
   - `(bp, base)` → `responsive[bp]` / `responsiveInline[bp]`
   - `(base, state)` → `states[state]` / `stateInline[state]`
   - `(bp, state)` → `stateResponsive[bp][state]` / `stateResponsiveInline[bp][state]`
   Every existing panel becomes state-aware with zero panel changes — same payoff the responsive dimension already delivered. The container-peel discipline (delete empty buckets on clear) extends to the new quadrants.
4. **CanonicalNode composition.** Extend `composeResponsive` / `composeResponsiveInline` to also walk the state + stateResponsive quadrants and emit the correctly-ordered `<bp>:<state>:` prefixes. The responsive-inline → generated-`<style>` promotion path (Phase 6) must handle state-prefixed selectors too.
5. **Canvas preview.** A "preview state" affordance so the designer can SEE the hover style on the canvas without actually hovering (editor nodes are non-interactive). Apply the active state's classes via a forced data-attribute / class on the selected node, cleared on deselect.
6. **Safelist** gains the `<bp>:<state>:` prefixed variants of every emitted utility. This is the combinatorial growth flagged in Risk 2 — the generator emits state-prefixed entries only for utilities a panel can actually produce, and arbitrary values still route to inline CSS (no safelist entry).

**Output**

- Structured state editing across all panels, at every breakpoint.
- ~14 tests: the 4-quadrant routing dispatch in `useNodeClasses`, per-quadrant merge + container-peel, prefix-ordering in composition, the 2-axis bar transitions, preview application.

---

## Group C — Background images + gradient-stop sliders (§ 4.6, 4.16)

**Land**

1. **Background image fill.** Extend the Appearance panel's Fill `ColorPicker` with an "Image" mode: pick via the Phase 11 `EditorImageProvider` (`ImagePicker` reuse) → write `background-image: url(...)` to inline. Add repeat / size (`cover|contain|auto`) / position controls.
2. **Gradient-stop HSL/RGB sliders (§ 4.16).** The gradient editor's stops currently lack the full slider set the solid picker has. Reuse `HslSliders` / `RgbSliders` for each stop (the nested-ColorPicker work from Phase 10 § 2.12 makes this mostly wiring).

**Output**

- Background images + repeat/size/position; gradient stops get the full picker.
- ~6 tests over the background-image inline serialization + stop-slider value round-trips.

---

## Group D — Token-driven themes + more built-ins (§ 4.11, 4.12)

**Land**

1. **`registerTheme({ id, displayName, tokens })`** higher-level API. Given a token map (`primary`, `background`, …), generate the `[data-theme="id"]` CSS block and inject it (same `<style data-craftjs-*>` mechanism as font tokens). Backward-compatible: the existing `dataThemeValue` + host-CSS form still works.
2. **Token derivation.** From a small set of base tokens, derive the full shadcn token set (foreground/border/ring/muted/etc.) with sensible defaults so hosts pass 3–4 colors, not 20. Pure function, heavily tested.
3. **Five more built-in themes** (§ 4.12): green, blue, slate, zinc, neutral — authored via the new token API to dogfood it.

**Output**

- Hosts register themes with tokens, no hand-written CSS.
- 7 built-in themes total.
- ~10 tests: derivation correctness, CSS-block generation, registry round-trip.

---

## Group E — CSS-variable picker + color-contrast checking (§ 4.9, 4.14)

**Land**

1. **CSS-variable picker (§ 4.9).** A host-supplied enumeration of available CSS custom properties (`--brand-blue`, …) surfaced as a color source in `ColorPicker` alongside Tailwind tokens. New SDK context (mirrors `EditorImageProvider`'s shape): `registerColorVariables([...])` or an `<EditorColorVariablesProvider>`. Picking one writes `var(--brand-blue)` to the slot.
2. **Color-contrast checking (§ 4.14).** When a text color is chosen over a known background, compute the WCAG contrast ratio (pure `contrastRatio(fg, bg)` helper) and render a live AA / AAA / fail badge in the Typography panel's color row. Resolve token/var colors to concrete values for the math where possible; show "unknown" when the background can't be resolved.

**Output**

- Host design tokens selectable; live accessibility feedback on text color.
- ~10 tests: contrast math (known WCAG pairs), variable resolution, badge thresholds.

---

## Group F — Visual theme editor + per-theme dark mode (§ 4.10, 4.13)

The biggest UI item in Phase 12.

**Resolved (decision):** the theme editor is a **modal dialog** launched from the theme switcher in the top bar — same Radix Dialog pattern as the Phase 11 image library, with a live canvas preview behind it. No sidebar tab / route.

**Land**

1. **Visual theme editor (§ 4.10).** Pick base colors → live-derive the full token set (reuses Group D's derivation) → live preview on the canvas → save as a new theme (via Group D's token API) → export the CSS block to clipboard / file.
2. **Per-theme dark mode (§ 4.13).** A theme declares `light` + `dark` token variants. A system-prefs-aware toggle in the editor chrome switches the active variant; the saved document records the chosen mode. Replaces the single baked-in `dark` class in `index.css`.

**Output**

- Designers create + edit themes visually, with light/dark variants.
- ~8 tests: editor state round-trip, dark-variant resolution, export format.

---

## Group G — Font upload UI + safelist build plugin (§ 4.15, 4.1)

Two standalone infrastructure items.

**Land**

1. **Font upload UI (§ 4.15).** A drag-drop `.woff2` panel: drop file → name it → `registerFontToken` + inject `@font-face`. Storage routes through the Phase 11 asset-provider pattern (host backend or session-inline). The font then appears in the Typography panel's font dropdown.
2. **Real safelist Vite plugin (§ 4.1).** Replace runtime `<style>` injection *for hosts that opt in* with a build-time plugin: reads the host's documents, emits `@source inline()` directives to a generated file, HMR-triggers Tailwind rebuilds when documents change. The Phase 8 extractor already produces the class set; this is the consumer. **Resolved (decision):** ship as an OPTIONAL export — the runtime injection path stays the zero-config default, so no host is forced into a build-config change. Adopting the plugin is purely a production-CSS-trimming upgrade.

**Output**

- Designers add fonts without code; hosts get a production-grade safelist build path.
- ~8 tests: font-token registration from upload, plugin extraction over fixture documents.

---

## Group H — Verification + close-out

**Land**

1. **Reduced-motion re-check.** Confirm the Group A authored-transitions distinction holds (document transitions animate; chrome respects reduce-motion).
2. **Full manual smoke.** Every new panel edits; states preview correctly; theme editor round-trips; contrast badges; font upload; image backgrounds. Clean `rm -rf node_modules && npm install && npm test`. `npm run build:dist` emits `.d.ts` for the new SDK additions (theme token API, color-variables provider, font-upload, safelist plugin).
3. **Doc updates.** PRODUCTION_READINESS § 4 non-Stretch items struck through; INTEGRATION_GUIDE (color-variables provider, theme token API, safelist plugin); SDK_GUIDE (new exports); DEVELOPER_GUIDE recipes (authoring a token theme, adding a style panel for a new utility family); ARCHITECTURE (state dimension, theme-token derivation); CHANGELOG cut as `0.3.0`.
4. **Close-out section** appended to this file: per-item path-taken table, the state-composition decision, theme-editor placement decision, safelist plugin opt-in vs default, bundle delta vs `0.2.0`, tests added.

**Output**

- Phase 12 complete; Phase 13 (Section 5 — component breadth) unblocked. `0.3.0` cut.

---

## Out of scope (NOT in Phase 12)

Section 4's Stretch items + everything in Sections 5+.

| Item | Section | Why deferred / Phase target |
|---|---|---|
| Conic / mesh / animated gradients | § 4.7 | Linear + radial cover the common case; conic is reasonable but mesh/animated are aspirational. Phase 13+ stretch. |
| OKLCH / wide-gamut color picker | § 4.8 | hex/RGB/HSL cover authoring today; a perceptual-space picker is polish. Pairs naturally with the theme editor but isn't required by it. Phase 13+ stretch. |
| Section 5 (component breadth) | § 5 | Phase 13 candidate. |
| Sections 6+ | § 6–14 | Later phases. |

---

## Risks + mitigations

No valves. Every risk has a mitigation that delivers the item.

1. **The full `breakpoint × state` matrix is a lot of surface** (4 storage quadrants × classes/inline, a 2-axis selector, prefix-ordered composition). Mitigation: it's all funneled through `useNodeClasses`'s single dispatch table + the composition helpers — panels never see it. Each quadrant is the same shape as the existing two, so the work is symmetric extension, not new patterns. Heavy unit coverage on the dispatch + merge + prefix-ordering (the pure halves) de-risks it before the UI lands.
2. **Safelist grows unboundedly with new utility families × breakpoints × states.** Mitigation: the generator emits only the families the panels can produce; arbitrary values still route to inline CSS (no safelist entry needed). Measure CSS bundle delta at close; if it's a problem, the Group G build plugin trims to per-document actual usage.
3. **Token derivation produces ugly themes.** Mitigation: derivation is a pure, tested function with conservative defaults; the visual theme editor's live preview lets designers correct any derived token by hand.
4. **Canvas state-preview conflicts with real interaction.** Mitigation: editor nodes are already non-interactive (Phase 1 decision); the preview is a forced data-attribute on the selected node only, cleared on deselect.
5. **The safelist Vite plugin couples to host build config.** Mitigation: ship it as an OPTIONAL export; the existing runtime-injection path stays the zero-config default, so no host is forced to adopt it.
6. **Contrast math on token/var colors that can't be resolved at edit time.** Mitigation: resolve what's resolvable (concrete hex, known tokens); show an explicit "can't determine" state rather than a wrong ratio.

---

## Definition of done

Every non-Stretch Section 4 item is **shipped + tested + documented** — the default bar, applied to all 14 in-scope items. No item left unaddressed. Stretch items (4.7, 4.8) keep their PRODUCTION_READINESS prose and are queued for later phases.

When all 14 in-scope items satisfy this bar, Phase 12 is complete and Phase 13 (Section 5 — component breadth) is unblocked. `0.3.0` cuts at the close-out commit.

---

## Close-out (Phase 12 shipped — `0.3.0`, 2026-05-28)

All 14 in-scope Section 4 items are shipped + tested + documented. Final:
**516 tests passing across 48 files**; `tsc -b`, `npm run build`, and
`npm run build:dist` all clean (the lib build emits `.d.ts` for every new
SDK addition: theme token API, color-variables provider, curated fonts,
and the `./vite-plugin` subpath).

### Per-item path taken

| Item | Path taken |
|---|---|
| 4.1 Safelist plugin | Optional `./vite-plugin` export consuming the Phase 8 extractor; opt-in, runtime injection stays default. |
| 4.2 Pseudo-class states | Full breakpoint × state matrix — 4 storage quadrants, central `dimensions.ts` dispatch, `StateBar`, canvas preview. |
| 4.3 Transitions | Four inline `transition-*` longhands via `FlexibleSelect`. |
| 4.4 Transforms | Composed inline `transform` function list (`cssFunctions.ts`). |
| 4.5 Filters | Composed inline `filter` list; owns `blur` (moved from Effects). |
| 4.6 Background images | Inline `background-image: url()` + repeat/size/position; coexists with color, exclusive with gradient. |
| 4.9 CSS-variable picker | `EditorColorVariablesProvider` (mirrors image provider); `var` ColorPicker kind. |
| 4.10 Visual theme editor | Modal from the top bar (not a route/tab) with an OKLCH slider picker + live canvas preview via a transient theme. |
| 4.11 Theme token API | `tokens` on `registerTheme` + pure `deriveTokens`; backward-compatible with CSS-only themes. |
| 4.12 More themes | green, blue, slate, zinc, neutral (token-authored, dogfooding 4.11). |
| 4.13 Dark mode | Per-theme `darkTokens` → `.dark[data-theme]`; `colorMode` persisted; system-aware toggle. |
| 4.14 Contrast checking | `ContrastBadge` + pure WCAG math + OKLCH→sRGB (browsers return computed token colors as oklch). |
| 4.15 Font upload | "Fonts" panel routing storage through the asset provider + curated system/Google fonts. |
| 4.16 Gradient-stop sliders | Already satisfied in Phase 10 (nested ColorPicker). |

### Decisions

- **State composition:** full breakpoint × state matrix (not state-only),
  funneled through one dispatch table so panels stay oblivious. Classes
  emit breakpoint-outermost (`md:hover:…`); state inline values promote to
  generated `.cls:hover` rules to beat the inline-`style` specificity.
- **Theme editor placement:** modal dialog from the top bar (Radix Dialog,
  like the Phase 11 image library), with the canvas previewing live behind
  it via a transient `__theme_preview` theme. No sidebar tab / route.
- **Safelist plugin:** OPT-IN export. Runtime `<style>` injection remains
  the zero-config default; the plugin is purely a production-CSS trim.
- **Reduced motion:** the global `prefers-reduced-motion` rule applies to
  the canvas too — authored transitions are intentionally NOT exempted
  (a user accessibility preference outranks previewing motion). Chrome and
  canvas both honor it; editor drag/guide/resize overlays use direct DOM
  positioning and are unaffected either way.

### Bundle delta vs `0.2.0`

`npm run build` (no minify, sourcemap): JS 578 → 603 KB raw (173 → 182 KB
gz); CSS 221 → 308 KB raw (28 → 39 KB gz). The CSS growth is the safelist
gaining `hover:`/`focus:`/`active:` state prefixes across utility families;
hosts trim it with the optional safelist plugin.

### Tests

516 passing (48 files), up from 452 at the start of the matrix work.
New coverage spans the dimension dispatch + prefix-ordered composition,
token derivation (light/dark) + CSS emission, WCAG contrast + OKLCH
conversion, the `var` color round-trip, document `colorMode` persistence,
oklch parse/format, curated-font list integrity + Google href, and the
safelist plugin's extraction/aggregation.

Phase 13 (Section 5 — component breadth) is unblocked.
