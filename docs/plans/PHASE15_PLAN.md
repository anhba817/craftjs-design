# Phase 15 — Launch readiness (production hardening)

**Status:** ✅ complete — shipped as `0.6.0` (see close-out at bottom).
**Cuts as:** `0.6.0`
**Audience:** whoever turns a feature-complete editor into a credibly
publishable package — CI, security, bundle, observability, contributor
infra.
**Scope discipline:** the remaining **production-blocker** and **High**
items from PRODUCTION_READINESS that gate "this is a real product you can
depend on" — drawn from §§ 8, 9, 10, 11, 12, 13. Not a single
PRODUCTION_READINESS section: phases 11–14 shipped the feature sections
(§§ 3–6); § 1 (reliability) shipped in Phase 9. What's left for a real
release is cross-cutting hardening, which is what this phase collects.

## Goal

The editor is feature-mature: 48 canonicals across two full adapters,
style depth, multi-document persistence on IndexedDB. What stands between
it and a release teams can adopt is *not another feature* — it's the
machinery of a maintainable, trustworthy package:

- **It builds green on every push** (CI) and **releases without a manual
  ritual** (changesets).
- **It's safe to embed** (CSP guidance + a nonce path, XSS input
  validation, dependency + license audit).
- **It ships a lean, analyzable bundle** (budget in CI, code-split the
  heavy adapter, verified tree-shaking, an ESM-only stance documented).
- **Hosts can observe it** (one telemetry context the error boundaries
  + perf hooks feed).
- **Contributors can land changes** (CONTRIBUTING, templates, the public
  API reference site).

That's the difference between "an impressive demo" and "a dependency."

In-scope (production-blocker + High items, by group):

| Group | Theme | PRODUCTION_READINESS items |
|---|---|---|
| A | CI + release automation | 9.4 CI pipeline, 9.5 pre-commit hooks, 9.6 release automation, 12.3 bundle budget in CI |
| B | Security + compliance | 11.1 CSP (doc + nonce path), 11.2 XSS input validation, 11.3 dep-vuln scan, 11.4 license audit |
| C | Bundle + load cost | 8.3 lazy adapter loading, 8.4 tree-shakable SDK, 12.1 module-format stance, 12.3 analyzer, 12.5 min variant |
| D | Observability | 13.1 TelemetryProvider context, 13.2 perf-metric callbacks, 13.4 error-reporting recipe |
| E | Contributor + docs infra | 9.1 CONTRIBUTING, 9.2 CoC, 9.3 issue/PR templates, 9.10 public-repo prep, 10.1 API reference site |
| F | Close-out | verification, docs, `0.6.0` cut |

Group A first — once CI + the bundle budget exist, every later group lands
behind a green gate.

---

## Resolved decisions

Settled up front so the implementer doesn't re-litigate them.

### 1. ESM-only stays — documented, not dual-packaged

The package already ships ESM with subpath `exports` (`.`, `./sdk`,
`./vite-plugin`, `./index.css`). We **do not** add CommonJS/UMD: React 19 +
the modern adapter stack are ESM-first, and a dual package invites the
well-known dual-package-hazard (two copies of the registry singletons).
§ 12.1 resolves as "ESM is the supported path," stated explicitly in the
docs. Subpath imports (§ 12.2) are already done — verify + document, don't
rebuild.

### 2. CI is GitHub Actions; releases are Changesets

`.github/workflows/ci.yml` runs lint + typecheck + test + `build:dist` +
the bundle-budget check on every push/PR. Releases use **Changesets**
(`.changeset/`): a PR adds a changeset; merge to main bumps the version,
updates CHANGELOG, and publishes to npm under the `next` dist-tag. The
actual npm token + "make the repo public" are **host actions** the plan
calls out but can't perform.

### 3. Security is boundary validation, not a sandbox

The XSS surface is the handful of places user strings reach CSS / URLs:
`registerFontToken({url})` (→ `@font-face`), `gradientToCss` /
inline-style values (→ `style`), and arbitrary `style.inline` props. We add
**validators with tests** (reject CRLF / control chars in font URLs;
constrain gradient hex + position ranges; whitelist-shape inline CSS
values) rather than attempt a CSS sandbox. CSP: keep `'unsafe-inline'` the
zero-config default but add an **optional nonce** the host can pass so the
runtime `<style>` injection is CSP-strict-compatible; document the required
directives either way.

### 4. Lazy-load only the heavy adapter

shadcn is the default and stays eager. **MUI** (the ~50 KB one) moves behind
a dynamic `import()` so hosts that never switch adapters don't pay for it.
This needs the resolver/adapter registry to tolerate an adapter that
registers asynchronously (a "loading" state on adapter switch). The Chakra
example follows the same lazy pattern. Tree-shaking (§ 8.4): keep the
ergonomic `export *` SDK surface but verify `sideEffects: false` and that a
host importing one helper doesn't pull the whole SDK (measured, not
assumed).

### 5. Telemetry is one context, no bundled analytics

A `<TelemetryProvider onError onMetric>` context that the existing four
error boundaries consume (replacing their per-boundary `onError` prop) plus
opt-in perf-metric emission points. The editor ships **no** analytics SDK
and collects nothing by default — it only calls the host's handlers.

### 6. "Public-repo / hosting" work is config the agent lands + actions the host takes

The plan lands the *files* (CONTRIBUTING.md, CoC, `.github/` templates, the
TypeDoc build + a deploy workflow). Making the repo public, provisioning
Pages/Vercel, and adding the npm token are host actions, listed explicitly
so nothing silently "looks done" that isn't.

---

## Cross-cutting work

1. **Bundle-budget script** (`scripts/check-bundle-size.ts`) — reads the
   `build:dist` output, fails if any artifact exceeds its budget. Used by
   CI (Group A) and locally. Budgets seeded from the current `0.5.0` sizes
   with headroom.
2. **A `SECURITY.md`-style threat list** for the validated surfaces, so the
   XSS work (Group B) is auditable and the validators have a documented
   rationale.
3. **No behavior change to the document model** — this phase touches build,
   CI, security validation, adapter loading, and observability wiring;
   canonicals + the document envelope stay put. Any change that would alter
   persisted shape is out of scope.

---

## Group A — CI + release automation (§ 9.4, 9.5, 9.6, 12.3)

**Land**

1. **`scripts/check-bundle-size.ts`** + budgets (cross-cutting #1); an
   `npm run check:size` script.
2. **`.github/workflows/ci.yml`** — matrix-free: install, `lint`,
   `tsc -b`, `vitest run`, `build:dist`, `check:size`. Runs on push + PR.
3. **Pre-commit hooks** (lefthook or husky + lint-staged) — lint + typecheck
   changed files, run touched tests. Opt-in for contributors via a setup
   step in CONTRIBUTING (Group E).
4. **Changesets** — `.changeset/` config; a release workflow that, on main
   merge with pending changesets, versions + updates CHANGELOG + publishes
   to `next`. Document the contributor flow ("add a changeset").

**Output**

- Green CI on every push; one-command release; bundle regressions caught.
  ~no runtime code change.

**Host actions (not landable here):** add `NPM_TOKEN` secret; enable
Actions on the repo.

---

## Group B — Security + compliance (§ 11.1–11.4)

**Land**

1. **Font-URL validation** — `registerFontToken({url})` rejects CRLF /
   control characters and non-http(s) schemes before it reaches
   `@font-face`. Tests for each rejection.
2. **Gradient + inline-style validation** — constrain `gradientToCss` hex +
   stop-position ranges; shape-check inline CSS values written through the
   inspector. Tests.
3. **CSP**: optional `nonce` prop threaded to the runtime `<style>`
   injector; document the `style-src` directives (unsafe-inline default vs
   nonce-strict).
4. **Dependency + license audit** — `npm audit` step in CI; a
   `scripts/check-licenses.ts` (or `license-checker`) that fails on a
   non-permissive dep license. Record the audit result in the docs.

**Output**

- Validated injection surfaces with tests, a CSP integration story, audit
  steps wired into CI. A `docs/SECURITY.md`.

---

## Group C — Bundle + load cost (§ 8.3, 8.4, 12.1, 12.3, 12.5)

**Land**

1. **Lazy MUI adapter** — code-split MUI behind a dynamic `import()`;
   AdapterSwitcher shows a brief loading state while it resolves. shadcn
   stays eager. Resolver/registry tolerate async adapter registration.
2. **Tree-shaking verification** — `sideEffects: false` audited; a test /
   analyzer run proving a single-helper SDK import doesn't drag the whole
   surface. Restructure only if measurement says so.
3. **Bundle analyzer** — `vite-bundle-visualizer` (or rollup-plugin-visualizer)
   wired to an `npm run analyze`. Feeds the budgets in Group A.
4. **Module-format stance** — document ESM-only (decision 1); ensure the
   `exports` map + `sideEffects` are correct.
5. **Minified variant** (§ 12.5) — emit `*.min.js` alongside the
   non-minified dist if cheap; otherwise document the host-minifies stance.

**Output**

- MUI off the default critical path; verified tree-shaking; analyzer +
  budgets; documented format stance.

**Risk:** lazy adapter registration touches the resolver's
"adapter-is-registered" assumption — the highest-risk item of the phase.
Mitigation: land it behind the existing missing-renderer placeholder (an
unresolved adapter degrades gracefully) and keep shadcn eager so the
default path is unchanged.

---

## Group D — Observability (§ 13.1, 13.2, 13.4)

**Land**

1. **`<TelemetryProvider onError onMetric>`** context; the four error
   boundaries read `onError` from it (keeping their explicit prop as an
   override for back-compat). SDK-exported.
2. **Perf-metric emission points** — opt-in callbacks for document load
   time + apply/deserialize time (reuse the `applyEnvelopeSafely` +
   bootstrap timings). No-op when no provider.
3. **Error-reporting recipe** in INTEGRATION_GUIDE (Sentry / PostHog
   wiring through the provider).

**Output**

- One observability seam; documented; zero data collected by default.

---

## Group E — Contributor + docs infra (§ 9.1–9.3, 9.10, 10.1)

**Land**

1. **CONTRIBUTING.md** — dev setup, test/lint/build commands, the
   changeset flow, the pre-commit hook setup, the SDK-boundary rule.
2. **CODE_OF_CONDUCT.md** (Contributor Covenant) + **`.github/` issue & PR
   templates** (bug / feature / adapter-request; PR checklist incl. "added
   a changeset").
3. **Public-repo prep** — a top-level README aimed at first-time visitors
   (what it is, install, the `<Editor />` quickstart, links to the guides),
   `SECURITY.md` reporting address, a roadmap pointer.
4. **API reference site** — TypeDoc build (the `docs` script exists) + a
   Pages deploy workflow; link it from the README.

**Output**

- A repo a stranger can land a PR in; a hosted API reference.

**Host actions:** make the repo public; enable Pages; set up
Discussions/Discord.

---

## Group F — Verification + close-out

**Land**

1. **Green CI run** on a PR (lint/type/test/build/size).
2. **Bundle check** — confirm `0.6.0` sizes are within budget; record the
   analyzer snapshot.
3. **Security pass** — the validation tests green; `npm audit` clean (or
   documented exceptions); license check clean.
4. **Doc updates** — PRODUCTION_READINESS ✅ markers for the items above;
   CHANGELOG `0.6.0`; SDK_GUIDE (TelemetryProvider, nonce); INTEGRATION_GUIDE
   (CSP directives, telemetry recipe, lazy-adapter note); version bump.
5. **Close-out section** in this file.

**Output**

- Phase 15 complete; `0.6.0` cut. The remaining gap to `1.0` is host
  actions (public repo, npm token, hosting) + the SDK-surface freeze.

---

## Out of scope (NOT in Phase 15)

| Item | § | Why deferred / target |
|---|---|---|
| More adapters (Ant, Mantine, Bootstrap, plain-HTML) | 7.2 | Ecosystem breadth — a later phase. Lazy-loading (this phase) makes adding them cheaper. |
| Real Chakra adapter as a published package | 7.1 | Ecosystem; the example adapter stays a demo. |
| Adapter compatibility matrix / versioning policy | 7.3, 7.4 | DevEx follow-up once there are >2 real adapters. |
| Canvas / Toolbox virtualization | 8.1, 8.2 | Stretch — not hot at current scale (per PERFORMANCE.md). |
| Micro-memoizations (PropField, ColorPicker, Toolbox callbacks) | 8.5–8.7 | Measured as not-hot in Phase 9; revisit only if the analyzer flags them. |
| CommonJS / UMD builds | 12.1 | Explicitly declined — ESM-only (decision 1). |
| Interactive sandboxes, video walkthroughs, cookbook, SVG diagrams | 10.2–10.5 | DevEx polish; the API reference site is the must. |
| Migration guides between majors | 10.6 | Needed at the first major bump, not now. |
| DevTools extension, scaffolding CLI, Storybook | 9.7–9.9 | Stretch DevEx. |
| Usage telemetry | 13.3 | Stretch; the provider seam is enough for now. |
| Public repo / Pages hosting / npm token / Discord | 9.10, 10.1 | **Host actions** — the plan lands the files; a human enacts the infra. |

---

## Risks + mitigations

1. **Lazy adapter loading breaks the resolver's registered-adapter
   assumption.** Highest-risk item. Mitigation: shadcn stays eager (default
   path unchanged); an unresolved adapter falls through the existing
   missing-renderer placeholder; ship behind a loading state on switch.
2. **CI / release automation needs repo infra the agent can't provision.**
   Mitigation: land all *files* (workflows, changeset config); list the
   token/secret/public-repo steps as explicit host actions; nothing claims
   "done" that depends on them.
3. **Tree-shaking restructure could churn the SDK surface.** Mitigation:
   measure first; only restructure if a single-import test proves bloat.
   `export *` stays unless evidence says otherwise.
4. **Security validators could reject legitimate input** (e.g., a valid but
   unusual font URL). Mitigation: validate *shape* (scheme, control chars,
   numeric ranges), not an allowlist of values; test the legitimate cases
   alongside the rejections.
5. **TelemetryProvider changing the boundaries could regress error
   handling.** Mitigation: the explicit `onError` prop stays as an override;
   the context is additive; existing boundary tests stay green.

---

## Definition of done

CI runs green on every push (lint + type + test + build + bundle budget);
releases publish via Changesets; the injection surfaces are validated +
tested with a documented CSP/XSS story and a clean dependency + license
audit; the heavy adapter is code-split off the default path with verified
tree-shaking and an analyzer + budgets; a single telemetry provider feeds
the boundaries + perf hooks; and a CONTRIBUTING + templates + hosted API
reference make the repo contributable. The only gap left to `1.0` is host
infra actions + freezing the SDK surface.

When the production-blocker items above are satisfied, Phase 15 is complete
and `0.6.0` cuts at the close-out commit.

---

## Close-out (`0.6.0`, 2026-05-31)

**Shipped.** The production-hardening items across §§ 8–13 that gate a
credible release. Mostly build/CI/security/docs; runtime additions are
additive (telemetry opt-in). The standout was a **packaging bug fix** — the
published bundle had been shipping with no built-in adapters/canonicals
registered.

### Per-group result

| Group | Result | Notes |
|---|---|---|
| A — CI + release automation | ✅ | CI workflow (lint/type/test/build/size/license/audit), Changesets release workflow, lefthook hooks, `check:size`. Also established a **green lint baseline** (was never run repo-wide; fixed a real `rules-of-hooks` bug in CanonicalNode, demoted react-hooks-v7's aggressive new rules to warnings). |
| B — Security + compliance | ✅ | Font-URL/family + inline-CSS-declaration validation (closes `<style>` injection); `check:licenses`; SECURITY.md with the CSP reality (a `<style>`-nonce can't beat the inline-`style=`-attribute requirement, so it's documented, not shipped). |
| C — Bundle + load cost | ✅ | **Fixed `sideEffects`** that tree-shook the registrations out of the published bundle (true size: ~414 KB gz, not the broken ~120 KB). Analyzer (`npm run analyze`); ESM-only documented; `/sdk` verified lean (~44 KB). Runtime lazy-MUI **deferred** (canvas-remount hazard). |
| D — Observability | ✅ | `setTelemetry` / `TelemetryProvider` seam the boundaries + timed flows feed; `document.bootstrap` / `document.apply` metrics. Zero collection by default. |
| E — Contributor + docs infra | ✅ | README, CONTRIBUTING, CoC, issue/PR templates; TypeDoc HTML + Pages workflow; regenerated `docs/api/` reference. |
| F — Close-out | ✅ | This section + `0.6.0`. |

### Key decisions / findings

- **The published bundle was broken** (no adapters/canonicals registered)
  due to an over-broad `sideEffects: ["**/*.css"]`. This was the single
  most important fix of the phase — caught only because CI's bundle work
  made us grep the artifact.
- **CSP can't be strict** while the editor uses inline `style=` attributes
  (~95 files), so the nonce was documented-away rather than shipped as
  false assurance.
- **Runtime lazy-adapter loading deferred**: `AdapterProvider` composes
  every adapter's `Wrapper` around `<Frame>`; post-mount registration would
  remount + wipe the canvas. The clean fix is an opt-in adapter subpath
  entry — queued.
- **Export-to-React-code stayed out of scope** (decided in Phase 14): a
  source-code generator isn't part of a runtime editor + document model.

### Bundle delta

`npm run build:dist`:

| Asset | `0.5.0` (broken) | `0.6.0` (correct) |
|---|---|---|
| `index.js` gz | ~187 KB* | 414 KB |
| `index.css` gz | ~40 KB | 124 KB |
| `/sdk` chunk gz | ~44 KB | 44 KB |

\* the `0.5.0` `index.js` under-counted because the registrations were
tree-shaken out — it wasn't a real, working editor bundle.

### Tests

615 passing (+telemetry, font/inline-CSS validation, license/bundle gates).

### Remaining to `1.0` (host actions + a freeze)

Not code: make the repo public; add the `NPM_TOKEN` secret + enable
Actions; enable Pages (Source = GitHub Actions). Then freeze the SDK
surface and promote from `next` to `latest`. The opt-in adapter-subpath
split (§ 8.3) is the main queued engineering follow-up.

**Phase 15 complete.**
