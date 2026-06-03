# Changelog

All notable changes to `@crafted-design/editor` are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What counts as a breaking change

The version bump policy follows semver strictly. A change is **breaking** (major bump) if it:

- Removes an exported function, type, or value from `@crafted-design/editor` or `@crafted-design/editor/sdk`.
- Removes a built-in canonical from the registry (because saved documents reference it by id).
- Changes the document envelope shape (`EditorDocument`) without shipping a migration in `src/persistence/migrations.ts`.
- Changes the signature of a publicly-exported hook in a way that older callers won't compile.
- Renames a Craft.js bridge type or a registered panel id.

A change is **non-breaking** (minor / patch) if it:

- Adds new exports.
- Adds new canonicals, adapters, themes, templates, or panels.
- Adds new optional fields to existing types (and to the document envelope, with a default).
- Changes internal modules under `src/` that aren't re-exported through `src/sdk/`.
- Changes UI strings, styling, or layout without changing the rendered HTML structure that integration consumers depend on.

Between `0.x` minors the API may evolve without a major bump — preview phase. `1.0.0` freezes the SDK surface.

## [0.1.0] — 2026-05-25 (initial public preview, behind `next` dist-tag)

Consolidates Phases 1 → 10 into the first publishable artifact.
Install with `npm install @crafted-design/editor@next react@19 react-dom@19`.
Until `1.0.0` the SDK surface may evolve between minors; see
"What counts as a breaking change" above.

### Added

**SDK surface** (`@crafted-design/editor/sdk`)
- Adapter authoring: `registerAdapter`, `unregisterAdapter`, `listAdapters`,
  `useActiveAdapter`; types `Adapter`, `AdapterRenderProps`, `ClassMapFn`,
  `ClassMapResult`.
- Canonical authoring: `registerCanonical` / `registerComponent`,
  `unregisterCanonical`, `getComponent`, `getComponentByDisplayName`,
  `listComponents`, `getCanvasSlots`, `getApplicablePanels`; types
  `CanonicalComponent`, `CanonicalCategory`, `CanonicalId`, `PanelId`.
- Inspector panels: `registerPanel`, `unregisterPanel`, `listPanels`,
  `getPanelsFor`; type `PanelDefinition`.
- Font tokens: `registerFontToken`, `unregisterFontToken`,
  `listFontTokens`; type `FontToken`.
- Themes: `registerTheme`, `unregisterTheme`, `getTheme`, `listThemes`;
  type `Theme`.
- Templates: `registerTemplate`, `unregisterTemplate`, `getTemplate`,
  `listTemplates`; type `TemplateDefinition`.
- Hooks: `useNodeClasses`; type `Breakpoint`.
- Tabs helpers: `tabSlotKeys`, `uniqueTabValues`, `TAB_SLOT_PREFIX`,
  `TabsProps`.
- Style data: type `NodeStyle`.

**Editor entry** (`@crafted-design/editor`)
- 20 built-in canonicals: Alert, Avatar, Badge, Box, Button, Card,
  Checkbox, Divider, Heading, Icon, Image, Input, Link, Radio, Select,
  Stack, Switch, Tabs, Text, Textarea.
- Three reference adapters: shadcn (default), MUI, Chakra (example).
- Themes: `default`, `rose`.
- Templates: `empty`, `form`.
- Inspector panels: Layout, Size, Spacing, Typography, Appearance,
  Effects, Properties.
- Persistence: multi-document store, share-by-URL, import / export.
- Reliability infrastructure (Phase 9): error boundaries × 4 layers,
  async error toast, malformed-craftJson recovery banner, localStorage
  quota tracking + blocking save-fail dialog, cross-tab concurrent
  edit banner, hydration race serialisation.
- Accessibility (Phase 9): canvas keyboard navigation, Toolbox roving
  tabindex, axe-core dev auto-scan, structural landmarks + h1.
- Performance (Phase 9): hex color edit defer-to-pointerup, resize
  overlay direct-DOM gesture.
- Hot-reload symmetry (Phase 10): post-mount `register*` calls reach
  the editor's dropdowns / pickers without remount, across all five
  registries.
- Stable per-tab ids (Phase 10): tab `value` renames no longer orphan
  canvas content; existing documents migrate via `migrateTabsIdsV10`.
- Gradient editor polish (Phase 10): nested ColorPicker per stop +
  drag-along-bar handles.

**Distribution**
- Two-entry-point dist build:
  `@crafted-design/editor` (full editor) +
  `@crafted-design/editor/sdk` (SDK boundary alone). Subpath exports
  route via `package.json` `exports`.
- `vite-plugin-dts` emits matching `.d.ts` files alongside the JS
  bundles (`dist-lib/main-app.d.ts`, `dist-lib/sdk/index.d.ts`).
- `src/sdk/internal/deprecate.ts` — once-per-call-site `console.warn`
  helper for future deprecations.
- ESLint `no-restricted-imports` rule blocks `examples/**` from
  reaching past the SDK boundary; integration consumers can mirror
  this for their own source trees.
- Auto-generated TypeDoc reference at `docs/api/` covering every SDK
  export.
- Sample consumer file at `examples/sdk-smoke/consumer.tsx` proves
  the `.d.ts` tree resolves end-to-end for an integration consumer.

### Migrated

- **Tabs documents pre-Phase-10**: legacy tabs without `id` are
  auto-migrated on load (`migrateTabsIdsV10`). Injected ids match the
  previous slot keys so existing canvas children stay attached.

### Bundle size

Dist (`npm run build:dist`, unminified):

| Artifact | Raw | Gzipped |
|---|---|---|
| `dist-lib/index.js` | 408 KB | 88 KB |
| `dist-lib/sdk.js` + shared chunk | 148 KB | 32 KB |
| `dist-lib/index.css` | 390 KB | 114 KB |

App build (`npm run build`):

| Artifact | Raw | Gzipped |
|---|---|---|
| `dist/assets/index-*.js` | 517 KB | 157 KB |
| `dist/assets/index-*.css` | 218 KB | 28 KB |

## [Unreleased]

(none yet)

## [1.2.0] — 2026-06-03

### Added

- **Scaffolding CLI.** A `crafted-design` bin generates a typed, SDK-wired
  skeleton for an adapter, canonical, or inspector panel:
  ```bash
  npx @crafted-design/editor scaffold adapter   my-design-system
  npx @crafted-design/editor scaffold canonical pricing-table
  npx @crafted-design/editor scaffold panel     seo-meta
  ```
  Generated code imports from `@crafted-design/editor/sdk` and ships with a
  passing smoke test, so authoring an extension starts from working code. Zero
  runtime dependencies (Node built-ins only). The authoring tutorials now lead
  with it.
- **Live demo + component gallery.** The docs site gained a clickable, in-browser
  editor at `/try` and a `/gallery` cataloging every canonical with per-adapter
  coverage, alongside the guides (`/`) and API reference (`/api`).
- **Runnable minimal-host example.** `examples/minimal-host` is now a real,
  copy-pasteable Vite + React 19 project (with an "Open in StackBlitz" link),
  CI-typechecked against the built package so the minimal integration can't
  drift from the shipped API.

No public API changes — the frozen SDK surface is unchanged (the CLI is a `bin`,
not an exported module).

### Fixed

- **Pure-ESM consumers no longer crash with `Calling require for "react"`.** A
  transitive CJS dependency (`use-sync-external-store`'s shim, pulled in by a
  Radix hook) did `require('react')`; with React externalized, the library
  build left a bare `require("react")` in the ESM output, which throws in a
  Vite/Rolldown (or any pure-ESM) host. The shim is now aliased to React 19's
  native `useSyncExternalStore` at build time, so the published bundle is pure
  ESM with no `require` calls.

## [1.1.0] — 2026-06-03

### Added

- **Host-themable editor chrome** — `<Editor editorTheme="dark" />` (or a
  partial token map, e.g. `editorTheme={{ accent: '#7aa2f7', surface:
  '#16161e' }}`) themes the editor's own UI — toolbox, inspector, toolbar,
  panels, banners. `editorTheme` is `'light'` (default) | `'dark'` | an
  `EditorChromeTokens` map (which may extend a preset via its `preset`
  field). Applied as CSS variables on `<html>`, so chrome that portals to
  `<body>` (dropdowns, modals) is themed too, while the host page is
  untouched. Like the `adapter` prop this is **host policy** — there's no
  end-user chrome switcher. It is independent of the document theme system
  (`registerTheme` / the canvas theme switcher / `colorMode`), which styles
  the canvas content end users design — dark chrome around a light document
  works. New type-only exports `EditorChromeTheme` and `EditorChromeTokens`
  (the frozen runtime surface is unchanged).

### Changed

- The editor chrome now styles itself through a dedicated `--ed-*` token set
  (light preset is byte-identical to the previous hardcoded grays — no visual
  change for the default `editorTheme`). Previously the chrome borrowed the
  document/canvas theme tokens in places, so switching the document theme or
  color mode could subtly shift the editor UI; the chrome and the document
  theme are now fully decoupled. A `check:chrome` CI guard keeps it that way.

## [1.0.2] — 2026-06-02

### Fixed

- **Toolbox: dragging from "Recently used" grabbed the wrong component.** The
  recently-used LRU was recorded on `mousedown`, which reordered the Recent
  section (and reflowed every tile below it) while the pointer was still
  down — so by the time `dragstart` fired, a different tile sat under the
  cursor and became the drag source (e.g. dragging the 4th recent tile dropped
  the old 3rd). The LRU bump now records on `dragend` (and on keyboard
  Enter-insert, as before), after the pointer is released, so the grid never
  reflows mid-drag. A click that never starts a drag no longer bumps the LRU
  (it inserts nothing, so it isn't a "use").

## [1.0.1] — 2026-06-02

First post-1.0 release (the published `1.0.0` tarball predates this feature).
Additive — no breaking changes.

### Added

- **Host-pinned adapter** — `<Editor adapter="mui" />` lets the host choose the
  design system (the product intent: the host picks, not the host's end
  users). Pinning sets the active adapter before first paint, hides the
  toolbar AdapterSwitcher, and makes loading a document NOT override the
  adapter (the envelope's `adapterId` is a preference, not a command —
  documents are canonical-id based and render under any adapter). A separate
  `allowUserToSwitchAdapter` prop controls the switcher independently
  (defaults: `false` when `adapter` is set, `true` otherwise — legacy behavior
  unchanged for prop-less `<Editor />`). Pinning an unregistered adapter warns
  and falls back to the default; **`adapter="mui"` requires the MUI peers**
  (`@mui/material`, `@emotion/react`, `@emotion/styled`). New `EditorProps`
  type export (type-only).

## [1.0.0] — 2026-06-02

First stable release. Promotes the editor off the `next` preview tag to
`latest`. The **public SDK surface is now frozen under the full SemVer
promise** — see [SDK_GUIDE.md](docs/SDK_GUIDE.md) "Public API stability":
removing or renaming any exported name (enumerated in `src/sdk/surface.test.ts`)
is from here a breaking, major-version change. No API changes vs `0.9.0`; this
is the stabilization cut, folding in the `0.9.0`-cycle work below.

### Changed

- **Toolbox is now a visual icon-thumbnail grid** (Unlayer-style) instead of a
  vertical list of text buttons. Each component shows a representative icon over
  its label in a 2-column grid per section; the favorite ★ reveals on
  hover/focus. Drag, recent-use, search, favorites, and roving-tabindex
  keyboard nav are unchanged (arrow keys now step in any direction). Custom
  canonicals with no mapped icon fall back to a category icon.
- **Built-in adapter impls are lint-enforced to consume the SDK** (Phase 18
  follow-up). A `no-restricted-imports` rule on `src/adapters/{shadcn,mui,html}/**`
  blocks reaching the `@/editor` · `@/state` · `@/lib` internals — those must
  come through `@design/sdk` (the same boundary third-party adapters hit). The
  canonical contract (`@/registry/components`) + the shadcn adapter's own
  primitives (`@/components/ui`) stay allowed; the adapter infrastructure at
  `src/adapters/` root is out of scope. Also migrated a straggler (`Box.tsx`'s
  `cn`) the earlier codemod missed.

### Added

- **Stepper + Table dynamic-canvas slot helpers promoted to the SDK** (Phase 18
  follow-up). `stepperSlotKey` / `stepperSlotKeys`, `tableCellSlotKey` /
  `tableCellSlotKeys`, the table merge-geometry helpers `containingMerge` /
  `isCellCovered`, their `STEP_SLOT_PREFIX` / `CELL_PREFIX`, and the
  `TableMerge` type are now exported from `@crafted-design/editor/sdk` — the
  Stepper/Table analog of the already-public Tabs/Carousel helpers, so a
  third-party Stepper/Table adapter has the full authoring surface. The pure
  helpers moved into the side-effect-free `dynamic-slots` module (the canonical
  modules re-export them for back-compat), so importing the SDK still registers
  no canonicals (`side-effect-free.test.ts` holds). Built-in adapters now
  import them from the SDK. Additive; recorded in `surface.test.ts`.

### Fixed

- **Plain-HTML adapter: collapsed table cells.** `HtmlTableCell` used
  `h-full w-full`, which resolves to 0 height in an empty cell — a dropped
  Table rendered ~8px tall. It now uses the `canvas-slot` class (min-height +
  "Drop here" hint + `height:100%` fill) and the `<td>` carries the `height:1px`
  row-fill hack, matching the shadcn / MUI tables.

## [0.9.0] — 2026-06-01

Phase 18 — architecture hygiene + SDK dogfooding (post-`0.8.0` review
follow-ups). Refreshes the 1.0 release candidate. No breaking changes — the
public surface only **grows** (additive, recorded in the frozen snapshot).

### Added

- **Overlay-authoring SDK seam** — `useOverlayRuntime`, `readOverlayOpen`,
  `useOverlayStageTarget`, `OverlayCard` (+ `OverlayKind` / `OverlayDef`
  types) are now public, so a third-party adapter can build overlay
  canonicals with the same editor-stage + runtime behavior as the built-ins.
- **`cn`** — the clsx + tailwind-merge class-merge util adapter impls use.
- **Per-canonical prop types** — every canonical's props type (`ButtonProps`,
  `ModalProps`, `TableProps`, …) is exported from the SDK (type-only).
- **Pure node-render-model** — `buildNodeRenderModel` extracted from
  `CanonicalNode` (internal), now directly unit-tested.

### Changed

- **Built-in adapters now consume the public SDK boundary** — shadcn / MUI /
  html no longer reach into `@/editor` / `@/state` / `@/lib` internals; they
  import `useIsEditing` / `EditableText` / `useStartTextEdit` / the overlay
  seam / `cn` from `@crafted-design/editor/sdk`. Behavior identical (same
  bindings); this is what surfaced the missing seams above.
- **`/sdk` bundle budget 60 → 70 KB gz** — the new overlay seam + `cn`
  (tailwind-merge) grow the full-surface number. `/sdk` is side-effect-free,
  so a consumer importing one symbol tree-shakes the rest.
- `CanonicalNode` is now wiring over the pure render model (no behavior
  change).

### Fixed

- **Adapter wrapper-stability hazard** — `registerAdapter` now warns when a
  `Wrapper`-bearing adapter registers *after* `<Editor />` mounts (a late
  Wrapper reshapes the composed wrapper tree and can remount Craft's
  `<Frame>`, wiping the canvas). The contract is documented on `Adapter.Wrapper`
  + the DEVELOPER_GUIDE adapter recipe.
- **Stale architecture docs** — `ARCHITECTURE.md` refreshed from the live
  registry: 48 canonicals (was "Twenty"), the real multi-canvas Pattern B
  (`canvasSlots` → per-slot `<Element canvas>`, used by Card/Table/Tabs/
  Stepper/Carousel), and the `html` adapter in the tree.

### Added — validation

- **Semantic document validation** — alongside the structural integrity check,
  a lenient pass validates each node's `nodeProps` against its canonical
  `propsSchema` and `style` against a new `NodeStyle` zod schema. Corrupt
  props/styles are reported (telemetry `document.semanticIssues` metric + a dev
  warning) **before render** without blocking a document the editor can still
  best-effort display.

## [0.8.0] — 2026-06-01

Phase 17 — production-readiness completion. The **1.0 release candidate**:
every non-Stretch item across PRODUCTION_READINESS §§ 8 (perf + bundle), 10
(docs), and 12 (distribution) is shipped, and the **public SDK surface is
frozen and enforced**. No breaking changes — additive + internal.

### Added

- **Frozen public API surface** (the 1.0 gate). `src/sdk/surface.test.ts`
  locks the exact exported-name list for both `@crafted-design/editor` /
  `/core` and `/sdk`, asserts the editor entry is a strict superset of the
  SDK, and that internals (`CanonicalNode`, the resolver builder) never leak.
  Any export change now fails CI until done deliberately. SDK_GUIDE gains a
  "Public API stability (toward 1.0)" section (SemVer promise + deprecation
  policy).
- **SDK tree-shaking guard** (§ 8.4). `src/sdk/side-effect-free.test.ts`
  verifies importing the SDK registers nothing but the three baseline font
  tokens — so consumers tree-shake unused authoring symbols.
- **Docs** — `docs/COOKBOOK.md` (task→recipe index), `docs/FAQ.md`,
  `docs/MIGRATION.md` (major-version template), `docs/RELEASE.md` (release
  runbook + 1.0 go/no-go criteria), and a copy-pasteable
  `examples/minimal-host` host app on `/core`. (§ 10.2, 10.4, 10.6, 10.7)

### Fixed

- **SDK tree-shaking leak** (§ 8.4). Importing `@crafted-design/editor/sdk`
  registered 2 canonicals (carousel + tabs): `sdk/canonical.ts` re-exported
  their slot-key value helpers from the canonical modules, which
  `registerComponent` at load. Helpers moved to the side-effect-free
  `registry/components/dynamic-slots.ts`; the SDK now registers 0 canonicals.
- **Inspector re-render** (§ 8.5). PropField/ObjectField/ArrayField are
  memoized with stable per-field `onChange` handlers — editing one prop no
  longer re-renders/re-walks sibling fields or nested sub-forms.
- **Toolbox connector churn** (§ 8.7). `connectors.create` re-ran for every
  palette button on every Toolbox render; a per-element guard connects each
  once.

### Changed

- **Distribution decision** (§ 12.5): the package stays **ESM-only,
  unminified with source maps** — no CJS/UMD, no separate `index.min.js`
  (consumers' bundlers minify). Documented in INTEGRATION_GUIDE "Bundle
  format".

### Notes

This is a release candidate on the `next` dist-tag. `1.0.0` (promotion to
`latest` + the full SemVer freeze) follows once the go/no-go checklist in
[`docs/RELEASE.md`](docs/RELEASE.md) is met — chiefly host/ops actions
(public repo, `NPM_TOKEN`, Actions + Pages) and an RC soak.

## [0.7.0] — 2026-05-31

Phase 16 — Adapter modularity + ecosystem. The package splits into a lean
`/core` entry plus opt-in per-adapter subpaths, the heavy UI libraries
become optional peer dependencies, a third built-in adapter (plain HTML, no
UI library) ships, and the adapter compatibility + versioning story is
documented and guarded in CI.

### Added

- **Lean `/core` entry + per-adapter subpaths** (§ 8.3, 12.2). New exports:
  `@crafted-design/editor/core` (editor + shadcn + plain-HTML, no MUI) and
  `@crafted-design/editor/adapters/{shadcn,mui,html}`. The default
  `@crafted-design/editor` entry stays batteries-included (core + MUI).
  Opt-in is at the **import boundary**, not runtime — runtime registration
  would reshape the `AdapterProvider` wrapper tree and remount (visually
  wipe) the canvas — so a shadcn-only host drops MUI from its bundle simply
  by importing `/core`.
- **Plain-HTML adapter** (`id: 'html'`, "Plain HTML") (§ 7.2). A
  dependency-free, semantic-HTML renderer for all 48 canonicals: the
  no-framework option, and the reference that proves the adapter SDK +
  modular structure end to end. Layout primitives compose their props
  (grid/flex/max-width); overlays portal to the editor's overlay stage and,
  at runtime, to `<body>` with a backdrop (no Radix dependency).
- **Adapter compatibility matrix** (§ 7.3). `scripts/adapter-matrix.ts`
  (`npm run docs:matrix`) introspects every registered adapter × the
  canonical registry and generates `docs/ADAPTER_MATRIX.md`; `--check` mode
  (wired into CI) fails if a built-in adapter drops below full coverage.
  Built-ins shadcn/MUI/html are 48/48; the Chakra example is intentionally
  partial (gaps fall back to the missing-renderer placeholder).
- **Adapter peer-dependency declaration** (§ 7.4). `peerDependencies`
  (`{ package: testedRange }`) is now a validated field on the adapter
  manifest, surfaced in the matrix and documented in
  `docs/ADAPTER_VERSIONING.md` (install contract, the three ways an upstream
  breaking change surfaces, the support policy). `src/adapters/peer-deps.test.ts`
  guards drift between an adapter's declared ranges and `package.json`.

### Changed

> ⚠ **Breaking for default-entry consumers** — see migration below.

- **`@mui/material`, `@emotion/react`, and `@emotion/styled` are now OPTIONAL
  peer dependencies instead of direct dependencies.** They are no longer
  bundled into the published editor (the dist build externalizes them).
- The SDK gains `peerDependencies` on the `Adapter` type / manifest schema.

#### Migration

The default `@crafted-design/editor` entry bundles the MUI adapter, so
consuming it now requires installing the three peers yourself:

```bash
npm install @mui/material @emotion/react @emotion/styled
```

If you don't use MUI, import the lean entry instead and install nothing
extra (shadcn + plain-HTML need no external peers):

```ts
import '@crafted-design/editor/core'   // editor + shadcn + html, no MUI
```

### Bundle

Measured at `0.7.0` (`npm run check:size` — transitive gzipped per entry,
externalized peers excluded):

| Entry | Gzipped | Note |
|---|---|---|
| `@crafted-design/editor` (`index.js`) | ~253 KB | + MUI/Emotion peers (installed separately) |
| `@crafted-design/editor/core` (`core.js`) | ~245 KB | shadcn + html, no MUI |
| `@crafted-design/editor/sdk` (`sdk.js`) | ~44 KB | SDK-only consumers |
| `index.css` | ~124 KB | |

The `0.6.0` "414 KB gz" `index.js` figure **bundled** MUI. Externalizing it
moves that weight to a peer the host installs only when it uses the MUI
adapter; the editor's own bundled code is ~253 KB gz, and `/core` consumers
ship ~245 KB gz with no MUI at all. (Our two entries are close because MUI is
now external for both; the real win is consumer-side — shadcn-only hosts no
longer download MUI.)

## [0.6.0] — 2026-05-31

Phase 15 — Launch readiness (production hardening). CI + release
automation, security/compliance gates, a corrected publishable bundle,
an observability seam, and contributor + docs infrastructure. Mostly
build/tooling/docs; the runtime additions are additive (telemetry is
opt-in). **Fixes a packaging bug** where the published bundle shipped
without its built-in adapters/canonicals registered.

### Fixed

- **Published bundle registered no built-ins.** `sideEffects:
  ["**/*.css"]` told Rollup every JS module was side-effect-free, so the
  dist build tree-shook away the registration side-effect imports
  (`import './adapters/shadcn'`, the canonical barrel, themes, panels,
  templates). The published `dist-lib` rendered an editor with **no
  adapter renderers and few canonicals** registered. The registration
  modules are now listed in `sideEffects`. (Restoring them is why
  `index.js` grows from a broken ~120 KB gz to its true ~414 KB gz — it
  now actually contains both adapter sets.)

### Added

- **CI + release automation** (§ 9.4–9.6, 12.3). GitHub Actions CI
  (lint + type-check + test + `build:dist` + bundle-budget + license +
  advisory `npm audit`); Changesets-driven release workflow (publishes to
  `next`); lefthook pre-commit/-push hooks; `scripts/check-bundle-size.ts`
  (`npm run check:size`).
- **Security + compliance** (§ 11.1–11.4). Font-token URL/family
  validation and responsive/state inline-style declaration sanitization
  to close CSS-injection vectors in the runtime `<style>` blocks;
  `scripts/check-licenses.ts` (`npm run check:licenses`); `SECURITY.md`
  with the threat model + CSP guidance.
- **Bundle visibility** (§ 8.4, 12.1, 12.3). `npm run analyze`
  (rollup-plugin-visualizer treemap); documented ESM-only stance + the
  two entries (full editor vs the ~44 KB `/sdk`, verified lean).
- **Observability** (§ 13.1, 13.2, 13.4). A `TelemetryProvider` /
  `setTelemetry` seam the error boundaries + timed flows feed (errors
  labeled by boundary; `document.bootstrap` / `document.apply` metrics).
  Zero collection by default.
- **Contributor + docs infra** (§ 9.1–9.3, 9.10, 10.1). Real README,
  CONTRIBUTING, Code of Conduct, issue/PR templates, and a TypeDoc HTML
  API-reference build + GitHub Pages deploy workflow; the in-repo
  `docs/api/` markdown reference regenerated current with the full SDK.

### Changed

- A latent `react-hooks/rules-of-hooks` bug in `CanonicalNode` (a
  `useMemo` after the early missing-adapter return) was fixed by computing
  the placeholder as a value and bailing after all Hooks. The lint
  baseline is now green (0 errors); eslint-plugin-react-hooks v7's
  aggressive new rules are demoted to warnings (tracked tech debt).
- SDK surface gains `setStorageAdapter` / `getStorageAdapter`,
  `setTelemetry` / `getTelemetry` / `TelemetryProvider`, and the matching
  types.

### Not supported (out of scope)

- **Runtime lazy-adapter loading** (§ 8.3) is deferred, not shipped:
  `AdapterProvider` composes every registered adapter's `Wrapper` around
  `<Frame>`, so registering an adapter post-mount would reshape the tree
  and remount (visually wipe) the canvas. The clean fix is an opt-in
  adapter subpath entry so shadcn-only hosts don't bundle MUI — queued.

### Bundle

Measured at `0.6.0` (`npm run build:dist`, no minification, with sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist-lib/index.js` | 1.97 MB | 414 KB |
| `dist-lib/index.css` | 498 KB | 124 KB |
| `dist-lib/sdk-*.js` (SDK subpath) | 196 KB | 44 KB |

The `index.js` figure is the honest full editor (both adapter sets + MUI);
the prior `0.5.0` "≈187 KB gz" number was the broken, under-registered
bundle. SDK-only consumers (`/sdk`) pay ~44 KB, not the full editor.

## [0.5.0] — 2026-05-30

Phase 14 — Persistence beyond localStorage. Documents now persist to
IndexedDB by default behind a host-replaceable `StorageAdapter`, a
versioned schema-migration pipeline runs on load, and documents can be
snapshotted / restored. Additive to the `0.4.x` SDK surface (new exports
only); the document-store internals went async but they aren't part of the
public SDK. (§ 6.5 export-to-React-code is intentionally **not** supported —
see below.)

### Added

- **`StorageAdapter` seam + async document store** (§ 6.2). One async
  interface (`readIndex` / `writeIndex` / `readDocument` / `writeDocument`
  / `deleteDocument` / `estimateUsage`, optional `init` + version
  methods) the editor talks to. The document store went sync → async over
  it (the index stays in synchronous Zustand state for the UI; blob I/O is
  async). SDK: `setStorageAdapter`, `getStorageAdapter`, the
  `StorageAdapter` / `DocumentIndex` / `DocumentSummary` / `DocumentVersion`
  / `StorageUsage` / `WriteResult` / `EditorDocument` types.
- **IndexedDB default backend** (§ 6.1). `IndexedDBStorageAdapter` lifts
  the ~100-document localStorage ceiling (IDB has hundreds of MB). Falls
  back to a localStorage adapter when IDB is unavailable (private mode).
  On first boot it imports any existing localStorage documents into IDB.
  `estimateUsage` reads the real quota via `navigator.storage.estimate()`.
- **Cross-tab sync via BroadcastChannel** (§ 6.2). Replaces the
  localStorage `storage` event (which is silent on IDB); concurrent-edit
  detection now works regardless of backend.
- **Versioned schema-migration pipeline** (§ 6.4). The envelope `version`
  is a monotonic integer; ordered `up()` steps run for every version above
  the stamped one, then re-stamp. The Phase 6 / 7 / 10 content migrations
  are folded into step 2. One-way (no `down`).
- **Document versioning** (§ 6.3). Auto-snapshot on every save
  (ring-buffered, last 20 per document) plus labeled manual save points
  (exempt from eviction); restore any version from the document menu
  (snapshots current first so restore is undoable). Stored via the
  adapter's optional version methods; the UI hides itself when the adapter
  doesn't support them.

### Not supported (out of scope)

- **Export to React code** (§ 6.5) is **not** a feature of this library and
  won't be added. The library is a runtime, adapter-pluggable editor +
  document model: documents are data (JSON) rendered live by the chosen
  adapter. Emitting framework source code is a different product (a
  design-to-code generator) that would duplicate every adapter component as
  drifting string templates — out of step with the library's intent. A
  prototype was built during Phase 14 and removed. Portability stays
  through JSON export / import / share-by-URL and embedding `<Editor />`.

### Changed

- `documentSchema.version` widened from `z.literal(1)` to `z.number().int()`
  so the migration pipeline can stamp newer versions; `0.4.x` documents
  (version 1) validate and migrate forward on load. New writes stamp
  `CURRENT_DOCUMENT_VERSION`.
- The document store's blob operations (`loadActiveDocument`,
  `duplicateDocument`, `saveActiveDocument`) and the document-switcher /
  version-history hooks are now async. These are internal modules, not part
  of `@crafted-design/editor/sdk`.

### Bundle

Measured at `0.5.0` (`npm run build`, no minification, with sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/assets/index-*.js` | 621 KB | 187 KB |
| `dist/assets/index-*.css` | 311 KB | 40 KB |

Delta vs `0.4.0`: ~+13 KB raw JS / +3 KB gzipped (the IndexedDB adapter,
migration pipeline, and versioning). No external dependency added at
runtime — `fake-indexeddb` is a devDependency for the adapter contract
tests only.

## [0.4.0] — 2026-05-30

Phase 13 — Component breadth (Section 5). 28 new canonicals across seven
groups (layout primitives, data display, navigation, overlays, feedback,
time, media), each rendered in both the shadcn and MUI adapters. All
additive; no breaking changes to the `0.3.x` SDK surface (new canonicals,
two new SDK helpers, one new hook).

### Added

**Layout primitives** (§ 5.5) — `Grid`, `Container`, `Spacer`, `Section`.
Grid is a Pattern A canvas with a column-count + gap; Container caps and
centers content; Spacer is a fixed-size strut; Section is a semantic
`<section>` wrapper.

**Data display** (§ 5.1) — `Table` (+ `TableRow` / `TableCell` as
slot-component canonicals), `DataList` (+ `DataListItem`), `Code`,
`Skeleton`. Table is a Pattern B dynamic-canvas with per-cell drop zones,
column/row resize, and a Cell-merge inspector panel. Code is a static
preview (syntax highlighting is queued — see Stretch). Skeleton ships
text / rectangle / circle variants.

**Navigation** (§ 5.2) — `Breadcrumb`, `Pagination`, `NavMenu`,
`NavItem`, `Stepper`. Each adapter renders its native primitive (MUI uses
`Breadcrumbs` / `Pagination` / `List` / `Stepper`). Stepper is a Pattern
B dynamic-canvas — one content canvas per step — with an Active-step
navigator panel bounded by `steps.length`.

**Overlays** (§ 5.3) — `Modal`, `Drawer`, `Toast`, `Tooltip`, `Popover`.
Overlays don't appear in the toolbox; they're attached to a triggering
component (Button + Icon / Avatar / Badge / Image / Link / NavItem /
Card) via right-click **Attach overlay**. In editing mode each overlay
portals a preview into a right-side **Overlay Stage**; at runtime it
falls back to the library's real primitive (Radix / MUI Dialog, Drawer,
Snackbar, Tooltip, Popover). Modal / Drawer / Toast / Alert use a
click-toggle model backed by an overlay runtime store; Tooltip / Popover
use the library's native hover / click-wrap behavior anchored to the
trigger. A `PreviewToggle` in the top bar flips Craft's
`state.options.enabled` so designers can sanity-check runtime behavior in
place.

**Feedback** (§ 5.4) — `Progress` (linear / circular, determinate),
`Spinner` (indeterminate). shadcn uses Radix Progress + an SVG arc /
lucide `Loader2`; MUI uses `LinearProgress` / `CircularProgress`.

**Time** (§ 5.6) — `DatePicker`, `TimePicker`, `DateRangePicker`. Native
`<input type="date|time">` across both adapters (no date-library
dependency). `readOnly` in editor mode, dropped at runtime so the native
picker opens. Rich calendar popovers are queued (see Stretch).

**Media** (§ 5.7) — `Video`, `Audio`, `Carousel`. Video / Audio wrap the
native players (MUI re-exports the shadcn impls). Carousel is a Pattern B
dynamic-canvas: one canvas per slide, hover-reveal chevrons with
dedicated `prevButton` / `nextButton` style slots, transparent floating
dot navigation, `showChevrons` / `showDots` toggles, and a flex-fill drop
zone that grows with the carousel's resized height.

**SDK surface** (`@crafted-design/editor/sdk`)
- `useIsEditing()` — true when Craft's `state.options.enabled` is set.
  Overlay-style canonicals branch their render on this (inline + open in
  the editor, real overlay at runtime). Documented adapter contract.
- `slideSlotKeys` / `SLIDE_SLOT_PREFIX` and the `CarouselProps` type —
  the Carousel dynamic-canvas helper, parallel to the existing
  `tabSlotKeys`, for third-party adapters building a custom Carousel.

### Changed

- **Inspector field rendering.** `PropField` now unwraps `ZodDefault` /
  `ZodOptional` before dispatching, fixing an "unsupported Zod kind" badge
  on schemas with defaulted fields (Tabs had the same latent bug).
  `ObjectField` hides `id` fields declared as `ZodDefault` (the stable
  slot-key convention used by Tabs / Carousel) so they aren't editable.
  `PropsPanel` humanizes field labels (`currentSlide` → "Current slide");
  `PanelRow`'s label column widened and wraps so long labels don't
  overflow.
- Several display / media / navigation canonicals gained a `triggers`
  array (overlay trigger linking) and opt the OverlayTriggers panel in.

### Bundle

Measured at `0.4.0` (`npm run build`, no minification, with sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/assets/index-*.js` | 608 KB | 184 KB |
| `dist/assets/index-*.css` | 311 KB | 40 KB |

Delta vs `0.3.0`: ~+5 KB raw JS / +1 KB gzipped despite 28 new canonicals
× 2 adapters — the per-component files tree-shake well and most lean on
existing shadcn / MUI primitives already in the graph. CSS grew ~+3 KB raw
from the new canonicals' default classes.

## [0.3.0] — 2026-05-28

Phase 12 — Style depth. The breakpoint × state matrix, transforms /
filters / transitions panels, background images, token-driven themes with
a visual editor + per-theme dark mode, a CSS-variable color source with
WCAG contrast checking, font upload + curated fonts, and an optional
build-time safelist plugin. All additive; no breaking changes to the
`0.2.x` SDK surface (new optional fields on `NodeStyle` and `EditorDocument`
default cleanly for older documents).

### Added

- **Pseudo-class states — full breakpoint × state matrix** (§ 4.2). A
  `StateBar` (Default / Hover / Focus / Active) pairs with the
  `ResponsiveBar`; every style panel reads/writes the active
  (breakpoint × state) quadrant. Four new optional `NodeStyle` buckets
  (`states`, `stateResponsive`, `stateInline`, `stateResponsiveInline`)
  routed through a central `dimensions.ts` dispatch; responsive +
  responsive-inline composition emit `<state>:` / `<bp>:<state>:`
  prefixed classes and promoted `.cls:hover` rules. The selected node
  previews the non-base state on the canvas. `editorStore.activeState`.
- **Transforms / Filters / Transitions panels** (§ 4.3, 4.4, 4.5).
  Composed inline `transform` / `filter` function lists (`cssFunctions.ts`,
  balanced-paren parser) and four `transition-*` longhands, edited via a
  new `FlexibleSelect` (dropdown preset **or** custom value). Filters owns
  `blur` (moved from Effects — `filter` is one property).
- **Background images** (§ 4.6). Inline `background-image: url(…)` +
  repeat / size / position longhands in the Appearance panel. Coexists
  with a solid color; mutually exclusive with a gradient.
- **Token-driven themes + 5 built-ins** (§ 4.11, 4.12). `registerTheme`
  accepts a small `tokens` map; `deriveTokens` fills the full shadcn core
  set and a `[data-theme]` block is generated + injected. New built-ins:
  green, blue, slate, zinc, neutral (7 total). SDK: `ThemeTokens`,
  `ThemeInput`, `ColorScheme`, `deriveTokens`, `themeTokensToCss`.
- **Visual theme editor** (§ 4.10). Modal launched from the top bar:
  per-scheme base-color fields with an OKLCH L/C/H slider picker, live
  preview (in-modal + on the canvas via a transient theme), save via the
  token API, Copy / Download CSS.
- **Per-theme dark mode** (§ 4.13). Themes declare `darkTokens`; a
  `.dark[data-theme]` block is emitted. `colorMode` (light / dark /
  system) in `editorStore`, **persisted in the document**;
  `useEffectiveColorScheme` resolves `system` via `prefers-color-scheme`;
  a `ColorModeToggle` in the top bar.
- **CSS-variable color source** (§ 4.9). `EditorColorVariablesProvider` /
  `useColorVariables` (SDK) let hosts surface their own CSS custom
  properties in the ColorPicker; picking writes `var(--name)`.
- **Color-contrast checking** (§ 4.14). A live AA / AAA / Fail badge under
  the Typography color row; pure `contrastRatio` / `contrastGrade` +
  OKLCH→sRGB conversion so token / variable colors resolve.
- **Font upload + curated fonts** (§ 4.15). A "Fonts" inspector panel
  (drag-drop / pick → name → register) routing storage through the image
  provider. `registerSystemFonts` (OS stacks) and `registerGoogleFonts`
  (popular web fonts via one combined CDN `<link>`) exposed from the SDK.
- **Optional safelist Vite plugin** (§ 4.1). `@crafted-design/editor/vite-plugin`
  → `craftedDocumentSafelist({ documents, outFile })` scans saved
  documents and emits `@source inline(…)` for their arbitrary values.
  Opt-in; runtime `<style>` injection stays the zero-config default.

### Changed

- `NodeStyle` gains four optional state buckets; `EditorDocument` gains an
  optional `colorMode`. Both default cleanly for `0.2.x` documents.
- The Filters panel owns `blur` (relocated from Effects).
- Inspector rows (`PanelRow`) gained `min-w-0` to stop horizontal overflow
  from the new flexible-value controls.

### Bundle

Measured at `0.3.0` (`npm run build`, no minification, with sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/assets/index-*.js` | 603 KB | 182 KB |
| `dist/assets/index-*.css` | 308 KB | 39 KB |

Delta vs `0.2.0`: ~+25 KB raw JS / +9 KB gzipped (the Phase 12 panels,
theme editor, contrast + oklch math). CSS grew ~+87 KB raw / +11 KB
gzipped — the safelist now carries `hover:` / `focus:` / `active:` state
prefixes across the utility families. Hosts that want to trim this adopt
the optional safelist Vite plugin (§ 4.1) to ship per-document usage only.

## [0.2.0] — 2026-05-27

Phase 11 — Designer UX. Multi-select, a layer tree, inline text editing,
alignment guides, discoverability surfaces, and a pluggable image
backend. All additive; no breaking changes to the `0.1.x` SDK surface.

### Added

- **Undo/redo grouping + clipboard + context menu** (§ 3.1, 3.2, 3.12).
  `useThrottledHistory` coalesces a gesture into one undo step. Internal
  clipboard with Cmd/Ctrl+C/X/V/D and a right-click `NodeContextMenu`
  (Cut/Copy/Paste/Duplicate/Wrap/Delete). `editorStore.clipboard`.
- **Multi-select + Inspector breadcrumbs** (§ 3.3, 3.5).
  `editorStore.selection: string[]`; Cmd/Ctrl-click toggles, Shift-click
  range-extends within a parent. Style panels merge values across the
  selection with a "— Mixed" indicator (`useNodeClassesMulti`, exposed
  via the SDK). `InspectorBreadcrumbs` walks the ancestor chain.
  Multi-delete is one undo step. Secondary selections get dashed
  outlines.
- **Layer tree** (§ 3.4). A `Layers` tab in the left aside (toggles with
  `Components`; choice persisted). Click / Cmd-click to select,
  chevron-collapse, HTML5 drag-reorder with above/below/inside drop
  zones and cycle prevention. Virtualizes past 50 visible rows
  (`@tanstack/react-virtual`).
- **Inline text editing** (§ 3.11). Double-click Text / Heading / Button
  to edit in place (`contenteditable="plaintext-only"`); Enter commits
  single-line, multiline preserves newlines, Escape reverts. Public
  `EditableText` + `useStartTextEdit` for adapter authors;
  `editorStore.editingTextNode`.
- **Alignment guides on drag** (§ 3.6, visual-only v1). Figma-style red
  guide lines when a dragged node's edges align with a sibling's
  (4px threshold, ≤2 lines). Alt bypasses; suppressed inside
  multi-canvas slots. Drop still commits via Craft's insertion-index
  move — coordinate snap deferred to a future phase.
- **Discoverability** (§ 3.7, 3.8, 3.9). Empty-canvas hint with a
  template CTA; 4-step onboarding tour (localStorage-dismissed,
  replayable from the document menu); Cmd/Ctrl+F canvas search that
  filters by displayName / tags / text props and cycles matches.
- **Asset library / image upload** (§ 3.10). `EditorImageProvider`
  context + `useEditorImageProvider()` hook (SDK) let hosts route
  uploads to their own backend; default provider inlines base64 and
  remembers session uploads. The Image `src` field gets an
  `ImagePicker` (URL / Upload / Library modal); host-gated
  `AssetLibraryPanel` browses + inserts.
- **Reduced motion** (§ 3.14). Global `prefers-reduced-motion` rule
  zeroes transitions / animations / smooth-scroll across the chrome.

### Changed

- Stack's default style now includes `min-h-16 p-4 border-dashed …` so a
  freshly-dropped empty Stack is a visible, droppable zone (was 0px).
- Selection writes go through `editorStore` synchronously (flushSync)
  alongside `actions.selectNode`, eliminating a one-frame lag on
  layer-tree clicks, keyboard arrow-nav, and search jumps.
- `PanelDefinition.component` now also receives `nodeIds` (the full
  selection) so panels can opt into multi-mode. Existing single-node
  panels are unaffected.

### Bundle

Measured at `0.2.0` (`npm run build`, no minification, with sourcemap):

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/assets/index-*.js` | 578 KB | 173 KB |
| `dist/assets/index-*.css` | 221 KB | 28 KB |

Delta vs `0.1.x`: roughly +60 KB raw JS / +16 KB gzipped — the bulk is
`@tanstack/react-virtual` (layer-tree virtualization) plus the Phase 11
feature surface itself. CSS grew ~3 KB for the new safelist entries.

## Deprecation policy

When an exported API is renamed or about to be removed:

1. The deprecated form stays exported for **at least one minor version**.
2. It calls `deprecate(api, sinceVersion, migration)` on first use per session per call site. The console message includes the migration step.
3. The new form is documented in the same section of `SDK_GUIDE.md` with a "Was previously…" note linking back to the old name.
4. Removal lands in the next major version. The CHANGELOG's "Removed" subsection lists every previously-deprecated export that's gone.

The first round-trip — from deprecation warning to removal — will happen between `0.1.0` and `1.0.0`. There are no current deprecations to migrate from `0.x`.

## Earlier phases (pre-public history)

For context, the pre-public phase plans are in `docs/plans/PHASE1_PLAN.md` through `docs/plans/PHASE9_PLAN.md`. The Phase 9 close-out summarises all reliability work that ships in `0.1.0`. From `0.1.0` onward, this CHANGELOG is the public record; phase plans remain in-repo as internal documentation.
