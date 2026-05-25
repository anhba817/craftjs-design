# Phase 10 — SDK maturity + npm publish

**Status:** planned
**Timeline:** no deadline; ship when every Section 2 item is correctly done
**Audience:** external developers extending the editor — adapter authors, panel authors, SDK consumers picking up `@design/editor` from npm
**Scope discipline:** every item in `PRODUCTION_READINESS.md` § 2 ships. No deferrals. Sections 3+ remain explicitly out of scope.

## Goal

Take the editor from "Phase 9 reliability complete" to "publishable + discoverable + extensible by external developers." Every item in PRODUCTION_READINESS.md § 2 — SDK Maturity — is delivered:

| § | Item | Status target |
|---|---|---|
| 2.1 | Publish to npm | Single-package release; `0.1.0` tag on npm with working install in a fresh React 19 host |
| 2.2 | `.d.ts` emit | Dist build emits matching `.d.ts` files; consumer's `tsc` resolves SDK types end-to-end |
| 2.3 | CHANGELOG.md + semver | Keep-a-Changelog file + documented "what counts as breaking" policy + commit discipline applied |
| 2.4 | Deprecation policy | Documented; one round-trip test from deprecation warning to removal in a future version |
| 2.5 | SDK boundary lint rule | ESLint rule blocks `examples/*` from importing past `@design/sdk`; CI enforces |
| 2.6 | TypeDoc API reference | Auto-generated HTML reference covering every `src/sdk/*.ts` export; replaces hand-maintained sections of SDK_GUIDE.md |
| 2.7 | Hot reload of font tokens | Typography panel's Font dropdown updates on `registerFontToken()` without selection change |
| 2.8 | Hot reload of adapters | AdapterSwitcher updates on `registerAdapter()` |
| 2.9 | Hot reload of themes | ThemeSwitcher updates on `registerTheme()` |
| 2.10 | Hot reload of templates | TemplatePicker updates on `registerTemplate()` |
| 2.11 | Stable per-tab ids in Tabs | Each tab carries a stable `id`; renaming `value` no longer orphans canvas content; migration converts existing documents |
| 2.12 | Nested ColorPicker per gradient stop | Each gradient stop opens a full ColorPicker (without recursive gradient mode) |
| 2.13 | Per-stop drag on gradient preview bar | Stop positions are drag-along-bar with per-stop handles, in addition to the numeric inputs |
| 2.14 | Real Chakra adapter | `examples/adapter-chakra/` uses real `@chakra-ui/react` primitives; documents what shipping it to a separate package would entail |

## Exit criteria

Every item below is a hard requirement. None can be deferred.

**2.1 — npm publish**
- Package name decided + reserved on npm (likely scoped, e.g. `@crafted-design/editor` — `@design/*` is taken; final choice is a Group A first task).
- `package.json` `exports` field exposes two entry points: the default (`@crafted-design/editor`) for the full editor; `@crafted-design/editor/sdk` for the SDK boundary alone.
- `peerDependencies` declares `react@^19`, `react-dom@^19`, `@craftjs/core`, `@mui/material` (when consumed via the editor entry), and `@emotion/react` / `@emotion/styled`. `@mui/*` is NOT required when only the `/sdk` subpath is imported.
- `files` field limits the published tarball to `dist-lib/`, the matching `.d.ts` tree, the README, the LICENSE, and the CHANGELOG.
- `prepublishOnly` script runs `tsc -b`, `vitest run`, and `npm run build:dist` so a broken publish is impossible.
- A fresh sandbox (`mkdir /tmp/sdk-smoke && cd /tmp/sdk-smoke && npm init -y && npm install react@19 react-dom@19 <package-tarball>`) imports `@crafted-design/editor/sdk` and uses at least one type — verifies the published artifact actually works.
- `0.1.0` is the initial public version; tagged with `npm publish --tag next` (not `latest`) so the version sits behind an opt-in dist-tag until Phase 11 promotes it.

**2.2 — `.d.ts` emit**
- `vite.config.dist.ts` runs `vite-plugin-dts` (or equivalent `tsc --emitDeclarationOnly` post-step) that emits a `.d.ts` tree mirroring the source.
- `dist-lib/index.d.ts` is the bundle entry point; `dist-lib/sdk.d.ts` mirrors the SDK subpath.
- A consumer in TypeScript strict mode (`tsc --strict`) resolves every exported type without `any` leaks or unresolved imports.
- `tsc --noEmit` against a sample consumer is added to the smoke step in Group G.

**2.3 — CHANGELOG.md + semver**
- `CHANGELOG.md` follows Keep-a-Changelog. Pre-publish entries cover the 10 Phase 9 items + the 14 Phase 10 items, summarised at the consumer level (not commit-message style).
- A "Breaking-change policy" subsection in `INTEGRATION_GUIDE.md` enumerates what triggers a major bump:
  - Removing an exported SDK function / type.
  - Removing a built-in canonical.
  - Changing the document envelope shape without a migration.
  - Changing a public hook's signature.
- `0.1.0` is "initial public preview"; the doc explicitly says "API may change between 0.x minors. 1.0.0 freezes."

**2.4 — Deprecation policy**
- Document in `INTEGRATION_GUIDE.md`: deprecated APIs emit a `console.warn` with a link to the migration entry; they live at least one minor version before removal.
- A `deprecate(name, sinceVersion, migration)` helper (under `src/sdk/internal/`) standardises the warning shape: once per session per call site, no spam.
- One actual deprecation is wired up in this phase as a working test of the policy — `useNodeClasses`'s old single-slot signature (if any predates Pattern B). If no genuine deprecation exists, ship the helper + an example in the docs and skip the real removal until Phase 11.

**2.5 — SDK boundary lint rule**
- `eslint.config.js` adds `no-restricted-imports` with a paths config blocking any import of `@/registry/*`, `@/editor/inspector/shared/*`, `@/state/*`, `@/persistence/*` from `examples/**` (and from a documented "consumer's source tree" pattern).
- The rule is enforced via `npm run lint`; the `package.json` `lint` script runs in CI (a one-time GitHub Actions or local pre-publish step).
- `src/sdk/index.ts` is the single allowed import target for examples / consumers.
- Existing `examples/adapter-chakra/` is verified passing the rule.

**2.6 — TypeDoc API reference**
- TypeDoc installed; `typedoc.json` configured with `entryPoints` pointing at `src/sdk/index.ts` and `src/sdk/*.ts`.
- Every exported function / type / interface in `src/sdk/*.ts` has at least a one-line JSDoc; complex APIs (registerCanonical, registerAdapter, registerPanel) get a parameter table + a minimal usage snippet.
- `npm run docs` regenerates the reference into `docs/api/`. The output is checked into the repo (for static-site hosting via GitHub Pages or equivalent in a future phase).
- `SDK_GUIDE.md` is reorganised: tutorial-style content stays hand-maintained; API tables that TypeDoc covers are replaced with links to the generated reference.

**2.7 — Hot reload of font tokens**
- `src/style/font-registry.ts` (or wherever `registerFontToken` lives) exposes `subscribeFontRegistry()` + `getFontRegistryVersion()` (mirroring `subscribeRegistry`/`getRegistryVersion` from Phase 7's canonical registry).
- TypographyPanel's Font dropdown uses `useSyncExternalStore(subscribeFontRegistry, getFontRegistryVersion, getFontRegistryVersion)`; calling `registerFontToken` after editor mount updates the dropdown without remounting it.
- Test: vitest registers a token before + after mount, asserts both appear in `listFontTokens()`; in the dropdown a useSyncExternalStore equivalent dummy verifies the version bump.

**2.8 — Hot reload of adapters**
- Same pattern as 2.7, applied to `src/adapters/registry.ts` (assumed name; verify in implementation). `subscribeAdapterRegistry()` + `getAdapterRegistryVersion()`.
- `AdapterSwitcher` subscribes; `registerAdapter()` post-mount updates the dropdown.
- Test as 2.7.

**2.9 — Hot reload of themes**
- Same pattern as 2.7 applied to `src/themes/registry.ts`.
- `ThemeSwitcher` subscribes; `registerTheme()` post-mount updates the dropdown.
- Test as 2.7.

**2.10 — Hot reload of templates**
- Same pattern as 2.7 applied to `src/persistence/templates/registry.ts`.
- `TemplatePicker` subscribes; `registerTemplate()` post-mount updates the picker WITHOUT requiring the user to close + re-open it.
- Test as 2.7.

**2.11 — Stable per-tab ids in Tabs**
- `tabsPropsSchema` extends each tab entry with `id: z.string()` (non-optional).
- `defaultValueFor(tabs)` and ArrayField's "+ Add" handler generate a fresh id (e.g. `tab-<random8>`) for new tabs. Existing `value` field stays for the visible label slug.
- `canvasSlots` function uses `id` to compute slot keys (`tab-<id>`), not `value`. Renaming `value` no longer changes the slot key, so canvas content stays attached.
- `uniqueTabValues` (Phase 9 dedupe helper) is reduced to a safety net for documents pre-dating the migration: if `id` is missing, fall back to today's value-based key.
- Migration in `src/persistence/migrations.ts` walks every Tabs node and injects an `id` derived from its current `value` (so the slot key stays stable across the migration boundary). Migration test: feed a v1 doc through; assert every Tabs node gains stable ids without re-keying the slots.

**2.12 — Nested ColorPicker per gradient stop**
- `GradientEditor`'s per-stop color input today is a hex text field. Replace with `<ColorPicker value={stop.color} onChange={...} allowGradient={false}>` — the existing solid-only mode.
- Popover stacking: the inner ColorPicker's Radix Popover must layer above the GradientEditor's outer Popover. Test in the browser; if Radix's z-index defaults clash, bump via a `style={{ zIndex: ... }}` on the inner content with a comment explaining why.
- Z-axis interactions with the ResizeOverlay's outline (also `z-50`) are documented; the inner popover sits above the overlay.
- Tested: open GradientEditor, click a stop swatch, ColorPicker opens, pick a token, stop's color updates.

**2.13 — Per-stop drag on gradient preview bar**
- `GradientEditor`'s preview bar renders an absolute-positioned handle per stop (its `position` percentage → CSS `left`).
- `onPointerDown` on a handle starts a drag: while the pointer is down, `pointermove` updates the stop's position; `pointerup` commits via a single onChange.
- Direct-DOM mutation during the drag (mirror Phase 9 ResizeOverlay / ColorPicker patterns) keeps the parent Inspector quiet — only one onChange fires per gesture on release.
- Numeric input field stays as the secondary path (for keyboard / precise input).
- Tested: dragging handles updates positions live; release commits one undo step.

**2.14 — Real Chakra adapter**
- `examples/adapter-chakra/` installs `@chakra-ui/react`, `@emotion/react`, `@emotion/styled`, `framer-motion` (Chakra peer deps).
- Replaces the mock primitives in `lib.tsx` with real Chakra components.
- Wraps the adapter's render area in `<ChakraProvider>` via the adapter's `Wrapper` (MUI pattern).
- ALL 20 canonicals get a Chakra impl that visually parity-matches the shadcn version.
- A README in `examples/adapter-chakra/` documents the dependencies + the path to extracting this example into a standalone `@crafted-design/adapter-chakra` package in a future phase (kept in-repo for Phase 10 to avoid the workspace overhead).
- Bundle-size note: the editor's `npm run build` (the dogfood app) now ships Chakra by default since `App.tsx` imports `examples/adapter-chakra`. Decision: keep the import as a side-effect demonstration but document that production hosts using only shadcn / MUI should remove the side-effect import.

**Process**
- `tsc -b` clean; tests pass (target: ~310 tests, up from 282).
- All four reliability-touching docs updated (`INTEGRATION_GUIDE.md`, `SDK_GUIDE.md`, `DEVELOPER_GUIDE.md`, `ARCHITECTURE.md`).
- `PRODUCTION_READINESS.md` § 2 items all marked complete.
- `CHANGELOG.md` exists.
- A working `0.1.0` install in a sandbox is documented step-by-step in `INTEGRATION_GUIDE.md`.
- Close-out section appended to this file with publish path taken + bundle delta + tests added.

---

## Plan

Seven groups, ordered by dependency. Every group ships its scope in full; no group has a "ship a partial version" exit ramp.

### Group A — Package boundary

The publish step (2.1) depends on the boundary being correctly drawn — `.d.ts` emission (2.2), CHANGELOG discipline (2.3), deprecation policy (2.4), and the lint rule that enforces what's importable (2.5). Group A lands all five together so 2.1's final publish at the end of Phase 10 sits on a stable foundation.

**Pre-flight**
- Decide the npm package name. Three candidates, ranked by ergonomics:
  1. `@crafted-design/editor` — scoped, descriptive, presumably available.
  2. `craftjs-design` — unscoped, matches the repo, may have name collisions.
  3. Something brand-new — likely needs human input + a domain decision.
- Decide the entry-point shape. Recommendation: single-package, subpath exports:
  - `@crafted-design/editor` → the full editor (`dist-lib/index.js`)
  - `@crafted-design/editor/sdk` → SDK boundary only (no editor UI; just types + register* helpers)
  - Subpath avoids the two-package coordination problem.
- Audit `src/sdk/index.ts` — is every export currently public still desired? Remove anything that should never have been exported.

**Land**
1. `package.json` — add `exports`, `peerDependencies` (React 19, Craft.js, MUI, emotion), `files`, `prepublishOnly`, set `version` to `0.1.0-pre.0` (the `-pre` suffix until we actually publish at the end of Group G).
2. `vite.config.dist.ts` — add `vite-plugin-dts` plugin emitting `dist-lib/**.d.ts`.
3. `vite.config.dist.ts` — add a separate `sdk` entry point that bundles only `src/sdk/index.ts` → `dist-lib/sdk.js` + `dist-lib/sdk.d.ts`. This is what the `/sdk` subpath resolves to.
4. `CHANGELOG.md` — initial entry under `[Unreleased]` with the 10 Phase 9 items + slot for Phase 10 work. A "Breaking-change policy" subsection in `INTEGRATION_GUIDE.md` documents what counts.
5. `src/sdk/internal/deprecate.ts` — the once-per-session warning helper. JSDoc with usage example.
6. `eslint.config.js` — `no-restricted-imports` rule blocking the internal modules from `examples/**` and a documented host-side pattern.
7. Verify: `npm run lint` clean; `npm run build:dist` produces matching `.d.ts`; `tsc --noEmit` on a sample consumer file (`examples/sdk-smoke/` — a new tiny sample) types successfully.

**Output**
- `package.json` ready to publish (just `version` bump + `npm publish` at Group G's end).
- `.d.ts` emission landed in `dist-lib/`.
- CHANGELOG + breaking-change policy documented.
- Lint rule enforcing the boundary.

### Group B — TypeDoc reference

Reads existing JSDoc on SDK exports; surfaces gaps; generates the static reference site.

1. `npm install --save-dev typedoc typedoc-plugin-markdown` (markdown plugin so the output can also be consumed by the Storybook-style docs site in a later phase).
2. `typedoc.json` — `entryPoints: ['src/sdk/index.ts']`, `entryPointStrategy: 'expand'` (or similar) so it walks every `src/sdk/*.ts`. Output → `docs/api/`.
3. Audit every export in `src/sdk/index.ts`:
   - `registerCanonical`, `registerAdapter`, `registerPanel`, `registerTheme`, `registerTemplate`, `registerFontToken` — each needs a top-of-function JSDoc paragraph + param table.
   - Hooks (`useNodeClasses`, etc.) — each needs a usage snippet.
   - Public types (`CanonicalComponent`, `PanelDefinition`, etc.) — each member needs a one-line description.
4. `npm run docs` script added. Output checked in.
5. `SDK_GUIDE.md` — sections that TypeDoc now covers get replaced by links to the generated reference. Tutorial-style sections stay hand-maintained.

**Output**
- `docs/api/index.html` (+ markdown counterparts) covering every public export.
- `SDK_GUIDE.md` reorganised — narrative + recipes only; tables / API listings link out.

### Group C — Hot-reload symmetry

Four parallel ports of the Phase 7 canonical-registry pattern: subscribe-to-version + `useSyncExternalStore` consumers.

Each follows the same shape:

```ts
// src/<area>/registry.ts
let version = 0
const listeners = new Set<() => void>()
export function getRegistryVersion(): number { return version }
export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function bump(): void { version += 1; for (const l of listeners) l() }
// register / unregister call bump().

// Consumer:
const v = useSyncExternalStore(subscribeRegistry, getRegistryVersion, getRegistryVersion)
const list = useMemo(() => listFonts(), [v])
```

Items:

1. **2.7 fonts** — `src/style/font-registry.ts`. TypographyPanel consumer.
2. **2.8 adapters** — `src/adapters/registry.ts`. AdapterSwitcher consumer.
3. **2.9 themes** — `src/themes/registry.ts`. ThemeSwitcher consumer.
4. **2.10 templates** — `src/persistence/templates/registry.ts`. TemplatePicker consumer.

For each: a vitest checks that registering after the editor "mounts" (the consumer first runs) bumps the version + reaches the consumer's selector.

**Output**
- Four parallel subscribe/version helpers.
- Four consumers re-wired.
- 4–8 new tests covering the version-bump path.

### Group D — Stable per-tab ids + migration

The deepest behavioural change in Phase 10 — touches the document schema. Migration is mandatory because existing documents lack `id` on tabs.

**Schema**
1. `src/registry/components/tabs.ts` — `tabsPropsSchema` adds `id: z.string()` per tab entry.
2. `defaultValueFor(tabs)` and the ArrayField "+ Add" path generate `tab-<random8>` ids.

**Migration**
3. `src/persistence/migrations.ts` — add a per-Tabs-node walker that, when reading a v1 / v2 envelope:
   - Parses the document.
   - Finds every node whose `displayName === 'Tabs'`.
   - For each tab entry without `id`, injects `id: <value>` so the slot key stays the same as before.
4. Migration test: feed in a fixture envelope from before the change; verify Tabs nodes gain ids; verify `canvasSlots` produces the same slot keys before vs after.

**Canvas slot keys**
5. `canvasSlots` function in `tabs.ts` uses `id`-based slot keys (`tab-<id>`). The Phase 9 `uniqueTabValues` helper is repurposed as a safety net — if `id` is somehow missing (corruption, hand-edited envelope), fall back to today's value-based key.
6. ShadcnTabs / MaterialTabs read the synthetic key from `canvasSlots`; existing rendering logic is unchanged.

**Inspector**
7. ArrayField's "+ Add" handler — when the array's element schema has an `id` field, auto-generate one. Phase 9 added a generic ArrayField; this hook lives there.

**Output**
- Tabs renames stop orphaning canvas content.
- Existing documents migrate cleanly.
- 3–5 new tests in `tabs.test.ts` + a migration test.

### Group E — Gradient editor polish

Two UI-level improvements (2.12 + 2.13). Mostly self-contained inside `GradientEditor.tsx`.

**2.12 — Nested ColorPicker**
1. Replace per-stop hex `<input>` with `<ColorPicker value={stop.color} onChange={...} allowGradient={false}>`.
2. Verify Radix Popover stacking: inner popover above the outer GradientEditor popover. If the default z-index doesn't suffice, add a `style={{ zIndex: 60 }}` (above ResizeOverlay's 50) with a comment.
3. Hex text field stays inside the ColorPicker as the precise-input path; the per-stop bar handle (Group E step 2.13) is the visual-input path.

**2.13 — Drag-along-bar handles**
4. `GradientPreviewBar` (existing or new) renders an absolute-positioned handle div per stop, at `left: ${stop.position}%`.
5. `onPointerDown` on a handle starts a drag:
   - Record `startX = e.clientX`, `startPosition = stop.position`, the bar's `clientWidth`.
   - Attach pointermove / pointerup listeners on `document` (mirrors Phase 9 ResizeOverlay pattern).
   - During drag: compute new `position = clamp(0, 100, startPosition + ((mv.clientX - startX) / barWidth) * 100)`. Mutate the handle's `left` style directly; do NOT call onChange.
   - On pointerup: call onChange with the final position; commit a single Craft.js setProp.
6. Numeric input fields stay for keyboard / precision.

**Output**
- GradientEditor feels Figma-like.
- One onChange per gesture (no re-render storm during drag).
- 2–4 new tests around the position-clamp math.

### Group F — Real Chakra adapter

Replaces the mock primitive library in `examples/adapter-chakra/` with real Chakra components.

1. `npm install --workspace examples/adapter-chakra @chakra-ui/react @emotion/react @emotion/styled framer-motion` (or root-install if not using workspaces; we currently don't).
2. Replace `examples/adapter-chakra/lib.tsx`'s mock primitives with real Chakra imports — `Box`, `Button`, `Heading`, `Stack`, `Card`, etc. (the 5 Chakra-impl'd canonicals in Phase 4 — verify in code).
3. Add a `Wrapper` component for the Chakra adapter (mirrors the MUI pattern) that wraps the rendered area in `<ChakraProvider>`. Without it, Chakra primitives crash at render.
4. Implement the remaining canonicals' Chakra impls so the adapter has parity. 20 components × probably 2–5 lines each ≈ a half-day of mechanical work.
5. `examples/adapter-chakra/README.md` — documents the dependencies + the path to extracting this example into a standalone `@crafted-design/adapter-chakra` package in a future phase.
6. Dogfood-app size note: the editor's `App.tsx` imports `examples/adapter-chakra` as a side-effect, so the production build now ships Chakra by default. Decision: keep the import (this is the demo app), but document for SDK consumers that production hosts using only shadcn / MUI should drop the side-effect import.

**Output**
- `examples/adapter-chakra/` ships real Chakra components.
- All 20 canonicals work in the Chakra adapter at parity with shadcn / MUI.
- Bundle size impact documented in INTEGRATION_GUIDE.md (likely +200 KB raw / +50 KB gzipped — measure during the work).

### Group G — Publish + close-out

The actual `npm publish` step. Runs after Groups A–F so the artifact is complete.

1. Final manual smoke:
   - `npm run build:dist` produces `dist-lib/index.{js,css,d.ts}` + `dist-lib/sdk.{js,d.ts}`.
   - Fresh sandbox: `mkdir /tmp/sdk-smoke && cd /tmp/sdk-smoke && npm init -y && npm install react@19 react-dom@19 file:<path-to-tarball>` — install succeeds.
   - Sample consumer `index.ts` imports `@crafted-design/editor/sdk`, calls `registerCanonical` with a minimal definition, runs `tsc --noEmit` clean.
   - Sample consumer mounts `<Editor>` (from the full entry) in a Vite scaffold; verify the editor boots, can drop a Box, save, reload.
2. Tag-time:
   - Bump `package.json` `version` from `0.1.0-pre.X` to `0.1.0`.
   - `git tag v0.1.0`.
   - `npm publish --tag next` (opt-in distribution; `latest` waits for Phase 11).
3. Verify install:
   - `npm view @crafted-design/editor` shows `0.1.0`.
   - `npm install @crafted-design/editor@next` in a fresh dir resolves the published version (not the local tarball).

**Doc updates**
- `INTEGRATION_GUIDE.md` — npm install snippet (`npm install @crafted-design/editor@next react@19 react-dom@19`), subpath import examples, the `0.1.0` peer-dep table.
- `SDK_GUIDE.md` — link to the published TypeDoc reference; recipe entries linking to specific generated pages.
- `ARCHITECTURE.md` — Layer 4 note that the editor is now published; add a "Distribution" subsection that documents the two entry points.
- `DEVELOPER_GUIDE.md` — new recipe: "Pinning a custom canonical against the published editor."
- `PRODUCTION_READINESS.md` — § 2 items struck through.
- `CHANGELOG.md` — `0.1.0` entry: "Initial public preview. All Section 1 + Section 2 items from PRODUCTION_READINESS.md complete."

**Close-out section** appended to this file:
- Final package name chosen.
- Path taken on the two-entry-point design (subpath vs two packages).
- TypeDoc coverage: count of exports documented vs total.
- Hot-reload tests pre/post.
- Tabs migration: count of v1/v2 documents in the test fixture pool that migrated cleanly.
- Bundle-size delta: dist combined gzipped before/after Phase 10 (Chakra adapter is the dominant new cost).

---

## Out of scope (NOT in Phase 10)

These are PRODUCTION_READINESS.md Sections 3 onward. Documented to make the scope discipline explicit: Phase 10 ships Section 2 fully and stops there.

| Item | Section | Phase target |
|---|---|---|
| Undo/redo grouping, layer tree, copy/paste/duplicate, inline text editing, image upload | § 3 | Phase 11+ |
| Transforms, filters, animations, shadows expansion | § 4 | Phase 11+ |
| Table, Modal, Drawer, Tooltip, etc. component breadth | § 5 | Phase 12+ |
| IndexedDB migration, server-backed storage, export to React code | § 6 | Phase 12+ |
| More 3rd-party adapter examples (Mantine, Joy, etc.) | § 7 | Phase 12+ |
| Performance optimisation past Phase 9's hot-path remediation | § 8 | future |
| Storybook integration, CONTRIBUTING.md, automated CI / publish workflows | § 9 | Phase 11+ (CI + workflows pair with npm publish, considered for Phase 10's stretch if simple) |
| Doc site (TypeDoc HTML hosted somewhere) | § 10 | Phase 11+ |

The plan calls these out so future phases inherit a clear roadmap.

---

## Risks + mitigations

No valves. Every risk has a mitigation that delivers the item; the mitigation may extend the timeline but not reduce scope.

1. **The desired npm package name is taken or contested.** Mitigation: pick a synonym. The plan picks `@crafted-design/editor` as a working name; if unavailable, `@craftjs-canvas/editor` or unscoped `crafted-design-editor` are next in line. Naming doesn't block the rest of Phase 10; we land everything against the working name and finalise at Group G.

2. **`vite-plugin-dts` doesn't handle Pattern B canonical generics cleanly.** Some canonicals have inferred Zod types that span multiple files; `vite-plugin-dts` is generally robust but inferred types can confuse it. Mitigation: if it can't emit a particular type, fall back to a `tsc --emitDeclarationOnly` post-step that runs against `src/sdk/` only. Both paths produce the same `.d.ts` tree.

3. **TypeDoc requires JSDoc that some exports don't have.** Mitigation: Group B's audit step explicitly walks every export and adds JSDoc where missing. This is grindy but unavoidable for a real reference doc.

4. **Hot-reload subscriptions cause unbounded re-renders if a listener triggers its own register.** Mitigation: each `bump()` is debounced via a microtask queue (Phase 9's promise-queue pattern); listeners that re-register during their own callback effectively coalesce into one bump.

5. **Tabs migration silently corrupts existing documents.** Mitigation: the migration test fixture pool includes a hand-crafted v1 envelope per known Tabs pattern (1 tab, 2 tabs, duplicate-value tabs, empty-value tabs). Each one's pre/post slot keys are asserted equal. If any fixture diverges, the migration is rolled back + redesigned.

6. **Real Chakra adapter inflates the editor's dogfood bundle.** Mitigation: measured in Group F and documented in INTEGRATION_GUIDE.md. Consumers who don't want Chakra remove the `import './examples/adapter-chakra'` line from their `App.tsx`. The default still includes it because the demo app is also a discoverability surface for adapter authors.

7. **Per-stop drag on the gradient bar conflicts with the outer GradientEditor's existing pointer handlers.** Mitigation: per-handle pointer events use `e.stopPropagation()` against the parent + attach pointermove / pointerup at the document level so they survive a pointer leaving the bar. Same pattern as ResizeOverlay.

8. **The published `0.1.0` has a subtle bug that breaks every consumer.** Mitigation: publishing under `--tag next` keeps it off the `latest` tag. Consumers opt in explicitly. Phase 11 promotes to `latest` after a soak period (or never, depending on what comes up).

9. **The CHANGELOG doesn't capture the right level of granularity.** Mitigation: each Phase 10 item's commit message becomes one CHANGELOG entry, written at the consumer level (not the commit level). The breaking-change policy documents the boundary explicitly.

10. **External adapter authors find the SDK boundary too narrow.** Mitigation: Group A's `src/sdk/index.ts` audit can ADD exports if needed. The boundary is intentionally minimal but not rigid; the lint rule blocks past-boundary imports but the boundary itself is a design surface.

---

## Definition of done

Every Section 2 item from PRODUCTION_READINESS.md is in one of these states:

- **Shipped + tested + documented.** The default — applies to all 14 items.
- **Documented as an explicit deferral with a follow-up phase queued.** Reserved ONLY for the rare case where an item turns out to depend on something outside Section 2's reach (e.g., real Chakra in a separate workspace package — the in-repo example ships; the workspace extraction is its own phase). Even then, the underlying work lands in Phase 10 in a working form.

No item is left unaddressed.

When all 14 items satisfy this bar, Phase 10 is complete and Phase 11 (Section 3 — Designer UX) is unblocked.
