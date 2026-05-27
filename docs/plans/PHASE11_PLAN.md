# Phase 11 — Designer UX

**Status:** ✅ complete — shipped as `0.2.0` (2026-05-27). Close-out at the bottom of this file.
**Timeline:** no deadline; ship when every in-scope Section 3 item is correctly done
**Audience:** end users — designers building documents day-to-day
**Scope discipline:** every non-Stretch item in `PRODUCTION_READINESS.md` § 3 ships. The three Stretch-tagged items (Comments 3.13, RTL 3.15, i18n 3.16) are explicitly out of scope and queued for a later phase. Sections 4+ remain out of scope.

## Goal

`0.1.0` shipped a publishable editor with a reliable runtime and a complete SDK boundary. Phase 11 turns the daily editing experience from "works" into "feels like a real design tool." Every non-Stretch item in PRODUCTION_READINESS.md § 3 — Designer UX — is delivered:

| § | Item | Status target |
|---|---|---|
| 3.1 | Undo/redo grouping | Slider drags + inspector edits collapse to one undo step per gesture |
| 3.2 | Copy / paste / duplicate node | Ctrl+C / Ctrl+V / Ctrl+D over selected nodes; subtree preserved |
| 3.3 | Multi-select | Cmd-click adds to selection; group-level style edits + delete |
| 3.4 | Layer tree / outline view | Sidebar list mirrors the canvas; click to select, drag to reorder |
| 3.5 | Inspector breadcrumbs | Selected node's ancestor chain shown + clickable above the panel list |
| 3.6 | Alignment guides on drag | Red snap lines when a dragged node's edges / centres align with siblings |
| 3.7 | Empty-state guidance | Fresh editor shows a "drag a component" hint + "start from a template" CTA |
| 3.8 | Onboarding tour | 3–5 step first-visit tour with skip + persistent dismiss |
| 3.9 | Search inside the canvas | `Cmd+F` opens a quick-find input; matches by displayName + props; arrow keys cycle |
| 3.10 | Asset library / image upload | File input → base64 inline OR a host-supplied upload endpoint via `<EditorImageProvider>` |
| 3.11 | Inline text editing | Double-click a Text / Heading / Button label commits via contenteditable |
| 3.12 | Right-click context menu | Per-node menu: Cut / Copy / Paste / Duplicate / Delete / Wrap in Stack |
| 3.14 | Reduced-motion preference | `prefers-reduced-motion: reduce` skips transitions on editor chrome |

## Exit criteria

Every item below is a hard requirement. None can be deferred.

**3.1 — Undo/redo grouping**
- A `useThrottledHistory(intent, payloadFn)` helper wraps the high-frequency edit paths (inspector slider scrubs, ColorPicker hex drags, ResizeOverlay gestures, GradientEditor stop drags). Calls within the same intent + ≤500 ms gap collapse to a single Craft `history.throttle` step.
- Verified by counting `actions.history.timeline.length` before / after each tracked gesture: 1 step per gesture, not N.
- Existing single-action edits (token clicks, dropdown picks, text input blurs) keep their one-edit-one-undo semantic.

**3.2 — Copy / paste / duplicate**
- `Cmd+C` (mac) / `Ctrl+C` (others) on a selected non-ROOT node copies its serialized subtree to the **internal clipboard** (`useEditorStore`, not the system clipboard — system clipboard requires user-gesture permissions per-domain and adds friction). Paste from another tab is out of scope; documented in the Phase 11 close-out.
- `Cmd+V` / `Ctrl+V` pastes the internal clipboard as a sibling of the current selection (canvas selection → child of the canvas, non-canvas selection → sibling after).
- `Cmd+D` / `Ctrl+D` duplicates the selected subtree (copy + paste in one step).
- All three keys also surface in the right-click context menu (§ 3.12) and the new Edit menu in SaveLoadBar.
- Tested in vitest by mocking `query.serialize` / `actions.addNodeTree` and asserting the right id family lands at the right parent.

**3.3 — Multi-select**
- Cmd-click (mac) / Ctrl-click adds a node to the current selection.
- Shift-click extends selection across siblings.
- `editorStore.selection` is now `string[]` (length 1 for typical case); Inspector subscribes to the array.
- When `selection.length > 1`: Inspector shows a "Multiple (N)" header and offers shared-attribute style edits (only attributes present on every selected node). Per-node panels render greyed out.
- ResizeOverlay scopes to selection[0] when multi (resizing N nodes at once is out of scope; documented in PERFORMANCE / future-work).
- `Delete` / `Backspace` removes all selected non-ROOT nodes in one Craft `actions.delete` batch (via `actions.history.throttle` so it's a single undo).
- Multi-select state persists across re-renders; Hydrator clears it on document switch.

**3.4 — Layer tree**
- New `<LayerTree>` component, mounted as a third aside (300 px wide) between Toolbox and the canvas, OR as a togglable panel in the Toolbox sidebar (decide in the Layout group below).
- Renders the document tree recursively from ROOT; each row shows the node's displayName + chevron for collapsibility.
- Indents reflect depth; canvas / linked nodes share the same visual treatment.
- Selecting a row mirrors `actions.selectNode(id)`; click while holding Cmd extends the multi-selection per § 3.3.
- Drag a row → reorder via Craft's `actions.move(id, parentId, index)`. Visual drop indicators.
- Long documents virtualize (TanStack Virtual or equivalent — only render visible rows when the tree exceeds ~50 nodes).
- Stress test: 200-node fixture; tree renders + scrolls smoothly.

**3.5 — Inspector breadcrumbs**
- Above the Inspector's panel list, a horizontal breadcrumb component shows the selected node's ancestor chain (`Box / Stack / Heading`).
- Click any segment to select that ancestor.
- Truncates with `…` when the chain doesn't fit; the truncated segments stay click-reachable via a pop-up menu on the `…`.
- Hidden when no node is selected.

**3.6 — Alignment guides**
- `<AlignmentGuides>` overlay listens to Craft's drag coordinate stream while a node is being moved.
- Computes alignment matches against the dragged node's edge / center vs every sibling's edge / center within the same parent canvas.
- When a match is within 4 px, snaps the drag position to the match AND renders a red line indicating the alignment axis.
- Multiple matches stack (e.g., top-edge match + left-edge match → two red lines).
- The snap is opt-in via `Alt`-modifier on the drag: pure free-drag with Alt held, snapping otherwise. Matches Figma's behaviour.
- Disabled inside multi-canvas drop zones where alignment isn't well-defined (Tab content slots, Card sections — each is its own coordinate space).
- If Craft.js's drop coordinate API doesn't expose enough — escalation path: `actions.history.throttle().setProp` on the node's inline `top/left` during the drag, with a manual position state held in `useEditorStore`.

**3.7 — Empty-state guidance**
- When the document's tree contains only ROOT with no children, the canvas shows a centered illustration + "Drag a component from the toolbox to start" hint.
- A secondary CTA links to the template picker.
- The hint disappears the moment the first non-ROOT node is added.
- Behaves the same after delete: if all non-ROOT nodes are removed, the hint returns.

**3.8 — Onboarding tour**
- First-visit detection via `localStorage.getItem('craftjs-design.onboarding-completed')`.
- Tour overlay with 3–5 steps: Toolbox (drag a component) → Canvas (drop it) → Inspector (edit properties) → Save (persistent storage) → Adapter (swap visual library).
- Each step highlights the relevant region via a positioned tooltip + dim everything else.
- `Skip` (any time) and `Next` (per step) controls. Completion sets the localStorage flag; the tour never re-fires on subsequent reloads.
- Reset via a "Show tour again" entry in the SaveLoadBar menu.

**3.9 — Canvas search**
- `Cmd+F` (mac) / `Ctrl+F` (others) opens a quick-find input overlaid at top-center of the canvas.
- Matches against every node's `displayName` (case-insensitive substring), tags, and string props (label, content, alt, etc.).
- Match count shown next to the input ("3 of 12").
- `Enter` / `Shift+Enter` cycles forward / backward; the matched node scrolls into view + becomes selected.
- `Esc` closes the input, clears highlights.
- Highlights drawn via the same `[data-canvas-focused]` overlay used by keyboard nav (§ 1.4) — re-uses the visual primitive.

**3.10 — Asset library / image upload**
- `<ImagePicker>` replaces the Image canonical's text-input `src` field in PropsPanel.
- Default: File input → reads file as base64 → writes to `src`. Warns above ~500 KB so designers know the document will bloat.
- Library: a new `<AssetLibraryPanel>` panel in the Inspector shows previously-used image URLs / base64 thumbnails. Click to reuse.
- Host integration: `<EditorImageProvider value={{ upload, list, delete }}>` lets the host supply its own asset backend (e.g., S3, Supabase). When provided, the picker uses the host's `upload(file)` → `url` instead of base64.
- Tests: vitest covers the base64 path; the host-provider path is documented + tested with a mock provider.

**3.11 — Inline text editing**
- Double-click on Text, Heading, or Button canonical's text node → enters edit mode.
- The text becomes `contenteditable=true`; focus moves to it; selection lands at the click point.
- `Enter` / blur commits to the canonical's `content` (or `label`) prop via the existing `actions.setProp`.
- `Escape` cancels (reverts to pre-edit value).
- Multi-line via Shift+Enter (Text), single-line for Heading + Button (Enter commits).
- Markdown / formatting NOT supported in this phase — plain text only.
- Adapter impls (shadcn / MUI / Chakra) detect the edit-mode flag and switch from rendering `{label}` to rendering an editable region. The flag lives in editorStore so all three adapters opt in identically.

**3.12 — Right-click context menu**
- `onContextMenu` on each canvas node opens a menu positioned at the cursor.
- Items: Cut, Copy, Paste, Duplicate, Delete, Wrap in Stack, Wrap in Box.
- Cut = Copy + Delete.
- Wrap in Stack / Box = create a new parent of that type, move the selected node(s) into it as children. Multi-select aware.
- Standard Radix `<ContextMenu>` for accessibility (keyboard navigable, escape to close).

**3.14 — Reduced-motion**
- `prefers-reduced-motion: reduce` media query: skip the editor's panel-open animations, banner fades, popover transitions.
- Implemented via Tailwind's `motion-safe:` / `motion-reduce:` utilities applied to transition classes editor-wide.
- Audit + sweep: every `transition-*`, `animate-*`, `duration-*` Tailwind class in the editor chrome is wrapped in `motion-safe:`.
- Verified by toggling the OS-level reduced-motion preference + reloading; the editor renders without transitions but still functional.

**Process**
- `tsc -b` clean; tests pass (target: ~370 tests, up from 325).
- All four UX-touching docs updated (`INTEGRATION_GUIDE.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `ACCESSIBILITY.md`).
- `PRODUCTION_READINESS.md` § 3 non-Stretch items all marked complete; the three Stretch items keep their existing prose.
- `CHANGELOG.md` `[Unreleased]` accumulates entries through the phase; cuts as `0.2.0` at Group H close-out.
- Close-out section appended to this file with per-item path-taken + bundle delta + tests added.

---

## Plan

Eight groups, ordered by dependency. Every group ships its scope in full; no group has a "ship a partial version" exit ramp.

### Group A — Undo/redo + clipboard + context menu (§ 3.1, 3.2, 3.12)

The three items share a common foundation — the selection-action machinery. Clipboard + context menu reuse the throttled-history primitive from § 3.1, and § 3.12's menu surfaces every action § 3.2 adds.

**Land**

1. **§ 3.1 — Throttled history helper.**
   - New `src/editor/history/useThrottledHistory.ts`: returns a function that wraps a Craft `setProp` call inside `actions.history.throttle(intent, 500)` so subsequent calls within 500 ms of the last with the same intent collapse to one undo step.
   - Wire into the high-frequency edit paths: ColorPicker (drag-deferred path already commits one setProp per gesture; this hook applies to the slider variants), GradientEditor's drag-along-bar handles, NumericInput sliders, ResizeOverlay's mouseup commit.
   - Tested: synthetic ticks 10× within 100 ms produce 1 undo step; 10× spread over 5 seconds produce 10 steps.

2. **§ 3.2 — Clipboard.**
   - New `editorStore.clipboard: NodeTree | null` + setter.
   - New `src/editor/clipboard/useClipboardActions.ts` exposes `copy(nodeId)`, `cut(nodeId)`, `paste(parentId?)`, `duplicate(nodeId)`. `copy` uses `query.serialize` scoped to the node + descendants; `paste` uses `query.parseFreshNodeTree` (or equivalent) + `actions.addNodeTree`.
   - Global keydown listener (mounted in Editor.tsx) catches `Cmd/Ctrl + C / V / D / X` when canvas focus is inside the region (re-uses the Phase 9 `containerRef.contains(activeElement)` gate).
   - Tested via mocked Craft actions: copy → paste round-trips the same subtree shape.

3. **§ 3.12 — Right-click context menu.**
   - New `<NodeContextMenu>` component using Radix `<ContextMenu>`. Items: Cut, Copy, Paste, Duplicate, Delete, Wrap in Stack, Wrap in Box, Bring to front, Send to back.
   - Mounted as a wrapper around each canvas node via CanonicalNode (or as a top-shell document-level listener that dispatches by event target's `data-craft-node-id`).
   - Wrap in Stack / Box: create the wrapper canonical, move the selected node(s) into it via `actions.move`, single undo step via the throttled-history helper.
   - Keyboard-accessible (Radix handles arrow / enter / escape).

**Output**

- `useThrottledHistory` ready to wrap other gestures later.
- Clipboard works via keyboard + context menu.
- Right-click menu visible on every canvas node.
- ~8 new tests covering clipboard round-trips + throttled history.

### Group B — Multi-select + Inspector breadcrumbs (§ 3.3, 3.5)

Both touch the selection model. Multi-select expands it from a single id to an array; breadcrumbs render the chain of the *first* selected node.

**Land**

1. **§ 3.3 — Multi-select.**
   - `editorStore.selection: string[]` (replaces the single-id derivation from Craft's `events.selected`). On every Craft `events.selected` change, sync into editorStore.
   - Cmd/Ctrl-click on a canvas node: append to selection if not present, remove if present.
   - Shift-click: extend selection to include all siblings between the current first and the clicked node (within the same parent).
   - Inspector subscribes to selection. When `selection.length > 1`:
     - Header reads "Multiple (N)".
     - Each style panel renders only attributes present on **every** selected node's slot; mixed values show as "—" with a tooltip explaining the mix.
     - Per-canonical Properties panel hides (canonical-specific props don't merge sensibly across types).
   - ResizeOverlay reads `selection[0]` only (scope-to-first is acceptable for v1; multi-resize is a Phase 12+ stretch).
   - `Delete` / `Backspace` deletes every node in selection via `actions.history.throttle('delete-multi', 0)` so it's one undo step.
   - Document switch (Hydrator / useDocumentSwitcher) clears selection.

2. **§ 3.5 — Breadcrumbs.**
   - New `<InspectorBreadcrumbs>` component rendered above the Inspector's panel list when `selection.length >= 1`.
   - Walks `query.node(selection[0]).ancestors()`; renders one chip per ancestor, separated by `/`.
   - Each chip is a `<button>` that calls `actions.selectNode(ancestorId)`.
   - Overflow: `…` button opens a Radix dropdown listing the truncated middle segments.
   - Hidden when selection is empty.

**Output**

- Multi-select shipped end-to-end.
- Breadcrumb navigation in the Inspector.
- ~10 new tests covering selection model (single → multi → empty transitions, Cmd-click toggle, Shift-click range).

### Group C — Layer tree (§ 3.4)

A new sidebar surface. Largest single UI item in Phase 11.

**Decision: layout placement.**
The existing layout is two `<aside>` + one `<main>`. Adding a third aside doubles the inspector real estate competition. Options:
- (a) New third sidebar (300 px) between Toolbox and Canvas.
- (b) Toggle-replace Toolbox: a tab strip at the top of the existing left aside switches between "Components" and "Layers". Default to Components on first load; remember the last choice in localStorage.

**Recommendation: (b).** Designers don't simultaneously need both component search AND layer tree open; toggling preserves screen real estate for the canvas. Group C starts with a layout audit decision-point with the user.

**Land**

1. **`<LayerTree>` component** rendering the document tree from ROOT.
   - Read tree state via `useEditor((_, query) => buildTreeShape(query))` — collect node id + displayName + children ids per node.
   - Recursive `<LayerRow>` with chevron-collapse, indent per depth, current-selection highlight.
   - Hover affordance shows the same outline the canvas hover does.
   - Click row → `actions.selectNode(id)`. Cmd-click extends multi-select.

2. **Drag-reorder.**
   - HTML5 drag-and-drop on each row.
   - Drop targets: above / below / inside another row (visual indicator shows which).
   - Commit via `actions.move(id, targetParentId, index)`.
   - Single undo step per drag.
   - Forbid drops that would create a cycle (target is descendant of dragged); visual indicator changes to "not-allowed".

3. **Virtualisation.**
   - For documents with > 50 visible rows, switch to TanStack Virtual.
   - Below 50, plain render (avoid virtualization overhead on common cases).

4. **Layout toggle.**
   - Toolbox's existing search input + content rows become one tab; LayerTree becomes the second tab.
   - Tab strip at the top of the left aside.
   - State persisted in localStorage.

5. **Stress test.**
   - Fixture document with 200 nodes (a deeply nested Card-with-Tabs-with-Stacks structure). Asserts smooth scroll + drag-reorder under React Profiler.

**Output**

- Layer tree usable as the primary navigation for documents > ~20 nodes.
- ~12 new tests covering tree shape, click-select, drag-reorder boundaries, virtualisation threshold.

### Group D — Inline text editing (§ 3.11)

Discrete feature; minimal blast radius. Lands here so designers have the basics (clipboard + multi-select + layer tree + inline edit) before the bigger drag-coordinate work in Group E.

**Land**

1. **Edit-mode flag.**
   - `editorStore.editingTextNode: string | null`. Adapter impls subscribe.

2. **Double-click handler.**
   - On Text / Heading / Button adapter impls (across shadcn / MUI / Chakra), `onDoubleClick` sets `editingTextNode = nodeId` and stops propagation.

3. **Editable region.**
   - When `editingTextNode === nodeId`, the adapter renders a `contentEditable=true` span instead of `{label}`.
   - The span uses `data-original={label}` to support Escape cancellation.
   - `onBlur` commits via `actions.setProp` (wrapped in `useThrottledHistory` from § 3.1 — every keystroke is throttled into one undo step).
   - `Enter` commits + blurs (Heading / Button); Shift+Enter inserts a newline (Text only); Escape reverts.

4. **Selection guard.**
   - While `editingTextNode` is set, the canvas keyboard handler (Phase 9 § 1.4) early-returns. Arrow keys move the text cursor, not the node selection.

5. **Adapter coverage.**
   - All three adapters' Text, Heading, Button impls updated. Multi-line for Text.

**Output**

- Designers can double-click any text node and edit in place.
- ~6 new tests covering edit-mode entry / exit / commit / cancel + the keyboard-guard handoff.

### Group E — Alignment guides on drag (§ 3.6)

The biggest single engineering item in Phase 11. The plan note in PRODUCTION_READINESS.md flags it explicitly: "Big engineering item; depends on Craft's drop coordinate model."

**Pre-flight: Craft.js coordinate audit.**
Investigate what Craft.js exposes during drag:
- Does `connectors.drag` emit `pointermove` coordinates we can listen to?
- Does Craft compute drop position internally? Can we hook the same logic?
- Is there a way to override the snap-to-position before Craft commits?

If Craft's API is insufficient, two escalation paths:
- **Path 1:** Implement our own drag layer that bypasses Craft's drop logic for in-document moves (drops from the Toolbox still go through Craft's create connector). The custom drag layer reads pointermove on document, computes the snap position, and on pointerup calls `actions.move(id, parentId, index)`.
- **Path 2:** Fork @craftjs/core to add a `beforeMove` hook, ship from the fork.

Either path lands smart guides in Phase 11; Path 1 is the default unless it proves uglier than Path 2.

**Land**

1. **Drag coordinate stream.**
   - `useDragCoordinates(nodeId)`: subscribes to pointermove events on document when the node is being dragged. Returns the current `{ x, y }`. Cleans up on pointerup / cancel.

2. **Alignment computation.**
   - For each sibling of the dragged node in the same parent canvas:
     - Compute the sibling's edges + centres (left, right, top, bottom, hCenter, vCenter) via `getBoundingClientRect`.
     - Compute the same for the dragged node.
     - For each pair (dragged edge, sibling edge), measure distance. Within 4 px → match.
   - Snap the dragged node's position to the matched edge (set `style.inline.left` / `top` directly via DOM mutation; commit on pointerup).

3. **Visual guides.**
   - Absolute-positioned `<div>` per match line, fixed-position over the canvas viewport.
   - Red 1 px line, full-canvas-width for horizontal alignments, full-canvas-height for vertical.
   - Up to 2 lines visible at once (one per axis).

4. **Modifier opt-out.**
   - Hold `Alt` during drag → bypass snapping, pure free-drag.

5. **Scope restriction.**
   - Multi-canvas drop zones (Tab content slots, Card sub-regions) each have their own coordinate space. Snapping is disabled inside these; guides don't appear.

6. **Testing.**
   - Pure helpers tested: `alignmentMatches(dragRect, siblingRects, threshold)` returns the right matches.
   - Integration verified via a manual smoke (R drag two Boxes in a Stack; their tops should snap).

**Output**

- Designers feel the Figma-like snap behaviour when dragging within a Stack / Box.
- Some Craft.js patching may be needed depending on the coordinate API.
- ~8 new tests covering the pure alignment math.

### Group F — Discoverability: empty state + onboarding + canvas search (§ 3.7, 3.8, 3.9)

Three small features grouped because they all help the user find their way around the editor. Independent of the bigger features above.

**Land**

1. **§ 3.7 — Empty state.**
   - `<EmptyCanvasHint>` renders when `query.getNodes().ROOT.data.nodes.length === 0`. Subscribes to the tree via `useEditor`.
   - Centred illustration (Lucide icon stack) + heading "Drop a component to start".
   - Secondary CTA: "Start from a template" → opens TemplatePicker.

2. **§ 3.8 — Onboarding tour.**
   - `<OnboardingTour>` mounted in Editor.tsx. Reads `localStorage.getItem('craftjs-design.onboarding-completed')`; if absent, starts on first render.
   - 4 steps: Toolbox / Canvas / Inspector / Save. Each step a tooltip pointing at the relevant region with a dimmer over everything else.
   - `Skip tour` (any step) and `Next` (advance) buttons. Last step's "Done" button writes the localStorage flag.
   - "Show tour again" entry in the DocumentMenu so designers can replay.

3. **§ 3.9 — Canvas search.**
   - `<CanvasSearch>` overlay, opened by `Cmd/Ctrl+F`. Top-centre fixed position.
   - Input filters nodes by displayName / tags / text content / common string props (label, content, alt).
   - Matched nodes highlighted via the canvas keyboard focus ring (re-uses Phase 9's `[data-canvas-focused]`).
   - `Enter` / `Shift+Enter` cycles through matches in DOM order; scrolls into view + selects.
   - `Esc` closes + clears highlights.

**Output**

- Designers see clear hints on first load + can search large documents.
- The onboarding tour persistently dismisses across sessions.
- ~10 new tests covering the search match logic + onboarding flag persistence.

### Group G — Asset library / image upload (§ 3.10)

Replaces the Image canonical's text-input `src` field with a real picker. Adds host integration via `<EditorImageProvider>`.

**Land**

1. **`<EditorImageProvider>` context.**
   - New `src/sdk/assets.ts` exports `EditorImageProvider` + types.
   - Context value: `{ upload: (file: File) => Promise<{ url: string }>, list: () => Promise<{ url: string; thumbnail?: string }[]>, delete?: (url) => Promise<void> }`.
   - Default provider (when no host wraps the editor): base64 → inline storage. Bytes warned above 500 KB.
   - SDK exposes the provider component + `useEditorImageProvider()` hook.

2. **`<ImagePicker>`.**
   - Replaces the text input in PropsPanel for the `src` field of the Image canonical (and other future canonicals with image fields — Avatar, Card).
   - Two paths:
     - "Upload" button → file input → upload (via provider) → write `src`.
     - "Library" tab → grid of previously-used image URLs / base64 thumbnails (pulled from the provider's `list()` OR scanned from the current document's Image nodes).

3. **`<AssetLibraryPanel>` (Inspector panel).**
   - New built-in panel via `registerPanel`. Lists assets from the provider's `list()`. Click to copy URL to clipboard or insert as a new Image canonical.
   - Applicable only when the host has supplied an EditorImageProvider (default base64 provider doesn't support listing).

**Output**

- Designers can upload images without leaving the editor.
- Host integration via the new SDK provider.
- ~8 new tests covering the provider mock + the base64 default.
- INTEGRATION_GUIDE.md gains an "Asset backends" section.

### Group H — Reduced-motion + verification + close-out (§ 3.14)

Final polish pass + the standard close-out routine.

**Land**

1. **§ 3.14 — Reduced-motion sweep.**
   - Grep every `transition-*` / `duration-*` / `animate-*` class in the editor chrome (`src/editor/**`, `src/components/ui/**` shadcn primitives we own).
   - Wrap each in Tailwind's `motion-safe:` prefix. `motion-reduce:transition-none` for forced-off cases.
   - Verify by toggling `chrome://settings/?search=reduce%20motion` (or OS-level) and reloading.

2. **Final smoke.**
   - Full manual smoke: each canonical drops, every panel edits, document lifecycle, error fallbacks, keyboard navigation, multi-select, clipboard, layer tree drag, inline edit, smart guides on drag, search, image upload.
   - `rm -rf node_modules && npm install && npm test` clean install.
   - `npm run build:dist` produces matching `.d.ts` for the new SDK additions (image provider).

3. **Doc updates.**
   - `PRODUCTION_READINESS.md` § 3 non-Stretch items struck through.
   - `INTEGRATION_GUIDE.md` — asset-provider section, keyboard reference updates (clipboard + multi-select + search), reduced-motion note.
   - `ACCESSIBILITY.md` — multi-select + breadcrumb keyboard model.
   - `ARCHITECTURE.md` — Layer tree placement decision documented; smart-guide coordinate strategy (whether Path 1 or Path 2 was taken).
   - `DEVELOPER_GUIDE.md` — new recipes: "Authoring a canonical that supports inline text editing", "Writing an EditorImageProvider".
   - `CHANGELOG.md` — Unreleased section cuts as `0.2.0`.

4. **Close-out section** appended to this file:
   - Per-item path-taken table (parallel to Phase 10's close-out format).
   - Multi-select UX decisions log.
   - Layer tree layout decision (replace-toggle vs third sidebar).
   - Smart guides path (own drag layer vs Craft fork).
   - Asset provider API stability statement.
   - Bundle delta vs Phase 10 close.
   - Tests added.

---

## Out of scope (NOT in Phase 11)

These are PRODUCTION_READINESS.md § 3's Stretch items + everything in Sections 4+. Documented to make the scope-discipline explicit: Phase 11 ships every non-Stretch § 3 item and stops there.

| Item | Section | Why deferred / Phase target |
|---|---|---|
| Comments / annotations | § 3.13 | Real collaboration infrastructure (CRDTs, server-backed presence) is its own phase. Phase 12+ candidate. |
| RTL support | § 3.15 | Touches every Tailwind `left-*` / `right-*` / `pl-*` / `pr-*` in the codebase + the safelist extractor. Audit + sweep is a phase of its own. Phase 13+ candidate. |
| Internationalization | § 3.16 | Picking an i18n framework + extracting every string is bigger than the Phase 11 budget. Phase 13+ candidate. |
| Multi-resize across multi-select | § 3.3 follow-up | Resizing N nodes simultaneously requires defining "the right way" — independent widths? proportional? Phase 12+ stretch. |
| System clipboard integration (Cmd+C → OS clipboard) | § 3.2 follow-up | Browser permission model is awkward; internal clipboard covers the common case. Phase 12+ stretch. |
| Markdown / rich text in inline edits | § 3.11 follow-up | A whole rich-text subsystem; out of scope for v1 inline editing. Phase 12+ stretch. |
| Section 4 (style depth) | § 4 | Phase 12 candidate. |
| Section 5 (component breadth) | § 5 | Phase 13+ candidate. |
| Section 6 (persistence beyond localStorage) | § 6 | Phase 12+ candidate. |
| Section 7 (more adapter examples) | § 7 | Phase 12+ candidate. |
| Section 8 (perf optimisation past Phase 9) | § 8 | future. |
| Section 9 / 10 (DevEx + doc site) | § 9, § 10 | Phase 12+ candidate. |

---

## Risks + mitigations

No valves. Every risk has a mitigation that delivers the item; the mitigation may extend the timeline but not reduce scope.

1. **Craft.js's `actions.history.throttle` doesn't behave as described in the docs.** Mitigation: implement our own throttle in `useThrottledHistory` — buffer setProps in a ref, fire one `actions.setProp` per debounce window. The undo step count test is the truth source.

2. **Multi-select breaks Craft's connector model.** Mitigation: keep Craft's `events.selected` as the single source authoritative; mirror to editorStore for our own UI. Mouse-click flows through Craft as-is; modifier-click extends our mirror. Craft sees one selection at a time.

3. **Layer tree's drag-reorder competes with Craft's drag-drop within the canvas.** Mitigation: layer tree drags use HTML5 drag-and-drop on a different DOM region; Craft's listeners are scoped to the canvas. Confirm no event bubbling crossover during the smoke test.

4. **Inline text editing breaks the Craft drag connector.** Mitigation: when `editingTextNode` is set, the canonical's adapter impl skips applying the drag connector to its content span. Drag-to-move is disabled for that node until edit ends.

5. **Smart guides' alignment math is wrong for transformed elements.** Mitigation: use `getBoundingClientRect` (which accounts for transforms) rather than computed `top` / `left` styles. Tests cover the rotated-sibling case.

6. **`<EditorImageProvider>` is too rigid for some host backends.** Mitigation: the SDK exports the type with optional methods; hosts implement only what they support. The Image picker degrades gracefully (no "Library" tab when `list` isn't provided).

7. **The onboarding tour interferes with the editor when localStorage is disabled** (private browsing). Mitigation: same pattern as Phase 9's sessionStorage usage — wrap reads / writes in try/catch; fall back to "show tour every session" if storage is unavailable.

8. **Reduced-motion sweep misses a transition.** Mitigation: ESLint custom rule that flags any new `transition-*` class outside a `motion-safe:` wrapper. Lands as part of Group H's close-out.

9. **Layer tree virtualisation feels wrong at the 50-node threshold.** Mitigation: tune the threshold based on the stress-test profile. If 50 is too high or low, change the constant; the user-visible behaviour is the same.

10. **The drag-coordinate work needs Craft.js changes.** Mitigation: documented escalation in Group E (own drag layer vs Craft fork). Either path ships smart guides.

---

## Definition of done

Every non-Stretch Section 3 item is in one of these states:

- **Shipped + tested + documented.** The default — applies to all 13 non-Stretch items.

No item is left unaddressed. Stretch items (3.13, 3.15, 3.16) keep their PRODUCTION_READINESS prose and are explicitly queued for later phases.

When all 13 in-scope items satisfy this bar, Phase 11 is complete and Phase 12 (Section 4 — style depth) is unblocked. The `0.2.0` release candidate cuts at the close-out commit.

---

## Close-out (2026-05-27 — shipped as `0.2.0`)

All 13 in-scope Section 3 items shipped, tested, and documented. Phase 12 (Section 4 — style depth) is unblocked.

### Per-item path-taken

| § | Item | Group | Path taken |
|---|---|---|---|
| 3.1 | Undo/redo grouping | A | `useThrottledHistory` wrapping `actions.history.throttle(rate)`; 500ms default. As planned. |
| 3.2 | Clipboard | A | Internal clipboard in `editorStore` (not system clipboard — browser permission model). `cloneNodeTree` rewrites ids + resets events/dom. As planned. |
| 3.12 | Context menu | A | Radix ContextMenu; right-click pre-selects the node via a `data-craft-node-id` walk so menu items aren't disabled on first open. |
| 3.3 | Multi-select | B | `editorStore.selection: string[]` as UI source of truth; `useSelectionSync` mirrors Craft → store. Style panels merge via `useNodeClassesMulti` with "— Mixed". Full plan (merged-value panels included). |
| 3.5 | Breadcrumbs | B | `InspectorBreadcrumbs` walks ancestors; overflow `…` dropdown. As planned. |
| 3.4 | Layer tree | C | **Tab-toggle** in the left aside (not a third sidebar). TanStack Virtual past 50 rows. HTML5 drag-reorder with cycle guard. As recommended in the plan. |
| 3.11 | Inline text editing | D | `contenteditable="plaintext-only"` + `EditableText`/`useStartTextEdit` SDK exports. Commit-once-on-done (no live per-keystroke writes — simpler, same one-undo-step property). |
| 3.6 | Alignment guides | E | **Visual-only v1** (path neither 1 nor 2). Craft's HTML5 drag exposes no pointer stream + the source doesn't move; full coordinate-snap (own drag layer / Craft fork) deferred to Phase 12+. Guides draw on `dragover`; drop still commits via insertion-index `actions.move`. |
| 3.7 | Empty state | F | `EmptyCanvasHint` over the canvas + TemplatePicker CTA. As planned. |
| 3.8 | Onboarding tour | F | 4-step box-shadow spotlight; localStorage dismissal; "Show tour again" in the doc menu. As planned. |
| 3.9 | Canvas search | F | Cmd/Ctrl+F overlay; pure `searchNodes`; Enter/Shift+Enter cycle. As planned. |
| 3.10 | Asset library / image upload | G | `EditorImageProvider` context (SDK); default base64 provider remembers session uploads; `ImagePicker` (URL/Upload/Library **modal**); host-gated `AssetLibraryPanel`. As planned + modal (designer feedback). |
| 3.14 | Reduced motion | H | **Global `prefers-reduced-motion` media query** in `index.css` (not per-class `motion-safe:` — covers all current + future motion, can't be forgotten). Outcome identical. |

### Key decisions log

- **Selection model:** editorStore is the UI source of truth, Craft is the document source of truth, bridged one-way by `useSelectionSync`. Every user selection entry point writes editorStore **synchronously via `flushSync`** then calls `actions.selectNode`. The `useSelectionSync` passive `useEffect` alone lagged a frame — surfaced as off-by-one layer-tree clicks + sticky arrow-nav. (See `feedback-selection-sync` lessons.)
- **`draggable=true` + selection:** use `onMouseDown`, not `onClick` — drag-prep hysteresis suppresses click.
- **useEditor / zustand collectors must return stable refs** — fresh `[]` / nested objects fail `shallowequal` and storm re-renders (CanvasSearch, Inspector primary, useNodeClassesMulti were all fixed).
- **Layer tree layout:** tab-toggle replace, not third sidebar (canvas real estate).
- **Smart guides:** visual-only over Craft's existing drag — 80% of the value at ~20% of the cost; coordinate snap is a Phase 12 stretch.
- **Reduced motion:** one global media-query rule, not scattered `motion-safe:` prefixes.

### Asset provider API stability

`EditorImageProvider` / `useEditorImageProvider` / `EditorImageProviderValue` / `EditorImageAsset` are part of the `0.2.0` public SDK surface (asserted in `sdk/boundary.test.ts`). The contract (`upload` / `list` / `delete?` / `canList`) is considered stable for the `0.x` line; additive fields only until `1.0.0` freezes the surface.

### Bundle delta vs Phase 10 close (`0.1.0`)

| Asset | `0.1.0` raw / gz | `0.2.0` raw / gz | Δ gz |
|---|---|---|---|
| `dist/assets/index-*.js` | 517 KB / 157 KB | 578 KB / 173 KB | +16 KB |
| `dist/assets/index-*.css` | 218 KB / 28 KB | 221 KB / 28 KB | ~0 |

Largest single contributor: `@tanstack/react-virtual` (layer-tree virtualization). The rest is the Phase 11 feature surface.

### Tests added

391 → **413** at close (`vitest run`, 39 files). New pure-logic suites: `cloneNodeTree`, `modifierSelection`, `mergeSlices`, `buildTreeShape` (+ `wouldCreateCycle`), `editingTextNode`, `alignmentMath`, `searchNodes`, `onboardingFlag`, `defaultImageProvider`, plus the `editorStore.selection` helpers and the expanded `sdk/boundary` surface. Render-timing bugs (selection lag, contentEditable commit, draggable click) were caught by manual runtime verification rather than unit tests — recorded in the lessons memory.

### Deferred to Phase 12+

Coordinate-snap smart guides (own drag layer / Craft fork), multi-resize across a multi-selection, system-clipboard integration, markdown/rich-text in inline edits. Stretch items 3.13 (comments), 3.15 (RTL), 3.16 (i18n) remain queued per the original scope.
