# Phase 20 — Developer experience & proof

**Status:** complete — shipped in 1.2.0 (2026-06-03)
**Cuts as:** the next release after `1.1.0` (additive — `1.2.0` recommended,
since the scaffolding CLI is a visible new capability).
**Theme:** the editor is a feature-complete v1, but extending it (the whole
point of the adapter/canonical/panel SDK) currently means reading a tutorial
and reverse-engineering the patterns, and there's nowhere to *see* it running.
This phase lowers the authoring barrier and makes the result visible — the
cheapest, highest-leverage post-1.0 move toward adoption.

## Where things stand

- The SDK (`@crafted-design/editor/sdk`) is the product's moat: hosts author
  adapters, canonicals, and inspector panels against a frozen surface. But the
  only on-ramp is prose — `docs/TUTORIAL_{ADAPTER,CANONICAL,PANEL}.md` — plus
  the in-tree `examples/adapter-chakra` to read. No generator, no "new file
  with the boilerplate already wired up."
- `examples/`: `adapter-chakra` (a real example adapter, 20/48, in-tree),
  `minimal-host` (**README only** — a copy-paste reference, NOT a runnable,
  CI-built project, so its snippets can silently drift from the API), and
  `sdk-smoke` (`consumer.tsx`).
- There is **no public, clickable demo**. `docs.yml` deploys the guides at `/`
  and the TypeDoc reference at `/api/`, but never the editor itself. A
  prospective adopter can read about it but can't touch it.
- `scripts/adapter-matrix.ts` already knows the full canonical × adapter
  coverage grid (it writes `docs/ADAPTER_MATRIX.md`) — the data for a visual
  cross-adapter gallery already exists; only the rendering is missing.

## Goal

```bash
# scaffold a new adapter/canonical/panel, pre-wired to the SDK + a passing test
npx @crafted-design/editor scaffold adapter my-design-system
npx @crafted-design/editor scaffold canonical pricing-table
npx @crafted-design/editor scaffold panel seo-meta
```
…and a **deployed, clickable** editor + a live component gallery at the docs
site, with "Open in StackBlitz" one-click trials on every tutorial.

## In-scope

| Group | Theme |
|---|---|
| A | Scaffolding CLI — `scaffold adapter\|canonical\|panel` generators |
| B | Live showcase — deploy the editor + a cross-adapter component gallery to Pages |
| C | Runnable, CI-built starter + "Open in StackBlitz" trials |
| D | Docs + close-out |

A is the marquee win (authoring friction); B/C are the "proof" half (make it
visible + tryable); D ties off.

## Resolved decisions

### 1. The CLI is a `bin` on the existing package — NOT a second package (for now)

`@crafted-design/editor` gains a `bin` (`scaffold`), invokable as
`npx @crafted-design/editor scaffold …`. Rationale: a standalone
`create-crafted-design` package would need its own npm trusted-publisher
config, release wiring, and (likely) workspace tooling — disproportionate
infrastructure for a scaffolder, and package #1 isn't even published to
`latest` yet. A `bin` ships templates in the existing `files` allowlist, costs
zero new publish infra, and is available the moment the editor is published.
The idiomatic `npm create crafted-design` form (a `create-crafted-design`
shim) and a full standalone CLI are noted as a **future** extraction if the
tool grows past scaffolding. The CLI is a **new public surface** with its own
SemVer obligations — its command/flag grammar is settled deliberately in this
group and documented, but kept deliberately small (three `scaffold`
subcommands, no plugin system).

### 2. The CLI generates into the HOST's project, wired to the published SDK

Generated files import from `@crafted-design/editor/sdk` (the consumer path —
never the in-repo `@design/sdk` alias), include the side-effect registration
import the host must add, a working impl stub, and a **passing smoke test**
(the generated code must typecheck + the test must pass out of the box — the
CLI's own test suite asserts this by generating into a temp dir and running
`tsc` + the test). No network calls, no interactive wizard beyond a name
prompt; deterministic output so it's diffable.

### 3. Storybook is CUT; the cross-adapter gallery is ours, in Group B

A standalone Storybook would add a heavy new toolchain + build for marginal
gain over a gallery we fully control and already have the data for
(`adapter-matrix.ts`). The gallery renders every canonical across
shadcn/MUI/HTML side-by-side as a static page deployed with the docs — it
doubles as a public component reference AND a visual-regression surface,
without Storybook's footprint.

### 4. Pages deploy gains a `/try` (editor) + `/gallery` route

`docs.yml` extends to build the full editor (`vite build` → `dist/`) and the
gallery, copying them into `_pages/try/` and `_pages/gallery/`. These deploy
**from source** — they are NOT blocked by npm publish. Only the CLI's `npx`
form and the StackBlitz-from-npm trials require the package to be on `latest`
(see Dependencies).

## Group A — Scaffolding CLI

**Land**

1. `src/cli/` — a small argv parser (no heavy CLI dep; Node's `util.parseArgs`)
   exposing `scaffold <adapter|canonical|panel> <name>`. `bin` field in
   `package.json` → `dist-lib/cli.js`; new entry in `vite.config.dist.ts`
   (Node target, shebang, externalized deps).
2. Templates for each kind: an adapter skeleton (manifest + a couple of
   component impls + `peerDependencies` field stub), a canonical
   (`registerCanonical` + defaults + adapter impl note), a panel
   (`registerPanel` + a `PropField`). Each emits the registration side-effect
   import and a `*.test.ts` smoke test.
3. CLI test suite: generate each kind into a temp dir, assert files exist, run
   `tsc` against them and run the generated test — proves the output is
   correct, not just present. Wire into CI.
4. `check:size` budget for the new `cli.js` entry; it must NOT pull the editor
   runtime into its graph (templates are emitted as strings/files, not
   imported).

**Output** — `npx @crafted-design/editor scaffold adapter foo` produces a
typechecking, test-passing skeleton. Authoring an extension starts from
working code, not a blank file.

## Group B — Live showcase + gallery

**Land**

1. Deploy the editor: extend `docs.yml` to `vite build` the dogfood app and
   publish it at `/try`. Strip the dev-only dogfood affordances (the chrome
   theme toggle, demo color variables) behind a build flag so `/try` is a
   clean editor, not the dev harness.
2. Component gallery: a generator (sibling to `adapter-matrix.ts`) that renders
   every canonical under each registered adapter into a static
   `/gallery` page — grouped by category, each cell labeled with adapter +
   canonical id, missing impls shown as the placeholder. Reuses the
   paper-and-ink design language of the docs site.
3. Link them from the docs landing hero ("Try it live →", "Component gallery
   →") and cross-link from the README.

**Output** — a prospective adopter can click into a running editor and see
every component in every design system, from the docs site, with no install.

## Group C — Runnable starter + StackBlitz

**Land**

1. Promote `examples/minimal-host` from README-only to a **real, runnable**
   Vite + React 19 + TS project (its own `package.json`, `src/`), building
   against the published package. A CI job builds it so the canonical "minimal
   integration" can't drift from the real API. (Keep the README as the
   walkthrough; the code becomes the source of truth.)
2. "Open in StackBlitz" buttons: a StackBlitz GitHub-import URL pointing at
   `examples/minimal-host`, added to each tutorial and the quick-start guide
   (via `build-docs-site.ts`). One click → a running editor in the browser.
3. Optionally dogfood the CLI: generate `examples/adapter-*-starter` from the
   Group A templates and assert it matches checked-in output (keeps the
   templates honest).

**Output** — "try before install" is one click; the minimal integration is
CI-guaranteed to compile against the shipped API.

## Group D — Docs + close-out

**Land**

1. DEVELOPER_GUIDE — a "Scaffolding with the CLI" section at the top of each
   authoring recipe ("generate the skeleton, then…"), so the CLI is the
   default on-ramp and the prose explains what it produced.
2. README highlight + a "Try it live / Component gallery" docs-landing block;
   FAQ entry ("How do I start a new adapter?").
3. CHANGELOG `1.2.0`; docs site regenerated; version cut.

**Output** — phase complete; release cut.

## Dependencies & ordering

- **npm publish is the gating prerequisite for the consumer-facing halves**
  (host action — OIDC or manual). `npx @crafted-design/editor scaffold …`,
  the StackBlitz-from-npm trials, and any "install this version" copy only work
  once `@crafted-design/editor` ≥ `1.2.0` is on `latest`. The CLI itself, the
  `/try` editor, and the `/gallery` all build and test **from source** and are
  NOT blocked — so Phase 20 engineering proceeds regardless; only the
  user-facing "go live" depends on the publish.
- Build/test A before C's CLI-dogfooding step (C step 3 consumes A's templates).

## Out of scope

| Item | Why |
|---|---|
| Standalone `create-crafted-design` package / `npm create` form | A `bin` covers the need with zero new publish infra; extract later on demand (Decision 1). |
| Storybook | Heavy toolchain; our own gallery covers the showcase + regression need (Decision 3). |
| CLI plugin system / interactive wizard / `eject` | Keep the surface tiny — three deterministic `scaffold` subcommands. |
| DevTools browser extension (PRODUCTION_READINESS § 9.7) | Separate, larger DevEx bet; not authoring-friction. |
| Hosted multi-file playground we run ourselves | StackBlitz/CodeSandbox host it for free; running our own is infra we don't need. |

## Risks + mitigations

1. **Generated code drifts from the SDK as the API evolves.** Mitigation: the
   CLI test suite generates + `tsc`s + runs the smoke test in CI, so a breaking
   SDK change fails the CLI tests in the same commit.
2. **The CLI becomes a maintenance surface under SemVer.** Mitigation: keep it
   to three `scaffold` subcommands with a stable flag grammar; no plugin
   extensibility (Decision 1).
3. **`/try` exposes dev-harness rough edges (demo toggles, color-variable
   provider).** Mitigation: a build flag strips dogfood-only affordances so the
   public demo is a clean `<Editor />`.
4. **The `bin` adds CLI deps to every host's install graph.** Mitigation: the
   CLI entry uses only Node built-ins (`parseArgs`, `fs`) — zero runtime deps —
   and `check:size` guards that it never imports the editor runtime.
5. **StackBlitz GitHub-import lag / API changes.** Mitigation: the runnable
   starter (Group C step 1) is the source of truth and CI-built; the StackBlitz
   link is a convenience layer over it, not the only path.

## Definition of done

`npx @crafted-design/editor scaffold adapter|canonical|panel <name>` emits a
typechecking, test-passing skeleton (CI-verified); the docs site links to a
deployed, clickable `/try` editor and a `/gallery` of every canonical across
all adapters; `examples/minimal-host` is a CI-built runnable project with a
one-click StackBlitz trial; the authoring docs lead with the CLI; release cut
as `1.2.0`.
