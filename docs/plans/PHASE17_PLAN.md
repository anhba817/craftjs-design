# Phase 17 — Production-readiness completion → 1.0 release candidate (Sections 8, 10, 12 + the SDK freeze)

**Status:** planned
**Cuts as:** `0.8.0` (the 1.0 **release candidate** — every non-Stretch
production-readiness item done + the SDK surface frozen). The actual `1.0.0`
cut is the deliberate promotion that follows (host/ops runbook + a soak
window), kept out of this phase so 1.0 is an intentional freeze after RC
exposure, not a version auto-stamped at the end of an engineering phase.
**Audience:** whoever closes the long tail of `PRODUCTION_READINESS.md` and
locks the public API so `@crafted-design/editor` can stand behind a `1.0.0`
SemVer promise.

**Scope discipline:** the remaining **non-Stretch** items across
`PRODUCTION_READINESS.md` §§ 8 (perf + bundle), 10 (docs completeness), 12
(distribution), plus the cross-cutting **SDK-surface freeze** that `1.0.0`
implies (CHANGELOG: "`1.0.0` freezes the SDK surface"). Everything already
shipped in Phases 9–16 stays shipped. Stretch items (charts, i18n, RTL,
collaboration, marketplace, DevTools, Storybook, CJS/UMD, usage telemetry)
remain Stretch and are explicitly out of scope.

## Goal

Turn "everything works and is documented, behind `next`" into "the public
surface is frozen, the last performance + distribution gaps are closed, the
0.x → 1.0 migration is written, and a documented runbook promotes RC → 1.0."
After this phase the only thing between us and `1.0.0` is human/ops work
(make the repo public, set secrets, promote the dist-tag) plus a soak.

## Where things stand entering Phase 17

A survey of `PRODUCTION_READINESS.md` shows §§ 1–7, 9, 11, 13 complete (less
Stretch), and §§ 8.3, 12.1–12.4 done in Phases 15–16. The genuine remainder:

| Item | Tier | Disposition in Phase 17 |
|---|---|---|
| § 8.4 Tree-shakable SDK exports | High / Bundle | Group B — verify + lock |
| § 8.5 Memoize PropField recursion | Performance | Group A |
| § 8.6 Throttle ColorPicker drag commits | Performance | Group A |
| § 8.7 Memoize Toolbox connector callbacks | Performance | Group A |
| SDK surface freeze (the 1.0 gate) | Production-blocker (implied) | Group C |
| § 10.6 Migration guides between majors | Production-blocker | Group D — template only (no published version to migrate from) |
| § 10.2 Interactive examples / sandbox | High / DevEx | Group D |
| § 10.4 Cookbook / patterns | DevEx | Group D |
| § 10.7 FAQ / Troubleshooting | DevEx | Group D |
| § 12.5 Minified variant | DevEx | Group B (decision) |
| § 9.10 Public repo / bug tracking | Production-blocker (host) | Group E runbook |
| § 10.3 Videos, § 10.5 diagrams | UX / DevEx | Out of scope (Stretch-adjacent) |

## In-scope

| Group | Theme | PRODUCTION_READINESS |
|---|---|---|
| A | Performance polish | § 8.5, 8.6, 8.7 |
| B | SDK bundle + tree-shaking finalization | § 8.4, 12.5 |
| C | **SDK surface audit + freeze** (the 1.0 gate) | § 2 (freeze), implied by 1.0 |
| D | Documentation completion | § 10.6, 10.2, 10.4, 10.7 |
| E | 1.0 release runbook + close-out (cut `0.8.0` RC) | § 9.10, final § pass |

Group C is the spine — it's what "ready for 1.0" actually means. A is
independent and can land first; B feeds C (tree-shaking informs what the
surface should look like); D and E close out.

## Resolved decisions

### 1. Phase 17 cuts `0.8.0` (RC), not `1.0.0`

The work that makes us 1.0-ready is engineering; the 1.0 *cut* is a
promotion decision that needs RC exposure + host/ops actions nobody can do
inside the repo. Stamping `1.0.0` at a phase close-out would freeze the API
the same hour it's finalized, with no soak. So Phase 17 produces a frozen,
fully-documented `0.8.0` RC; the `1.0.0` cut is the next deliberate step
(Group E ships the runbook + go/no-go criteria for it).

### 2. The SDK surface is frozen by an enforced snapshot, not a promise

Today the stable surface is described in prose (`src/sdk/index.ts` header).
For 1.0 it must be *enforced*: a golden-list test of every exported name from
`@crafted-design/editor` and `@crafted-design/editor/sdk`, so an accidental
new/removed export fails CI. Freezing means the list stops changing without a
SemVer-major + CHANGELOG note.

### 3. ESM-only stays; no CJS/UMD; consumer bundlers minify

§ 12.1 (ESM-only) was decided in Phase 15. § 12.5 (ship `index.min.js`): for
an ESM library consumed through a bundler, the consumer minifies — shipping a
parallel minified entry doubles the surface for no real consumer benefit and
complicates `exports`. Decision: **document** that the published bundle is
unminified-with-sourcemaps by design and consumers' build minifies; do not
ship a separate min variant. (Recorded, not built.)

### 4. Performance items are verified by measurement, not assumed

§ 8.5–8.7 are micro-optimizations. Each must show a before/after in the React
Profiler (or a targeted render-count) — otherwise it's churn. If a change
doesn't move a measurable number, it's dropped, not merged "to be safe."

---

## Group A — Performance polish (§ 8.5, 8.6, 8.7)

**Land**

1. **§ 8.5 Memoize PropField recursion.** PropField walks the Zod schema on
   every render; `useMemo` the schema-dispatch so editing one field doesn't
   re-walk the whole tree. Verify with a render-count on a deep props form.
2. **§ 8.6 Throttle ColorPicker drag commits.** `HexColorPicker` fires
   `onChange` per drag tick → a store write + responsive-CSS recompute per
   tick. Throttle to ~16 ms or commit on pointer-up; keep the swatch preview
   live. Verify drag stays smooth on a throttled CPU.
3. **§ 8.7 Memoize Toolbox connector callbacks.** `connectors.create(el, …)`
   re-runs every Toolbox render; `useCallback` the ref callback per canonical.

**Output**

- The three remaining `*(Performance)*` items closed, each with a measured
  before/after; no behavior change.

---

## Group B — SDK bundle + tree-shaking finalization (§ 8.4, 12.5)

**Land**

1. **§ 8.4 Verify + lock tree-shakability.** `/sdk` re-exports via per-feature
   `export *`. Confirm every `src/sdk/*` submodule is side-effect-free (so a
   consumer importing one symbol drops the rest), fix any that aren't, and add
   a smoke check: a fixture importing a single SDK symbol bundles to far less
   than the full `/sdk`. Surface a per-entry note in `check:size`.
2. **§ 12.5 Minified-variant decision.** Per Resolved Decision 3 — document
   the ESM-only / consumer-minifies stance in `INTEGRATION_GUIDE.md` +
   `PRODUCTION_READINESS.md`; do not ship `index.min.js`.

**Output**

- SDK consumers provably pay only for what they import; the distribution
  story is closed and documented.

---

## Group C — SDK surface audit + freeze (the 1.0 gate)

**Land**

1. **Enumerate the public surface.** Generate the complete list of exported
   names from `@crafted-design/editor` (full + `/core`) and
   `@crafted-design/editor/sdk` from the built `.d.ts` (or a typed entry
   import). Classify each: intended-stable, intended-internal-but-leaked, or
   re-export noise.
2. **Seal leaks.** Remove or `@internal`-mark exports that shouldn't be public
   (anything the `src/sdk/index.ts` header says is "intentionally NOT
   exported" but slips through a barrel; Craft bridge internals; store
   internals). Update the boundary lint rule if needed.
3. **Golden snapshot test.** A test that asserts the sorted exported-name list
   equals a committed `sdk-surface.snapshot`. New/removed exports fail until
   the snapshot is updated *deliberately* — that's the freeze mechanism.
4. **Stability doc.** A "Public API stability (1.0)" section in `SDK_GUIDE.md`:
   what's covered by the SemVer promise, what's explicitly not (the editor's
   internal modules, visual/CSS output, Craft.js bridge types beyond the
   re-exported ones), and the deprecation path.

**Output**

- A frozen, enforced public surface — the precondition for a `1.0.0` SemVer
  promise. The list can't drift without a deliberate snapshot update + a
  CHANGELOG entry.

---

## Group D — Documentation completion (§ 10.6, 10.2, 10.4, 10.7)

**Land**

1. **§ 10.6 Migration guides** — *no 0.x → 1.0 guide needed.* Nothing has been
   published to a stable tag and there are no real consumers (the editor only
   ever lived behind `next`), so there is no migration to write. We ship only
   the lightweight `docs/MIGRATION.md` **template** (what-changed / how-to-update
   / document-envelope sections) for the *first real* major bump down the road;
   no concrete entry. Not a blocker for this release.
2. **§ 10.2 Runnable example.** A minimal, copy-pasteable host app (under
   `examples/` or a documented StackBlitz/CodeSandbox link) showing install →
   `<Editor />` → save/load, on the lean `/core` entry.
3. **§ 10.4 Cookbook.** A `docs/COOKBOOK.md` of task-oriented recipes
   (custom canonical, custom adapter subpath, server StorageAdapter, theme,
   panel) cross-linking the existing TUTORIAL_* docs.
4. **§ 10.7 FAQ.** A `docs/FAQ.md` seeded from the troubleshooting notes +
   the decisions hosts hit first (which entry to import, MUI peers, ESM-only,
   no export-to-React).

**Output**

- The documentation blockers for a public 1.0 are closed; a new host can go
  install → shipped without reading source.

---

## Group E — 1.0 release runbook + close-out (cut `0.8.0` RC)

**Land**

1. **Release runbook** — `docs/RELEASE.md`: the exact human/ops steps the repo
   can't perform itself (§ 9.10): make the GitHub repo public, set `NPM_TOKEN`
   + enable Actions, enable Pages (Source = GitHub Actions), run
   `npm run release` (publishes to `next`), then promote `next → latest`. Plus
   the standing release flow (changeset → version → publish).
2. **1.0 go/no-go criteria** — an explicit checklist: SDK surface frozen
   (Group C green), migration guide published, RC soak period elapsed with no
   surface change, all CI gates green, host actions done. Only when all true
   does `1.0.0` cut.
3. **Final `PRODUCTION_READINESS.md` pass** — mark every non-Stretch item in
   §§ 8, 10, 12 done; add a "Road to 1.0" status banner pointing at the
   runbook + criteria.
4. **CHANGELOG `0.8.0`** — RC entry: perf items, tree-shake verification,
   frozen surface (+ any exports sealed in Group C — note if breaking),
   migration/cookbook/FAQ docs.
5. **Version → `0.8.0`**; close-out section here.

**Output**

- Phase 17 complete; `0.8.0` (1.0 RC) cut; a documented, criteria-gated path
  to `1.0.0`.

---

## Out of scope (NOT in Phase 17)

| Item | § | Why |
|---|---|---|
| The actual `1.0.0` cut | — | Deliberate promotion after RC soak + host actions; Group E ships its criteria + runbook, not the cut. |
| CJS / UMD bundle formats | 12.1 | ESM-only decided (Phase 15); consumers' bundlers handle interop. |
| Shipping a separate minified entry | 12.5 | Consumer bundlers minify; see Resolved Decision 3. |
| Video walkthroughs, real architecture diagrams | 10.3, 10.5 | UX/DevEx polish, not 1.0 blockers. |
| DevTools extension, scaffolding CLI, Storybook | 9.7–9.9 | Stretch DevEx. |
| Charts, editor primitives, i18n, RTL, collaboration, marketplaces, usage telemetry, AI | 5.8–5.9, 3.15–3.16, 6.7–6.8, 7.5, 13.3, 14.* | Stretch. |

---

## Risks + mitigations

1. **Freezing the surface surfaces accidental public exports that hosts may
   already depend on.** Mitigation: Group C classifies before sealing; any
   removal is noted as breaking in the `0.8.0` CHANGELOG (pre-1.0, the API may
   still move) — better to seal now than after 1.0 locks it.
2. **Perf micro-opts risk regressions for unmeasurable gains.** Mitigation:
   Resolved Decision 4 — measure or drop. Each is behavior-neutral and
   covered by existing tests.
3. **Tree-shaking is defeated by a stray side-effectful SDK submodule.**
   Mitigation: the Group B smoke check catches it; this is the same
   `sideEffects` bug class as Phase 15 — verify against the built bundle, not
   source.
4. **Scope creep into Stretch docs.** Mitigation: Group D ships the blocker
   (10.6) + the three highest-leverage DevEx docs; videos/diagrams stay out.

---

## Definition of done

Every non-Stretch item in `PRODUCTION_READINESS.md` §§ 8, 10, 12 is shipped;
the public SDK surface is enumerated, sealed, and frozen behind an enforced
snapshot test with a stability doc; the 0.x → 1.0 migration guide, cookbook,
and FAQ are published; a release runbook + explicit 1.0 go/no-go criteria
exist. `0.8.0` (the 1.0 release candidate) cuts at the close-out commit, and
the only remaining work to `1.0.0` is the documented host/ops promotion plus
an RC soak.
