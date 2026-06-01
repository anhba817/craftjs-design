# Release runbook

How `@crafted-design/editor` gets published, and the path from the current
`0.9.0` release candidate to a stable `1.0.0`. Some steps are **host/ops
actions** that can't happen inside the repo — they're called out as such.

---

## One-time host setup (ops)

These are prerequisites for the automated release + docs workflows. Done once
by a repo admin:

1. **Make the GitHub repo public.** Required for npm provenance
   (`NPM_CONFIG_PROVENANCE`) and for GitHub Pages docs hosting. (§ 9.10)
2. **Add the `NPM_TOKEN` secret.** An npm automation token with publish rights
   to the `@crafted-design` scope, as a repository secret. `GITHUB_TOKEN` is
   provided by Actions automatically.
3. **Enable GitHub Actions** for the repo (CI + Release workflows).
4. **Enable GitHub Pages** with **Source = GitHub Actions** so the TypeDoc
   site (`docs.yml`) deploys.

Until #1–#3 are done, releases run locally (see "Manual release" below).

---

## Standing release flow (Changesets)

Day to day, releasing is automated — you never hand-edit the version or
CHANGELOG:

1. **Every behavior-changing PR adds a changeset** — `npm run changeset`, pick
   the bump level, commit the generated `.changeset/*.md`. (Doc/internal-only
   PRs don't need one.) See [CONTRIBUTING.md](../CONTRIBUTING.md).
2. **On merge to `main`**, the Release workflow (`.github/workflows/release.yml`)
   opens/updates a **"Version Packages" PR** that bumps `package.json` and
   folds pending changesets into `CHANGELOG.md`.
3. **Merging that PR** (when no changesets remain) triggers
   `npm run release` → `build:dist && changeset publish --tag next`, publishing
   to the **`next`** dist-tag.

> The phase close-outs in this repo bumped the version + CHANGELOG by hand
> because nothing was published yet and the automation never ran. Once #1–#3
> above are in place, switch to the Changesets flow — don't keep hand-editing.

### Manual release (fallback / pre-automation)

From a clean `main` with the version + CHANGELOG already set:

```bash
npm run release   # build:dist && changeset publish --tag next
```

Requires being logged in to npm with publish rights (`npm whoami`).

---

## Promoting `next` → `latest`

The package lives on the **`next`** dist-tag during preview. Promotion to the
default `latest` tag is a deliberate, separate step (this is what "going 1.0"
means for consumers):

```bash
npm dist-tag add @crafted-design/editor@<version> latest
```

Don't promote until the 1.0 criteria below are all met.

---

## Road to 1.0 — go / no-go criteria

`1.0.0` is cut only when **every** box is checked. `0.9.0` (the current RC)
exists to soak against these.

- [ ] **Public surface frozen.** `src/sdk/surface.test.ts` green; no pending
      surface changes. (Frozen in `0.8.0`; `0.9.0` added the overlay/cn/
      prop-type authoring seams — deliberate, snapshot-recorded.)
- [ ] **Migration template in place.** `docs/MIGRATION.md` exists; a concrete
      entry is only needed if a break lands before 1.0. (Group D — ✅.)
- [ ] **All CI gates green** on `main`: lint, type-check, tests, `build:dist`,
      `check:size`, `check:licenses`, `docs:matrix --check`.
- [ ] **Docs complete.** INTEGRATION_GUIDE, SDK_GUIDE (incl. stability),
      COOKBOOK, FAQ, ADAPTER_MATRIX/VERSIONING current. (✅ in `0.8.0`.)
- [ ] **Host actions done.** Repo public, `NPM_TOKEN` set, Actions + Pages
      enabled. (Ops — see "One-time host setup".)
- [ ] **RC soak elapsed.** `0.9.0` published to `next` and exercised by at
      least one real integration with no surface change required.

When all are true:

1. Land a `major` changeset (or bump `package.json` to `1.0.0` + finalize the
   CHANGELOG `1.0.0` entry if still releasing manually).
2. Publish, then `npm dist-tag add @crafted-design/editor@1.0.0 latest`.
3. Announce; the frozen surface is now under the full SemVer promise
   ([SDK_GUIDE.md → Public API stability](./SDK_GUIDE.md#public-api-stability-toward-10)).
