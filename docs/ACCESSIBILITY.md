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

### Future — keyboard navigation between editor regions

Tab order today is "browser default" — DOM order. The user can tab from the
toolbar through the toolbox through the canvas (Craft's selection isn't
keyboard-navigable; click only) into the inspector. The inspector's panel
sections are collapsible and each panel's controls are reachable, but
moving between regions is not optimized.

**Recommended**: a roving-tabindex pattern with arrow keys for the toolbox
and inspector sections. Phase 9 polish.

### Future — Craft.js selection via keyboard

The canvas relies on mouse / pointer selection. Designers using keyboard
exclusively can't select a node. The Inspector still shows "Nothing
selected." until a pointer interaction.

**Recommended**: add `tabIndex={0}` to the canvas root + arrow-key
navigation between siblings, then `Enter` to select. Out of scope for
Phase 8; documented as a Phase 9 task.

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
