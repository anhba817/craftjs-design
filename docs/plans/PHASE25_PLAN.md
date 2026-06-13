# Phase 25 — Responsive editor chrome

**Status:** planned
**Cuts as:** a minor — `1.7.0` if it lands before Phase 24 (scoped CSS), else
`1.8.0`. The two are independent (no shared files of consequence); whichever
ships first takes `1.7.0`.
**Origin:** diagnostic review of the editor shell — the chrome is a fixed
multi-column desktop layout with **no responsive design** (exactly one
breakpoint class in all of `src/editor`, and it's incidental). It degrades on
narrow screens by squeezing/clipping rather than reflowing.

## The problem (verified against source)

The editor shell (`src/editor/Editor.tsx`) is:

```
cd-editor-chrome  →  h-screen flex flex-col          (pinned to viewport)
├─ SaveLoadBar    →  flex items-center gap-2          (ONE non-wrapping row, ~13 controls)
└─ body row       →  flex flex-1 min-h-0
   ├─ LeftAside   →  w-56  (224px, fixed)             Components / Layers tabs
   ├─ <main>      →  flex-1 overflow-auto p-8          the canvas
   ├─ OverlayStage→  w-80  (320px, fixed, shrink-0)    ALWAYS rendered, never shrinks
   └─ Inspector   →  w-72  (288px, fixed)             props panel
```

- **Three fixed side columns total 832px** of permanent chrome (224 + 320 +
  288). `OverlayStage` is `shrink-0`, so it never yields — and it's rendered
  unconditionally even when empty (the common case).
- The **top bar has no `flex-wrap` / no `overflow-x`** — ~13 controls
  (DocumentMenu, Undo/Redo, spacer, Preview, AdapterSwitcher, ThemeSwitcher,
  ThemeEditor, ColorMode, Share, Import, Export, Save, Load) in a single row.
- **Zero responsive breakpoints** in the chrome. (The `sm:`/`md:` etc. and the
  "responsive" docs hits all concern the *document being designed* — the canvas
  breakpoint feature — not the editor UI.)

**Behavior by width** (static CSS analysis; Group D confirms with screenshots):

| Width | Today |
|---|---|
| ≥1280 desktop | Intended layout, comfortable. |
| ~1024 small laptop | 832px chrome → canvas ≈ 190px; tight. |
| ~768 tablet | Fixed chrome ≈ the whole width → canvas collapses / the row overflows; toolbar clips. |
| <640 phone | Unusable: canvas (flex-basis 0) collapses first, panels shrink below content, toolbar overflows. |

## Goal

The editor is **first-class on tablet/landscape and narrow laptops**, and
**degrades gracefully (not brokenly) on phones**. At ≥`lg` (1024px) the layout
is **unchanged** (ideally byte-identical). Below `lg`, side panels become
toggleable overlay drawers so the canvas keeps full width, and the toolbar
collapses its secondary controls into an overflow menu — nothing clips.

```
≥ lg (1024)         md–lg (768–1024)            < md (768)
┌──┬─────────┬──┐   ┌──────────────────┐        ┌──────────────────┐
│L │ canvas  │R │   │ ☰  toolbar    ⋯ ⧉│        │ ☰  ⋯           ⧉ │
│  │         │  │   ├──────────────────┤        ├──────────────────┤
└──┴─────────┴──┘   │     canvas       │        │     canvas       │
  docked columns    │  (panels = slide- │        │  (full-width;    │
  (today, unchanged)│   in drawers)     │        │   drawers + hint)│
                    └──────────────────┘        └──────────────────┘
```

## Honest scope boundary — touch & phones

Craft.js drag-to-add uses **HTML5 drag-and-drop, which does not fire on touch**.
So *full* mobile authoring (drag a component from the toolbox onto the canvas
with a finger) is out of reach without a touch-DnD shim — explicitly **out of
scope** here. Phase 25 makes the chrome *fit and not clip* on small/touch
screens (inspect, select, edit props, undo/redo, reorder via Layers, save) and
shows a dismissible hint that drag-add wants a pointer / larger screen. Tablet
with a pointer, and narrow desktop windows, get the full experience.

## In-scope

| Group | Theme |
|---|---|
| A | Layout primitives — a viewport/breakpoint hook, panel open/close UI state (docked ≥lg vs drawer <lg), and a reusable off-canvas Drawer shell (a11y: focus trap, Esc, backdrop) on `--ed-*` tokens |
| B | Make the panels responsive — LeftAside + Inspector + OverlayStage wired into docked-vs-drawer; toolbar panel-toggle buttons that appear only <lg; auto-open inspector on selection (narrow), close on canvas tap |
| C | Toolbar overflow — group SaveLoadBar controls (primary always-visible, secondary into a `⋯` overflow menu below a breakpoint); guarantee no horizontal clipping |
| D | Small-screen polish + verification — phone hint banner, sensible min behavior, screenshots at 375/768/1024/1440 as the gate, docs + close-out |

## Resolved decisions

### 1. One structural breakpoint: `lg` (1024px) — docked vs. drawer

At ≥`lg` the body row is the **current docked columns, unchanged**. Below `lg`,
each side panel renders as an **overlay drawer** (absolutely positioned, slides
in over the canvas, backdrop dims the canvas) so the canvas always gets full
width. Driven by a single `useEditorViewport()` hook (`matchMedia('(min-width:
1024px)')`, mirroring the existing `useEffectiveColorScheme` pattern in
`src/themes/colorMode.ts`). The toolbar overflow (Group C) uses its own,
narrower breakpoint (`md`) since controls clip before the panels do.

### 2. Tabify the right panel at ALL sizes — reclaim the always-on OverlayStage

`OverlayStage` is rendered unconditionally and is `shrink-0` — 320px gone even
when no overlays exist (the common case, where it's just an empty hint).
**Decision (confirmed):** the right side becomes **one panel with Properties /
Overlays tabs at every breakpoint** — the same pattern `LeftAside` uses for
Components / Layers. This is a single, consistent right-side structure (docked
column ≥lg, drawer <lg), and it **reclaims 320px on the desktop** too, not just
in the narrow layout. It changes today's two-column desktop right side, so
Group D's desktop screenshots (1024/1440) gate the visual result.

### 3. Panel state lives in `editorStore`, but desktop ignores it

Add a small UI slice (`leftPanelOpen`, `rightPanelOpen`, defaulting closed). At
≥`lg` the docked columns render regardless of the flags (always visible); the
flags only drive the drawers <`lg`. Keeps one source of truth and lets the
toolbar toggles, canvas-tap-to-close, and auto-open-on-select all coordinate
without prop drilling. UI-only; not persisted in the document.

### 4. Toolbar: primary stays, secondary collapses into `⋯`

Group the ~13 controls: **primary** (always visible) = DocumentMenu, Undo/Redo,
Save, and the panel toggles; **secondary** (into a `⋯` overflow menu below `md`)
= Import, Export, Share, AdapterSwitcher, ThemeSwitcher, ThemeEditor, ColorMode,
Preview. Above `md` the bar looks exactly as today. The overflow menu reuses the
existing menu primitive (as `DocumentMenu` does) — no new dependency.

### 5. Drawers are editor-owned chrome, themed by `--ed-*`

The off-canvas Drawer shell is built in `src/editor/` from the existing
overlay/portal patterns (or a minimal absolutely-positioned panel) — NOT the
`drawer` *document canonical* (that's content the user designs). It uses only
`--ed-*` chrome tokens so `check:chrome` stays green and the chrome theme
(light/dark/custom) applies. Backdrop, focus trap, Esc-to-close, and
`aria-modal` for a11y.

### 6. `hideChrome` + responsive compose

Under `hideChrome` (Phase 23) the toolbar/banners are already gone; the
responsive drawers + canvas still apply. An embed at a narrow width gets the
canvas + drawer-toggle affordances without the document-management bar.

## Group A — Layout primitives + breakpoint state

**Land**

1. `useEditorViewport()` (e.g. `src/editor/responsive/useEditorViewport.ts`) —
   `matchMedia` based, returns `{ isDesktop }` (≥lg) and `{ isCompact }` (<md)
   for the toolbar; SSR/headless-safe (guards `window`/`matchMedia`), mirrors
   `useEffectiveColorScheme`.
2. `editorStore` UI slice: `leftPanelOpen` / `rightPanelOpen` (+ setters,
   `closeAllPanels`). UI-only.
3. A reusable `<ChromeDrawer side="left|right">` shell: portal/absolute overlay
   under the editor root, `--ed-*` tokens, backdrop, focus trap, Esc, restores
   focus on close. No-op (renders its docked children inline) at ≥lg.
4. Tests: the hook reacts to `matchMedia` change events; the store toggles;
   the drawer traps focus + closes on Esc/backdrop; ≥lg renders children docked
   (no overlay).

**Output** — the primitives exist; **no visible change yet** (panels not wired).

## Group B — Panels become responsive

**Land**

1. Wire `LeftAside` as the **left drawer** <lg (toggle = a `☰` button at the
   left of the toolbar), docked column ≥lg.
2. Consolidate `Inspector` + `OverlayStage` into **one right panel with
   Properties / Overlays tabs at ALL sizes** (Decision 2) — a docked single
   column ≥lg (replacing today's two columns), the right drawer <lg (toggle
   button). One component, one structure, both breakpoints.
3. Auto-open the right drawer on selection when compact, and close panels on a
   canvas tap. **Must not perturb the selection-sync path** — panel-open is a
   separate store write, decoupled from the `flushSync` selection mirror (see
   Risks).
4. Tests: <lg the panels are drawers (closed by default, open on toggle);
   selecting a node opens the inspector drawer (compact); ≥lg the three-column
   docked layout is intact.

**Output** — below `lg`, the canvas is full-width and panels slide in on demand.

## Group C — Toolbar overflow

**Land**

1. Split `SaveLoadBar` into primary + secondary (Decision 4); render secondary
   inline ≥md and inside a `⋯` overflow menu <md.
2. Ensure the bar never overflows horizontally at any width (no clipping); the
   panel-toggle buttons (Group B) live here, shown only <lg.
3. Tests: <md the secondary controls are in the overflow menu and reachable;
   ≥md the bar is unchanged; all actions still fire from wherever they render.

**Output** — the toolbar fits every width with no clipped/inaccessible controls.

## Group D — Small-screen polish + verification

**Land**

1. A dismissible **small-screen hint** (<sm, phone) — "Optimized for larger
   screens; drag-to-add needs a pointer" — remembered in localStorage. Not a
   hard block.
2. Sensible floor: the chrome stays usable down to ~360px (no negative widths,
   no clipped controls); document the supported range.
3. **Screenshots at 375 / 768 / 1024 / 1440** (dev server + Playwright — reuse
   the Phase 22 browser tooling) as the make-or-break gate; attach to the PR.
4. Docs: INTEGRATION_GUIDE "Responsive & supported viewports" (tablet/desktop
   first-class, phone degraded, touch-DnD caveat); CHANGELOG; version cut.

**Output** — confirmed responsive across the four widths; phase complete; cut.

## Out of scope

| Item | Why |
|---|---|
| Touch drag-to-add (finger DnD onto canvas) | Craft uses HTML5 DnD (no touch events); a touch-DnD shim is a separate, larger effort. Layers-reorder + props editing cover light touch use. |
| A full mobile-first redesign of every panel's internals | This phase reflows the *shell*; per-panel content stays as-is (it already scrolls internally). |
| Changing the canvas breakpoint feature (the document's own responsive editing) | Unrelated — that's about the design being built, not the editor UI. |
| Persisting panel open/close in the document | UI-only, per-session; the envelope shape is frozen. |

## Risks + mitigations

1. **Regressing the desktop (≥lg) layout.** Mitigation: the docked path renders
   exactly as today (the drawer shell is inert ≥lg); Group D screenshots at 1024
   and 1440 gate it; `check:chrome` stays green (drawers use `--ed-*` only).
2. **Auto-open-inspector fights the selection sync.** Selection visual feedback
   requires a `flushSync` + sync `editorStore` write (see
   [[feedback_selection_sync]]). Opening the drawer on selection must be a
   *separate* store update, not folded into that write, or it risks an
   off-by-one / lag regression. Test selection on a compact viewport explicitly.
3. **Drawer focus trap / a11y bugs.** Mitigation: `aria-modal`, Esc, backdrop,
   focus restore on close; reuse the established overlay patterns; axe pass.
4. **Touch users expect to drag-add and can't.** Mitigation: the explicit hint
   (Group D) sets expectations; Layers + props editing remain usable on touch.
5. **Tabifying the right panel at all sizes (Decision 2) changes the desktop.**
   It replaces today's two docked columns (Overlays + Properties) with one
   tabbed column. Mitigation: Group D's 1024/1440 screenshots gate the visual
   result; the existing right-panel content (Inspector body, overlay stage list)
   is reused unchanged — only the container/tab shell is new. If the desktop
   result is unwelcome on review, the fallback is "tabify only <lg."

## Open questions

1. ~~Tabify the right panel at all sizes vs. only <lg?~~ **RESOLVED — tabify at
   ALL sizes** (Decision 2). Desktop goes to a single tabbed right column,
   reclaiming 320px.
2. **Structural breakpoint at `lg` (1024) or `xl` (1280)?** `lg` keeps docked
   columns on small laptops (832px chrome → ~190px canvas — tight but docked);
   `xl` would switch small laptops to drawers (roomier canvas) at the cost of
   changing a common laptop width from today's behavior. (Recommend: `lg`.)
3. **Phone (<sm): degrade-with-hint, or also offer a "preview-only" stripped
   mode** (canvas + inspector, no toolbox)? (Recommend: degrade-with-hint for
   v1; stripped mode is a follow-up.)

## Definition of done

The editor chrome reflows responsively: docked columns ≥`lg` (desktop
unchanged), overlay drawers + full-width canvas below `lg`, a toolbar overflow
menu below `md`, and a graceful phone hint — with **no clipped or inaccessible
controls at any width**, verified by screenshots at 375/768/1024/1440;
`check:chrome` green; touch-DnD limitation documented; release cut.
