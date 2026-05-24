# Phase 6 — Editor polish + Plugin SDK

**Status:** planned
**Timeline target:** 5–8 weeks
**Audience for delivered build:** external developers (SDK consumers)

## Goal

Two interlocking outcomes:

1. **Close every Phase 5 deferred item** so the editor stops feeling "almost done." A designer dropping in for the first time should not hit a "ZodArray not supported" badge, a Select dropdown that flaps open in editor mode, a Card whose footer is a string, or a hex picker that quietly switches to base-only at the `md` breakpoint.
2. **Stabilize the plugin SDK surface** so an external developer can author their own adapter, canonical, or inspector panel by reading docs and writing code — without grepping internal modules. The architectural promise from Phase 1 (Layer 3 = pluggable adapter SDK) becomes real here.

Phase 6 ends with: a `Chakra` adapter shipped as a worked tutorial example, written entirely against `@design/sdk` re-exports with no internal imports.

## Exit criteria

- All four Phase 5 deferred items shipped or explicitly punted with a written-down reason. No silent gaps.
- `src/sdk/` exports a documented surface that's sufficient for adapter / canonical / panel authoring. Every export has JSDoc.
- A Chakra adapter exists in `examples/adapter-chakra/` (separate folder, not in `src/adapters/`) and integrates via the SDK only. The editor's adapter switcher gains a `Chakra` option that works.
- `docs/SDK_GUIDE.md` exists with a reference for every public type and registration function.
- Three tutorial docs exist: `TUTORIAL_ADAPTER.md`, `TUTORIAL_CANONICAL.md`, `TUTORIAL_PANEL.md`. Each ships a runnable example.
- `tsc -b` clean, tests pass (existing 48 plus new tests for ZodArray editor, multi-canvas slots, responsive arbitrary inline CSS generation, undo/redo button wiring, SDK boundary lint).
- A `dist-sdk` build target exists (even if not published to npm) that produces clean .d.ts files for SDK consumers.

## Valves (cut scope as you go)

| Valve | Triggers if… | What gets cut |
|---|---|---|
| **V1** | Multi-canvas refactor breaks more than it fixes after one week | Ship Card with header/footer as **single** canvas (just `body`); leave footer/header as props. Tabs stays props-driven. |
| **V2** | Per-document safelist Vite plugin gets gnarly | Ship "expanded safelist" only — pre-generate `bg-[#hex]` for a fixed palette of 64 colors at all breakpoints. No truly arbitrary responsive. |
| **V3** | Panel registration API requires deep Inspector rewrites | Ship adapters + canonicals in SDK; document panel authoring as Phase 7 work. |
| **V4** | Undo/redo UI surfacing reveals Craft.js history bugs | Ship keyboard shortcuts only (Cmd+Z / Cmd+Shift+Z); no toolbar buttons. |

---

## Plan

Nine groups, ordered for dependency: polish first (so the SDK examples have a clean editor to demo against), SDK second.

### Group A — ZodArray editor in PropsPanel (Week 1)

**Why first:** unblocks editing `tabs` / `options` props in Select / Radio / Tabs without needing the multi-canvas refactor. Low-risk, high-visibility win.

**Files touched**
- `src/editor/inspector/PropsPanel.tsx` — add `ZodArray` case.
- `src/editor/inspector/fields/ArrayField.tsx` (new) — extracted recursive renderer for array items.
- `src/editor/inspector/fields/ObjectField.tsx` (new) — extracted recursive renderer for `z.object` element types.

**Behavior**
- For `z.array(z.object({...}))`: render a stacked list of items. Each item is a collapsible card containing recursive field renderers for the object's sub-schema. "+" button at the bottom appends a new item (using `safeParse({})` defaults if available, else empty object). "↑ / ↓ / 🗑" controls per item.
- For `z.array(scalar)`: render a list of plain inputs with the same controls. Lower-priority — only ship if free.
- Scope cap: no nested `z.array(z.array(...))`. Renders "unsupported deep nesting" badge.

**Tests**
- `src/editor/inspector/fields/array-field.test.tsx` — render + add / remove / reorder, verify `actions.setProp` payloads.

**Exit criteria**
- Drop a Tabs → PropsPanel shows editable list of 3 tabs. Add a 4th. Reorder. Delete one. Refresh — state persists. Add a tab with custom `value`, see it appear in the rendered Tabs.

### Group B — Multi-canvas Card/Tabs slots (Week 2)

**Why second:** depends on a clean PropsPanel for Tabs (built in A) and is the most invasive refactor in the polish bag.

**Architectural change**

The canonical contract gains a per-slot canvas flag. Two options:
- Option 1 (preferred): `styleSlots` stays as `string[]`, add new `canvasSlots: readonly string[]` field on `CanonicalComponent`.
- Option 2: replace `styleSlots: string[]` with `slots: { name: string; canvas?: boolean }[]`. More expressive but more migration.

Option 1 ships. Backwards-compatible (existing canonicals: `canvasSlots: ['root']` if `isCanvas: true`, otherwise `[]`).

`CanonicalNode.tsx` changes:
- When `def.canvasSlots.length > 1`, generate one `<Element canvas id={slot}>` wrapper per canvas slot.
- Pass `slotChildren: Record<slot, ReactNode>` to the adapter impl (alongside existing `children` for back-compat with single-canvas impls).
- Single-canvas impls keep working: `children` is still populated, equal to `slotChildren[firstCanvasSlot]` when there's exactly one canvas.

`AdapterRenderProps`:
- Add `slotChildren?: Record<string, ReactNode>`.

`Card` impl:
- Header / footer become canvases. The `title` / `description` / `footerText` props go away. Drop a Text canonical into the header.
- `body` stays canvas.

`Tabs` impl:
- Each tab gets its own canvas. The `tabs` prop's `content` field goes away — it becomes a canvas keyed by tab value.
- The number of canvases is dynamic, driven by `props.tabs`. Add/remove a tab → corresponding canvas added/removed.

**Migration**
- Existing documents with the old Card/Tabs shape are migrated on load: pre-existing string title/description/footerText/content are dropped into newly-created child Text canonicals.
- Migration code lives in `src/persistence/migrations.ts` (new file).

**Tests**
- `src/craft/multi-canvas.test.ts` — verify CanonicalNode produces N canvas wrappers for N-canvas canonicals.
- `src/persistence/migrations.test.ts` — old-shape Card → new-shape verification.

**Exit criteria**
- Drop a Card → can drop Text into header, body, and footer independently. Each is a real drop zone.
- Drop a Tabs → click any tab → drop a Button into that tab's content area → switch tabs → button persists per-tab.
- Load a Phase 5 document → renders correctly via migration.

### Group C — Per-doc responsive arbitrary inline (Week 3)

**Why third:** the most engineering-heavy item. Unblocks the visual fidelity story for design-conscious users.

**Architecture**

Today: `style.inline[slot][cssProperty] = value` is applied at base breakpoint only via `composeInlineStyle`. At `md/lg`, arbitrary inline is silently ignored.

Phase 6 approach: **runtime per-node `<style>` injection**, not a Vite-time safelist.

For each node with `style.responsiveInline?.[bp]?.[slot]?.[cssProp]` entries:
- CanonicalNode generates a unique class id per node (e.g., `node-<short-hash>`).
- A scoped `<style>` block is injected with media-queried rules:
  ```css
  @media (min-width: 768px) { .node-abc123 { background-color: #ff00ff } }
  ```
- The class id is added to the element's className.

This avoids the Tailwind safelist problem entirely. The cost: each node potentially gets a `<style>` tag. We collect them into a single `<style>` element managed by a top-level `<ResponsiveInlineStyles>` provider rather than scattering throughout the tree.

**Files touched**
- `src/style/responsive-inline.ts` (new) — generators for the scoped CSS.
- `src/style/ResponsiveInlineStyles.tsx` (new) — provider + collected style element.
- `src/registry/types.ts` — extend `NodeStyle.inline` to support per-breakpoint entries: `inline?: Record<string, Record<string, Record<string, string>>>` (slot → bp → cssProp → value). Or add a sibling `responsiveInline` field.
- Inspector — unlock the "arbitrary" toggle at non-base breakpoints. Remove the Phase 4.5 restriction.

**Tests**
- `src/style/responsive-inline.test.ts` — verify CSS generation, unique class id allocation, no collisions.

**Exit criteria**
- Set `bg-[#ff0000]` at base, `bg-[#00ff00]` at `md`. Resize viewport across the breakpoint — color changes. Save and reload — persistence works.
- Run `tsc -b`, no errors. No new console warnings.

### Group D — Polish bundle (Week 3, parallel to C)

Three independent items that share no architecture. Ship in parallel with Group C.

**D.1 — Drag-resize handles**
- New file: `src/editor/canvas/ResizeHandles.tsx`.
- Renders 8 handle dots on the selected node's bounding box.
- Dragging a handle updates `style.inline[slot].width` / `.height` with px values.
- Snap-to-token: if the resulting size is within 4px of a Tailwind size token, snap to the token class instead of inline px (round-trip clarity).

**D.2 — Undo/redo UI**
- Toolbar buttons in `src/editor/Toolbar.tsx` (or wherever the existing toolbar lives).
- Wired to `useEditor().actions.history.undo()` / `.redo()`.
- Keyboard shortcuts: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z.
- Buttons show disabled state when `canUndo` / `canRedo` is false (from `useEditor` collector).

**D.3 — Select dropdown click-block in editor mode**
- `src/adapters/shadcn/components/Select.tsx`: wrap the `<SelectTrigger>` in a `<div>` with `pointer-events: none` *inside* the trigger only — keeps the trigger clickable for selection (Craft node selection) but blocks the dropdown popup.
- Approach: render `<Select open={false} onOpenChange={() => {}}>` to force closed state.

**Exit criteria**
- Drag a handle on a Box → it resizes. Release → tokens snap if close.
- Click undo → previous node state restored. Cmd+Z works.
- Click a Select trigger in editor mode → no dropdown opens.

### Group E — SDK package boundary (Week 4)

**Why now:** polish work is done; the editor's polished, so the SDK examples will look good.

**Architecture**

Create `src/sdk/` as the public boundary. Everything outside `src/sdk/` is internal — SDK consumers must not import it.

```
src/sdk/
  index.ts                # main entry (re-exports)
  adapter.ts              # Adapter contract types
  canonical.ts            # Canonical registration types
  panel.ts                # Panel registration types (Group G)
  style.ts                # NodeStyle, ClassMapResult
  hooks.ts                # useNodeProps, useNodeStyle, useNodeClasses (for panel authors)
```

`package.json`:
```jsonc
{
  "exports": {
    ".": "./src/main.tsx",
    "./sdk": "./src/sdk/index.ts"
  }
}
```

Self-dogfood: existing in-tree adapters (shadcn, mui) refactor to import from `@design/sdk` paths. The internal Adapter/Canonical types in `src/adapters/types.ts` and `src/registry/types.ts` get re-exported from `src/sdk/*` and the originals become re-exports of the SDK types (single source of truth — SDK is canonical).

**Lint check**
- Add an ESLint rule (`no-restricted-imports`) that any file inside `examples/` cannot import from `../src/` except via `@design/sdk`. Wire into CI.

**JSDoc pass**
- Every export from `src/sdk/*` gets a JSDoc with usage example. Phase 6 SDK doc generator (`typedoc`) reads these.

**Tests**
- `src/sdk/boundary.test.ts` — programmatic check that `src/sdk/index.ts`'s exports include the expected names. Catches accidental removal.

**Exit criteria**
- Both shadcn and mui adapters import only from `@design/sdk`. No regressions.
- Adding `@design/sdk` to a new file and importing `registerAdapter` works.

### Group F — Canonical registration in SDK (Week 5)

Add `registerCanonical()` (rename from `registerComponent` — old name kept as deprecated alias for one phase). Export from `@design/sdk/canonical`.

Add post-mount registration warning: if a canonical is registered after the editor has rendered, log a warning recommending reload. (Hot reload remains a Phase 7+ item — we'd need to invalidate Craft's resolver.)

Add `unregisterCanonical(id)` for symmetry. Used by examples that want to override defaults.

**Tests**
- `src/registry/lifecycle.test.ts` — register / unregister / re-register flows.

**Exit criteria**
- `@design/sdk` re-export of `registerCanonical` works. The shadcn / mui in-tree adapters' calls to `registerComponent` are renamed (or aliased).

### Group G — Panel registration in SDK (Week 6)

The trickiest SDK item. Today panels are statically wired in `Inspector.tsx`. To make them pluggable:

**API surface**
```ts
interface PanelDefinition {
  id: string                                // 'layout' | 'spacing' | ...custom
  displayName: string                       // 'Layout'
  order: number                             // for sorting; built-ins use 0/10/20/...
  applicableTo: (def: CanonicalComponent) => boolean
  component: ComponentType<{ nodeId: string; slot: string }>
}
function registerPanel(panel: PanelDefinition): void
function unregisterPanel(id: string): void
```

`Inspector.tsx` reads from the panel registry, filters by `applicableTo`, sorts by `order`, renders each via `<panel.component nodeId={...} slot={activeSlot} />`.

The 6 existing panels (Layout / Size / Spacing / Typography / Appearance / Effects) are converted to `registerPanel({...})` calls at module load — they become the "built-in" pack.

`hooks.ts` exports the helpers panel authors need:
- `useNodeProps(nodeId)` — read current props
- `useNodeStyle(nodeId)` — read current NodeStyle
- `useSetNodeProp(nodeId)` — setter via Craft `setProp`
- `useNodeClasses(nodeId, slot)` — existing hook, now SDK-exported

**Tests**
- `src/editor/inspector/panel-registry.test.tsx` — register / unregister, applicableTo filtering, order sorting.

**Exit criteria**
- Replace one built-in panel by registering a custom one with the same `id`. Works.
- Add a brand-new panel (e.g., "Notes") that applies to all canonicals. Renders.

**Valve V3 trigger:** if any of the 6 built-in panels needs a deep refactor to fit the registration shape, pull Group G and document the panel registration API as Phase 7.

### Group H — Chakra adapter example + tutorials (Week 7)

**examples/adapter-chakra/** (new directory at repo root, sibling to `src/`)

A standalone folder, not in `src/adapters/`. It imports only from `@design/sdk` — proves the boundary works.

Files:
- `examples/adapter-chakra/index.ts` — `registerAdapter({...})`
- `examples/adapter-chakra/Wrapper.tsx` — `<ChakraProvider>` wrapper
- `examples/adapter-chakra/components/*.tsx` — Chakra impls for the 20 canonicals (or a subset documented as "MVP")
- `examples/adapter-chakra/README.md` — how to plug into your editor

The editor's main app adds a one-line conditional import to register the example adapter in dev mode, demonstrating the integration path.

**Tutorial docs**
- `docs/SDK_GUIDE.md` — reference: every type and function in `@design/sdk`, with usage example.
- `docs/TUTORIAL_ADAPTER.md` — walks through the Chakra adapter step-by-step. Frame: "add a third adapter to the editor in 30 minutes."
- `docs/TUTORIAL_CANONICAL.md` — walks through adding a new canonical (Stepper). Shows: canonical definition, adapter impl, defaults, panel applicability.
- `docs/TUTORIAL_PANEL.md` — walks through adding a custom panel (e.g., "Notes" — free-text per-node annotations stored in `props.__notes`).

**Exit criteria**
- The Chakra adapter renders the 20 canonicals (or documented-MVP subset) in the editor.
- A reader following `TUTORIAL_ADAPTER.md` can produce a working adapter end-to-end. (Verify with a Sonnet 4.6 subagent: run the tutorial as if from scratch, report which step is unclear.)

### Group I — Verification + close-out (Week 8)

- Exit-criteria checklist walkthrough.
- Run all tests on a clean install.
- Build `dist-sdk` target — verify `.d.ts` outputs are clean.
- Cross-test: swap between shadcn, MUI, and Chakra adapters on a 20-canonical document. No flicker, no missing impls.
- Update `docs/ARCHITECTURE.md`:
  - Add "Layer 3 — public SDK boundary" section.
  - Mention multi-canvas slot support.
  - Mention runtime responsive-inline `<style>` injection.
- Append close-out section to this file: which valves pulled, what slipped.

---

## Out of scope (Phase 6)

| Feature | Phase |
|---|---|
| Hot canonical reload | Phase 7 — requires Craft resolver invalidation |
| Drag-and-drop reorder of ZodArray items (vs. ↑/↓ buttons) | Phase 7 |
| HSL / RGB sliders, eyedropper, gradients in color picker | Phase 7 |
| Document import/export, named documents, share links | Phase 7 |
| Templates / starter documents | Phase 7 |
| Published `@design/sdk` npm package | Phase 7+ |
| `dist` production build of the editor itself | Phase 7+ |
| Per-document Tailwind safelist (Vite-time, not runtime) | Phase 8+ |
| React 19 upgrade | Phase 7+ |
| Plugin marketplace UI | Far future |

---

## Risks specific to Phase 6

1. **Multi-canvas migration is one-shot and unforgiving.** A user with a saved Phase 5 Card document expects to open it and see the same thing. Migration code (`src/persistence/migrations.ts`) must be exhaustive. Test: load every Phase 5 sample document, verify nothing visually shifts. If a migration drops content silently, the user has no recourse. **Mitigation:** version the document envelope and refuse to load mismatched-version documents in production — fail loud rather than corrupt silently.

2. **Runtime per-node `<style>` injection collides with React reconciliation.** A naive implementation re-renders the global style block on every selection change. **Mitigation:** memoize and use stable class ids derived from `style` content hashes, not node ids. Verify with React Profiler that `<ResponsiveInlineStyles>` renders are bounded.

3. **SDK boundary is mostly social, not technical.** Even with a lint rule, internal-import temptation is high during refactors. **Mitigation:** the lint rule catches it in CI; review every PR through "would an SDK consumer be able to do this?" lens.

4. **Panel registration is a public-API decision that's hard to revisit.** Once external panels exist, the props the panel component receives are locked-in. Spend time on the API design upfront. **Mitigation:** stage the rollout — first move all built-ins to use `registerPanel()` internally (no external use), let them simmer a week, then open up the SDK export. Catches mistakes before users see them.

5. **Chakra adapter doubles compile time.** Adding 20 more components is a real chunk. **Mitigation:** ship the example with an MVP subset (5-10 canonicals); tutorial frames it as "extend from here." Don't gate Phase 6 on 20/20 Chakra coverage.

6. **Phase 6 timeline.** 5–8 weeks is aggressive for this scope. If a valve gets pulled in week 3, that's the budget working as designed. Schedule a hard mid-Phase review at end of Group D — if any of A–D slipped, pull V3 (drop panel registration).

7. **Documentation maintenance.** Three tutorial docs + a reference + ARCHITECTURE.md update is a lot to keep accurate as code shifts. **Mitigation:** snapshot-test code samples in tutorials by literally `pnpm exec ts-node` them in CI.

---

## Definition of done

Exit-criteria checklist passes. `examples/adapter-chakra/` works end-to-end. SDK docs are accurate. Close-out section in this file records which valves were pulled and any items that slipped to Phase 7. Phase 7 (lifecycle: docs / import-export / templates / color depth) is unblocked.

---

## Close-out (2026-05-24)

### Status: Complete

All 9 groups (A–I) shipped. `tsc -b` clean, **101 tests pass** (up from 48 at end of Phase 5 — 53 new tests across the new modules).

### Group-by-group summary

- **A — ZodArray editor**: PropsPanel handles `z.array(z.object/scalar)` with add / remove / reorder. Recursive `PropField` dispatcher extracted from `PropsPanel.tsx`; ZodObject case also added for nested fields. Nested arrays (`z.array(z.array)`) render an "unsupported deep nesting" badge.
- **B — Multi-canvas Card** (partial V1 pull): Card's `canvasSlots: ['header','body','footer']` ships; Tabs stays props-driven. Dynamic-canvas Tabs deferred to Phase 7 because the count varies with `props.tabs.length` and requires linked-node-id management — different complexity class. Migration drops Phase-5 Card props (title/description/showFooter/footerText) and flips persisted `isCanvas: true` on Card nodes to false.
- **C — Responsive arbitrary inline**: per-slot CSS class generation via content hash + `@media` rules, rendered as `<style>` inline next to the impl. When a slot has any responsive entry, base inline is promoted into the class so specificity doesn't beat the `@media` rule. All `arbitraryDisabledHint` / `hexDisabledHint` plumbing removed — arbitrary works at every breakpoint.
- **D — Polish bundle**: Select dropdown click-blocked in editor mode (`open={false}`). Undo/redo toolbar buttons + Cmd/Ctrl+Z & Cmd/Ctrl+Shift+Z global shortcuts (skipped when target is an editable element). Drag-resize implemented as an explicit "Resize" toggle in the Inspector that activates native CSS `resize: both` + outline; toggling off captures rendered px and writes to `style.inline.root`.
- **E — SDK boundary**: `src/sdk/{adapter,canonical,style,hooks,panel}.ts` re-exports the public surface. `@design/sdk` path alias wired in tsconfig + vite. Internal adapter `index.ts` files dogfood the alias. Boundary test asserts the 16 expected exports.
- **F — Canonical lifecycle**: `registerCanonical` (alias for `registerComponent`), `unregisterCanonical`, post-mount registration warning flipped by Editor.tsx's useEffect.
- **G — Panel registration**: `PanelDefinition` contract + `registerPanel` / `unregisterPanel` / `listPanels` / `getPanelsFor`. Inspector refactored to render from the registry. All 7 built-ins migrated to `registerPanel` calls in `built-in-panels.ts`.
- **H — Chakra example**: `examples/adapter-chakra/` ships with 5 canonical impls (Box, Heading, Button, Stack, Card) and a mock primitive library (`lib.tsx`) so the example compiles without installing real Chakra. README explains how to swap for `@chakra-ui/react`. Auto-loaded from App.tsx — adapter switcher gains a third option. Three tutorial docs (TUTORIAL_ADAPTER, TUTORIAL_CANONICAL, TUTORIAL_PANEL) + SDK_GUIDE reference all shipped.
- **I — Verification**: coverage script confirms 20/20 canonicals registered, 20/20 in shadcn, 20/20 in MUI, 5/20 in Chakra example (MVP, documented).

### Valves pulled

- **V1 (multi-canvas)** — *partial pull on Tabs only.* Card multi-canvas shipped; Tabs deferred to Phase 7. Card's three fixed slots were tractable; Tabs' dynamic count needed more design work than the week budget afforded.
- **V2, V3, V4** — *not pulled.*

### Deferred to Phase 7

| Item | Reason |
|---|---|
| Tabs multi-canvas (per-tab content as canvas) | Dynamic canvas count tied to `props.tabs.length`; requires linked-node-id management. |
| Hot canonical reload | Requires Craft.js resolver invalidation. Today we warn and ask for a reload. |
| Drag-and-drop reorder of ZodArray items | Currently uses ↑/↓ buttons. |
| Resize handles on canvas overlay (vs. toggle in Inspector) | Avoids the Craft drag-connector conflict; toggle is the simpler MVP. |
| Real Chakra impls + per-document Tailwind safelist | Both intentionally out of scope. |

### Notable Phase 6 design decisions

1. **Pattern B multi-canvas uses an additive `canvasSlots` field.** Existing Pattern A canvases (`isCanvas: true`) keep working unchanged — `canvasSlots` is only consulted when explicitly set. `getCanvasSlots(def)` is the single resolution point.
2. **Responsive arbitrary lives in runtime `<style>` tags, not the safelist.** Per-node hash-keyed class id + inline `<style>` injection. No Vite plugin, no per-document safelist generation. Content hash naturally deduplicates identical styling across nodes.
3. **Drag-resize is a toggle, not always-on.** Mousedown on a native `resize: both` corner would race with Craft's drag connector — the toggle gives clean mode separation. Trade-off: one extra click before resizing.
4. **Panel registry is the new source of truth for inspector composition.** `getApplicablePanels` kept as a legacy helper but Inspector reads via `getPanelsFor`. Canonicals' `applicablePanels` whitelist still wins when set; otherwise each panel's `applicableTo` predicate decides.
5. **Chakra example uses mock primitives.** A real `@chakra-ui/react` install would add ~30MB of node_modules for a documentation artifact. The mock library demonstrates the adapter pattern; README explains how to swap.
6. **The SDK boundary is mostly social.** TypeScript paths + the `src/sdk/` directory help, but discipline-by-convention is the actual enforcement. The boundary test catches accidental export removal; ongoing review catches "would an SDK consumer reach for this?"

### Files added this phase

```
src/editor/inspector/fields/{defaults,defaults.test,PropField,ObjectField,ArrayField}.ts(x)
src/editor/inspector/{ResizeToggle,panel-registry,panel-registry.test,built-in-panels}.ts(x)
src/editor/UndoRedo.tsx
src/persistence/migrations.ts + migrations.test.ts
src/style/responsive-inline.ts + responsive-inline.test.ts
src/sdk/{index,adapter,canonical,style,hooks,panel,boundary.test}.ts
src/registry/registry.test.ts
examples/adapter-chakra/{index.ts,lib.tsx,README.md}
examples/adapter-chakra/components/{Box,Button,Heading,Stack,Card}.tsx
docs/SDK_GUIDE.md
docs/TUTORIAL_{ADAPTER,CANONICAL,PANEL}.md
```

### Files materially changed

```
src/registry/types.ts                  (+canvasSlots, +responsiveInline shape)
src/registry/registry.ts               (+getCanvasSlots, +registerCanonical, +unregisterCanonical, +_markEditorMounted, post-mount warning)
src/adapters/types.ts                  (+slotChildren on AdapterRenderProps)
src/craft/CanonicalNode.tsx            (multi-canvas Element wrappers, per-slot responsive inline CSS generation, <style> injection)
src/editor/Inspector.tsx               (panel-registry-driven render, ResizeToggle mount)
src/editor/Editor.tsx                  (post-mount flag flip)
src/editor/inspector/PropsPanel.tsx    (extracted to fields/PropField, much simpler)
src/editor/inspector/shared/{ColorPicker,NumericInput,BoxSidesEditor}.tsx
                                       (-arbitraryDisabledHint, -hexDisabledHint)
src/editor/inspector/{Appearance,Size,Spacing,Typography}Panel.tsx
                                       (-hexHint, panels now accept slot)
src/editor/inspector/shared/useNodeClasses.ts
                                       (responsiveInline read/write at non-base)
src/editor/SaveLoadBar.tsx             (UndoRedo toolbar slot)
src/registry/components/card.ts        (Pattern B multi-canvas, propsSchema collapsed)
src/adapters/{shadcn,mui}/components/Card.tsx
                                       (consume slotChildren per region)
src/persistence/storage.ts             (load runs migrateDocument)
src/App.tsx                            (+examples/adapter-chakra import, +built-in-panels)
src/index.css                          (+.canvas-slot empty-state styling)
tsconfig.json / tsconfig.app.json / vite.config.ts
                                       (+@design/sdk path alias; +examples include)
```

Phase 7 — the deferred polish bag (Tabs multi-canvas, real Chakra adapter, HSL color picker, document import/export, templates) is unblocked.

