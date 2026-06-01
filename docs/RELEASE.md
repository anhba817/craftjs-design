# Release runbook

How `@crafted-design/editor` gets published, and the path from the current
`0.9.0` release candidate to a stable `1.0.0`. Some steps are **host/ops
actions** that can't happen inside the repo — they're called out as such.

---

## One-time host setup (ops)

These are prerequisites for the automated release + docs workflows. Done once
by a repo admin:

1. **Make the GitHub repo public.** Required for npm provenance + GitHub Pages
   docs hosting. (§ 9.10)
2. **Enable GitHub Actions** for the repo (CI + Release workflows).
3. **Enable GitHub Pages** with **Source = GitHub Actions** so the TypeDoc
   site (`docs.yml`) deploys.
4. **Configure npm Trusted Publishing** for the package. npm no longer accepts
   long-lived automation tokens for CI publishes — CI authenticates via OIDC,
   so there is **no `NPM_TOKEN` secret**. On npmjs.com → the package →
   **Settings → Publishing access → Add trusted publisher**, set:
   - Provider: **GitHub Actions**
   - Repository: `anhba817/craftjs-design` (owner/repo)
   - Workflow filename: **`release.yml`**
   - Environment: *(leave blank — the workflow uses none)*

   The Release workflow already has `permissions: id-token: write` and upgrades
   npm to ≥ 11.5.1, which is what OIDC requires.

> **First-publish chicken-and-egg.** A trusted publisher is configured *on an
> existing package*, so the package must exist on the registry before you can
> add one. For the **very first** publish of `@crafted-design/editor`, publish
> once manually to create it (see *Manual / first release* below), then add the
> trusted publisher per step 4 — every CI publish after that is tokenless OIDC.

Until #1–#2 are done, releases run locally (see *Manual / first release*).

---

## Standing release flow (Changesets)

Day to day, releasing is automated — you never hand-edit the version or
CHANGELOG:

1. **Every behavior-changing PR adds a changeset** — `npm run changeset`, pick
   the bump level, commit the generated `.changeset/*.md`. (Doc/internal-only
   PRs don't need one.) See [CONTRIBUTING.md](../CONTRIBUTING.md).
2. **On merge to `main`**, the Release workflow (`.github/workflows/release.yml`)
   opens/updates a **"Version Packages" PR** (via `changesets/action`) that
   bumps `package.json` and folds pending changesets into `CHANGELOG.md`.
3. **Merging that PR** (when no changesets remain) triggers the workflow's
   publish step: `npm publish --provenance --tag next`, authenticated by the
   **GitHub OIDC token** (trusted publishing — no `NPM_TOKEN`). The step
   guards on `npm view` so it only publishes a version not already on the
   registry. Publishes to the **`next`** dist-tag.

> The workflow does NOT use `changeset publish` — that path currently fails
> with an E404 for OIDC + scoped packages (npm/cli#8976), and our package is
> scoped. `npm publish` directly is npm's documented OIDC path.

> The phase close-outs in this repo bumped the version + CHANGELOG by hand
> because nothing was published yet and the automation never ran. Once the host
> setup is in place, switch to the Changesets flow — don't keep hand-editing.

### Manual / first release (token-based)

OIDC trusted publishing only works **inside the CI workflow** (it needs the
GitHub OIDC token) and only **after** the package exists + a trusted publisher
is configured. For the **first** publish, or any local/manual publish, use a
classic auth path from a clean `main` with the version + CHANGELOG set:

```bash
npm login                 # or set an automation token in ~/.npmrc
npm run build:dist
npm publish --tag next    # creates / publishes @crafted-design/editor
```

After this first publish, configure the trusted publisher (host setup step 4)
so subsequent releases go through tokenless CI OIDC.

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
- [ ] **Host actions done.** Repo public, Actions + Pages enabled, npm Trusted
      Publisher configured (after the first manual publish). (Ops — see
      "One-time host setup".)
- [ ] **RC soak elapsed.** `0.9.0` published to `next` and exercised by at
      least one real integration with no surface change required.

When all are true:

1. Land a `major` changeset (or bump `package.json` to `1.0.0` + finalize the
   CHANGELOG `1.0.0` entry if still releasing manually).
2. Publish, then `npm dist-tag add @crafted-design/editor@1.0.0 latest`.
3. Announce; the frozen surface is now under the full SemVer promise
   ([SDK_GUIDE.md → Public API stability](./SDK_GUIDE.md#public-api-stability-toward-10)).
