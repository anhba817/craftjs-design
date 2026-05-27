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
