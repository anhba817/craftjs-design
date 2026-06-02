# Release runbook

How `@crafted-design/editor` is published. **`1.0.0` is the first stable
release**; the public SDK surface is now **frozen under SemVer** — removing or
renaming any export (the set enumerated in `src/sdk/surface.test.ts`) is a
breaking, major-version change. See
[SDK_GUIDE.md → Public API stability](./SDK_GUIDE.md#public-api-stability).
Releases publish to the default **`latest`** dist-tag. Some steps are
**host/ops actions** that can't happen inside the repo — they're called out as
such.

---

## One-time host setup (ops)

Prerequisites for the automated release + docs workflows. Done once by a repo
admin:

1. **Make the GitHub repo public.** Required for npm provenance + GitHub Pages
   docs hosting.
2. **Enable GitHub Actions** for the repo (CI + Release + Docs workflows).
3. **Enable GitHub Pages** with **Source = GitHub Actions** so the docs site
   (`docs.yml`) deploys (guides at `/`, the TypeDoc API reference at `/api/`).
4. **Configure npm Trusted Publishing** for the package. npm no longer accepts
   long-lived automation tokens for CI publishes — CI authenticates via OIDC,
   so there is **no `NPM_TOKEN` secret**. On npmjs.com → the package →
   **Settings → Publishing access → Add trusted publisher**, set:
   - Provider: **GitHub Actions**
   - Repository: `anhba817/craftjs-design` (owner/repo)
   - Workflow filename: **`release.yml`**
   - Environment: *(leave blank — the workflow uses none)*

   `release.yml` already has `permissions: id-token: write` and upgrades npm to
   ≥ 11.5.1, which OIDC requires.

> **The first publish is manual.** A trusted publisher is configured *on an
> existing package*, so the package must exist on the registry before you can
> add one — and OIDC only works inside CI. The `1.0.0` cut is therefore
> published once by hand (see *Manual / bootstrap release*), after which you
> add the trusted publisher (step 4) and every CI publish is tokenless OIDC.

---

## Standing release flow (Changesets → OIDC → `latest`)

Day to day, releasing is automated — you never hand-edit the version or
CHANGELOG:

1. **Every behavior-changing PR adds a changeset** — `npm run changeset`, pick
   the bump level (a removed/renamed public export is a **major**), commit the
   generated `.changeset/*.md`. (Doc/internal-only PRs don't need one.) See
   [CONTRIBUTING.md](../CONTRIBUTING.md).
2. **On merge to `main`**, the Release workflow (`.github/workflows/release.yml`)
   opens/updates a **"Version Packages" PR** (via `changesets/action`) that
   bumps `package.json` and folds pending changesets into `CHANGELOG.md`.
3. **Merging that PR** (when no changesets remain) triggers the workflow's
   publish step: `npm publish --provenance --tag latest`, authenticated by the
   **GitHub OIDC token** (trusted publishing — no `NPM_TOKEN`). It guards on
   `npm view` so it only publishes a version not already on the registry.

> The workflow does NOT use `changeset publish` — that path currently fails
> with an E404 for OIDC + scoped packages (npm/cli#8976), and our package is
> scoped. `npm publish` directly is npm's documented OIDC path.

> **Pre-1.0 history:** versions `0.1.0`–`0.9.0` were bumped by hand (no
> changeset files were ever created) while nothing was published. From `1.0.0`
> on, use the Changesets flow above rather than hand-editing.

### Manual / bootstrap release (token-based)

Use this for the **first** publish (creating the package on the registry) or
any local hotfix where CI OIDC isn't available. From a clean `main` with the
version + CHANGELOG set:

```bash
npm login              # or put an automation token in ~/.npmrc
npm run build:dist
npm publish            # defaults to the `latest` tag (publishConfig.tag)
```

`prepublishOnly` rebuilds dist-lib + runs the tests before packing. Omit
`--provenance` here — it only works inside a supported CI/OIDC run. Verify with
`npm view @crafted-design/editor`. After the first publish, add the trusted
publisher (host setup step 4) so subsequent releases go through CI OIDC.

---

## Prereleases (optional)

To preview a release without moving `latest` (e.g. an RC before a breaking
major), publish to the `next` tag instead:

```bash
npm version 2.0.0-rc.0 --no-git-tag-version
npm publish --tag next     # or set publishConfig.tag temporarily
```

Promote it to stable when ready:

```bash
npm dist-tag add @crafted-design/editor@2.0.0 latest
```

---

## Cutting a breaking (major) release

The `1.0.0` SemVer freeze means a breaking change is a deliberate event:

1. Land a **`major`** changeset.
2. Write the concrete entry in [`docs/MIGRATION.md`](./MIGRATION.md) — what
   changed, how to update integration code, and any document-envelope
   migration.
3. Update the frozen surface snapshot in `src/sdk/surface.test.ts` in the same
   change, and note the removal/rename in the CHANGELOG.

---

## Per-release checklist

- [ ] CI green on `main`: lint, type-check, tests, `build:dist`, `check:size`,
      `check:licenses`, `docs:matrix --check`.
- [ ] Any public-surface change is intentional (`surface.test.ts` updated) and,
      if breaking, has a `docs/MIGRATION.md` entry + a `major` changeset.
- [ ] `CHANGELOG.md` has an entry for the release (or pending changesets that
      fold into one).
- [ ] Host setup complete (repo public, Actions + Pages on, trusted publisher
      configured after the first publish).
