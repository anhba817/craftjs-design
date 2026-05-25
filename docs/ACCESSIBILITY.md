# Accessibility

Target: **WCAG 2.1 Level AA** for the editor chrome (toolbar, toolbox,
inspector). The *output document* — what designers build with the editor —
is the designer's responsibility; this document is about the editing
experience itself.

This is a *static* audit. Read the source, flag what's covered and what's
not. The matching axe-core scan against a real browser run lands here as a
"Audit findings" section in a future pass.

## Coverage status

### Shipped — icon-only buttons all carry `aria-label`

Verified by grep of the editor's interactive components:

| File | Icon-only button | aria-label |
|---|---|---|
| `Toolbox.tsx` | Favorite star toggle | `'Favorite'` / `'Unfavorite'` |
| `UndoRedo.tsx` | Undo / Redo buttons | `'Undo'` / `'Redo'` |
| `ShareButton.tsx` | Copy link / Copy as JSON | (text-bearing buttons — no label needed) |
| `EyedropperButton.tsx` | Pipette icon button | `'Pick color from screen'` |
| `ResizeToggle.tsx` (removed Phase 7) | n/a | replaced by canvas overlay |
| `ArrayField.tsx` | Move up / Move down / Remove | `'Move up'` / `'Move down'` / `'Remove'` |
| `GradientEditor.tsx` | Add stop / Remove stop | `'Add stop'` / `'Remove stop'` |
| `Inspector.tsx` | Delete | text-bearing (button reads "Delete") |
| `ResizeOverlay.tsx` | Resize handles | `aria-hidden` on the overlay container (decoration only — Inspector's SizePanel is the keyboard-accessible path) |
| `DocumentMenu.tsx` | Rename / Duplicate / Delete | text-bearing (icon + text label) |

### Shipped — text-bearing buttons

Inspector buttons (Delete, Rename, etc.) carry visible text labels; the
icon is decorative. No aria-label needed; the button's text content is the
accessible name.

### Shipped — form inputs paired with labels

Every panel row wraps inputs in `<PanelRow label="...">` which renders a
`<label>` association via the visible label text — see
`src/editor/inspector/shared/PanelRow.tsx`.

### Shipped — focus rings via shadcn defaults

shadcn's primitives ship with `:focus-visible` rings via the
`outline-ring/50` Tailwind layer in `index.css`. Custom buttons (`Toolbox`
entries, `UndoRedo`, etc.) inherit the browser default focus ring.

### Acceptable — `tabular-nums` for numeric readouts

`HslSliders` / `RgbSliders` readouts use `tabular-nums` for stable
character width during drag. Reduces visual jitter for users with vision
sensitivity to small movements.

### Acceptable — sliders use native `<input type="range">`

Browser handles keyboard focus + arrow-key adjustment + screen-reader
semantics natively. No custom slider logic to break.

## Known gaps

These are documented to scope the gap honestly — not all are blockers for
Phase 8 sign-off. Phase 9+ polish picks them up.

### Shipped — Toolbox keyboard navigation (Phase 9 § 1.5)

The Toolbox implements the WAI-ARIA toolbar pattern with roving tabindex.
The component list is `role="toolbar"` with `aria-orientation="vertical"`;
exactly one component button is tab-focusable at a time. Keys:

| Key | Action |
|---|---|
| `Tab` | Enters / exits the toolbar (one tab stop for the whole region) |
| `ArrowDown` / `ArrowUp` | Move focus to next / previous component (crosses section boundaries) |
| `Home` / `End` | First / last component |
| `Enter` or `Space` | Drop the focused component. Selection-aware: child of ROOT (no selection), child of the selected canvas (canvas selected), sibling AFTER the selected node (non-canvas selected) |
| `F` | Toggle the favorite star on the focused row |
| `/` | Focus the search input (also works from inside the input — refocuses + selects) |
| `Escape` (in search) | Clear the search query and return focus to the first component |

Implementation: `src/editor/Toolbox.tsx`. The favorited buttons stay
`tabIndex={-1}` so they don't fragment the roving rotation — `F` is the
keyboard path; mouse users click directly.

### Shipped — Canvas keyboard navigation (Phase 9 § 1.4)

The canvas region (`<CanvasKeyboardRegion>` in
`src/editor/canvas/CanvasKeyboardRegion.tsx`) is a single tab stop. Arrow
keys move the **selection** directly — there is no separate keyboard-focus
state. The ResizeOverlay's dashed outline + 8 resize handles is the
visual indicator, identical to mouse-driven selection. This matches the
pattern used by Figma's layers panel, file managers, and IDE outline
views: arrows = move selection.

Key map (active when focus is inside the canvas region):

| Key | Action |
|---|---|
| `Tab` | Enters / exits the canvas region (one tab stop). When entering with no current selection, ROOT is selected. |
| `ArrowDown` | Selects the next node in pre-order (first child if any, else next sibling, else next ancestor's sibling). |
| `ArrowUp` | Selects the previous node in pre-order (previous sibling's deepest descendant, else parent). |
| `ArrowRight` | Selects the first child (else next sibling). |
| `ArrowLeft` | Selects the parent. |
| `Escape` | Clears selection; returns focus to the region wrapper. |
| `Delete` or `Backspace` | `actions.delete(selectedId)` (ROOT exempt); selection moves to next sibling, previous sibling, or parent in that preference order. |

Implementation notes:

- The keydown listener attaches at `document` level (not as a React
  `onKeyDown`) because some Craft.js connectors / Radix overlays attach
  direct DOM listeners that can call `stopPropagation` on synthetic
  events. The handler gates on
  `containerRef.current?.contains(document.activeElement)` so arrow
  keys outside the canvas (Inspector inputs, Toolbox) stay unaffected.
- Form inputs nested inside a canvas node (an editable text canonical,
  for instance) keep their own arrow-key behaviour — the handler
  returns early when the event target is an `<input>`, `<textarea>`,
  or `contenteditable` element.
- Each canvas node's DOM gets `tabindex=-1` from
  `CanonicalNode.attachRef` so click-focus works for all browsers
  (Safari requires explicit tabindex to focus a `<div>` on click).
- After delete or arrow navigation, the new selection auto-scrolls
  into view via `scrollIntoView({ block: 'nearest' })`.

### Future — color contrast of token swatches

`ColorPicker`'s token swatches show the token's color as background. Some
token colors (`muted`, `secondary`) are subtle and may not meet 3:1
contrast against the popover background. Not a contrast failure for *text*
(the swatch is decorative), but the active-state ring (`ring-primary/40`)
should be verified.

**Recommended**: visual review with axe-core in a real browser.

### Future — Toolbox search input lacks visible label

`<input placeholder="Search components…" />` is the search input; the
placeholder is the only visible label. Screen reader users hear the
placeholder, which is acceptable but not ideal — best practice is an
explicit `<label>`.

**Recommended**: wrap in `<label>` with a visually-hidden span: `<label><span class="sr-only">Search components</span><input ... /></label>`.

### Future — modal dialog focus trap

`window.confirm` is used for the "Delete document?" confirmation in
`DocumentMenu`. The browser-native dialog handles its own focus trap.
Future polish replacing with a custom modal would need to manually trap
focus.

### Future — screen reader announcements for canvas changes

When a node is dropped on the canvas, screen readers don't announce it.
Adding `aria-live` regions for "Component dropped" / "Node selected" would
help. Out of Phase 8 scope.

## Color contrast (informational)

Editor chrome uses the standard shadcn neutral palette:
- Background: `oklch(1 0 0)` (white)
- Foreground: `oklch(0.145 0 0)` (~#252525, near-black)
- Muted background: `oklch(0.97 0 0)`
- Muted foreground: `oklch(0.556 0 0)` (~#8c8c8c, gray-500)

The `muted-foreground` against `background` is ~4.6:1 — passes WCAG AA for
normal text (4.5:1 required). Verified visually; an axe-core scan would
confirm.

## Audit plan

Phase 8 Group I runs an axe-core scan in dev mode and records findings
here. Initial expected findings:

1. `Toolbox.tsx` search input — wrap in `<label>` per the gap above.
2. Color contrast of muted-on-muted backgrounds — verify.
3. ResizeOverlay handles announced as buttons — they aren't `<button>`s
   today (they're `<div onMouseDown>`); switch to `<button>` so keyboard
   users can at least focus them, then implement arrow-key resize as a
   Phase 9 stretch.
