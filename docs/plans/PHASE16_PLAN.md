# Phase 16 — Adapter modularity + ecosystem (Section 7 + § 8.3)

**Status:** ✅ complete — cut `0.7.0` (see close-out at end)
**Cuts as:** `0.7.0`
**Audience:** whoever makes adapters opt-in + tree-shakable and grows the
adapter set, so a shadcn-only host stops paying for MUI and new adapters
are cheap to add, discover, and version.

**Scope discipline:** PRODUCTION_READINESS § 7 (adapter ecosystem) plus the
§ 8.3 item deferred from Phase 15 (the two are the same architecture seen
from two angles). Full third-party production adapters (Chakra/Ant/Mantine
for all 48 canonicals) and the adapter marketplace stay Stretch.

## Goal

Today the published full editor (`@crafted-design/editor`) **bundles both
adapter sets** — MUI is ~290 KB gz of `index.js` — and there's no way for a
shadcn-only host to avoid it. And adding a new adapter means editing the
core entry. Phase 16 makes adapters **modular**:

- A shadcn-only host imports a lean **`/core`** entry and never pulls MUI.
- MUI / Chakra / future adapters are **opt-in subpath imports**; the heavy
  UI libraries become **optional peer dependencies** (not bundled).
- A **plain-HTML adapter** ships for hosts that want no UI framework at all
  — and proves the modular model end-to-end.
- A **compatibility matrix** documents which canonicals each adapter
  covers, and a **versioning policy** says which library versions an
  adapter is tested against.

That turns "the editor, with two adapters welded in" into "the editor, plus
the adapters you choose."

In-scope:

| Group | Theme | PRODUCTION_READINESS |
|---|---|---|
| A | Adapter modularization | § 8.3 (deferred), § 12.2 |
| B | Plain-HTML adapter — **scaffold** (all 48 registered) | § 7.2 (the no-library entry) |
| C | Compatibility matrix | § 7.3 |
| D | Adapter versioning + peer deps | § 7.4 |
| E | **Plain-HTML adapter — rendering correctness** (all 48 render right) | § 7.2 |
| F | Close-out | `0.7.0` cut |

Group A is the spine — B/C/D build on the modular structure. **Group B
ships the HTML adapter scaffold** (all 48 canonicals registered, structure
+ semantics in place) but its components don't yet render *correctly* —
many canonicals' default styles assume the adapter supplies the look
(shadcn's `cva` variants, MUI's components), so the minimal HTML impls
look bare / wrong. Making all 48 render correctly is a focused styling +
behavior pass deferred to **Group E**, near the end of the phase, once the
structure (matrix, versioning) is settled.

---

## Resolved decisions

### 1. Keep the full entry; add a lean `/core` + per-adapter subpaths

`@crafted-design/editor` stays the **convenience full entry** (registers
shadcn + MUI + plain-HTML) — no break for hosts that want batteries
included. New entries:

- **`@crafted-design/editor/core`** — the editor + the **shadcn** adapter
  only. Never imports MUI/Chakra, so it carries none of their weight and
  needs none of their peers installed.
- **`@crafted-design/editor/adapters/<id>`** — side-effect modules that
  register one adapter on import (`/adapters/mui`, `/adapters/shadcn`,
  `/adapters/html`). Compose: `import '@crafted-design/editor/core'` then
  `import '@crafted-design/editor/adapters/mui'`.

A shadcn-only host uses `/core` (small, no MUI). A "pick my adapters" host
uses `/core` + the subpaths it wants. A batteries-included host uses the
full entry.

### 2. Heavy UI libraries become OPTIONAL peer dependencies

`@mui/material`, `@emotion/*`, and `@chakra-ui/react` move from
`dependencies` to **`peerDependencies` + `peerDependenciesMeta.optional`**,
and are **externalized** in the dist build (not bundled). Consequences:

- The MUI adapter code imports MUI as external → a host that imports the
  MUI adapter (or the full entry) must have `@mui/material` installed; one
  using only `/core` does not. `peerDependenciesMeta.optional` keeps
  `npm install` from warning when they're absent.
- `index.js` (full entry) shrinks substantially because MUI is no longer
  inlined — the consumer's bundler pulls MUI from their `node_modules`
  (the correct model for a library; mirrors how React/Craft are already
  externalized).
- They stay **devDependencies** so the dogfood app + tests still build.

### 3. No runtime dynamic import — opt-in is at the import boundary

Adapters register when their module is imported, which the consumer does at
app startup (before `<Editor />` mounts). So the adapter set is fixed at
mount and `AdapterProvider`'s Wrapper composition stays stable — **this is
why the modular approach is safe where Phase 15's runtime lazy-load was
not** (that would have registered post-mount and remounted the canvas). The
contract — "register adapters before mounting `<Editor />`" — gets
documented. Switching to an unregistered adapter at runtime keeps the
existing graceful fallback (resolve to shadcn; the missing-renderer
placeholder per node).

### 4. Plain-HTML adapter is a first-class built-in

A no-UI-library adapter (`id: 'html'`) covering all 48 canonicals with
semantic HTML + the canonical's own classes. It's the minimum-viable
target for hosts that don't want a design system, and it exercises the
whole adapter SDK with near-zero dependency weight — so it doubles as the
proof + test of the modular model. Ships under `/core` (it's tiny and
dependency-free) and appears in the switcher.

### 5. Full third-party adapters stay Stretch

A production Chakra / Ant Design / Mantine adapter (all canonicals,
maintained against the library's releases) is a large, on-demand effort —
**not** in this phase. The Chakra adapter under `examples/` stays a demo.
Phase 16 ships the *structure* that makes them cheap to add later, plus the
plain-HTML one as the reference third adapter.

---

## Cross-cutting work

1. **Per-entry dist build + `.d.ts`.** `vite.config.dist.ts` gains entries
   for `core` and each `adapters/<id>`; `package.json` `exports` + the
   bundle-budget script + `check-bundle-size` budgets track them.
2. **`sideEffects` stays correct.** The new adapter entry modules are
   side-effectful (they call `registerAdapter`) — they must be in the
   `sideEffects` list so they're not tree-shaken (the exact bug Phase 15
   fixed; don't regress it). A test/grep asserts each entry registers.
3. **Migration note.** Externalizing MUI means full-entry consumers now
   install `@mui/material` themselves — a `0.7.0` upgrade note in the
   CHANGELOG + INTEGRATION_GUIDE.

---

## Group A — Adapter modularization (§ 8.3, § 12.2)

**Land**

1. **`/core` entry** (`src/core.tsx` or similar) — the editor + shadcn +
   html adapters; no MUI/Chakra import.
2. **Per-adapter entries** — `src/adapters/{shadcn,mui,html}/register.ts`
   side-effect modules (the existing `index.ts` already register; expose
   them as build entries). Chakra stays an example.
3. **Externalize** `@mui/material` / `@emotion/*` / `@chakra-ui/react`;
   move to optional peer deps; keep as devDeps for the app/tests.
4. **Build + exports** — new dist entries + `package.json` `exports` +
   budgets; full entry keeps registering everything.
5. **AdapterSwitcher** — already lists registered adapters and updates on
   registry bumps; verify it reads cleanly when only shadcn/html are
   registered.

**Output**

- A shadcn-only `/core` bundle that drops MUI (~290 KB gz lighter);
  opt-in adapter subpaths; UI libs externalized.

**Risk (highest of the phase):** externalizing MUI must not break the
dogfood app build (which bundles) or the full entry. Mitigation: keep the
libs as devDeps; verify `npm run build` (app) + `build:dist` (lib) + the
dogfood switcher still work; the full entry's MUI import resolves against
the installed devDep.

---

## Group B — Plain-HTML adapter, scaffold (§ 7.2)

**Land**

1. **`html` adapter** — all 48 canonical impls registered in semantic HTML
   (`<button>`, `<table>`, `<nav>`, `<dialog>`-or-div overlays, native
   `<input type=date>`, etc.), reusing the canonical's composed classes; no
   UI lib.
2. Registered in `/core`; appears in the switcher; exposed as the
   `@crafted-design/editor/adapters/html` subpath (build entry + `.d.ts`).
3. 3-way coverage parity guard test (shadcn ≡ MUI ≡ html).

**Output**

- A third, dependency-free adapter, structurally complete and proving the
  modular structure / SDK end-to-end.

**Known gap (deferred to Group E):** the components don't yet render
*correctly*. Most canonicals' default `style.classes` are empty because
the shadcn/MUI adapter components supply the look (cva variants, MUI
component styles); the minimal HTML impls have no such baseline, so they
render bare or wrong (unstyled buttons/badges/inputs, flat cards, etc.).
Making all 48 look + behave right is a focused pass in Group E.

---

## Group C — Adapter compatibility matrix (§ 7.3)

**Land**

1. **`scripts/adapter-matrix.ts`** — introspects each registered adapter ×
   the canonical registry and emits a coverage table (which canonicals each
   adapter implements; the missing-renderer placeholder is the runtime
   fallback for gaps).
2. Surface it in docs (generated section) + optionally a dev-time warning
   when an adapter has gaps. shadcn/MUI/html should be 100%; the Chakra
   example is intentionally partial.

**Output**

- A maintained coverage view; the subset policy documented.

---

## Group D — Adapter versioning + peer deps (§ 7.4)

**Land**

1. **`peerDependenciesMeta`** marking the UI libs optional; documented
   "tested against `@mui/material` vX.Y" per adapter.
2. **Breaking-change note** — when an underlying library changes a
   primitive's API, which adapter breaks and how that's surfaced.
3. (CI matrix building each adapter against multiple library versions is
   **Stretch** — documented as a follow-up.)

**Output**

- A clear peer-dep + version-support story for adapter consumers.

---

## Group E — Plain-HTML adapter, rendering correctness (§ 7.2)

The scaffold from Group B registers all 48 canonicals but renders them
bare/wrong because the HTML impls carry no baseline look (unlike shadcn's
cva variants / MUI's component styles). This group makes every canonical
render + behave correctly under the `html` adapter.

**Land**

1. **Baseline styling** — give each HTML impl a sensible built-in look using
   the editor's design-token Tailwind classes (the same tokens the theme
   CSS defines: `bg-card`, `text-foreground`, `border-border`, ring/focus,
   etc.), so a freshly-dropped component looks right with empty
   `style.classes`, and author overrides still compose on top.
2. **Per-canonical correctness pass**, grouped: leaves (button/badge/
   avatar/input family/select/switch/checkbox/radio), feedback
   (progress/spinner/skeleton), media (video/audio), navigation
   (breadcrumb/pagination/nav), Pattern B (card slots, data-list, table +
   merges, tabs, stepper, carousel), overlays (modal/drawer/toast/alert/
   tooltip/popover — editor-inline + runtime gating). Verify each visually
   and behaviorally against the shadcn adapter.
3. **Snapshot / structure tests** where cheap; extend the parity guard if
   useful.

**Output**

- The `html` adapter renders all 48 canonicals correctly and is a genuine
  drop-in no-framework option, not just a registration stub.

---

## Group F — Verification + close-out

**Land**

1. **Smoke pass** — full entry (shadcn+MUI+html), `/core` (shadcn+html, no
   MUI installed-need), opt-in `/adapters/mui`; switch between adapters;
   confirm the missing-renderer placeholder for the example Chakra gaps.
2. **Bundle check** — `/core` is meaningfully smaller than the full entry;
   budgets updated.
3. **Docs** — PRODUCTION_READINESS § 7 ✅ markers; CHANGELOG `0.7.0` +
   migration note (MUI now a peer); SDK_GUIDE/INTEGRATION_GUIDE entry-point
   matrix; DEVELOPER_GUIDE "authoring an adapter as a subpath entry".
4. **Close-out section** here.

**Output**

- Phase 16 complete; `0.7.0` cut.

---

## Out of scope (NOT in Phase 16)

| Item | § | Why |
|---|---|---|
| Production Chakra / Ant Design / Mantine / Bootstrap adapters | 7.1, 7.2 | Large, on-demand; the structure + plain-HTML reference ship now. Chakra stays an example. |
| Adapter marketplace / discovery | 7.5 | Stretch — ecosystem/registry work. |
| CI matrix building adapters against multiple library versions | 7.4 | Stretch — heavy CI; the peer-dep + tested-version docs land first. |
| Runtime dynamic-import adapter loading | 8.3 (alt) | Rejected — the Wrapper-composition remount/canvas-wipe hazard; opt-in subpath imports achieve the bundle goal safely. |
| Charts (§ 5.8), Markdown/WYSIWYG (§ 5.9) | 5.8, 5.9 | Still Stretch, unrelated to adapters. |

---

## Risks + mitigations

1. **Externalizing MUI breaks the app build or the full entry.** Mitigation:
   keep the UI libs as devDeps (app/tests still resolve them); verify both
   builds + the dogfood switcher; the full entry bundles against the
   installed devDep, consumers install the peer.
2. **`sideEffects` regression drops the new adapter entries** (the Phase 15
   bug class). Mitigation: add each entry module to `sideEffects`; a test
   asserts every entry registers its adapter.
3. **Breaking change: full-entry consumers must now install `@mui/material`.**
   Mitigation: optional peer + a clear `0.7.0` migration note; the `/core`
   path needs no MUI at all.
4. **Plain-HTML adapter is 48 more impls.** Mitigation: they're trivial
   (semantic tag + composed classes), mostly mechanical, and reuse the
   canonical class composition the other adapters already consume.

---

## Definition of done

A shadcn-only host can import `@crafted-design/editor/core` and ship without
MUI in the bundle or `node_modules`; MUI/Chakra are opt-in subpath imports
backed by optional peer deps; a dependency-free plain-HTML adapter ships and
covers every canonical; a compatibility matrix + version-support policy
document the adapter set. The full entry stays batteries-included.

When § 7 (less the Stretch full-adapter builds) and § 8.3 are satisfied,
Phase 16 is complete and `0.7.0` cuts at the close-out commit.

---

## Close-out (`0.7.0`)

Phase 16 complete. The package is modular, MUI is an optional peer, a third
built-in adapter ships, and the ecosystem story is documented + CI-guarded.

**Per-group:**

- **A — Modularization.** Lean `src/core.tsx` entry (editor + shadcn + html,
  no MUI) owning the full export surface; full `main-app.tsx` = core + MUI.
  `vite.config.dist.ts` entries for `core` + `adapters/{shadcn,mui,html}`;
  `@mui/*` + `@emotion/*` externalized + moved to optional peers; `exports`
  subpaths + `sideEffects` registration modules.
- **B — Plain-HTML adapter scaffold.** All 48 canonicals registered as
  semantic HTML, `/adapters/html` subpath, 3-way coverage-parity guard.
- **C — Compatibility matrix.** `scripts/adapter-matrix.ts` → `docs/ADAPTER_MATRIX.md`;
  `--check` CI guard; `docs:matrix` script.
- **D — Versioning + peer deps.** `peerDependencies` as a validated
  adapter-manifest field; `docs/ADAPTER_VERSIONING.md`; `peer-deps.test.ts`
  drift guard; matrix peer-deps section.
- **E — Plain-HTML rendering correctness.** Token baselines mirroring shadcn +
  prop-driven fixes. See decisions below.
- **F — Close-out.** This section; CHANGELOG `0.7.0` + migration; PRODUCTION_READINESS
  §§ 7 ✅ / 8.3 addressed; INTEGRATION_GUIDE entry-point matrix; DEVELOPER_GUIDE
  subpath-adapter recipe; version → `0.7.0`.

**Decisions / discoveries:**

- **Opt-in at the import boundary, not runtime.** Runtime `import()` of an
  adapter would re-register post-mount and reshape `AdapterProvider`'s wrapper
  tree, remounting (wiping) the canvas. Subpath imports hit the same bundle
  goal safely.
- **Group B shipped a scaffold; correctness was deferred to Group E.** The
  empty-default canonicals (button/input/badge/card/alert/tabs/select/…) get
  their look from the shadcn/MUI *component*, not from default classes, so the
  minimal HTML impls rendered bare until E gave each a design-token baseline.
- **Group E caught a class of prop-driven bugs**, surfaced partly by dogfooding
  (Grid rendered as a plain div): Stack/Grid/Container were aliased to Box and
  ignored their layout props; Spinner rendered nothing (`iconElement` has no
  loader glyph → CSS ring); Heading was always `<h2>` (matched `level` against
  `'h1'` but the prop is `'1'..'6'`); Progress only drew the bar (added the
  circular SVG); Pagination was bare numbers; overlays rendered inline in the
  canvas instead of portaling to the right-side overlay stage. A proactive
  audit of every shadcn component that derives render from props caught the
  rest in one pass rather than one user round-trip at a time.
- **Bundle delta is consumer-side.** Our two entries (`index.js` ~253 / `core.js`
  ~245 KB gz) are close because MUI is now external for both; the real win is
  shadcn-only hosts no longer downloading MUI (the `0.6.0` `index.js` bundled it
  at 414 KB gz).
- **Plain-HTML is dependency-free by design.** lucide-react is an icon set (not
  a UI framework) so icon-bearing impls use it; overlays reimplement the
  portal/backdrop themselves rather than pulling in Radix.

**Verification:** lint 0 errors; tsc clean; 623 tests; app + dist builds; size
gate green (full 253 / core 245 / sdk 44 / css 124 KB gz, all within budget);
`docs:matrix --check` passes (built-ins 48/48). MUI/Emotion/Chakra remain
devDeps so the app + tests still resolve them; consumers install the optional
peers per the migration note.

**Remaining (Stretch, post-0.7.0):** full production Chakra/Ant/Mantine/Bootstrap
adapters (§ 7.1–7.2), adapter marketplace (§ 7.5), multi-version CI matrix
(§ 7.4), runtime lazy loading (§ 8.3 alt — rejected).
