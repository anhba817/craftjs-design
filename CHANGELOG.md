# Changelog

All notable changes to `@crafted-design/editor` are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What counts as a breaking change

The version bump policy follows semver strictly. A change is **breaking** (major bump) if it:

- Removes an exported function, type, or value from `@crafted-design/editor` or `@crafted-design/editor/sdk`.
- Removes a built-in canonical from the registry (because saved documents reference it by id).
- Changes the document envelope shape (`EditorDocument`) without shipping a migration in `src/persistence/migrations.ts`.
- Changes the signature of a publicly-exported hook in a way that older callers won't compile.
- Renames a Craft.js bridge type or a registered panel id.

A change is **non-breaking** (minor / patch) if it:

- Adds new exports.
- Adds new canonicals, adapters, themes, templates, or panels.
- Adds new optional fields to existing types (and to the document envelope, with a default).
- Changes internal modules under `src/` that aren't re-exported through `src/sdk/`.
- Changes UI strings, styling, or layout without changing the rendered HTML structure that integration consumers depend on.

Between `0.x` minors the API may evolve without a major bump — preview phase. `1.0.0` freezes the SDK surface.

## [Unreleased]

The `0.1.0` initial public preview consolidates all Phase 1 → Phase 9 work into a single shippable artifact. Phase 10 is in progress; the Unreleased section tracks Phase 10 deltas until `0.1.0` cuts.

### Added (Phase 10 — Group A, in progress)

- Two-entry-point dist build: `@crafted-design/editor` (full editor) + `@crafted-design/editor/sdk` (SDK boundary alone). Subpath exports route via `package.json`.
- `vite-plugin-dts` integration emits matching `.d.ts` files alongside the JS bundles (`dist-lib/main-app.d.ts`, `dist-lib/sdk/index.d.ts`).
- `src/sdk/internal/deprecate.ts` — once-per-call-site `console.warn` helper for the deprecation policy below.
- ESLint `no-restricted-imports` rule blocks `examples/**` from reaching past `@design/sdk` into internal modules.

### Changed (Phase 10 — Group A, in progress)

- `package.json` reshaped for publish: scoped name `@crafted-design/editor`, `peerDependencies` for React 19 + Craft.js, `prepublishOnly` script, `publishConfig.tag = "next"`.

## Deprecation policy

When an exported API is renamed or about to be removed:

1. The deprecated form stays exported for **at least one minor version**.
2. It calls `deprecate(api, sinceVersion, migration)` on first use per session per call site. The console message includes the migration step.
3. The new form is documented in the same section of `SDK_GUIDE.md` with a "Was previously…" note linking back to the old name.
4. Removal lands in the next major version. The CHANGELOG's "Removed" subsection lists every previously-deprecated export that's gone.

The first round-trip — from deprecation warning to removal — will happen between `0.1.0` and `1.0.0`. There are no current deprecations to migrate from `0.x`.

## Earlier phases (pre-public history)

For context, the pre-public phase plans are in `docs/plans/PHASE1_PLAN.md` through `docs/plans/PHASE9_PLAN.md`. The Phase 9 close-out summarises all reliability work that ships in `0.1.0`. From `0.1.0` onward, this CHANGELOG is the public record; phase plans remain in-repo as internal documentation.
