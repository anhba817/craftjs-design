# Production-Readiness Audit

A complete inventory of what stands between the editor today (end of Phase 8)
and "production-ready, easy to use for external developers and designers."
No timeline — this is a *what* document, not a *when* document.

Each item is tagged:

- **Critical**: ships broken or actively harms users today.
- **Production-blocker**: prevents "this is a real product" claim.
- **UX**: affects daily designer experience but the editor works without it.
- **DevEx**: affects contributor / SDK author experience.
- **Ecosystem**: expands what the editor can do (adapters, components, integrations).
- **Stretch**: nice-to-have, not load-bearing.

---

## Where the editor stands today

> **Update (`0.4.0`, Phase 13):** the canonical count below is now **48**
> — Section 5 (Component breadth) shipped every § 5.1–5.7 item in both
> shadcn and MUI. See § 5 for the per-group status.

**What works:**
- 48 canonical components, full coverage in shadcn + MUI adapters.
- Multi-document store with import / export / share-by-URL / templates.
- Hot canonical reload (registry version + setOptions).
- Pluggable inspector panels via `registerPanel`.
- Pattern B multi-canvas (Card has 3 droppable regions; Tabs is multi-canvas via dynamic `canvasSlots`).
- Gradient editor (linear + radial, 2–8 stops).
- HSL/RGB color sliders + EyeDropper (Chromium-family).
- Custom font tokens via `registerFontToken` (URL `@font-face` + per-class CSS).
- 8 resize handles with snap-to-Tailwind-token.
- 4-layer error boundaries with telemetry hook.
- Dist build (`npm run build:dist`) — 440 KB combined gzipped, externalizes React + Craft.
- 226 passing tests across pure helpers, parsers, registry lifecycle, persistence.

**What's documented:**
- ARCHITECTURE.md (full architecture reference).
- DEVELOPER_GUIDE.md (in-tree contribution + 7 recipes).
- SDK_GUIDE.md (public SDK reference).
- TUTORIAL_ADAPTER / CANONICAL / PANEL (step-by-step authoring).
- INTEGRATION_GUIDE.md (embedding walkthrough).
- PERFORMANCE.md (static audit + measurement plan).
- ACCESSIBILITY.md (static audit + WCAG AA target + known gaps).
- 8 phase plans + close-outs (PHASE1_PLAN through PHASE8_PLAN).

**What's missing:** the rest of this document.

---

## 1. Reliability — runtime correctness under real use

### 1.1 React 19 verification + cleanup ✅ *(Shipped — Phase 9 Group A)*

The editor now depends on React 19.x. The Phase-1 `display: contents`
wrappers in 9 shadcn adapter impls (Button, Input, Tabs, Select, Textarea,
Alert, Badge, Radio, Avatar) are removed; refs flow directly through the
shadcn primitives via React 19's ref-as-prop semantics. Dist build verified
on React 19 (`npm run build:dist` succeeds; 226 tests pass; ~3 KB smaller
JS+CSS).

Pending: manual smoke test in a running browser session — automated tests
cover the pure code paths but rendering correctness of the upgraded shadcn /
MUI / Radix / Craft.js stack needs a human pass.

### 1.2 React Profiler baseline + memoization sweep ✅ *(Shipped — Phase 9 Group B + C)*

All 9 tracked flows (the original six plus large-doc open, tabs with all
canvases, rapid resize) are measured in PERFORMANCE.md with before/after
numbers. The two critical hotspots fixed in Group C:

- **Flow 5 — hex color edit**: 376 commits → 8 ColorPicker re-renders.
  ColorPicker now defers BOTH React state and parent commits during
  drag; on pointerup a single commit lands. Drag stays at 60 fps.
- **Flow 9 — rapid resize**: 570 commits → 3. ResizeOverlay's `rect` is
  now mirrored to a `ref` + direct DOM mutation during the gesture;
  one React commit fires on pointerup.

Smaller candidate items (Toolbox re-register, PropField recursion,
slider gradient memoisation, ResizeOverlay scroll batching, panel
mounting) are documented in PERFORMANCE.md with measured baselines and
accepted as not currently hot.

### 1.3 Real axe-core scan + remediation ✅ *(Shipped — Phase 9 Group B + D)*

@axe-core/react auto-scans the editor in dev mode (`src/devtools/axe-init.ts`,
guarded by `import.meta.env.DEV`). Findings remediated:

- **color-contrast (serious)**: 8 elements failed at 2.6:1 — Toolbox
  category headers + Inspector empty state. Lifted from `text-gray-400`
  to `text-gray-500` (4.66:1, passes).
- **landmark-unique (moderate)**: Toolbox + Inspector were both
  unlabelled `<aside>`. Added `aria-label`.
- **region (moderate)**: SaveLoadBar was a `<div>`. Changed to
  `<header>` so its content is inside a landmark.
- **page-has-heading-one (moderate)**: no `<h1>`. Added `sr-only`
  inside the header.

Re-scan returns zero violations.

### 1.4 Canvas keyboard navigation ✅ *(Shipped — Phase 9 Group D)*

`<CanvasKeyboardRegion>` (`src/editor/canvas/`) is a single tab stop;
arrow keys move the **selection** directly (matching Figma's layers
panel / file managers). Each canvas node gets `tabindex=-1` from
`CanonicalNode.attachRef` so it can be programmatically focused. The
keydown handler runs at the document level (some adapters' direct DOM
listeners would otherwise eat the synthetic event) and gates on
`containerRef.contains(document.activeElement)` so it never fires
when focus is outside the canvas. Key map: ArrowDown/Up = pre-order
next/prev, ArrowRight = first child, ArrowLeft = parent, Delete /
Backspace = delete (ROOT exempt), Escape = clear selection.

### 1.5 Toolbox roving tabindex ✅ *(Shipped — Phase 9 Group D)*

Toolbox is `role="toolbar"` with `aria-orientation="vertical"`. Only
one drag-handle button is `tabIndex={0}` at a time; arrows move focus
across section boundaries (Favorites, Recent, each category). Enter
drops the focused canonical via `actions.add` with selection-aware
parent + index. F toggles favourite. `/` focuses search. Escape in
search clears + returns focus to the first component.

### 1.6 Async error coverage ✅ *(Shipped — Phase 9 Group E)*

`useGlobalErrorHandler` attaches `window.error` +
`window.unhandledrejection` listeners; `<AsyncErrorBanner>` shows the
most recent failure in a fixed-position toast with a Dismiss action.
Critical async failures (Hydrator deserialize) still bubble through
ErrorBoundary instead; this handles the non-fatal long tail. Pure
helpers `normalizeErrorEvent` + `normalizeRejectionEvent` are
unit-tested (covering Error / string / object / undefined reasons +
cross-origin "Script error." stripping).

### 1.7 localStorage quota near-full banner ✅ *(Shipped — Phase 9 Group F)*

`documentRegistry.getStorageUsage()` sums every `craftjs-design:*` key
against a conservative 5 MB ceiling. `documentStore.reportWrite()`
calls this after every save / index write. ≥80% surfaces
`<StorageQuotaBanner>` (dismissable; dismiss state in sessionStorage so
it survives reload but resets across tabs). Actual `QuotaExceededError`
(detected for both `'QuotaExceededError'` and Firefox's
`'NS_ERROR_DOM_QUOTA_REACHED'`) raises a blocking
`<StorageQuotaErrorModal>` with "Continue without saving" + "Open
documents menu" actions.

### 1.8 Concurrent edit safety ✅ *(Shipped — Phase 9 Group F)*

`useConcurrentEditWatcher` attaches a `window.storage` listener.
`decideStorageEvent(event, activeId)` (pure, tested) classifies each
event as ignore / reload-index / conflict. Index changes auto-sync
via `documentStore.reloadIndexFromStorage()` (no write-back, so no
ping-pong). Active-doc blob changes raise `<ConcurrentEditBanner>`
with two actions: Reload (apply remote via `applyEnvelopeSafely`) or
Overwrite (save local snapshot, blowing away the other tab's write).

### 1.9 Malformed craftJson hardening ✅ *(Shipped — Phase 9 Group E)*

`validateCraftJson` runs before every `actions.deserialize`: checks
that the string parses, has ROOT, every `parent` / `nodes` /
`linkedNodes` ref resolves, every type is `'div'` or a registered
canonical. Failures (or a thrown deserialize) set
`editorStore.malformedDocument`; Editor.tsx swaps the canvas Frame for
`<MalformedDocumentBanner>` with three recovery actions: Show raw JSON
(read-only viewer), Export raw (downloads the broken envelope as
JSON), Reset to empty (archives the broken envelope under
`craftjs-design:doc:<id>:broken:<timestamp>` before writing the Empty
template into the doc's slot).

### 1.10 Hydration race conditions ✅ *(Shipped — Phase 9 Group E)*

`applyEnvelopeSafely` returns `Promise<ApplyEnvelopeResult>` and routes
work through a module-level promise queue + generation counter. Rapid
apply calls (e.g., user clicks doc B while doc A is mid-load) collapse
to "latest wins" — only the final envelope reaches `deserialize`.
Hydrator's module-level `hydrated` flag is intentionally narrow:
"initial restore from localStorage on first mount." Document switching
goes exclusively through `useDocumentSwitcher`; the two paths share
the same queue so they can't race against each other either.

---

## 2. SDK Maturity — making the boundary publish-ready

### 2.1 npm publish ✅ *(Shipped — Phase 10 Group A + G)*

Package name `@crafted-design/editor` decided via Group A user choice.
Single-package design with subpath exports:

- `@crafted-design/editor` → `dist-lib/index.js` (full editor)
- `@crafted-design/editor/sdk` → `dist-lib/sdk.js` (SDK boundary alone)

`package.json` carries the publish-ready `exports`, `peerDependencies`
(react ^19, react-dom ^19, @craftjs/core ^0.2.12), `files` whitelist
(`dist-lib`, README, CHANGELOG, LICENSE), and a `prepublishOnly` script
that runs `build:dist` + `vitest run`. `publishConfig.tag = "next"` so
the initial release sits behind the `next` dist-tag until Phase 11
promotes it. Version stays at `0.1.0-pre.0` until the actual
`npm publish` (held outside the close-out commit so that requires
explicit user action with npm credentials).

### 2.2 `.d.ts` emit from dist build ✅ *(Shipped — Phase 10 Group A)*

`vite-plugin-dts` emits matching `.d.ts` files alongside each entry.
`dist-lib/main-app.d.ts` is the full-editor entry's declaration;
`dist-lib/sdk/index.d.ts` is the SDK subpath's. A consumer's
`tsc --noEmit` resolves every exported type — verified by the
`examples/sdk-smoke/consumer.tsx` file (touches every SDK export) and
the editor's own `tsc -b` pass.

### 2.3 CHANGELOG.md + semver discipline ✅ *(Shipped — Phase 10 Group A)*

`CHANGELOG.md` (Keep-a-Changelog format) covers the 0.1.0 initial entry
+ a documented breaking-change policy:

- Removing an exported SDK function / type = major bump.
- Removing a built-in canonical = major bump (saved documents reference it).
- Document envelope shape changes without a migration = major bump.
- Public hook signature changes = major bump.
- New exports / new canonicals / new optional envelope fields with
  defaults = minor or patch.
- Internal `src/` changes that don't surface via `src/sdk/*` = patch.

Between `0.x` minors the API may evolve. `1.0.0` freezes the SDK
surface.

### 2.4 Deprecation policy ✅ *(Shipped — Phase 10 Group A)*

`src/sdk/internal/deprecate.ts` is the once-per-call-site
`console.warn` helper. Pattern: deprecated form stays exported for at
least one minor version, fires `deprecate({ api, since, removeIn,
migration })` on first call per session, the new form is documented
in the same CHANGELOG entry. No current deprecations exist; the
helper is in place for the first one.

### 2.5 SDK boundary lint rule ✅ *(Shipped — Phase 10 Group A)*

`eslint.config.js`'s `no-restricted-imports` rule scoped to
`examples/**` blocks any `@/*` alias import. Sanity-checked with a
synthetic violating import during the Group A landing. The rule's
documented in `INTEGRATION_GUIDE.md` so integration consumers can
mirror it for their own source trees.

### 2.6 TypeDoc auto-generated API reference ✅ *(Shipped — Phase 10 Group B)*

`npm run docs` regenerates `docs/api/` (markdown + index files,
checked into the repo). JSDoc audit added param tables + usage
examples on every register* / hook / helper exported from
`src/sdk/*.ts`. `SDK_GUIDE.md`'s header now points readers at the
auto-generated reference as authoritative; SDK_GUIDE is the
narrative companion.

### 2.7 Hot reload of font tokens ✅ *(Shipped — Phase 10 Group C)*

`subscribeFontRegistry` + `getFontRegistryVersion` exported from
`src/registry/fonts.ts`. `registerFontToken` / `unregisterFontToken`
bump the version counter; TypographyPanel's Font dropdown subscribes
via `useSyncExternalStore`. Replaces the prior `[nodeId]`-trigger
hack that only refreshed on selection change.

### 2.8 Hot reload of adapters ✅ *(Shipped — Phase 10 Group C)*

`subscribeAdapterRegistry` + `getAdapterRegistryVersion` in
`src/adapters/AdapterContext.tsx`. New `unregisterAdapter()`
function (was missing). AdapterSwitcher subscribes.

### 2.9 Hot reload of themes ✅ *(Shipped — Phase 10 Group C)*

`subscribeThemeRegistry` + `getThemeRegistryVersion` in
`src/themes/registry.ts`. New `unregisterTheme()` function.
ThemeSwitcher subscribes.

### 2.10 Hot reload of templates ✅ *(Shipped — Phase 10 Group C)*

`subscribeTemplateRegistry` + `getTemplateRegistryVersion` in
`src/persistence/templates/registry.ts`. New `unregisterTemplate()`
function. TemplatePicker subscribes — registrations show without
the user having to close + reopen the popover.

### 2.11 Stable per-tab ids in Tabs ✅ *(Shipped — Phase 10 Group D)*

Each tab now carries a stable `id`; `canvasSlots` keys on `id` rather
than the user-authored `value` field. Renaming `value` no longer
orphans canvas children. `defaultValueFor` recognises ZodDefault so
new tabs auto-generate `tab-<base36-random>` ids. Existing documents
migrate via `migrateTabsIdsV10` in `src/persistence/migrations.ts`,
which injects ids that preserve pre-Phase-10 slot keys bit-for-bit
(the migration test asserts this invariant).

### 2.12 Nested ColorPicker per gradient stop ✅ *(Shipped — Phase 10 Group E)*

`GradientEditor`'s per-stop color input is now a nested
`<ColorPicker allowGradient={false}>`. Token picks resolve to hex
via `getComputedStyle` + an rgb-to-hex normaliser so the gradient
string stays portable across theme swaps. The nested popover stacks
correctly above the outer GradientEditor popover via Radix's
mount-order stacking.

### 2.13 Per-stop drag on gradient preview bar ✅ *(Shipped — Phase 10 Group E)*

`GradientPreviewBar` renders a draggable handle per stop at
`left: <position>%`. Direct-DOM mutation during drag (mirroring the
Phase 9 ResizeOverlay + ColorPicker patterns); one `onChange`
commit fires on `pointerup`. Numeric input stays as the precise /
keyboard input path.

### 2.14 Real Chakra adapter ✅ *(Shipped — Phase 10 Group F)*

`examples/adapter-chakra/` now uses real `@chakra-ui/react` v3
primitives across all 20 canonicals. `<ChakraProvider
value={defaultSystem}>` installed via the adapter's Wrapper field.
The mock `lib.tsx` is gone; each component file imports its Chakra
primitive directly. Bundle delta: roughly +200 KB raw / +50 KB
gzipped via the side-effect import in `App.tsx`; production hosts
using only shadcn / MUI should remove that import. The
`examples/adapter-chakra/README.md` covers the dependencies + the
Phase 11+ candidate to extract this folder into a standalone
`@crafted-design/adapter-chakra` workspace package.

---

## 3. Designer UX — making daily editing smooth

> **Status — shipped in `0.2.0` (Phase 11):** every non-Stretch item in
> this section is done: 3.1 undo/redo grouping, 3.2 clipboard, 3.3
> multi-select, 3.4 layer tree, 3.5 breadcrumbs, 3.6 alignment guides
> (visual-only v1 — coordinate snap deferred), 3.7 empty state, 3.8
> onboarding tour, 3.9 canvas search, 3.10 asset library, 3.11 inline
> text editing, 3.12 context menu, 3.14 reduced motion. Still open
> (Stretch, deferred to Phase 12+): 3.13 comments, 3.15 RTL, 3.16 i18n.
> See `docs/plans/PHASE11_PLAN.md` for the per-item path-taken table.

### 3.1 Undo/redo grouping *(High / UX)* — ✅ shipped 0.2.0

Today every `setProp` is one undo step. Designer drags the HSL hue
slider → 30 undo steps for one color change. Craft has `history.throttle`;
needs to be wired into the inspector's panel writes (e.g., throttle by
500ms after the last edit in a popover session).

### 3.2 Copy / paste / duplicate node *(High / UX)* — ✅ shipped 0.2.0

No node-level clipboard. Designers must rebuild manually. Add:

- `Ctrl+C` to copy the selected node's serialized subtree.
- `Ctrl+V` to paste (as a sibling of the current selection).
- `Ctrl+D` to duplicate (inserts a clone next to the original).

### 3.3 Multi-select *(High / UX)* — ✅ shipped 0.2.0

Selection is single-node today. Designers reasonably expect Cmd-click
to add nodes to selection, then style/delete the group at once. Touches
Inspector (multi-selection state model), Craft selection events, and
the resize overlay (would need to scope to a single node).

### 3.4 Layer tree / outline view *(High / UX)* — ✅ shipped 0.2.0

The canvas shows nodes spatially; designers also want a list view of
the document structure. Click a layer to select. Drag layers to reorder
in the tree. Indents show parent/child relationships. Standard design
tool surface.

### 3.5 Inspector breadcrumbs *(UX)* — ✅ shipped 0.2.0

The selected node's parents aren't reachable from the inspector — only
the click-target is selected. A breadcrumb (Box > Stack > Heading)
lets designers navigate up.

### 3.6 Alignment guides / smart guides on drag *(UX)* — ✅ shipped 0.2.0 (visual-only)

Dragging a node into a Stack today is free positioning — no visual
alignment with siblings. Smart guides (red lines that snap to sibling
edges, centers, etc.) are standard. Big engineering item; depends on
Craft's drop coordinate model.

### 3.7 Empty-state guidance *(UX)* — ✅ shipped 0.2.0

The fresh editor shows a blank Box. Add:

- "Drag a component from the toolbox to start" hint.
- "Start from a template" CTA linking to the template picker.

### 3.8 Onboarding tour *(UX)* — ✅ shipped 0.2.0

First-time users get no guidance. A 3–5 step tour (toolbox → canvas →
inspector → save) on first load would help. localStorage flag to skip
on subsequent visits.

### 3.9 Search inside the canvas *(UX)* — ✅ shipped 0.2.0

In a large document, finding "the third Card from the top" requires
clicking through. A "Cmd+F" canvas search (by displayName / props) +
keyboard navigation between results.

### 3.10 Asset library / image upload *(High / UX)* — ✅ shipped 0.2.0

The Image canonical takes a URL. Designers can't upload from their
machine. Add:

- File input → base64 inline OR upload to a host-provided endpoint.
- Image library panel: previously-uploaded images.
- Host integration: an `<EditorImageProvider>` for the host to plug their
  own asset backend.

### 3.11 Inline text editing *(High / UX)* — ✅ shipped 0.2.0

Designers double-click a Text canonical and edit inline today? No —
they use the PropsPanel. Double-click-to-edit on Text / Heading /
Button labels would be standard.

### 3.12 Right-click context menu *(UX)* — ✅ shipped 0.2.0

Standard design tool gesture. Per-node menu with Cut / Copy / Paste /
Duplicate / Delete / Wrap in Stack / etc.

### 3.13 Comments / annotations *(Stretch)*

Designer leaves "Make this red for Friday" on a node. Stretch — real
collaboration tools have this.

### 3.14 Reduced-motion preference *(UX / Accessibility)* — ✅ shipped 0.2.0

`prefers-reduced-motion` is ignored. Transitions on hover, color
animations, panel opens — could honor user setting.

### 3.15 RTL support *(Stretch / i18n)*

Hardcoded `left/right` Tailwind utilities don't flip for RTL languages.
For end users in Arabic / Hebrew, the editor chrome and rendered output
need `dir="rtl"` handling.

### 3.16 Internationalization *(Stretch / i18n)*

All editor chrome strings are English-only. No `i18n` framework. For
non-English-speaking designers, this is a barrier.

---

## 4. Style depth — raising the design ceiling

> **Status — shipped in `0.3.0` (Phase 12):** every non-Stretch item in
> this section is shipped + tested + documented. 4.1 (safelist plugin),
> 4.2 (pseudo-class states — full breakpoint × state matrix), 4.3
> (transitions), 4.4 (transforms), 4.5 (filters), 4.6 (background images),
> 4.9 (CSS-variable picker), 4.10 (visual theme editor), 4.11 (theme token
> API), 4.12 (5 more built-in themes), 4.13 (per-theme dark mode), 4.14
> (contrast checking), 4.15 (font upload + curated system/Google fonts).
> 4.16 (gradient-stop HSL/RGB sliders) was already satisfied in Phase 10
> via the nested ColorPicker. Deferred (Stretch): 4.7 conic/mesh/animated
> gradients, 4.8 OKLCH/wide-gamut picker — though the theme editor ships a
> dedicated OKLCH L/C/H slider for token authoring.

### 4.1 Real Vite plugin for Tailwind safelist *(High / Performance)* — ✅ shipped 0.3.0

Phase 8 shipped the extractor; the plugin that consumes it is deferred.
A real plugin reads documents at build time, emits `@source inline()`
directives to a generated file, and HMR-triggers Tailwind rebuilds when
documents change. Replaces runtime `<style>` injection.

### 4.2 Pseudo-class styling (`:hover`, `:focus`, `:active`) *(High / UX)* — ✅ shipped 0.3.0 (full breakpoint × state matrix)

Designers can type `hover:bg-primary` manually via class strings but
there's no structured editing. A "States" tab in the inspector with
hover / focus / active variants of each panel section.

### 4.3 Transitions / animations panel *(UX)* — ✅ shipped 0.3.0

Tailwind has `transition-*` utilities. No panel today. Could expose
duration, easing, properties as a structured editor.

### 4.4 Transforms (rotate / scale / translate / skew) *(UX)* — ✅ shipped 0.3.0

No panel today. Tailwind utilities exist (`rotate-45`, `scale-110`).
Could expose as a Transforms panel.

### 4.5 Filters (`blur`, `drop-shadow`, `grayscale`, etc.) *(UX)* — ✅ shipped 0.3.0

Effects panel has `blur` and `shadow`. Missing: brightness, contrast,
grayscale, invert, saturate, sepia, drop-shadow.

### 4.6 Background images, repeat patterns *(UX)* — ✅ shipped 0.3.0

Today: `background` accepts solid colors and gradients via the
ColorPicker's gradient mode. Could extend with:

- URL → `background-image: url(...)`
- Repeat / size / position controls
- Image library integration (see 3.10).

### 4.7 Conic / mesh / animated gradients *(Stretch)*

Linear + radial only today. Conic is reasonable for circular progress
visuals. Mesh and animated are aspirational.

### 4.8 OKLCH / wide-gamut color picker *(Stretch)*

Today: hex / RGB / HSL. shadcn's tokens use OKLCH. A perceptual color
space picker would match.

### 4.9 CSS variable picker *(High / Theming)* — ✅ shipped 0.3.0

Designers picking a color today get Tailwind tokens (`primary`,
`secondary`, etc.). Hosts that have their own design tokens
(`--brand-blue`, `--surface-elevated`, etc.) can't expose them. Add a
variable picker that lets the host enumerate their available CSS
custom properties.

### 4.10 Visual theme editor *(High / UX)* — ✅ shipped 0.3.0

Today themes are CSS blocks designers can't edit. A theme editor:

- Pick base colors → derives the full shadcn token set.
- Live preview as designer adjusts.
- Save as a new theme; export the CSS block.

### 4.11 Theme creation API for SDK *(DevEx)* — ✅ shipped 0.3.0

`registerTheme({ id, displayName, dataThemeValue })` requires the host
to also ship the CSS block. A higher-level API:

```ts
registerTheme({
  id: 'forest',
  tokens: {
    primary: 'oklch(0.55 0.18 145)',
    background: 'oklch(0.98 0.02 145)',
    // ...
  },
})
```

Generate the CSS automatically.

### 4.12 More built-in themes *(UX)* — ✅ shipped 0.3.0

Today: default + rose. Add green, blue, slate, zinc, neutral.

### 4.13 Dark mode per-theme *(High / UX)* — ✅ shipped 0.3.0

Today `dark` is a separate class baked into index.css. Themes could
declare their own `light` + `dark` variants; a system-prefs-aware
toggle in the editor.

### 4.14 Color contrast checking *(High / Accessibility)* — ✅ shipped 0.3.0

When the designer picks a text color over a background, surface the
contrast ratio (live) + a WCAG AA/AAA badge. Prevents shipping
inaccessible designs.

### 4.15 Font upload UI *(UX)* — ✅ shipped 0.3.0 (+ curated system / Google fonts)

Today `registerFontToken` is SDK-only. A font-upload panel in the
editor (drag-drop .woff2 → enter name → register) would let designers
add fonts without writing code.

### 4.16 HSL/RGB sliders for gradient stops *(UX)* — ✅ shipped (Phase 10, via nested ColorPicker)

Same picker capabilities for stops as for solid colors. Nested
ColorPicker (see 2.12) gets this for free.

---

## 5. Component breadth — closing the canonical gap

**Status: shipped in `0.4.0` (Phase 13).** The editor now ships 48
canonicals (up from 20), every § 5.1–5.7 item rendered in both the shadcn
and MUI adapters. § 5.8 (Charts) and § 5.9 (Editor primitives) remain
Stretch — each needs a heavy library and is deferred to a later phase.

### 5.1 Data display *(High / UX)* — ✅ shipped
- ✅ Table (rows / cells as slot-component canonicals; per-cell drop
  zones, column/row resize, Cell-merge panel)
- ✅ DataList (+ DataListItem)
- ✅ Code block (static; syntax highlighting queued — Stretch)
- ✅ Skeleton (text / rectangle / circle)

### 5.2 Navigation *(High / UX)* — ✅ shipped
- ✅ Breadcrumb
- ✅ Pagination
- ✅ NavMenu (+ NavItem)
- ✅ Stepper (Pattern B dynamic-canvas; Active-step navigator panel)

### 5.3 Overlays *(High / UX)* — ✅ shipped
- ✅ Modal / Dialog
- ✅ Drawer
- ✅ Toast / Snackbar
- ✅ Tooltip (real canonical; native hover at runtime)
- ✅ Popover
- Attached via right-click **Attach overlay**; editor previews them in
  the Overlay Stage, runtime uses the library primitive. `useIsEditing()`
  is the adapter contract.

### 5.4 Feedback *(UX)* — ✅ shipped
- ✅ Progress (linear + circular, determinate)
- ✅ Spinner / Loader (indeterminate)

### 5.5 Layout *(UX)* — ✅ shipped
- ✅ Grid (first-class canonical)
- ✅ Container (max-width wrapper)
- ✅ Spacer
- ✅ Section (semantic wrapper)

### 5.6 Time *(UX)* — ✅ shipped
- ✅ DatePicker
- ✅ TimePicker
- ✅ DateRangePicker
- Native `<input type="date|time">` for v1; rich calendar popover queued
  (Stretch).

### 5.7 Media *(UX)* — ✅ shipped
- ✅ Video
- ✅ Audio
- ✅ Carousel (Pattern B dynamic-canvas of slides)

### 5.8 Charts *(Stretch)* — not started
- Line, Bar, Pie, Area
- Sparkline
- Needs a chart library (Recharts / Visx); deferred to a later phase.

### 5.9 Editor primitives *(Stretch)* — not started
- Markdown renderer
- Rich text (WYSIWYG)
- Math (KaTeX)
- Each is its own large dependency; deferred.

---

## 6. Persistence — beyond localStorage

**Status: § 6.1–6.4 shipped in `0.5.0` (Phase 14).** § 6.5 (export to
React code) is **out of scope — won't be supported** (see below). § 6.6–6.8
remain Stretch. Documents persist to IndexedDB by default behind a
host-replaceable `StorageAdapter`; a versioned migration pipeline runs on
load; documents snapshot / restore.

### 6.1 IndexedDB migration *(High / Production-blocker)* — ✅ shipped

- ✅ Async storage core; `IndexedDBStorageAdapter` is the default (hundreds
  of MB vs localStorage's ~5 MB). localStorage adapter is the fallback.
- ✅ First-boot import of existing localStorage documents into IDB.

### 6.2 Server-backed storage adapter *(Production-blocker)* — ✅ interface shipped

The documented `StorageAdapter` interface (async; `readIndex` /
`writeIndex` / `readDocument` / `writeDocument` / `deleteDocument` /
`estimateUsage`, optional `init` + version methods). Register via
`setStorageAdapter(...)`. The editor's default is IndexedDB →
localStorage; a concrete HTTP / Supabase / etc. adapter is the host's job
(INTEGRATION_GUIDE has the recipe).

### 6.3 Document versioning beyond Craft's undo *(UX)* — ✅ shipped

- ✅ Auto-snapshot on save (ring-buffered, last 20 per doc).
- ✅ Manual save points (labeled, exempt from eviction).
- ✅ Restore from the document menu (snapshots current first).
- Version **diff view** remains a Stretch follow-up.

### 6.4 Schema migration framework *(DevEx)* — ✅ shipped

- ✅ Envelope `version` is a monotonic integer; ordered `up()` steps run
  for every version above the stamped one, then re-stamp.
- ✅ The Phase 6 / 7 / 10 content migrations are folded into step 2.
- One-way only — no `down` steps (export-before-downgrade policy).

### 6.5 Export to React code — ❌ out of scope (won't support)

**Not a feature of this library, by design.** crafted-design is a runtime,
adapter-pluggable editor + document model: a document is data (JSON)
rendered live by the chosen adapter (shadcn / MUI / …). Emitting framework
**source code** is a fundamentally different product — a design-to-code
generator — that would have to re-implement every adapter component as a
string template and keep ~48 canonicals × N adapters of those templates
from drifting from the real components. That's out of step with the
library's intent and a large, brittle maintenance surface.

A prototype was built during Phase 14 and removed once this was clear.
Portability is served instead by **JSON export / import / share-by-URL**
(round-trips the document model) and by **embedding `<Editor />`** or
rendering the document model at runtime via the chosen adapter. Hosts that
genuinely need code output can layer their own generator on top of the
exported JSON + the public registry metadata.

### 6.6 Export to other formats *(Stretch)*
- HTML (static, no React)
- Figma plugin → import Figma → editor doc
- Sketch (less relevant)

### 6.7 Real-time collaboration *(Stretch)*

Multiple users editing the same document with live cursors and
operational-transform style conflict resolution. Yjs / Liveblocks /
Automerge integration. Big engineering item — defer until requested.

### 6.8 Document templates marketplace *(Stretch)*

Today templates are baked-in. A community library where designers can
share/publish templates would be a real ecosystem boost.

---

## 7. Adapter ecosystem

### 7.1 Real Chakra adapter as a separate package *(Ecosystem)*

`@design/adapter-chakra` — installed alongside the editor. Phase 6 has
the mock; Phase 9+ ships the real one.

### 7.2 More adapters *(Ecosystem)*
- Ant Design
- Mantine
- Bootstrap (React Bootstrap)
- Plain HTML (no library — minimum-viable for hosts that don't want a UI framework)
- Tailwind UI / Tailwind Plus (paid components)

### 7.3 Adapter compatibility matrix *(DevEx)*

Document which canonicals each adapter supports. Currently shadcn + MUI
cover all 20; future adapters might cover subsets. The missing-impl
placeholder is the runtime fallback; the matrix is the docs view.

### 7.4 Adapter versioning + breaking changes *(DevEx)*

If shadcn changes a primitive's API (which happens), our adapter breaks.
Need:
- Adapter peer-dependency on the underlying library.
- Documented "tested against shadcn vX.Y" per adapter.
- CI matrix that builds against multiple versions.

### 7.5 Adapter marketplace / discovery *(Stretch)*

A list of community-built adapters with install instructions.

---

## 8. Performance optimization (post-measurement)

These depend on the measurement pass (1.2) — fixes once we know what's hot.

### 8.1 Toolbox virtualization *(Stretch)*

At 60+ canonicals, the Toolbox rendering 60+ buttons each render gets
expensive. Virtualization (react-window) cuts the render to the visible
slice.

### 8.2 Canvas virtualization *(Stretch)*

Large documents (1000+ nodes) render every node every frame. Could
viewport-cull off-screen nodes.

### 8.3 Lazy adapter loading *(High / Performance)*

Today all adapters preload. MUI brings ~50 KB; users who never switch
adapters pay that cost. Code-split per-adapter; load on demand.

### 8.4 Tree-shakable SDK exports *(High / Bundle)*

`@design/sdk` re-exports everything via `export *`. Hosts that use only
a subset still get the full bundle. Restructure as named imports per
feature.

### 8.5 Memoize PropField recursion *(Performance)*

PropField walks the Zod schema on every render. `useMemo` on the
schema-dispatch path.

### 8.6 Throttle ColorPicker drag commits *(Performance)*

HexColorPicker fires onChange per drag tick. Throttle to ~16ms or
defer to mouseup commit for slow devices.

### 8.7 Memoize Toolbox connector callbacks *(Performance)*

`connectors.create(el, ...)` re-runs on every Toolbox render. `useCallback`
the ref callback per canonical.

---

## 9. Developer experience — easing contribution + SDK authoring

### 9.1 CONTRIBUTING.md *(DevEx)*

How to set up the dev environment, run tests, propose changes, etc.

### 9.2 Code of Conduct *(DevEx)*

Standard CoC for community contributions.

### 9.3 Issue / PR templates *(DevEx)*

GitHub issue templates for bug reports, feature requests, etc.

### 9.4 CI pipeline (GitHub Actions) *(Production-blocker)*
- Lint on every push.
- Type-check on every push.
- Run tests on every push.
- Build dist on PR.
- Bundle size budget check.

### 9.5 Pre-commit hooks (husky / lefthook) *(DevEx)*
- Lint changed files.
- Format with Prettier.
- Run tests touching changed paths.

### 9.6 Release automation (changesets / semantic-release) *(Production-blocker)*
- PR labels → version bump (patch / minor / major).
- Auto-publish on main merge.
- Auto-generate CHANGELOG entries.

### 9.7 DevTools extension *(Stretch / DevEx)*

A browser extension that exposes the editor's state (Craft tree,
registry, active adapter / theme / document) for debugging. Similar
to React DevTools or Redux DevTools.

### 9.8 Adapter / canonical / panel scaffolding CLI *(DevEx)*

```bash
npx @design/cli create-adapter my-lib
npx @design/cli create-canonical my-component
```

Generates the file skeleton + registration.

### 9.9 Storybook for adapter impls *(DevEx)*

Visual regression testing of adapter impls. Each canonical has a
Storybook story across all adapters; visual diffs catch regressions.

### 9.10 Bug-tracking infrastructure *(Production-blocker)*

This is a local repo today. To ship publicly:
- Public GitHub repo
- Issue tracker
- Discussions / Discord / forum
- Public roadmap

---

## 10. Documentation completeness

### 10.1 Live API reference site *(High / DevEx)*

TypeDoc → static site. Hosted somewhere (GitHub Pages, Vercel).
Versioned (v0.1 / v0.2 / etc.).

### 10.2 Interactive examples / sandboxes *(High / DevEx)*

CodeSandbox / StackBlitz templates per tutorial. Click a button, get a
running editor with the recipe applied. Beats reading markdown.

### 10.3 Video walkthroughs / screencasts *(UX)*

5-minute video per tutorial. Captioned. Hosted on YouTube + embedded.

### 10.4 Cookbook / patterns library *(DevEx)*

Beyond the three tutorial files. Real-world patterns: form validation
in a custom panel, server-side persistence integration, custom theme
generation, etc.

### 10.5 Architecture diagrams (real, not ASCII) *(DevEx)*

The Four-Layer Model is an ASCII box diagram. Real SVG diagrams (made
in Excalidraw or Figma) would communicate the architecture more
clearly. Especially the data flow walkthroughs.

### 10.6 Migration guides between major versions *(Production-blocker)*

When we bump major versions (e.g., v1 → v2), a migration guide:
- What changed
- How to update integration code
- Document migrations (if envelope changed)

### 10.7 FAQ / Troubleshooting *(DevEx)*

INTEGRATION_GUIDE.md has a troubleshooting section. Could grow into a
dedicated FAQ as user reports accumulate.

---

## 11. Security + compliance

### 11.1 CSP audit *(Production-blocker)*

The editor injects inline styles + runtime `<style>` blocks. Some CSPs
forbid this. Document required CSP directives:
- `style-src 'self' 'unsafe-inline'` OR
- Nonce-aware `<style>` injection (Phase 9+ polish)

### 11.2 XSS audit *(Production-blocker)*

React auto-escapes most content. But:
- `style.inline[slot][cssProp]` accepts arbitrary strings. CSS
  `expression()` (IE legacy) is dead but verify no injection vectors
  in modern browsers.
- `gradientToCss` constructs CSS strings from user input. Validate hex
  + position ranges.
- `registerFontToken({ url })` injects URL into `@font-face`. CRLF
  injection? Validate.

### 11.3 Dependency vulnerability scanning *(Production-blocker)*

`npm audit` on CI. Snyk / Dependabot integration.

### 11.4 License audit *(Production-blocker)*

What license does the editor ship under? MIT / Apache 2.0 / BSL?
Verify all deps have compatible licenses (no GPL contamination).

### 11.5 GDPR / privacy *(Stretch — depends on host)*

Editor is client-side; no data collection. But integration hosts
embedding it in EU-targeted apps need to know.

---

## 12. Build / distribution

### 12.1 Multiple bundle formats *(High / Production-blocker)*

Today: ESM only. For broader compatibility:
- CommonJS (`require()` users)
- UMD (`<script>` tag users)
- Or document ESM as the only supported path.

### 12.2 Subpath imports *(High / DevEx)*

```ts
import { registerCanonical } from '@design/editor/sdk'
import { Editor } from '@design/editor/runtime'
```

vs the current single entry. `package.json` `exports` field already
shown in SDK_GUIDE.md but not actually shipped.

### 12.3 Bundle analyzer + budgets *(Production-blocker)*
- `vite-bundle-visualizer` integration.
- CI fails if bundle exceeds N KB.
- Per-export size tracking.

### 12.4 Source maps for production *(Shipped)*

Today: included.

### 12.5 Minified + non-minified variants *(DevEx)*

Today: non-minified. Ship both via `index.js` + `index.min.js`.

---

## 13. Telemetry + observability

### 13.1 Telemetry provider context *(High / DevEx)*

Today each error boundary takes its own `onError` prop. A
`<TelemetryProvider>` context lets the host plug one handler that all
boundaries inherit:

```tsx
<TelemetryProvider onError={Sentry.captureException} onMetric={posthog.capture}>
  <Editor />
</TelemetryProvider>
```

### 13.2 Performance metrics *(High / DevEx)*

Standard editor metrics:
- Time to first interactive
- Document load time
- Render time per node
- Re-render counts per flow

Surface as opt-in callbacks for hosts to ship to their observability.

### 13.3 Usage telemetry (opt-in) *(Stretch)*

Aggregate usage stats: which canonicals used, which adapters active,
session duration. For the project's own product analytics, not the
host's. Opt-in only.

### 13.4 Error reporting *(Production-blocker)*

Already covered by error boundaries + telemetry hook. Document the
integration recipe.

---

## 14. Stretch ideas — speculative

### 14.1 AI-assisted editing
- "Generate a landing page about X" → editor places components.
- "Make this red" → ColorPicker resolves.
- "Suggest a font" → typography assistant.

### 14.2 Plugin marketplace
- Browse / install community plugins from a UI.
- Trust + verification model.
- Auto-update.

### 14.3 Asset generation
- AI-generated images via inline prompt.
- Icon search across multiple icon libraries.

### 14.4 Multi-platform export
- React Native adapter (Mobile).
- React Email adapter (transactional email).
- Web Components emit.

---

## Summary — minimum production-ready set

If we had to pick the smallest set that makes "production-ready, easy for
external developers and designers" honest, it would be:

**Must:**
1. React 19 verified + .d.ts emit (1.1, 2.2)
2. Real npm publish + CHANGELOG + semver (2.1, 2.3)
3. CI pipeline (9.4)
4. CSP + XSS audit (11.1, 11.2)
5. Bundle size budget + analyzer (12.3)
6. IndexedDB or server-backed storage adapter (6.1, 6.2) — ✅ shipped 0.5.0
7. Stable per-tab ids in Tabs (2.11)
8. Layer tree / outline view (3.4)
9. Copy / paste / duplicate node (3.2)
10. Inline text editing on Text canonicals (3.11)
11. Image upload / asset library (3.10)
12. Real Profiler + axe-core measurement pass (1.2, 1.3)
13. TypeDoc API reference site (10.1)
14. Bug tracking infrastructure (9.10)

(Export to React code, formerly listed here, is **out of scope** — a
source-code generator isn't part of a runtime editor + document model.)

**Should:**
15. Canvas keyboard navigation (1.4)
16. Hot reload of fonts / adapters / themes (2.7–9)
17. CSS variable picker for host themes (4.9)
18. Color contrast checking (4.14)
19. Telemetry provider (13.1)
20. Lazy adapter loading + tree-shakable SDK (8.3, 8.4)
21. SDK boundary lint rule (2.5)
22. Subpath imports + multiple bundle formats (12.1, 12.2)
23. Schema migration framework (6.4) — ✅ shipped 0.5.0
24. Real Vite plugin for Tailwind safelist (4.1)

**Nice-to-have but not blocking:**
- Everything in §5 (component breadth)
- Everything in §14 (stretch)
- Most of §4 beyond CSS variable picker + color contrast
- Most of §10 beyond TypeDoc

The "must" list is ~14 items. With genuine effort and no timeline
pressure, that's the path to "this is a real product." Anything beyond
the must list is product breadth, not production readiness — they
strengthen the offering but don't block claiming production status.
