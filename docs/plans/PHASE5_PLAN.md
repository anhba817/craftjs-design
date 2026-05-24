# Phase 5 — Component Breadth + Toolbox UX

> Fill out to 20 canonical components. Two Pattern B composites (Card, Tabs) introduce multi-slot containers. Full toolbox UX: categories, search, favorites, recently-used. Both adapters reach parity on the new components.

## Goal

End-state user experience: open the editor, see a properly-organized toolbox of 20 components grouped by category with search, favorites, and recents. Drop a Card with header/body/footer; nest other components inside each slot. Author multi-tab navigation with Tabs. The 16 new canonicals all render cleanly under both shadcn and MUI.

## Exit criteria

1. Toolbox shows **20 canonicals** grouped by category. Search bar filters by name + tags. Favorites section pins user-starred canonicals (persisted). Recently-used section tracks last ~5 dragged canonicals.
2. Each new canonical renders correctly under **both adapters**. Swapping adapter with new canonicals on canvas does not break.
3. **Card** ships with three named slots (`header`, `body`, `footer`). User can drag children into each slot independently. Slot containment is visible: child Boxes dropped into "header" stay in the header region.
4. **Tabs** ships with two named slots (`tabs`, `content`). User can author multi-tab UIs by adding Button-like children to `tabs` slot and content children to `content` slot. Active tab is a canonical prop editable via Props panel.
5. Save → reload → all new canonicals restore with their state and slot children intact.
6. Inspector handles slot selection: when a Pattern B canonical is selected, the Inspector exposes which slot's classes the user is editing (via a slot picker above the panels).

---

## Scope decisions (locked)

- **16 new canonicals**: Heading, Link, Image, Card, Stack, Divider, Icon, Badge, Avatar, Alert, Select, Checkbox, Radio, Switch, Textarea, Tabs.
- **Pattern B for Card + Tabs** (multi-slot composites). Alert stays Pattern A (variant prop).
- **Responsive arbitrary values deferred to Phase 6** — Phase 4.5's "base-only arbitrary" constraint stays.
- **Full toolbox UX**: categories + search + favorites + recently-used.

### Scope-reduction valves

This plan is **ambitious for the original 2–3 week target** in `IMPLEMENTATION_PLAN.md`. Realistic completion: 4–6 weeks. Four valves to pull mid-phase if a checkpoint slips:

- **Valve A — defer form inputs** (Select / Checkbox / Radio / Switch / Textarea) to Phase 6. Saves 5 canonicals × 2 adapters = 10 impl files plus their `npx shadcn add` runs.
- **Valve B — defer Tabs**. Card remains the sole Pattern B demo. Saves the trickiest composite (active-tab state management).
- **Valve C — defer favorites + recently-used**. Toolbox ships categories + search only. Saves Zustand persistence work for the new state.
- **Valve D — shadcn-only impls for new canonicals**. MUI parity moves to Phase 6. Halves the per-canonical impl work.

Decide each valve at the Group transition where it would help — not up front.

---

## Pre-flight

### 0.1 shadcn primitives

Run once at the start so they're available before component-by-component work:

```sh
npx shadcn add card
npx shadcn add alert
npx shadcn add avatar
npx shadcn add badge
npx shadcn add separator
npx shadcn add checkbox
npx shadcn add radio-group
npx shadcn add switch
npx shadcn add textarea
npx shadcn add tabs
# select is already installed (Phase 4.5)
```

Verify each lands at `src/components/ui/<name>.tsx` and the `@/lib/utils` import works.

### 0.2 Decide if Toolbox UX work goes first or last

Tradeoffs:
- **First**: as you add canonicals, you can immediately see them grouped, searched, favorited. Easier to verify breadth.
- **Last**: the new canonicals exist and the toolbox is the cherry on top. Less risk of scope creep blocking the component work.

**Recommendation: Last.** Group B (toolbox UX) sits at the end. If a valve gets pulled mid-phase, the toolbox shipped last is the cleanest cut.

---

## Target directory additions

```
src/
  registry/components/
    heading.ts, link.ts, image.ts, card.ts, stack.ts, divider.ts,
    icon.ts, badge.ts, avatar.ts, alert.ts, select.ts, checkbox.ts,
    radio.ts, switch.ts, textarea.ts, tabs.ts
  adapters/shadcn/components/
    Heading.tsx, Link.tsx, Image.tsx, Card.tsx, Stack.tsx, Divider.tsx,
    Icon.tsx, Badge.tsx, Avatar.tsx, Alert.tsx, Select.tsx, Checkbox.tsx,
    Radio.tsx, Switch.tsx, Textarea.tsx, Tabs.tsx
  adapters/mui/components/                  (same names, MUI impls)
  craft/
    CanonicalNode.tsx                       # EXTENDED — multi-slot rendering
  state/
    editorStore.ts                          # EXTENDED — favorites, recents
  editor/
    Toolbox.tsx                             # REWRITE — categories + search + favorites + recents
    inspector/
      SlotPicker.tsx                        # NEW — appears for Pattern B canonicals
  components/ui/                            # additions from `npx shadcn add` (see above)
```

---

## Implementation steps

Six groups, ~25 steps total. Each group ends with `tsc -b` + `npm test -- --run` clean and a checkpoint demo.

### Group A — Pattern B foundation (Steps 1–4)

The most architecturally significant work in Phase 5. Get this right before any composite canonicals ship.

#### Step 1 — Confirm `styleSlots` shape supports multiple

The `CanonicalComponent.styleSlots` field already exists (`readonly string[]`). Today every canonical uses `['root']`. Pattern B canonicals declare `['header', 'body', 'footer']` etc. No type changes needed; verify the registry accepts non-root slots.

#### Step 2 — Adapter impls render named sub-canvases

The Pattern B impl renders multiple `<Element id="<slot>" canvas>` children inside the canonical's root layout:

```tsx
// adapters/shadcn/components/Card.tsx
import { Element } from '@craftjs/core'

export function ShadcnCard({ rootRef, className, inlineStyle, style }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn('rounded-md border bg-card', className)} style={inlineStyle}>
      <div className={cn('border-b p-4', style.classes.header)}>
        <Element id="header" canvas>{/* children dropped into header slot */}</Element>
      </div>
      <div className={cn('p-4', style.classes.body)}>
        <Element id="body" canvas>{/* children dropped into body slot */}</Element>
      </div>
      <div className={cn('border-t p-4', style.classes.footer)}>
        <Element id="footer" canvas>{/* children dropped into footer slot */}</Element>
      </div>
    </div>
  )
}
```

Pattern B impls **read `style.classes[slot]` directly** — that's the *intent* of the slot. The convention to consume `className` only is for the *root* slot (which is fed by `composeResponsive`). Sub-slots haven't gone through responsive composition; reading them straight is the right call.

#### Step 3 — Inspector `SlotPicker`

When the selected canonical has `styleSlots.length > 1`, the Inspector mounts a `SlotPicker` above the panels:

```tsx
// editor/inspector/SlotPicker.tsx
export function SlotPicker({ slots, active, onChange }: { slots: readonly string[]; active: string; onChange: (s: string) => void }) {
  return (
    <div className="flex gap-1 border-b p-2">
      {slots.map((s) => (
        <button key={s} onClick={() => onChange(s)} className={cn('px-2 py-1 text-xs rounded', active === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
          {s}
        </button>
      ))}
    </div>
  )
}
```

The `useNodeClasses` hook gains a slot parameter (it already supports it). The Inspector's selected slot becomes a piece of local state.

#### Step 4 — Tests for slot routing

Add a test confirming a Card with edits to `slot.classes.header` round-trips. Pattern B's data shape is the same as Pattern A — just multiple keys in `classes` — so the persistence schema is unchanged. Tests verify nothing in the read/write helpers breaks at slot != 'root'.

### Group B — Simple canonicals (Steps 5–13)

Pure Pattern A canonicals with single root slot. Each ships in roughly the same shape: define in registry, write two adapter impls (shadcn + MUI), wire defaults.

#### Step 5 — Heading

`registry/components/heading.ts`:
```ts
propsSchema: z.object({ level: z.enum(['1', '2', '3', '4', '5', '6']), content: z.string() })
defaults: { props: { level: '2', content: 'Heading' }, style: { classes: { root: 'text-2xl font-bold text-foreground' } } }
```

shadcn: `<h{level} className={className}>{content}</h{level}>`. MUI: `<Typography variant={`h${level}`}>`.

#### Step 6 — Link

`propsSchema: z.object({ href: z.string(), label: z.string(), target: z.enum(['_self', '_blank']) })`.

#### Step 7 — Image

`propsSchema: z.object({ src: z.string(), alt: z.string(), aspectRatio: z.enum(['auto', 'square', '16/9', '4/3']) })`.

#### Step 8 — Stack

Sugar over flex Box with a vertical default. `propsSchema: z.object({ direction: z.enum(['vertical', 'horizontal']), gap: z.enum(['1','2','4','6','8']) })`. Defaults to flex+col+gap-4. isCanvas: true.

#### Step 9 — Divider

Trivial. `propsSchema: z.object({ orientation: z.enum(['horizontal', 'vertical']) })`. shadcn: `<Separator orientation={orientation}>`. MUI: `<Divider orientation={orientation}>`.

#### Step 10 — Icon

`propsSchema: z.object({ name: z.string(), size: z.enum(['sm', 'base', 'lg', 'xl']) })`. Uses `lucide-react` (already installed). Render via dynamic lookup: `const I = Icons[name]; return <I size={...} />`. Both adapters share the same impl (no library divergence).

#### Step 11 — Badge

`propsSchema: z.object({ label: z.string(), intent: z.enum(['primary','secondary','destructive','outline']) })`. shadcn: `<Badge>`. MUI: `<Chip>`.

#### Step 12 — Avatar

`propsSchema: z.object({ src: z.string().optional(), alt: z.string(), fallback: z.string() })`. shadcn: `<Avatar>`/`<AvatarImage>`/`<AvatarFallback>`. MUI: `<Avatar>`.

#### Step 13 — Alert

Pattern A with intent + title + description. `propsSchema: z.object({ intent: z.enum(['info','warning','error','success']), title: z.string(), description: z.string() })`. shadcn: `<Alert>`. MUI: `<Alert severity={intent}>`.

### Group C — Form canonicals (Steps 14–18)

Form components with stateful behavior. In editor mode they must be **non-interactive** (clicks/changes shouldn't fire state updates that confuse the user).

#### Step 14 — Select

`propsSchema: z.object({ label: z.string(), options: z.array(z.object({ value: z.string(), label: z.string() })), defaultValue: z.string(), disabled: z.boolean() })`.

#### Step 15 — Checkbox

`propsSchema: z.object({ label: z.string(), checked: z.boolean(), disabled: z.boolean() })`. In editor: `<Checkbox checked={checked} disabled />` — disabled prevents the editor's click from toggling state.

#### Step 16 — Radio

`propsSchema: z.object({ name: z.string(), options: z.array(z.object({ value: z.string(), label: z.string() })), selectedValue: z.string(), disabled: z.boolean() })`.

#### Step 17 — Switch

`propsSchema: z.object({ label: z.string(), checked: z.boolean(), disabled: z.boolean() })`.

#### Step 18 — Textarea

`propsSchema: z.object({ placeholder: z.string(), value: z.string(), rows: z.number(), disabled: z.boolean() })`. shadcn: `<Textarea readOnly>`. MUI: `<TextField multiline rows={rows} ...>`.

**Valve A trigger:** if Group C is taking longer than a week, drop to base form canonicals only (Checkbox + Select) or push the whole group to Phase 6.

### Group D — Pattern B composites (Steps 19–22)

The architectural payoff. Requires Group A to be complete.

#### Step 19 — Card

`styleSlots: ['root', 'header', 'body', 'footer']`. `isCanvas: false` (the *node* itself isn't the canvas; sub-slots are). `propsSchema: z.object({})`. Defaults give each slot a sensible default class string.

shadcn impl: see Step 2 above. MUI impl uses `<Card>` + `<CardHeader>` + `<CardContent>` + `<CardActions>`.

#### Step 20 — Tabs

`styleSlots: ['root', 'tabs', 'content']`. `isCanvas: false`. `propsSchema: z.object({ activeTab: z.string() })` — index or label of currently-active tab.

shadcn impl: `<Tabs value={activeTab}>` + `<TabsList><Element id="tabs" canvas /></TabsList>` + `<TabsContent value={activeTab}><Element id="content" canvas /></TabsContent>`.

**The active-tab problem.** Tabs needs a way to associate sub-content with tabs. Phase 5 simplification: a single content area, the user manually changes `activeTab` via Inspector PropsPanel to switch which content shows. This is **not** the rich Tabs UX of multiple content panes per tab — it's a stub. Real multi-tab content with per-tab regions is a Phase 6 expansion.

Worth flagging clearly in the canonical's description so users know what they're getting.

#### Step 21 — Inspector exposes slot-level styling

With SlotPicker mounted (Group A), users select Card, pick "header" in the slot picker, and edit padding/background/etc for just the header region.

#### Step 22 — Save → load with slot children

Verify: drop a Card, drag a Heading into header, drag two Boxes into body, save, hard refresh. The tree restores with children in their respective slots.

**Valve B trigger:** if Tabs (Step 20) blows up scope, ship just Card (Step 19) as the Pattern B demo and document Tabs as Phase 6.

### Group E — Toolbox UX (Steps 23–26)

Cleanup-and-polish phase. The toolbox sees a lot of UX love.

#### Step 23 — Categories

Rewrite `Toolbox.tsx`. Group `listComponents()` by `canonical.category`. Render section headers with collapsible regions (reuse `CollapsibleSection`).

#### Step 24 — Search

Search bar at the top of the toolbox. Filter `listComponents()` by substring match on `displayName` + `tags`. Filtered results show flat (no categories) when search is active.

Trivial fuzzy implementation: `name.toLowerCase().includes(query.toLowerCase()) || tags.some(t => t.toLowerCase().includes(query.toLowerCase()))`. Phase 6 polish can use `fuse.js` if needed.

#### Step 25 — Favorites

Star icon on each Toolbox entry. Click → adds to `favorites: string[]` in `editorStore`. Favorites section at the top of the toolbox (above categories) shows starred canonicals.

Persist via `localStorage`. **Not** in the document envelope — favorites are user-level, not document-level.

#### Step 26 — Recently used

Track last 5 dragged canonicals in `editorStore.recents: string[]`. Update on every successful drop (track via `useEditor` events or hook in `Toolbox`'s connector). Recents section between Favorites and Categories.

Persist via localStorage.

**Valve C trigger:** if the favorites/recents persistence becomes finicky, ship categories + search only and defer the rest to Phase 6 polish.

### Group F — MUI adapter parity (Step 27)

#### Step 27 — Write MUI impls for every Group B + C + D canonical

Roughly mechanical — wrap MUI primitives with the same `AdapterRenderProps` shape. The MUI Tabs and Card already exist as MUI components, so impls are thin wrappers.

**Valve D trigger:** if Group F is grinding, ship shadcn-only for the new canonicals. MUI users see missing-impl placeholders for the gaps; they can switch adapter. Phase 6 closes them.

### Group G — Verification + docs (Steps 28–30)

#### Step 28 — Manual exit-criteria walkthrough

Run through every exit criterion in the browser. Capture screenshots of a landing page built entirely from Phase 5 canonicals: hero (Stack + Heading + Text + Button), features section (3-column flex of Cards), CTA section, footer (Stack of Links + Divider).

#### Step 29 — Tests

No new `tw-classes` slices in Phase 5; the existing test suite covers the style layer. Add a unit test for the SlotPicker's read/write logic if it has nontrivial state. Otherwise visual-smoke check only.

#### Step 30 — Update docs

- `docs/ARCHITECTURE.md` — Layer 2 list grows; § Container pattern decision now mentions Pattern B as live code; new "Slot routing" walkthrough.
- `docs/DEVELOPER_GUIDE.md` — recipe for adding a Pattern B canonical; documentation for SlotPicker + slot-aware `useNodeClasses(nodeId, slot)`.
- `docs/plans/PHASE5_PLAN.md` (this file) — close-out: which valves got pulled, which canonicals didn't ship.

---

## Out of scope (Phase 5)

| Feature | Phase |
|---|---|
| Responsive arbitrary values (`#hex` at md, different at lg) | Phase 6 |
| Per-document Tailwind safelist build pipeline | Phase 6 |
| Per-tab content regions in Tabs (rich multi-tab UX) | Phase 6 |
| Drag-to-resize handles on canvas | Phase 6 |
| Undo/redo UI buttons | Phase 6 |
| `AdapterProvider` split (cleaner Wrapper composition) | Phase 6 |
| React 19 upgrade | Phase 6 |
| Plugin SDK public surface | Phase 6 |
| HSL / RGB sliders, eyedropper, gradients | Phase 6+ |

---

## Risks specific to Phase 5

1. **Pattern B inspector UX is genuinely new.** SlotPicker isn't a trivial component — it's a mode switch that affects all subsequent panel writes. Edge cases: what does "delete" do when the selected slot isn't root? (Answer: deletes the canonical node, not the slot.) Spending time on this upfront pays off; rushing it produces a confusing inspector for Card/Tabs users.

2. **16 canonicals × 2 adapters = 32 impl files.** Mechanical mistakes are likely. Discipline: TypographyPanel as the reference; copy and adapt. Type-check every step.

3. **Form components in editor mode.** A Checkbox that toggles when the user clicks it (during editing) is a bug. Every form impl needs `disabled` (or `readOnly` for TextArea/Input). Spot-check each one.

4. **Tabs active-tab UX is a known compromise.** The single-content-pane model is a downgrade from native Tabs UX. Users may not realize they need to manually toggle `activeTab` in Inspector to see different content. Mitigation: clear visual cue in the rendered Tabs that the active tab is what's showing.

5. **Toolbox UX with favorites + recents adds persistence beyond the document.** Until now, only the document persists. User-level preferences (favorites, recents) need their own localStorage namespace and don't travel with documents. New mental model for users; document it.

6. **MUI parity drift.** If Valve D is pulled, MUI users see missing-impl placeholders for new canonicals. That's confusing if they're swapping adapters mid-workflow. Mitigation: at minimum, ship Stack and Divider (the layout primitives) on both adapters so basic structure works in MUI. Defer the rest.

7. **Phase 5 timeline.** Original IMPLEMENTATION_PLAN said 2–3 weeks; realistic is 4–6 weeks at full scope. Checkpoint demos after each Group (A–F) reveal slippage early. Pull valves before they turn into commit-and-pray.

---

## Definition of done

Exit-criteria checklist passes. Updated `docs/ARCHITECTURE.md` + `docs/DEVELOPER_GUIDE.md`. Close-out section in this file records: which valves (A–D) were pulled, which canonicals slipped, and any Pattern B follow-ups for Phase 6. Phase 6 (plugin SDK hardening + the deferred polish bag) is unblocked.

---

## Close-out (2026-05-24)

### Status: Complete

All 7 groups (A–G) shipped. **20 canonicals total** (4 → 20):
- Group A: Pattern B foundation (AdapterRenderProps slot maps, SlotPicker, Inspector wiring, slot-routing tests).
- Group B: 9 Pattern A canonicals (Heading, Link, Image, Stack, Divider, Icon, Badge, Avatar, Alert).
- Group C: 5 form canonicals (Select, Checkbox, Radio, Switch, Textarea) — all non-interactive in editor mode via no-op handlers / `readOnly`.
- Group D: 2 Pattern B composites (Card, Tabs).
- Group E: Toolbox UX (search, favorites, recently-used) — categories shipped earlier in the group via direct grouping.
- Group F: MUI adapter parity audit — all 20 canonicals registered in both adapters (no valve pulled).
- Group G: Verification + this close-out section.

### Valves pulled: none.

All four pre-declared valves stayed un-pulled. Full scope shipped.

### Deferred to Phase 6

| Item | Reason |
|---|---|
| PropsPanel auto-form support for `z.array(z.object(...))` | Select / Radio / Tabs `options` and `tabs` array props ship with defaults; users can't edit list items via UI yet. Defaults are sensible, but custom options need JSON editing in localStorage. |
| Select dropdown click-block in editor mode | The Radix SelectTrigger still opens its dropdown when clicked in editor mode. Doesn't crash anything; just noisy UX. Wrap-and-block in Phase 6. |
| Tabs editor-mode active-tab UX cue | The active tab is driven by `defaultValue` prop; switching tabs in the rendered preview requires editing the prop. Phase 6 could surface a visual indicator that this is the "preview-only" active tab. |
| Multi-canvas regions for Card / Tabs | Card's `body` is a single canvas; `header`/`footer` are props-driven strings. Tabs has no canvas at all. Phase 6 could split each named slot into its own Craft canvas for rich composition. |
| Responsive arbitrary inline values | Phase 4.5 limitation. Still inline-base-only. Per-document safelist pipeline deferred. |

### Notable Phase 5 design decisions

1. **`composedClasses` / `composedInlineStyles` maps in AdapterRenderProps** — Pattern B impls (Card, Tabs) consume per-slot composed strings. The `className` / `inlineStyle` fields still mirror the root entry for Pattern A backwards compat.

2. **Form components use no-op `onChange` handlers** — Radix and MUI both warn on controlled components without change handlers. The no-op silences warnings; user input never mutates state in editor mode. Combined with `disabled`/`readOnly` props from the canonical, the components are visually present but interactively inert.

3. **Toolbox preferences (favorites + recents) live in their own localStorage key** — `craftjs-design.toolbox`. Separate from the document envelope because they're user-level, not document-level. Survives document switches.

4. **Recently-used tracked on mousedown of toolbox button** — fires whether or not the drag completes. Approximates "intent to use." LRU capped at 5 entries.

5. **Toolbox category order is fixed and explicit** — `CATEGORY_ORDER` array in `Toolbox.tsx`. Anything with an unrecognized category falls into "Other" at the bottom rather than silently disappearing.

6. **Icon canonical shares one impl across adapters** — MUI re-exports `ShadcnIcon` because both adapters use lucide-react for the 16 Phase 5 icons. Conceptual divergence is zero for this component.

### Files added this phase

```
src/registry/components/{heading,link,image,stack,divider,icon,badge,avatar,alert,
                         select,checkbox,radio,switch,textarea,card,tabs}.ts
src/adapters/shadcn/components/{Heading,Link,Image,Stack,Divider,Icon,Badge,Avatar,Alert,
                                Select,Checkbox,Radio,Switch,Textarea,Card,Tabs}.tsx
src/adapters/mui/components/{Heading,Link,Image,Stack,Divider,Icon,Badge,Avatar,Alert,
                             Select,Checkbox,Radio,Switch,Textarea,Card,Tabs}.tsx
src/editor/inspector/SlotPicker.tsx                  (Group A)
src/style/slot-routing.test.ts                       (Group A)
```

### Files modified this phase

```
src/adapters/types.ts                  (+composedClasses, +composedInlineStyles fields)
src/craft/CanonicalNode.tsx            (per-slot composition)
src/editor/Inspector.tsx               (activeSlot state, SlotPicker wiring)
src/editor/inspector/*Panel.tsx        (slot prop on all 6 class-editing panels)
src/editor/Toolbox.tsx                 (categories, search, favorites, recents)
src/registry/components/index.ts       (barrel +16 imports)
src/adapters/shadcn/index.ts           (+16 registrations)
src/adapters/mui/index.ts              (+16 registrations)
scripts/gen-safelist.ts                (+6 one-off utilities)
```

