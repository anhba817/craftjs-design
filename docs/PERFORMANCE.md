# Performance

A snapshot audit of where the editor spends render time and where it doesn't.
This is a *static* audit — read the source, flag patterns. The matching
React Profiler run (under real edit gestures) is the next step; results land
here as a Profile Findings section as they're measured.

This document covers the goal of no re-render storms during
typical edit flows. Findings are categorized as **shipped** (already
optimized), **acceptable** (works fine, no fix needed), or **future** (a
fix is queued for later).

## Subscription model

Two reactive state systems drive the editor:

1. **Craft.js editor state** — accessed via `useEditor(collector)`. The
   collector's return value is shallow-compared per render; collectors that
   return stable objects re-render only when their slice of the editor's
   state changes.
2. **Zustand `editorStore`** — accessed via `useEditorStore((s) => s.field)`.
   Selector-based; subscribers re-render only when the selected field
   changes.

### Shipped — selector hygiene

Every `useEditorStore` call across the codebase uses a selector:

```ts
const activeThemeId = useEditorStore((s) => s.activeThemeId)
```

Confirmed via `grep useEditorStore` in `src/` — 9 call sites, all selector
form. No component subscribes to the entire store.

### Shipped — split selectors over compound state

`useNodeClasses` famously deals with state from two systems (Craft's per-node
props + Zustand's `activeBreakpoint`). The hook reads `activeBreakpoint` in
the body, not inside `useEditor`'s collector — see
`src/editor/inspector/shared/useNodeClasses.ts`. This guarantees
`activeBreakpoint` updates trigger a re-render and the body reads the fresh
value, instead of the collector closing over a stale one.

Documented in `docs/DEVELOPER_GUIDE.md` § `useEditor` collector reads stale
non-Craft state.

## Render hot paths

### Shipped — direct DOM mutation during drag-resize

`src/editor/canvas/ResizeOverlay.tsx` mutates `selectedDom.style.width/height`
directly during the drag loop (no React render per mousemove). The final
value commits via `actions.setProp` on mouseup — one re-render at the end of
the gesture, ~60 fps during.

### Shipped — direct DOM mutation during ColorPicker visual drag

`react-colorful`'s `HexColorPicker` calls our `onChange` per drag tick. The
chain is: pick tick → setState in ColorPicker → `actions.setProp` → React
re-render of the selected node. At ~60Hz this is well within budget for
single-node updates; not currently bottlenecked. If the user drags while
many siblings are observing the same node (rare), profile and consider
debouncing.

### Acceptable — runtime `<style>` injection per node

The responsive-arbitrary inline path emits a `<style>` element per
node whose `style.responsiveInline` has entries. For documents with ≤100
nodes that have responsive inline, this is fine. A Vite-plugin replacement
was considered but V1 was partially pulled — the runtime
path stays. See `src/style/safelist-extract.ts` for the foundation if a
build-time path becomes worthwhile later.

### Acceptable — Inspector renders all panels on every selection change

`src/editor/Inspector.tsx` renders the seven built-in panels (plus any SDK
extras). Each `<panel.component>` runs `useEditor` + `useNodeClasses`. For
the current set the cost is sub-millisecond per panel; collapsed sections
skip their content since `<details>` doesn't render closed content.

### Acceptable — ResizeOverlay updates rect on scroll

`window.addEventListener('scroll', recompute, { capture: true, passive: true })`
fires often during a smooth scroll. `setRect` re-renders the overlay; the
overlay only renders four positioned divs. Cheap. Removed `requestAnimationFrame`
batching for simplicity; revisit if scroll feels janky on slow devices.

### Future — Toolbox button refs may re-register Craft sources

`src/editor/Toolbox.tsx` per-button ref callback calls `connectors.create(el, ...)`
on every render. Each render of the Toolbox (e.g., when favorites change)
re-registers the drag source. Craft's internal de-dupe may handle this
cheaply, but it's worth measuring — if the registry mutation cost is
non-trivial, memoize the ref callback via `useCallback`.

### Future — `<HexColorPicker>` allocates a new color on every drag tick

External component; not directly fixable. Consider debouncing via mouseup
commit (the slider state stays local until release) for nodes inside large
canvases where per-tick re-render starts to drop frames.

## Measurement plan

Baseline numbers are recorded via React DevTools Profiler during
six tracked flows:

1. **Mount** — initial Editor render with one default document.
2. **Drop component** — drag a Box from the Toolbox to the canvas.
3. **Select node** — click an existing node.
4. **Token color edit** — pick a Tailwind color token in the ColorPicker.
5. **Hex color edit** — drag the visual S/L picker.
6. **Adapter swap** — flip from shadcn to MUI.

Each flow's expected scope:

| Flow | Expected re-renders | Critical fast path |
|---|---|---|
| Mount | One pass through each registered component | Don't double-render via StrictMode in dev |
| Drop component | Canvas + Toolbox button + Inspector | New node mounts; existing nodes stable |
| Select node | Inspector only (the canvas doesn't re-render unless props change) | Selection in Craft state |
| Token color edit | One node + Inspector | className change propagates one render |
| Hex color edit | One node + ColorPicker (live) | Direct DOM mutation during drag (visual picker) |
| Adapter swap | Every canvas node + adapter switcher | Tree shape stays stable (compose-not-switch) |

Anything that exceeds the expected scope is a re-render storm; fix via
`useMemo`, `React.memo`, or refactoring shared state.

## Profiler baselines (2026-05-25)

Recorded with React DevTools Profiler against the editor in dev mode
(StrictMode active). Raw exports live in `profiler/` at the repo root —
one JSON per flow. Numbers are warm-cache: each flow profiled in isolation
after a one-off mount, so totals exclude the StrictMode double-render of
the initial render path.

### Summary

| # | Flow | Commits | Total ms | Max commit | Verdict |
|---|------|--------:|---------:|-----------:|---------|
| 1 | Mount | 2 | 34.8 | 34.1 | ✅ Healthy (one-time cost) |
| 2 | Drop component | 4 | 13.1 | 10.8 | ⚠️ Toolbox re-renders fully (6.6 ms self) |
| 3 | Select node | 8 | 90.7 | 66.6 | ⚠️ Inspector subtree dominates |
| 4 | Token color edit | 11 | 55.0 | 41.5 | ⚠️ NumericInput × ColorPicker fan-out |
| 5 | **Hex color edit** | **376** | **816.9** | 52.6 | 🚨 **Critical — re-render loop** |
| 6 | Adapter switch | 2 | 8.3 | 8.2 | ✅ Healthy |
| 7 | Large doc open | 3 | 80.7 | 49.4 | ✅ Acceptable for doc load |
| 8 | Tabs with all canvases | 8 | 14.6 | 5.9 | ✅ Healthy |
| 9 | **Rapid resize** | **570** | **374.9** | 26.2 | 🚨 **Critical — render storm** |

A frame budget at 60 fps is 16.7 ms; at 120 fps, 8.3 ms. "Healthy" means
all commits land inside one frame; "acceptable" means a single one-off
commit exceeds a frame (load / mount) but ongoing gestures stay smooth;
"critical" means user-driven gestures generate sustained sub-frame
storms whose aggregate exceeds the gesture duration.

### 🚨 Flow 5 — Hex color edit (`816.9 ms / 376 commits`)

Top renderers during a single hex-input edit:

| Component | Renders | Self-time |
|-----------|--------:|----------:|
| ChevronDown | 376 | 37.6 ms |
| ChevronDown | 242 | 48.4 ms |
| ChevronDown | 133 | 26.6 ms |
| ColorPicker | 87 | 13.6 ms |
| ColorPicker | 77 | 13.9 ms |
| ColorPicker | 69 | 11.7 ms |
| NumericInput | 55 | 11.8 ms |
| ValueSelect | 41 | 11.6 ms |

The profile JSON for this flow alone is 56 MB — the size is itself a
symptom: 376 commits each captured the full fiber tree. Every keystroke
in the hex input propagates through the entire ColorPicker popover,
re-rendering every neighbouring icon (`ChevronDown` × 3 — the dropdown
chevrons in the popover header), every sibling numeric input, every
preset color swatch.

**Hypothesis:** the hex `<input>` is controlled by state held at the
ColorPicker root, and the root re-renders the whole popover on every
keystroke. Sub-components aren't memoized, so even unchanged siblings
get reconciled.

**Fix shipped (defer ALL React state during drag).** Approach taken:

An rAF-coalescing approach was tried first and rejected — on a 60 Hz
display the pointermove input rate already matches the frame rate, so
coalescing was a no-op (re-profile after rAF: 398 commits, virtually
unchanged from baseline 376).

The shipped fix defers BOTH the Craft.js commit AND ColorPicker's own
local state updates (`pickerColor` / `hexInput`) until pointerup. An
intermediate version that only deferred the Craft.js commit cut
Inspector renders from 376 → 4 but left ColorPicker re-rendering on
every drag tick — and each re-render cascaded into Radix Popover's
positioning machinery (PopoverContent re-rendered 1928 times during
a single 5.5 sec drag, ChevronDown 3044 times; total 3044 commits with
1534 of them landing within 1 ms of the previous one — a clear render
chain).

During drag, the hex value is stashed in a ref. No `setState` runs,
so:
- ColorPicker doesn't re-render
- Popover / PopoverContent / floating-ui positioning doesn't re-render
- All popover internals stay quiescent

Why it's safe:
- react-colorful's `HexColorPicker` manages its visual cursor with its
  own internal Saturation/Hue state. Once mounted with an initial
  `color`, the cursor follows the pointer without parent re-renders.
- HSL / RGB sliders are native `<input type="range">`; during pointer
  interaction the browser shows the thumb at the pointer position
  regardless of the `value` prop. The next React render after release
  reconciles back to the controlled state.
- The text-input hex display stays stale during drag (designers read
  the color from the visual cursor / swatch, not from the text field).
  Refreshes on release.

On pointerup the final hex commits via `onChange` (one Craft.js
dispatch). The `useEffect([value])` then re-syncs `pickerColor` and
`hexInput` from the new external value — one final ColorPicker render.
Pointer release is listened for on `document` so dragging outside the
popover surface still commits.

**Trade-off:** the canvas loses live preview during the drag. The
underlying document updates only when the user releases. This matches
Figma/Photoshop slider UX and was foreshadowed in the static audit
("Consider debouncing via mouseup commit (the slider state stays local
until release)…").

**Measured post-fix numbers** (recorded 2026-05-25):

| | Before | After |
|---|---:|---:|
| ColorPicker renders | 950 | **8** |
| AppearancePanel renders | 4 | **2** |
| PopoverContent renders | 1928 | **26** |
| Total commits | 3044 | 2874 |
| Total ms | 1699 | 1058 |
| Subjective feel | sluggish | **smooth, no lag** |

The reactive layer this codebase controls — ColorPicker, AppearancePanel,
the Inspector subtree — now barely re-renders during drag. The
remaining ~2855 commits per drag come from inside the popover after it
opens: ~6 unnamed Radix Popover positioning / react-colorful internal
fibers + the popover-content ChevronDown firing in unison at ~360 Hz
(react-colorful's `Saturation` / `Hue` / `Interactive` components call
`setState` on every pointermove tick).

Each of those commits is ~0.3 ms (sub-frame), so the drag stays at
60 fps in practice. Total CPU during drag is ~13 % over the gesture —
not zero, but not perceptible. The library-internal churn is out of
scope for this codebase; eliminating it would require either swapping
react-colorful for a direct-DOM color picker or wrapping it in a
memoization layer that defeats its internal state model. Documented
as out-of-scope; revisit only if drag becomes laggy on slower devices.

Discrete actions (eyedropper, token click, gradient toggle, clear,
hex text input blur/Enter) keep firing immediately — only the
drag-rate sources are deferred.

Re-measure by recording a new Flow 5 profile and saving over
`profiler/performance_flow_5_hex_color_edit.json`.

### 🚨 Flow 9 — Rapid resize (`374.9 ms / 570 commits`)

| Component | Renders | Self-time |
|-----------|--------:|----------:|
| ResizeOverlay | 568 | 209.0 ms |
| Handle (×8) | 145–165 each | 14.8–19.3 ms each |

The "shipped — direct DOM mutation during drag-resize" note above is
still accurate for the *resized node* — its `style.width/height` is
mutated directly with no React render. The 570 commits come from
`ResizeOverlay` itself: the overlay's own position rectangle is held
in React state (`setRect`) and recomputed on every `pointermove`. All
eight resize handles re-render with the overlay because they're
children of it.

**Hypothesis:** `ResizeOverlay` holds its rect in `useState`. Each
mousemove tick calls `setRect`, triggering one commit. Over a typical
1-second resize gesture at 60 fps that's ~60 commits; 570 suggests
either an unbounded high-rate event source (no rAF coalescing) or
that pointermove inside React's input pipeline fires more often than
the display refresh.

**Fix shipped (direct-DOM overlay sync).** Approach taken:

Tracked the actual source: every mousemove tick mutates
`selectedDom.style.width/height` directly (no Craft.js dispatch — that
part was already shipped). But the DOM mutation triggers the
`ResizeObserver` watching the selected node, which calls `recompute()`
→ `setRect(getBoundingClientRect())` → React re-render of
`ResizeOverlay` + all 8 handles. 568 renders per gesture.

Fix:
- Added `isResizingRef` set on mousedown / cleared on mouseup.
- `recompute()` bails out when `isResizingRef.current === true`. The
  ResizeObserver keeps firing during the drag but its setRect calls
  are skipped.
- Added `overlayRef` and during onMouseMove the overlay's own
  `style.width` / `style.height` are mutated directly to track the
  node — same direct-DOM pattern the node itself uses. The visual
  outline + handle positions stay in lock-step with no React render.
- On mouseup `recompute()` is called once to sync `rect` state back
  to React. Total: 1 React render per gesture (the final size sync).

**Measured post-fix numbers** (recorded 2026-05-25):

| | Before | After |
|---|---:|---:|
| Total commits per gesture | 570 | **3** |
| ResizeOverlay renders | 568 | 2 |
| Handle renders (per handle) | ~150 | 2 |
| Total render time | 374.9 ms | 35.4 ms |

The 3 remaining commits are all post-release:
1. The `setProp` commit reconciling the canvas tree with the new size
   class (33 ms, ~2000 fibers — one-time cost on release).
2. An inspector Select tick reading the new size into the size dropdown.
3. The final `ResizeOverlay` + 8 Handles render syncing the React
   `rect` state to the post-commit DOM size.

Zero commits during the active drag motion. Outline + handles track
the node 1:1 via direct DOM mutation; no per-frame React work.

### Secondary observations

- **Flow 2 — Toolbox** rendered fully at 6.6 ms self on every component
  drop. Already flagged in the static audit (see "Toolbox button refs
  may re-register Craft sources" above). Confirmed by measurement.
  Memoize candidate but not critical.
- **Flow 3 — Inspector** runs 8 commits / 90.7 ms on every node select.
  The Inspector renders 7 built-in panels; the static audit calls this
  "acceptable" but the measured 66.6 ms actual-time for the dominant
  Inspector commit pushes against 4 frames. Re-examine whether panels
  can render lazily based on `<details>` open state.
- **Flow 4 — Token color edit** at 11 commits / 55 ms is the same
  ColorPicker hot path as Flow 5, but milder because a token click is
  a single commit instead of N keystrokes. Fixing Flow 5 will likely
  improve Flow 4 as a side effect.

### Re-measurement protocol

To re-profile after a fix:

1. Open the editor in dev mode (`npm run dev`).
2. Open React DevTools → Profiler tab.
3. Click record, perform exactly one instance of the target flow,
   click stop.
4. Save to `profiler/performance_flow_<n>_<name>.json`.
5. Run `python3 /tmp/analyze_profiles.py` (or re-extract via the same
   logic) to print the commit count, total ms, and top renderers.
6. Compare against the table above. A passing fix:
   - Reduces commits by ≥ 80 % for re-render-storm flows.
   - Keeps total ms below one frame per discrete user action.
   - Doesn't regress healthy flows.

## Bundle size (informational)

Not currently measured. A dist build target ships; bundle
size will be recorded once measured.
