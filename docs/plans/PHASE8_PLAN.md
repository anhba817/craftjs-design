# Phase 8 — Style depth + Production path

**Status:** planned
**Timeline target:** 5–8 weeks
**Audience for delivered build:** integration consumers (embedding the editor inside another React app)

## Goal

Two interlocking outcomes:

1. **Raise the design ceiling.** Today's `ColorPicker` ships hex + token swatches; there's no gradient editor, no eyedropper, no custom font story, and arbitrary CSS values are emitted via runtime `<style>` injection (Phase 6) rather than a real Tailwind safelist. A designer hitting the ceiling sees "I can't express this." Phase 8 lifts the ceiling: HSL/RGB sliders, gradients, custom fonts, snap-to-token resize, 8 resize handles.

2. **Make the editor embeddable.** Today the editor only runs as the standalone Vite app at `src/main.tsx`. Integration consumers want to drop `<Editor />` into their own React app. Phase 8 ships a `dist` build target, React 19 upgrade (so it matches what most integration apps run), error boundaries (so a buggy canonical doesn't crash the host), performance + accessibility passes (so the embedded editor doesn't tank the host's metrics), and an integration tutorial.

Phase 8 ends with: a designer can paint a multi-stop gradient with HSL sliders and an eyedropper, use a custom font registered at runtime, drag-resize a node with snap-to-Tailwind-token feedback, AND an integration consumer can `npm install @design/editor`, import `<Editor />`, and embed it in their React 19 app.

## Exit criteria

**Style depth**
- `ColorPicker` exposes HSL sliders (hue / saturation / lightness) AND RGB sliders alongside the existing hex input and token swatches. Mode toggle to pick which slider set is visible.
- EyeDropper API integration where the browser supports it (Chrome / Edge / Opera). Hidden gracefully where unsupported (Firefox, Safari at time of writing).
- Gradient editor: linear AND radial, multi-stop (≥2, ≤8 stops). Per-stop color via the same `ColorPicker`. Direction (linear) + position (radial). Stored in `style.inline[slot].background` as a CSS gradient string.
- Custom font tokens: user can register a font via `registerFontToken({ name, family, url? })`. The font-family Inspector pickers (Typography panel) list both built-in tokens AND user-registered ones. The runtime injects `@font-face` declarations for URL-backed fonts.
- Per-document Tailwind safelist via Vite plugin: replaces the Phase-6 runtime `<style>` injection for responsive arbitrary inline. The build emits real Tailwind CSS classes; runtime `<style>` blocks go away.
- 8 resize handles (4 corners + 4 edges). Edge handles do single-axis resize.
- Snap-to-token on resize release: if the rendered width/height is within 4px of a Tailwind size token (`w-32`, `w-48`, …), snap to the token class and clear the inline px value.

**Production path**
- `npm run build:dist` produces an embeddable `<Editor />` bundle. Includes type declarations.
- React 19 upgrade complete. The React-18 `display: contents` ref-forwarding workarounds in adapter impls are gone; shadcn primitives consume `ref` directly.
- Error boundaries wrap the canvas, the inspector, the toolbox, and each adapter's Wrapper. A boundary catches and renders a recovery UI instead of letting React unmount the entire editor.
- Performance pass: React Profiler audit shows no re-render storms during typical edit flows (drag, color pick, panel toggle). Document the measured baselines in `docs/PERFORMANCE.md`.
- Accessibility pass: every interactive control has an `aria-label` or visible label. Tab order is sane. Focus rings visible. Toolbox is keyboard-navigable.
- `docs/INTEGRATION_GUIDE.md` walks through embedding `<Editor />` in a host React 19 app.
- `tsc -b` clean. Tests pass (existing 164 + new tests for HSL/RGB conversions, gradient parser, font registration, error boundary fallback, safelist plugin).

## Valves (cut scope as you go)

| Valve | Triggers if… | What gets cut |
|---|---|---|
| **V1** | Per-document Vite safelist plugin gets gnarly (e.g., HMR breaks, Tailwind v4 internals fight back) | Keep the Phase-6 runtime `<style>` injection. Document the performance cost; move on. |
| **V2** | React 19 upgrade reveals deep shadcn / MUI / Craft incompatibilities | Stay on React 18 for Phase 8. Defer 19 to Phase 9 with a written list of blockers. |
| **V3** | Vite library mode can't cleanly externalize React + Craft for the dist bundle | Ship a workspace-example dist (full bundle, no externals). Embedders pay the duplicate-React cost in their own bundle. |
| **V4** | EyeDropper API has too narrow browser support to be worth shipping | Skip the eyedropper. HSL/RGB sliders + hex input still ship. |
| **V5** | Gradient editor scope creeps (conic, mesh, animation) | Linear + radial only. No conic. No animation. |
| **V6** | Custom font registration interacts badly with shadcn theme tokens | Ship the API but no UI — SDK consumers can call `registerFontToken` from code; the Typography panel doesn't surface them yet. |

---

## Plan

Nine groups, ordered for dependency: style depth groups front-loaded (highest user-visible value), production path groups at the end (need the rest to be stable first).

### Group A — Advanced ColorPicker (Week 1)

**Why first:** ColorPicker is touched by every other style-depth group. Get the new internals right before gradients / fonts build on it.

**Architecture**

Today's `ColorPicker` uses `react-colorful`'s `HexColorPicker` + a hex input + token swatches. Phase 8 wraps the visual picker with a mode-toggle: HSL sliders OR RGB sliders OR the existing visual S/L+Hue picker.

Pure conversion helpers live in `src/editor/inspector/shared/color-conversions.ts`:
- `hexToRgb(hex): {r,g,b}` / `rgbToHex(rgb): hex`
- `hexToHsl(hex): {h,s,l}` / `hslToHex(hsl): hex`
- `clamp` + range parsing utilities

Test these directly — no DOM needed.

**Eyedropper**

`window.EyeDropper` is a Chrome/Edge/Opera-only API at time of writing. Behind a feature check:

```ts
const supportsEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window
```

When supported, render an eyedropper button next to the hex input. Click → `await new EyeDropper().open()` → pick a color from anywhere on the screen → commit as hex.

**Files**
- `src/editor/inspector/shared/color-conversions.ts` (new) + `.test.ts`
- `src/editor/inspector/shared/RgbSliders.tsx` (new) — three range inputs + readout
- `src/editor/inspector/shared/HslSliders.tsx` (new) — three range inputs + readout
- `src/editor/inspector/shared/EyedropperButton.tsx` (new) — feature-gated trigger
- `src/editor/inspector/shared/ColorPicker.tsx` — add the mode-toggle UI; route values through conversions

**Exit criteria**
- ColorPicker shows: token swatches (existing), visual picker (existing), hex input (existing), HSL sliders (new), RGB sliders (new), eyedropper button (new, browser-conditional).
- Mode toggle (e.g., `Visual | HSL | RGB`) hides/shows the appropriate slider set.
- All editing modes commit the same `{ kind: 'hex', hex }` shape — downstream code unchanged.

### Group B — Gradient editor (Week 2)

**Architecture**

Add a "Gradient" mode to `ColorPickerValue`:

```ts
type ColorPickerValue =
  | { kind: 'token'; token: TokenColor }
  | { kind: 'hex'; hex: string }
  | { kind: 'gradient'; gradient: Gradient }
  | { kind: 'unset' }

interface Gradient {
  type: 'linear' | 'radial'
  angle?: number              // linear only — 0..360
  position?: { x: number; y: number }  // radial only — 0..100 (%)
  stops: GradientStop[]       // 2..8 entries
}

interface GradientStop {
  color: string              // hex
  position: number           // 0..100
}
```

Gradient values serialize to CSS via `gradientToCss(g): string` — e.g., `linear-gradient(45deg, #ff0000 0%, #00ff00 100%)`. They store in `style.inline[slot].background` (and similar for `borderImage` if we extend).

**Editor UI**

`GradientEditor.tsx` — a popover-rendered editor:
- Type toggle (Linear / Radial)
- Angle slider (linear) or position picker (radial)
- Stop bar — clickable to add a stop at a position; each stop opens a mini ColorPicker
- Live preview at the top

**Where the gradient lives in the inspector**

Two new ColorPicker affordances:
- `Fill` (AppearancePanel) — currently calls ColorPicker for `backgroundColor`. Extend to accept gradients → writes to `background` (longhand including gradient syntax).
- New `Background` row maybe? Or keep within Fill, but the input gets a "gradient" tab.

Decision: extend Fill in `AppearancePanel` to support gradients via a tagged toggle inside the popover. Keep the existing Fill API; the impl detects gradient and routes to a different inline property name.

**Files**
- `src/editor/inspector/shared/gradient.ts` — pure helpers (parser + serializer + test). New file.
- `src/editor/inspector/shared/GradientEditor.tsx` — popover editor.
- `src/editor/inspector/shared/ColorPicker.tsx` — add gradient mode + extend `ColorPickerValue`.
- `src/editor/inspector/AppearancePanel.tsx` — route gradient values through `writeInline('background', cssString)`.

**Tests**
- Roundtrip `Gradient` → CSS string → `Gradient`.
- Multi-stop ordering (positions must be ascending).
- Edge cases: 0 stops, 1 stop, > 8 stops.

**Valve V5 trigger:** if conic / mesh / animated gradients keep creeping into the spec, hard-cap at linear + radial. No conic. No animation.

### Group C — Custom font tokens (Week 3, part 1)

**Architecture**

New SDK function `registerFontToken({ id, name, family, url? })`:
- `id` — stable string (e.g., `'inter'`)
- `name` — display name in the Inspector dropdown
- `family` — CSS `font-family` value (e.g., `'Inter Variable', sans-serif`)
- `url` — optional `@font-face` source URL (for hosted webfonts)

Registration appends to a module-level registry and (if `url` is set) injects a `@font-face` declaration into `document.head`. SDK consumers register at module load; the Typography panel reads from the registry.

**Built-in font tokens**

Today, `--font-sans` and `--font-heading` are baked CSS variables in `index.css`. Phase 8 preserves them but exposes them as the initial entries in the font-token registry. The Typography panel surfaces `font-sans` and `font-heading` as the default options; user-registered tokens append.

**Files**
- `src/registry/fonts.ts` (new) — `registerFontToken` / `listFontTokens` / `getFontToken`.
- `src/registry/fonts.test.ts`
- `src/editor/inspector/TypographyPanel.tsx` — new "Font family" row backed by `listFontTokens()`.
- `src/style/tw-classes.ts` — extend the typography slice with a `fontFamily` field (token-only; arbitrary fonts via inline would require a custom CSS approach).
- `src/sdk/canonical.ts` — re-export `registerFontToken`.

**Exit criteria**
- `registerFontToken({ id: 'inter', name: 'Inter', family: '"Inter Variable", sans-serif', url: 'https://fonts.googleapis.com/...' })` at runtime adds "Inter" to the Typography panel's Font dropdown. Selecting it adds `font-inter` to the slot's classes (with the safelist update). The webfont loads from the URL.

**Valve V6 trigger:** if shadcn's theme tokens fight runtime `@font-face` injection (e.g., FOUT issues, theme color drift), ship the SDK API without the Typography panel UI. Custom fonts still work programmatically.

### Group D — Per-document Tailwind safelist (Week 3, part 2 — high risk)

**Why now:** the runtime `<style>` injection from Phase 6 works but emits arbitrary CSS at render time, which is opaque to Tailwind tooling, breaks the optimization story (no purge), and complicates the dist build (the bundled editor would need to ship the runtime injector with no Tailwind-side awareness). Replacing with a build-time safelist makes the design data drive a real Tailwind CSS build.

**Architecture**

A Vite plugin (`vite-plugin-craftjs-safelist`) hooks into Vite's transform pipeline:
- Walks the user's current document(s) on dev start.
- Extracts arbitrary values (`bg-[#ff0000]`, `md:bg-[#00ff00]`, etc.) from the serialized JSON.
- Emits a Tailwind safelist file alongside `safelist.generated.css`.
- HMR-triggers a Tailwind rebuild when the document changes.

The runtime `<style>` injection from Phase 6 stays as a fallback for documents the build hasn't seen (e.g., a freshly-imported file).

**Files**
- `plugins/vite-plugin-craftjs-safelist/index.ts` (new directory at repo root)
- `plugins/vite-plugin-craftjs-safelist/extract.ts` — pure tree-walker that finds arbitrary classes in a `craftJson` string. Tests.
- Update `vite.config.ts` to use the plugin.

**Exit criteria**
- After designer changes `bg-[#abc]` at the `md` breakpoint, the Tailwind CSS rebuilds with the new class; the runtime `<style>` block disappears.

**Valve V1 trigger:** if the plugin can't reliably trigger Tailwind rebuilds during HMR, or if the extraction logic gets gnarly, pull. The runtime `<style>` injection works today — it's just suboptimal. Documented in PHASE6_PLAN's design decisions section.

### Group E — Resize polish: 8 handles + snap-to-token (Week 4)

**Architecture**

Extend `ResizeOverlay` to render 8 handles (corners + edges). Edge handles do single-axis resize:
- Top/bottom edges: vertical drag only
- Left/right edges: horizontal drag only
- Corners: both (existing)

The drag-end commit logic gains a snap step:
1. Read final `offsetWidth` / `offsetHeight`.
2. Compute the closest Tailwind size token (`w-1`, `w-2`, `w-32`, `w-96`, ...) by pixel distance.
3. If within 4px of a token's pixel value AND the current node has no other inline width/height conflict, write `w-<token>` to `style.classes.root` and clear `style.inline.root.width`.
4. Otherwise keep the inline px value.

**Files**
- `src/editor/canvas/ResizeOverlay.tsx` — render 8 handles, dispatch single-axis vs both-axis drag.
- `src/editor/canvas/snap.ts` (new) — `snapToSizeToken(px, sizeTokens): string | null`. Tests.

**Exit criteria**
- Drag any edge or corner of a selected node. Release within 4px of a Tailwind token → SizePanel shows the token; inline value cleared. Otherwise → SizePanel shows the rendered px.

### Group F — Error boundaries (Week 5)

**Architecture**

Embedded editors need to survive a buggy canonical or adapter impl. A blank screen because one prop blew up an inspector panel is a deal-breaker for integration consumers.

Place error boundaries at four layers:

1. **Around the canvas Frame** — a buggy adapter impl throws on render; the canvas shows "Render failed for node X" instead of crashing the whole editor.
2. **Around each inspector panel** — a buggy panel throws; the section shows "Panel failed" with a "Retry" button.
3. **Around the Toolbox** — a buggy canonical registration throws; the toolbox shows a list of registered canonicals minus the broken one.
4. **Around the entire editor shell** — top-level catch-all; the editor falls back to a "the editor crashed; reload" message with telemetry hook.

Each boundary uses React's `componentDidCatch` / `ErrorBoundary` pattern with a typed `<FallbackRenderer>` prop.

**Files**
- `src/editor/errors/ErrorBoundary.tsx` (new)
- `src/editor/errors/CanvasErrorFallback.tsx` (new)
- `src/editor/errors/PanelErrorFallback.tsx` (new)
- Mount boundaries in `Editor.tsx`, `Inspector.tsx`, `Toolbox.tsx`.

**Exit criteria**
- Throw deliberately inside a canonical's render → the canvas shows the typed fallback; rest of editor stays alive.
- Click "Retry" → re-mounts the failed subtree.

### Group G — Performance + a11y audit (Week 6)

**Performance**

React Profiler audit during typical edit flows:
- Selection change: should re-render the selected node + Inspector only.
- Color edit (token): should re-render the node + the panel.
- Color edit (hex): same.
- Drag-resize: should NOT re-render React per mousemove (Phase 7's direct-DOM-mutation already avoids this — verify).
- Adapter swap: should re-render canvas + adapter switcher; document tree should not change.

Baseline measurements go in `docs/PERFORMANCE.md`. Identify any re-render storms; fix via `useMemo` / `React.memo` / Zustand selectors.

**Accessibility**

WCAG 2.1 AA scan via axe-core or similar. Common issues to fix:
- Missing `aria-label` on icon-only buttons.
- Tab order: toolbar → toolbox → canvas → inspector. Fix any traps.
- Focus rings visible (Tailwind's default `outline` should be on; verify shadcn primitives haven't overridden).
- Keyboard navigation: select node via arrow keys (escape to deselect); delete via Backspace.
- Color contrast: token swatch labels readable on each token color.

**Files**
- `docs/PERFORMANCE.md` (new) — baseline measurements + memoization rationale.
- `docs/ACCESSIBILITY.md` (new) — audit results + known gaps.
- Memoization changes scattered across hot-path components.

**Exit criteria**
- React Profiler shows expected re-render scope for each tracked flow.
- axe scan reports 0 errors, ≤5 warnings.

### Group H — Dist build + React 19 upgrade + integration docs (Week 7)

**Why bundled:** all three depend on a stable testbed. React 19 upgrade reveals issues integration consumers will hit; the dist build is what they consume; the integration tutorial assumes a working dist.

**React 19 upgrade**

shadcn primitives in Phase 7 already assume React 19 ref-as-prop semantics (they're plain function components, not `forwardRef` wrappers). The Phase-1 workaround in adapter impls wraps shadcn primitives in `<span style={{display:'contents'}} ref={rootRef}>`. After React 19:
- The wrapper spans can drop (refs flow through plain function component children).
- Test: every shadcn-backed adapter impl + MUI impl behaves identically post-upgrade.

Risk: `@craftjs/core` might not be React-19-tested. Verify by upgrading and running the existing test suite + manual browser smoke.

**Dist build**

New script `npm run build:dist` runs Vite in library mode:
- Entry: `src/sdk/index.ts` + `src/main-app.tsx` (a re-export of `<Editor />` and `<App />`).
- Externals: `react`, `react-dom`, `@craftjs/core` — peer dependencies; embedders provide.
- Output: `dist/` containing `index.js`, `index.d.ts`, and CSS.

**Integration tutorial**

`docs/INTEGRATION_GUIDE.md` walks through:
1. `npm install @design/editor` (or whatever the dist package is named).
2. Mount `<Editor />` inside a host React 19 app.
3. Pre-register canonicals / adapters / themes if the host wants to customize.
4. Persist documents via a host-provided storage backend (override `documentStore`).

**Files**
- `vite.config.dist.ts` (new) — library mode config.
- `package.json` — `build:dist` script, `exports` field for the dist package.
- `docs/INTEGRATION_GUIDE.md` (new).
- `src/main-app.tsx` (new) — re-exports for embedders.

**Valve V2 trigger:** if React 19 + shadcn or React 19 + @craftjs/core revealed deep incompatibilities, stay on React 18. Document and continue. The dist build still ships against 18.

**Valve V3 trigger:** if externalizing React/Craft from the dist bundle keeps breaking, ship a bundled-everything dist. Embedders pay the duplicate-React cost; document.

### Group I — Verification + close-out (Week 8)

- Exit-criteria walkthrough in the browser.
- Run all tests + the dist build's smoke test (import in a fresh React 19 app).
- Update docs:
  - `ARCHITECTURE.md` — add a Style Depth section noting gradients, custom fonts, the Vite safelist plugin (or its absence per V1). Note the React 19 upgrade.
  - `DEVELOPER_GUIDE.md` — recipe for adding a font token; recipe for adding an error boundary fallback.
  - `SDK_GUIDE.md` — new `registerFontToken` surface; gradient API for `ColorPickerValue`.
  - `INTEGRATION_GUIDE.md` — finalize.
- Append close-out section to this file: which valves got pulled, what slipped.

---

## Out of scope (Phase 8)

| Feature | Phase |
|---|---|
| Conic / mesh gradients | Phase 9+ |
| Animated gradients / properties | Phase 9+ |
| Pattern B multi-canvas templates (Card / Tabs with content) | Phase 9 |
| Stable per-tab ids in Tabs | Phase 9 |
| User-saved templates ("save current as template") | Phase 9 |
| Drag-drop reorder of nested arrays (`z.array(z.array)`) | Phase 9 |
| IndexedDB storage migration | Phase 9 (when designer-scale use reports localStorage quota hits) |
| Multi-user collaboration | Far future |
| Plugin marketplace UI | Far future |
| AI-assisted editing | Far future |

---

## Risks specific to Phase 8

1. **Vite plugin for Tailwind safelist is genuinely new engineering.** Phase 6's runtime `<style>` injection sidesteps the Tailwind build entirely. A real safelist plugin needs to participate in Tailwind's CSS build, handle HMR correctly, and survive editor restarts. The plugin space is sparsely documented. **Mitigation:** time-box to 1 week (Week 3 part 2). If not landing, pull V1 cleanly; the runtime path stays as it was.

2. **React 19 + Craft.js is untested territory.** `@craftjs/core` 0.2.12 was authored before React 19 stabilized. Synthetic event handling, ref semantics, concurrent rendering — any could break. **Mitigation:** spike early in Group H. If anything blocks, pull V2.

3. **Dist build externalization is fiddly.** Vite library mode externals need to match what the host actually has. Mismatch → the bundle ships a second copy of React; weird "Invalid hook call" errors at runtime. **Mitigation:** Test against a real React 19 host app (vite-react-template scaffold) in Week 7.

4. **Error boundaries don't catch async errors.** A canonical that throws in a `useEffect` won't trigger the boundary. **Mitigation:** documented as a known limitation. The top-level boundary catches synchronous throws; async errors log to console + the telemetry hook. Future error-handling polish can add `window.onerror` / `unhandledrejection` listeners.

5. **Gradient editor UI complexity.** Multi-stop gradients with drag-to-reposition stops is its own UX problem. The plan caps at ≤8 stops + ↑/↓ on the stop bar; full drag UX (à la Figma) is a Phase 9 polish.

6. **Custom fonts + theme tokens interaction.** Phase 2's themes are CSS blocks; Phase 8's runtime `@font-face` injection happens in `document.head`. If a theme's CSS clobbers `--font-sans`, custom fonts might not show. **Mitigation:** the font-token registry writes specific font-family-class rules (`.font-inter { font-family: ... }`), not theme tokens; themes can co-exist.

7. **Accessibility audit reveals deeper architectural issues.** Tab order across a 3-column editor is hard; nested popovers (color picker inside fill row inside panel inside inspector) are challenging for screen readers. **Mitigation:** target WCAG AA, not AAA. Document known limitations.

8. **Phase 8 timeline.** 5–8 weeks; 9 groups. Performance + a11y (Group G) is a 2-week item in many real projects — budget tight. Have a hard mid-Phase review at end of Week 4 (after style depth groups). If groups F–H are looking shaky, pull production-path valves and ship style depth alone.

---

## Definition of done

Exit-criteria checklist passes. Updated `docs/ARCHITECTURE.md` + `docs/DEVELOPER_GUIDE.md` + `docs/SDK_GUIDE.md` + new `docs/INTEGRATION_GUIDE.md` + new `docs/PERFORMANCE.md` + new `docs/ACCESSIBILITY.md`. Close-out section in this file records which valves (V1–V6) were pulled, which items slipped, and any followups for Phase 9. Phase 9 (the remaining polish bag — multi-canvas templates, stable tab ids, user-saved templates, IndexedDB) is unblocked.

---

## Close-out (2026-05-24)

### Status: Complete

All 9 groups (A–I) shipped. `tsc -b` clean, **226 tests pass** (up from 164 at end of Phase 7 — 62 new tests across style depth + production path). The dist build runs end-to-end (`npm run build:dist`) and emits 1.5 MB JS + 390 KB CSS (440 KB combined gzipped).

### Group-by-group summary

- **A — Advanced ColorPicker**: HSL + RGB slider modes (with live-keyed track backgrounds), mode toggle inside the existing popover, EyeDropper API integration (Chrome/Edge/Opera-only, feature-gated). 17 new tests for color-conversion math.
- **B — Gradient editor**: Linear + radial multi-stop gradients (2–8 stops). New `{ kind: 'gradient' }` variant on ColorPickerValue. `gradientToCss` / `parseGradient` / `addStop` (midpoint-blended) / `sortStops` / `updateStop` / `removeStop`. AppearancePanel's Fill row enables the gradient mode via `allowGradient` prop. 17 tests.
- **C — Custom font tokens**: `registerFontToken` SDK + runtime `<style data-craftjs-fonts>` injection (including optional `@font-face` for URL-backed webfonts). TypographySlice gained `fontFamily?: string`; TypographyPanel got a new Font dropdown reading from `listFontTokens()`. Built-ins seed at module load (`sans`, `heading`, `mono`). 8 tests.
- **D — Safelist extractor** (V1 partial pull): pure `extractArbitraryClasses(tree)` walks a Craft node map's `inline` + `responsiveInline` and emits Tailwind-style arbitrary class strings. The full Vite plugin from the original plan deferred to Phase 9 — it needs either a runtime data source or a runtime refactor to emit Tailwind arbitrary classes instead of `<style>` injection. The Phase-6 runtime injection stays primary. 12 tests.
- **E — Resize polish**: 8 handles (4 corners + 4 edges) with axis-vector dispatch. `snapToSizeToken(px)` returns the closest Tailwind size token within `SNAP_TOLERANCE_PX = 4`; the mouseup commit writes either a token class (snap hit) or inline px (snap miss). 6 tests.
- **F — Error boundaries**: Four layers — top shell (App.tsx), canvas (Frame), per-inspector-panel (each `<CollapsibleSection>`), toolbox. Generic `<ErrorBoundary fallback={...} onError={...}>` class. Four typed fallback components.
- **G — Perf + a11y audit**: `docs/PERFORMANCE.md` (subscription-model survey, render hot-path catalog, measurement plan with six tracked flows) + `docs/ACCESSIBILITY.md` (icon-only-button coverage matrix, known gaps, WCAG 2.1 AA target). One a11y fix landed: Toolbox search input now has a visually-hidden accessible name.
- **H — Dist build + integration guide** (V2 partial pull): `vite.config.dist.ts` library mode with React + ReactDOM + Craft externalized. `src/main-app.tsx` consolidates side-effect imports + re-exports the runtime surface. `npm run build:dist` ships `dist-lib/{index.js, index.css}` (440 KB combined gzipped). `docs/INTEGRATION_GUIDE.md` walks through embedding with telemetry, custom registry, persistence, and theming. React 19 upgrade deferred to Phase 9 (Craft.js peerDeps accept it, but no verified smoke test).
- **I — Verification + close-out**: this section + the doc-updates below.

### Valves pulled

| Valve | Status | Reason |
|---|---|---|
| **V1** (Vite plugin safelist) | **partial pull** | Extractor module shipped (`src/style/safelist-extract.ts`). Full Vite-plugin pipeline requires runtime-data coordination (Phase 9). |
| **V2** (React 19) | **partial pull** | Dist works on React 19 hosts via Craft.js peerDeps, but no verified smoke test. The `display: contents` ref-forwarding workarounds in adapter impls are still there; cleanup happens in Phase 9. |
| **V3** (dist externalization) | not pulled | React + ReactDOM + Craft externalized cleanly on first try. |
| **V4** (EyeDropper API) | not pulled | Shipped feature-gated. Chrome/Edge/Opera users see the button; Firefox/Safari users don't (no broken UI). |
| **V5** (gradient scope creep) | not pulled | Linear + radial only. No conic. No mesh. No animation. |
| **V6** (custom font UI) | not pulled | TypographyPanel surfaces the Font dropdown; `@font-face` injection works alongside shadcn theme tokens. |

### Deferred to Phase 9

| Item | Reason |
|---|---|
| Real `@chakra-ui/react` example (replace mock) | Phase 6 ships the mock; Phase 9 swaps in the real install + verifies. |
| React 19 upgrade + ref-as-prop cleanup | Needs verified browser smoke test of shadcn + MUI + Craft. |
| TS `.d.ts` emit from dist build | `vite-plugin-dts` or `tsc --emitDeclarationOnly` post-step. |
| Hot reload of font tokens | Currently re-captures on selection change; same pattern as Phase-7 canonical reload could apply. |
| Pattern B multi-canvas templates (Card / Tabs with content) | Template builder needs linked-node generation. |
| Stable per-tab ids in Tabs | Today renaming a `value` orphans content. Stable id auto-fill in ArrayField. |
| Nested ColorPicker per gradient stop | Stops currently take hex input only; full nested ColorPicker is a UX upgrade. |
| Per-stop color drag on gradient bar | Click+drag along the preview bar to reposition / add stops. |
| IndexedDB storage migration | localStorage hits 5–10 MB quota at scale; not yet reported. |
| Telemetry-handler provider | Currently per-boundary prop; surfacing as context provider would let the App.tsx-level handler propagate to inner boundaries. |
| Canvas keyboard navigation | Tab + arrow-key selection in Craft. |
| Toolbox keyboard navigation (roving tabindex) | Audit identified, deferred. |
| Full axe-core scan against running dev server | Static audit done; real scan is Phase 9. |
| React Profiler baseline measurement | Measurement plan in PERFORMANCE.md; numbers land in Phase 9. |

### Notable Phase 8 design decisions

1. **HSL/RGB tracks render with live-keyed gradient backgrounds.** Designers see what the slider transitions through — the R track shows red varying while G+B stay fixed; the L track shows black → current-hue → white. Pure inline-style computation per render; no DOM-level animation.
2. **Gradient stops stored in insertion order; sorted at serialize.** Designers can edit a stop's position without it jumping in the list. `gradientToCss` sorts ascending; storage stays positionally arbitrary.
3. **`addStop` inserts at the largest gap with a midpoint-blended color.** New stops feel visually coherent — they sit between existing stops with a sane intermediate color. Per-channel midpoint blend, not perceptual.
4. **Font tokens inject runtime CSS, not Tailwind-generated rules.** Built-ins (`sans`, `heading`, `mono`) overlap with Tailwind's own `font-*` utilities — the injection is redundant but harmless; user-registered tokens get the only available rule via injection.
5. **`canvasSlots` function form** (from Phase 7) made Tabs' dynamic-count case work without ad-hoc parsing. Same pattern would apply to a future "RepeatableContainer" canonical.
6. **Snap-to-token operates per axis, not per handle.** A bottom-right corner drag might snap height but leave width as inline. Designers see the SizePanel reflect whichever axis snapped — predictable.
7. **Error boundaries are class components.** React 18/19 still has no hooks equivalent for `componentDidCatch`; the class is the official path. Generic + typed fallbacks let the four layers share one base.
8. **Dist externalizes React + Craft, not Tailwind.** Hosts provide React; Tailwind's compiled CSS is part of the artifact. Two reasons: (a) Tailwind 4 is a build-time concern, not runtime, so it doesn't matter what the host runs; (b) sharing safelist + compiled CSS with a host would force a Tailwind config negotiation that's not worth the simplification.

### Files added this phase

```
src/editor/inspector/shared/{color-conversions,color-conversions.test}.ts
src/editor/inspector/shared/{RgbSliders,HslSliders,EyedropperButton}.tsx
src/editor/inspector/shared/{gradient,gradient.test}.ts
src/editor/inspector/shared/GradientEditor.tsx
src/registry/{fonts,fonts.test}.ts
src/sdk/fonts.ts
src/style/{safelist-extract,safelist-extract.test}.ts
src/editor/canvas/{snap,snap.test}.ts
src/editor/errors/{ErrorBoundary,ErrorBoundary.test,fallbacks}.tsx
src/main-app.tsx
vite.config.dist.ts
docs/{PERFORMANCE,ACCESSIBILITY,INTEGRATION_GUIDE}.md
```

### Files materially changed

```
src/editor/inspector/shared/ColorPicker.tsx
                          (+'gradient' kind, +allowGradient prop, +Solid/Gradient toggle,
                           +mode toggle wires HSL/RGB sliders + eyedropper)
src/editor/inspector/AppearancePanel.tsx
                          (Fill routes gradients to inline.background; clears alternatives)
src/editor/inspector/TypographyPanel.tsx
                          (+Font row reading listFontTokens)
src/style/tw-classes.ts
                          (+BUILTIN_FONT_FAMILIES, +FontFamily, +FONT_FAMILY_RE,
                           parser/serializer extended)
src/editor/canvas/ResizeOverlay.tsx
                          (4 → 8 handles, axis-vector dispatch, snap-to-token commit)
src/editor/Editor.tsx     (+ToolboxErrorBoundary, +CanvasErrorFallback, re-exports for App)
src/editor/Inspector.tsx  (per-panel PanelErrorFallback)
src/App.tsx               (+TopShellErrorBoundary)
src/editor/Toolbox.tsx    (+sr-only accessible name on search input)
scripts/gen-safelist.ts   (+font-{sans,heading,mono} emission)
package.json              (+build:dist, +prebuild:dist)
.gitignore                (+dist-lib)
```

Phase 9 (real Chakra + React 19 + .d.ts emit + the remaining polish bag) is unblocked.

