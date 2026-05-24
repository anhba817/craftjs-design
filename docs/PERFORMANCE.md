# Performance

A snapshot audit of where the editor spends render time and where it doesn't.
This is a *static* audit — read the source, flag patterns. The matching
React Profiler run (under real edit gestures) is the next step; results land
here as a Profile Findings section as they're measured.

This document covers Phase 8's exit criterion "no re-render storms during
typical edit flows." Findings are categorized as **shipped** (already
optimized), **acceptable** (works fine, no fix needed), or **future** (a
fix is queued for later — Phase 9+).

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

Phase 6's responsive-arbitrary inline path emits a `<style>` element per
node whose `style.responsiveInline` has entries. For documents with ≤100
nodes that have responsive inline, this is fine. The Phase 8 plan called
for a Vite-plugin replacement but V1 was partially pulled — the runtime
path stays. See `src/style/safelist-extract.ts` for the foundation if a
build-time path becomes worthwhile in Phase 9+.

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

Phase 8 Group I records baseline numbers via React DevTools Profiler during
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

## Bundle size (informational)

Not currently measured. Phase 8 Group H ships a dist build target; bundle
size lands in that group's close-out.
