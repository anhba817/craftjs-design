# Phase 18 — Architecture hygiene + SDK dogfooding (review follow-ups)

**Status:** planned
**Cuts as:** `0.9.0` (refreshes the 1.0 release candidate — additive SDK seams
+ a semantic-validation feature + internal refactors; no breaking changes to
the frozen surface, only deliberate **additions** recorded in the snapshot +
CHANGELOG).
**Audience:** whoever pays down the five maintainability findings from the
post-`0.8.0` review so the codebase entering `1.0` is honest in its docs,
single-responsibility at its choke points, and dogfoods its own public
boundary.

**Scope discipline:** the five review comments, nothing more. These are
code-health / correctness-hardening items, not new product surface. Each is
independently shippable; none blocks the others.

## Goal

Turn five "this is getting away from us" observations into concrete fixes:
docs that match the code, a choke point that does one job, an adapter-wrapper
contract that can't silently break, document validation that catches corrupt
*data* (not just a broken *graph*), and built-in adapters that consume the SDK
the way third parties must — surfacing the seams we're missing.

## In-scope

| Group | Comment | Theme |
|---|---|---|
| A | #1 | Refresh stale architecture docs from the live registry |
| B | #3 | Extract a pure node-render-model from `CanonicalNode` |
| C | #2 | Make the adapter-wrapper stability contract enforceable |
| D | #4 | Semantic document validation (props + style) |
| E | #5 | Dogfood the SDK boundary in built-in adapters; promote missing seams |
| F | — | Close-out — CHANGELOG `0.9.0`, surface snapshot, version bump |

Suggested order: A (docs, independent) → B (pure refactor, unlocks unit
tests) → C (small guard) → D (feature) → E (dogfooding, touches the frozen
surface) → F. B and D are the substantive ones.

## Resolved decisions

### 1. Comment #2 — guard + document, not a wrapper-host re-architecture

`composeAllWrappers` already keeps the wrapper tree stable for the real case
(adapters registered at module load, before `<Editor />` mounts). The only
hole is **post-mount registration of a wrapper-bearing adapter**, which would
reshape the tree on a later render. That's an edge case, so the proportionate
fix is to **make it impossible to do silently**: reuse the existing
editor-mounted flag to detect it and warn (dev) / document the contract
("adapters with a `Wrapper` must register before `<Editor />` mounts"). A
stable wrapper-host slot (rendering wrappers into a fixed portal regardless of
registration time) is the heavier alternative — deferred unless a real use
case needs runtime wrapper adapters.

### 2. Comment #4 — semantic validation is lenient + reported, not fatal

A second validation pass (props vs each canonical's `propsSchema`, style vs a
new `NodeStyle` zod schema) runs after the structural integrity check. Default
policy: **report, don't reject.** A document that loads today must keep
loading — a single corrupt prop shouldn't blank the canvas. So the pass
collects per-node issues and (a) reports them through the telemetry seam +
the malformed-document affordance, and (b) optionally repairs to the
canonical's defaults for the offending field so render is safe. Hard-fail is
reserved for corruption the renderer genuinely can't survive. (The exact
repair-vs-strip behavior is settled in Group D.)

### 3. Comment #5 — dogfood by migration + promote the seams it surfaces

Built-in adapters move to `@design/sdk` imports for everything the SDK already
exposes (`useIsEditing`, `EditableText`, `useStartTextEdit`, `useNodeClasses`).
The imports that have **no** SDK seam today are the finding: promote the ones
adapter authors genuinely need to the public surface, keep the rest internal.
New seams add to the frozen surface (Group C of Phase 17) — a deliberate
pre-1.0 addition, recorded in `surface.test.ts` + CHANGELOG.

---

## Group A — Refresh architecture docs (#1)

**Land**

1. `docs/ARCHITECTURE.md` — replace **"Twenty canonicals ship today"** + the
   canonical table with the current **48**, generated from `listComponents()`
   / the adapter matrix rather than hand-counted. Fix the two "for all 20
   canonicals" lines in the directory-tree diagram.
2. Rewrite the **Pattern B** section (≈ 712–722): it claims slots are
   style-only with "one drop zone (the body)" and tabs have "no drop zone."
   That predates dynamic canvas slots — `CanonicalNode` now generates one
   `<Element canvas id={slot}>` per `canvasSlots` entry (Card header/body/
   footer, Tabs/Stepper/Carousel/Table per-slot). Describe the real
   `canvasSlots` (static list + function form) model.
3. Sweep the doc for other counts/claims that drift from code (adapter list:
   shadcn/MUI/**html** + the Chakra example; the `/core` vs full entry split).

**Output**

- ARCHITECTURE.md matches the shipped registry + adapter set. Where practical,
  cite the generators (`docs:matrix`) so it's re-checkable.

---

## Group B — Extract the node render model from `CanonicalNode` (#3)

**Land**

1. New pure module (e.g. `src/craft/nodeRenderModel.ts`):
   `buildNodeRenderModel(def, nodeProps, style, ctx)` →
   `{ composedClasses, composedInlineStyles, responsiveInlineCSS,
   canvasSlots, usesSlotChildren, rootClassString, rootInline }`. It owns the
   slot loop, responsive composition + inline merge, and the pseudo-state
   preview overlay — currently inline in `CanonicalNode` (≈ 104–165). `ctx`
   carries the editor inputs it reads (active breakpoint, the pseudo-state
   preview selection) so the function stays pure.
2. `CanonicalNode` becomes mostly wiring: `useNode` + connector ref, call
   `buildNodeRenderModel`, memoize the `<Element canvas>` slot children,
   hand off to the adapter. No behavior change.
3. **Unit tests** for `buildNodeRenderModel` — the win of a pure helper: the
   repo runs Vitest without a DOM, so the composition logic (responsive
   bucket promotion, pseudo-preview merge, slot keys) is finally directly
   testable, not just smoke-verified through the component.

**Output**

- A tested, framework-free render model; `CanonicalNode` reads as wiring.
  Behavior identical (verified at runtime + the new unit tests).

---

## Group C — Adapter-wrapper stability contract (#2)

**Land**

1. Expose the editor-mounted state to the adapter registry (an internal
   getter alongside `_markEditorMounted`, or move the flag to a shared
   module).
2. In `registerAdapter`, when the editor is already mounted **and** the
   adapter declares a `Wrapper`, emit a dev warning: wrapper adapters must
   register before `<Editor />` mounts, or the wrapper tree reshapes and Craft
   `<Frame>` can remount (wipe the canvas). Non-wrapper adapters registering
   post-mount stay fine (hot-reload path).
3. Document the contract where adapters are authored
   (`DEVELOPER_GUIDE.md` adapter recipe + the `Adapter.Wrapper` type doc), and
   update the `AdapterContext` comment that currently asserts registration "is
   stable across renders" to state the contract it now enforces.

**Output**

- The remount hazard can't happen silently; the wrapper-stability assumption
  is enforced + documented, not just hoped.

---

## Group D — Semantic document validation (#4)

**Land**

1. **`NodeStyle` zod schema** (`src/registry/` alongside the `NodeStyle`
   interface) — validates `classes` / `responsive` / `inline` /
   `responsiveInline` shapes (string maps), so a corrupt style block is
   catchable.
2. **Semantic pass** that walks the deserialized node tree and, per node,
   validates `props` against the resolved canonical's `propsSchema` and
   `style` against the `NodeStyle` schema. Runs after
   `craftJsonIntegrity` (structural) in the load pipeline.
3. **Policy = lenient + reported** (Resolved Decision 2): collect issues,
   route them through the telemetry seam, and surface via the existing
   malformed-document recovery affordance; repair offending fields to the
   canonical default so render stays safe. Settle repair-vs-strip per field
   kind here.
4. Tests: corrupt-prop and corrupt-style fixtures → caught + repaired;
   a valid document → no issues, unchanged.

**Output**

- Corrupted props/styles are caught before render with a clear report and a
  safe fallback, instead of a confusing mid-render crash.

---

## Group E — Dogfood the SDK boundary; promote missing seams (#5)

**Land**

1. **Migrate built-in adapters** (shadcn / mui / html) to import from
   `@design/sdk` everything already exported there: `useIsEditing` (22+
   sites), `EditableText` / `useStartTextEdit` (replacing direct
   `@/editor/text-edit/*` + `useEditorStore.setEditingTextNode`),
   `useNodeClasses`.
2. **Promote the seams the migration surfaces** — the imports with no SDK
   path today, which adapter authors provably need:
   - **Overlay-stage authoring** — `OverlayCard` + `useOverlayStageTarget`
     (10× each), used by every overlay impl. Promote (possibly behind one
     tidy `OverlayStageSlot`-style helper) so third parties can build
     overlay canonicals.
   - **Overlay runtime** — `useOverlayRuntime` / `readOverlayOpen` (15×), the
     open/close state triggers read.
   - **Per-canonical prop types** — `ModalProps`, `DrawerProps`, … are not
     exported; an adapter author implementing a canonical needs its prop
     type. Export the built-in canonicals' prop types (type-only, so no
     runtime/tree-shaking cost).
   - **`cn`** (63×) — decide: export a small class-merge util, or leave
     adapters to bring their own `clsx`/`tailwind-merge`. Lean toward
     exporting, since every adapter needs it.
3. Each new export updates `src/sdk/surface.test.ts` (the frozen snapshot)
   and the SDK_GUIDE + CHANGELOG — a deliberate pre-1.0 surface addition.
4. (Optional) extend the `no-restricted-imports` ESLint rule that already
   guards `examples/**` to `src/adapters/**`, with an allowlist for anything
   intentionally kept internal — so new adapter code reaches for the SDK
   first and future gaps surface immediately.

**Output**

- Built-in adapters consume the public boundary like a third party; the seams
  they needed are now public (or consciously kept internal); the freeze test
  proves the surface grew deliberately.

---

## Group F — Close-out (cut `0.9.0`)

**Land**

1. CHANGELOG `0.9.0` — the doc refresh, the render-model extraction, the
   wrapper-contract guard, semantic validation (additive, opt-in-safe), the
   new SDK seams (list every added export).
2. Final `surface.test.ts` snapshot reflecting Group E's additions; confirm
   `side-effect-free` still holds (new seams must not add registration side
   effects).
3. Version → `0.9.0`; close-out section in this plan; refresh the "Road to
   1.0" note (still RC; the go/no-go checklist in `RELEASE.md` is unchanged —
   these were code-health, not new blockers).

**Output**

- Phase 18 complete; `0.9.0` cut as the refreshed 1.0 RC.

---

## Out of scope (NOT in Phase 18)

| Item | Why |
|---|---|
| Stable wrapper-host re-architecture (runtime wrapper adapters) | No real use case; the guard (Group C) covers the hazard. |
| Hard-fail semantic validation / a strict document mode | Default is lenient; a strict mode can come later if a host wants it. |
| Exporting `CanonicalNode` / the render-model as public SDK | The model is an internal helper; keep the surface minimal. |
| Banning all internal imports from adapters | Built-in adapters legitimately live in-repo; the goal is surfacing gaps, not purity for its own sake. |
| Anything from the Phase-17 Stretch list (charts, i18n, collaboration, …) | Still Stretch. |

---

## Risks + mitigations

1. **Render-model extraction changes behavior subtly** (responsive/pseudo
   composition is fiddly). Mitigation: the new unit tests pin the exact
   composition; runtime-verify the inspector (responsive + state styling) per
   the standing gate.
2. **Semantic validation rejects documents that load fine today.** Mitigation:
   lenient-by-default (report + repair, never reject what currently renders);
   regression-test existing fixtures stay clean.
3. **New SDK seams bloat or leak internals.** Mitigation: promote only what
   the adapter migration proves is needed; type-only where possible;
   `surface.test.ts` + `side-effect-free.test.ts` gate the additions.
4. **Adapter migration regresses a built-in's behavior.** Mitigation: it's a
   pure import-path swap to the same implementations re-exported by the SDK;
   the full test suite + runtime smoke per adapter.

---

## Definition of done

ARCHITECTURE.md matches the live registry (48 canonicals, real Pattern B);
`CanonicalNode` delegates composition to a pure, unit-tested
`buildNodeRenderModel`; registering a wrapper-bearing adapter post-mount warns
+ is documented; a lenient semantic pass validates props + style and reports/
repairs corruption before render; built-in adapters import the SDK and the
seams they needed are public + frozen. `0.9.0` cuts at the close-out commit as
the refreshed 1.0 release candidate.
