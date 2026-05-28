# Phase 13 — Component breadth (Section 5)

**Status:** planned
**Cuts as:** `0.4.0`
**Audience:** the people who'll author the new canonicals + adapter impls.
**Scope discipline:** PRODUCTION_READINESS § 5 non-Stretch only. Stretch
(5.8 charts, 5.9 editor primitives) stays queued for later phases.

## Goal

`0.3.0` raised the design ceiling (Phase 12 — Style depth). Phase 13 raises
the **content ceiling**: from 20 baseline canonicals to ~50, covering data
display, navigation, overlays, feedback, layout primitives, time pickers,
and media. That's the difference between "a builder for one-pagers" and "a
builder for real apps".

In-scope items (PRODUCTION_READINESS § 5.1–5.7, all marked non-Stretch):

| § | Group | Canonicals (this plan's breakdown) |
|---|---|---|
| 5.5 | A — Layout primitives | Grid, Container, Spacer, Section |
| 5.1 | B — Data display | Table + TableRow + TableCell, DataList + DataListItem, Code, Skeleton |
| 5.2 | C — Navigation | Breadcrumb, Pagination, NavMenu + NavItem, Stepper |
| 5.3 | D — Overlays | Modal, Drawer, Toast, Tooltip, Popover |
| 5.4 | E — Feedback | Progress, Spinner |
| 5.6 | F — Time | DatePicker, TimePicker, DateRangePicker |
| 5.7 | G — Media | Video, Audio, Carousel |
|  | H — Close-out | verification, docs, `0.4.0` cut |

~30 canonicals total. Layout ships first so later groups can compose with
Grid / Container.

---

## Resolved decisions

These shape every group. Settled before writing the plan so authors don't
re-litigate them per component.

### 1. Adapter parity: shadcn + MUI full, Chakra subset

Every new canonical ships in **shadcn** and **MUI**. The Chakra example
adapter does NOT need new entries — it's a third-party-adapter demo, not a
production target, and forcing parity there triples the work for marginal
value. The "missing renderer" error fires only when a host activates the
Chakra adapter and uses one of the new canonicals; acceptable for a demo.

### 2. Overlay editing: inline-open

Modal / Drawer / Toast / Tooltip / Popover render **always-open inline** in
the editor (so their content is a normal drop target), and as the real
triggered overlay at runtime. Adapters branch on Craft's `useEditor()
.enabled` — `true` = editing → inline; `false` = preview/runtime → real
overlay. Mirrors the Phase 12 state-preview philosophy (the editor shows
what you can't otherwise reach).

### 3. Heavy multi-canvas: prefer real HTML semantics over dynamic slots

Table and NavMenu decompose into the HTML primitives:

- **Table = Table (canvas of rows) + TableRow (canvas of cells) + TableCell
  (canvas of content).** Each is a normal canvas — no dynamic slot keys.
  More canonicals, but each one is small and arbitrarily nestable like
  real HTML.
- **NavMenu = NavMenu (canvas of NavItems) + NavItem (link-like, optional
  nested NavMenu).** Same shape.

Carousel uses the **dynamic `canvasSlots` function** (like Tabs) keyed off
`props.slides`, because the slide list is structurally fixed-arity per
slide.

### 4. Time pickers ship native, no heavy deps

DatePicker / TimePicker / DateRangePicker use `<input type="date"|"time">`
under the hood in both shadcn and MUI. Avoids adding `@mui/x-date-pickers`
(MUI's date package — paid pro for some features) and the calendar weight.
A "rich" calendar UI is a Stretch follow-up.

### 5. Static previews for interactive components

Pagination, Stepper, Carousel, Modal-content, etc. render as **static
previews** in the editor (whichever step / slide / page is currently
selected via props is shown — same approach as Tabs). Real interactivity
is preview-mode / runtime only.

---

## Cross-cutting work

These show up in multiple groups and are factored once.

1. **`useIsEditing()` helper** — a tiny wrapper around Craft's
   `useEditor((state) => state.options.enabled)` for adapter impls
   (overlays, carousel auto-rotate, etc.). Lives in `src/sdk/hooks.ts`.
2. **PropsPanel coverage for the new prop shapes** — number sliders,
   string-array editors (already have `ArrayField`), URL inputs (reuse
   `ImagePicker` for Video/Audio src? — they're URLs, not images; an
   `AssetPicker` would generalize but isn't required for v1, accept a
   plain URL string field).
3. **Toolbox categories.** No new categories needed — `layout` / `display`
   / `navigation` / `feedback` / `media` / `input` already exist (Phase 12
   map). Time pickers go under `input`. Overlays go under a new sentinel
   sub-grouping inside `display` (or we add an `overlay` category if the
   toolbox looks cluttered — decide in Group D when we can see it).
4. **Tests pattern per canonical:** one registration test (id, slots,
   defaults parse via the schema) + one targeted test per non-trivial
   behavior (dynamic slot keys, dynamic count). Adapter impls are
   smoke-checked via the existing AdapterContext snapshot tests.

---

## Group A — Layout primitives (§ 5.5)

**Land**

- **Grid.** Canvas; props: `cols` (1–12), `gap` (token). Outer `display:
  grid` with `grid-template-columns: repeat(cols, 1fr)`. Adapter impls map
  to `div className="grid grid-cols-…"` (shadcn) and `<Box display=grid>`
  (MUI). Drop target.
- **Container.** Canvas; props: `maxWidth` (sm/md/lg/xl/2xl/full). Wraps
  children with `mx-auto max-w-…`. Pattern A single canvas.
- **Spacer.** Leaf; props: `size` (0–96 token / arbitrary px), `axis`
  (vertical/horizontal). Renders an empty div with width or height.
- **Section.** Canvas; semantic wrapper rendering a `<section>`. No
  visible chrome by default. Includes an aria-`label` prop.

**Output**

- 4 canonicals, 8 adapter impls (shadcn + MUI), 4 registration tests.
- Layout primitives composable as drop targets — unblocks later groups
  (Card alternatives, list layouts, etc.).

---

## Group B — Data display (§ 5.1)

**Land**

- **Table + TableRow + TableCell.** Pattern: Table is a canvas accepting
  TableRow children only; TableRow is a canvas accepting TableCell children
  only; TableCell is a normal content canvas. Document the parent-child
  rules in the canonicals' `tags` (later phase can enforce via a `accepts`
  field — out of scope here). 3 canonicals.
- **DataList + DataListItem.** DataList is a canvas of DataListItems.
  DataListItem is a leaf with `term` + `description` string props (renders
  `<dt>` + `<dd>`). 2 canonicals.
- **Code.** Leaf; props: `language` (curated enum), `content` (string).
  Renders a `<pre><code>` with mono font; **no syntax highlighting in v1**
  (shiki / highlight.js are big). Language label badge in the corner.
- **Skeleton.** Leaf; props: `variant` (text/rectangle/circle), `width`,
  `height`. Pulsing placeholder.

**Output**

- 7 canonicals, 14 adapter impls, ~6 tests.
- Designers can lay out real data UIs (settings pages, dashboards, KV
  panels) without resorting to nested Box hacks.

---

## Group C — Navigation (§ 5.2)

**Land**

- **Breadcrumb.** Leaf; props: `items: Array<{ label, href? }>`. Renders a
  horizontal `<nav>` with separators. ArrayField in PropsPanel for the
  items.
- **Pagination.** Leaf; props: `pageCount` (number), `currentPage` (number,
  for the static preview). Renders prev / next buttons + numbered range.
- **NavMenu + NavItem.** NavMenu is a canvas of NavItems. NavItem has
  `label`, `href`, optional `icon`, and an OPTIONAL nested NavMenu slot
  for submenus (Pattern B multi-canvas with one canvas slot named
  `submenu`). 2 canonicals.
- **Stepper.** Leaf; props: `steps: Array<{ label, description? }>`,
  `currentStep` (number). Horizontal stepper with completed / current /
  upcoming states (driven by `currentStep` for the editor preview).

**Output**

- 5 canonicals, 10 adapter impls, ~5 tests.
- Real apps' shell components (admin sidebars, wizards, paginated lists)
  buildable without code.

---

## Group D — Overlays (§ 5.3)

**Land**

- **Modal.** Canvas; props: `title`, `description`, `size`
  (sm/md/lg/full). Editing: renders inline as a bordered card (always
  open). Runtime: shadcn `<Dialog>` / MUI `<Dialog>`; opens via a sibling
  trigger node (out of scope for now — Modal is content-only; a
  `<Button>` next to it can be wired manually).
- **Drawer.** Canvas; props: `side` (left/right/top/bottom), `size`.
  Editing inline; runtime via shadcn `<Sheet>` / MUI `<Drawer>`.
- **Toast.** Leaf; props: `title`, `description`, `intent`
  (info/success/warning/error). Editing inline as a positioned card;
  runtime via the adapter's toast primitive.
- **Tooltip.** Canvas wrapping a single child + a `content` string prop.
  Editing: child + tooltip card both visible. Runtime: real on-hover.
- **Popover.** Like Tooltip but the content is a canvas slot (richer
  content). Editing inline as a card next to the trigger; runtime real.

**Output**

- 5 canonicals, 10 adapter impls, ~5 tests (including the
  `useEditor().enabled` branch on at least one).
- The `inline-open` pattern documented as the SDK contract for any
  custom overlay canonicals SDK consumers add.

---

## Group E — Feedback (§ 5.4)

**Land**

- **Progress.** Leaf; props: `value` (0–100), `variant` (linear/circular).
- **Spinner.** Leaf; props: `size` (sm/base/lg).

**Output**

- 2 canonicals, 4 adapter impls, ~2 tests.

---

## Group F — Time (§ 5.6)

**Land**

- **DatePicker.** Leaf wrapping `<input type="date">`; props: `value`,
  `min`, `max`, `disabled`. Both adapters render the same primitive
  (native input gives consistent cross-browser behavior without a date
  library).
- **TimePicker.** Same shape with `<input type="time">`.
- **DateRangePicker.** Two native inputs side-by-side with a `–`
  separator; props: `start`, `end`, `min`, `max`.

**Output**

- 3 canonicals, 6 adapter impls, ~3 tests. **Note:** "rich" calendar UI
  (popover with month grid) is queued as a Stretch follow-up — see the
  Out of scope table.

---

## Group G — Media (§ 5.7)

**Land**

- **Video.** Leaf; props: `src` (URL), `poster` (URL), `controls`
  (boolean), `autoplay` (boolean), `loop` (boolean), `muted` (boolean).
  Renders a `<video>`.
- **Audio.** Leaf; props: `src`, `controls`, `autoplay`, `loop`. Renders
  an `<audio>`.
- **Carousel.** Pattern B dynamic-canvas (like Tabs). Props: `slides:
  Array<{ id }>`, `currentSlide`. `canvasSlots: (props) =>
  slideSlotKeys(props.slides)`. Editor preview shows the current slide;
  runtime is the adapter's real carousel.

**Output**

- 3 canonicals, 6 adapter impls, ~3 tests (slide-key derivation, like
  Tabs has).

---

## Group H — Verification + close-out

**Land**

1. **Smoke pass.** Drop every new canonical, edit its props, verify it
   renders in shadcn + MUI; switch to the Chakra adapter and confirm the
   "missing renderer" error message lists the new ids gracefully.
2. **`npm run build:dist`** emits `.d.ts` for any new SDK additions
   (`useIsEditing`, any helpers exposed for dynamic-canvas keys).
3. **Doc updates:**
   - PRODUCTION_READINESS § 5 — status banner; per-item ✅ markers for
     5.1–5.7; 5.8/5.9 left as Stretch.
   - CHANGELOG `0.4.0` entry; version bump.
   - SDK_GUIDE — overlay editor-mode contract, dynamic-canvas helper.
   - INTEGRATION_GUIDE — Chakra-subset policy noted.
   - DEVELOPER_GUIDE recipe: "Authoring a canvas canonical" +
     "Authoring an overlay canonical (inline-open)".
4. **Close-out section** in this file (per-group canonical count, decisions,
   bundle delta, total canonicals registered).

**Output**

- Phase 13 complete; `0.4.0` cut. Phase 14 (Section 6 — persistence
  beyond localStorage) unblocked.

---

## Out of scope (NOT in Phase 13)

Section 5 Stretch items + later sections.

| Item | Section | Why deferred / Phase target |
|---|---|---|
| Charts (Line/Bar/Pie/Area/Sparkline) | § 5.8 | Stretch. Real chart support needs a library (Recharts / Visx); decide whether to bundle in a later phase. |
| Markdown / WYSIWYG / KaTeX renderers | § 5.9 | Stretch. Each is its own large dependency. |
| Rich calendar popover for time pickers | § 5.6 follow-up | v1 ships native inputs; a rich calendar is queued. |
| Syntax highlighting in Code | § 5.1 follow-up | Shiki/HL.js is heavy; queued. |
| Chakra-example impls for new canonicals | (adapter-strategy decision) | The Chakra adapter is a third-party-adapter demo; growing it for every new canonical isn't load-bearing. |
| `accepts` rule on canonicals (Table → only TableRow) | architectural follow-up | The HTML semantics are documented in tags; enforcement can come later. |
| `AssetPicker` for arbitrary URL fields (Video/Audio src) | DX polish | A plain URL string input ships first; a generalized asset picker is queued. |
| Sections 6+ | § 6–14 | Later phases. |

---

## Risks + mitigations

No valves. Every risk has a mitigation that delivers the item.

1. **Volume — ~30 canonicals × 2 adapters = ~60 component files.**
   Mitigation: every new canonical follows one of three templates already
   in the repo (leaf like Button, single-canvas like Box, multi-canvas
   like Card/Tabs). Authors copy + adapt; the cross-cutting hooks +
   `useIsEditing` are shared.
2. **Table's nested-canvas model.** Mitigation: three separate canonicals
   (Table / TableRow / TableCell) keeps each one ordinary. Cross-component
   rules ("Table only accepts TableRow children") are documented in tags
   for v1; enforcement is a later phase.
3. **Overlay editor-mode branching is easy to forget.** Mitigation:
   `useIsEditing()` hook + a documented adapter contract; the Group D
   close-out section lists every overlay's branch.
4. **MUI's date package is heavy.** Mitigation: native `<input
   type="date">` for v1; a "rich calendar" follow-up can opt into
   `@mui/x-date-pickers` per-adapter when needed.
5. **Bundle delta from the new adapter impls.** Mitigation: measure at
   close-out; if the JS budget tightens, the per-adapter impls are
   tree-shake-friendly (one file per component), and a follow-up can
   split the MUI adapter into its own subpath.
6. **The Chakra-example adapter being incomplete now visibly diverges from
   shadcn / MUI.** Mitigation: document the subset policy in
   INTEGRATION_GUIDE; the "missing renderer" error already lists the
   canonical id when a host tries one Chakra doesn't implement.

---

## Definition of done

Every § 5 non-Stretch canonical is **shipped + tested + rendered in shadcn
and MUI**. The `0.4.0` close-out lists each canonical with its multi-canvas
pattern (Pattern A / Pattern B-static / Pattern B-dynamic) and the file
locations.

When all 7 in-scope groups satisfy this bar, Phase 13 is complete and
Phase 14 (Section 6 — persistence beyond localStorage) is unblocked.
`0.4.0` cuts at the close-out commit.
