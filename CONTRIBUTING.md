# Contributing

Thanks for helping improve `@crafted-design/editor`. This guide covers the
dev loop, the checks CI enforces, and the conventions that keep the SDK
boundary clean.

## Setup

```bash
npm install          # also installs git hooks (lefthook) via `prepare`
npm run dev          # the dogfood editor app at the printed localhost URL
```

Node 20+ (CI runs on 22). The package is ESM-only.

## The dev loop

| Command | What |
|---|---|
| `npm test` | vitest (watch: `npm test`; once: `npx vitest run`) |
| `npm run lint` | eslint — must be **0 errors** (warnings are tracked tech debt) |
| `npx tsc -b` | type-check |
| `npm run build:dist` | build the publishable library |
| `npm run check:size` | bundle-size budget (gzip) |
| `npm run check:licenses` | runtime-dependency license audit |
| `npm run analyze` | bundle treemap → `bundle-stats.html` |

CI runs lint + type-check + tests + `build:dist` + `check:size` +
`check:licenses` on every push and PR. A green local run of those mirrors CI.

### Pre-commit hooks

`npm install` installs [lefthook](https://lefthook.dev) hooks (`prepare`
script). On commit they lint + type-check staged files; on push they run
tests. To (re)install manually: `npx lefthook install`. Skip once with
`LEFTHOOK=0 git commit …` if you must.

## Changesets — every behavior-changing PR

We version + publish with [Changesets](https://github.com/changesets/changesets).
If your PR changes shipped behavior, add a changeset:

```bash
npm run changeset
```

Pick the bump level (see [`.changeset/README.md`](./.changeset/README.md) and
the CHANGELOG's "What counts as a breaking change") and commit the generated
`.changeset/*.md`. Pure-internal or doc-only changes don't need one. The
release workflow consumes pending changesets on merge to `main`.

## Conventions

- **SDK boundary.** Public API lives in `src/sdk/`. Code under `examples/`
  (and integration consumers) must import only from `@design/sdk` /
  `@crafted-design/editor/sdk` — never `@/...`. An ESLint rule enforces this
  for `examples/**`. New public surface gets added to `src/sdk/` explicitly.
- **Phase plans.** Larger work is planned in `docs/plans/PHASEnn_PLAN.md`
  before implementation; groups are committed incrementally.
- **Verify at runtime.** Tests + type-check aren't sufficient for UI changes —
  run `npm run dev` and confirm the behavior before considering it done.
- **Recipes.** `docs/DEVELOPER_GUIDE.md` has step-by-step recipes for adding a
  canonical, adapter, inspector panel, schema migration, or StorageAdapter.

## Reporting bugs / requesting features

Use the issue templates (bug report, feature request, adapter request).
Security issues: see [SECURITY.md](./SECURITY.md) — report privately, not via a
public issue.

By contributing you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
