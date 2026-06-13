# Phase 23 — Controlled embedding API

**Status:** planned
**Cuts as:** the next release after `1.5.0` (additive — new optional props, a new
optional CSS entry, a `forwardRef`; `1.6.0` recommended).
**Origin:** `EMBEDDING_FEEDBACK.md` from the NFC business-card team (a real
consumer on v1.5.0). They embed `<Editor>` as one step of a multi-step form in
a React 19 + Vite SPA and need the standard **controlled-component** contract:
seed a document in, read it back live, mount/unmount freely, opt out of the
editor's own persistence + chrome, and coexist with the host's Tailwind v4.
Today none of that is first-class, so they built an iframe + postMessage +
custom StorageAdapter + DOM-click-the-Save-button workaround. This phase makes
`<Editor>` a controlled component so that machinery is unnecessary.

## Where things stand (verified against source)

- **Hydration is one-shot per JS realm.** `src/editor/Hydrator.tsx` uses a
  *module-level* `let hydrated = false` (deliberately, to survive the
  AdapterProvider Wrapper remount within a session). So re-mounting `<Editor>`
  to seed a different document never re-hydrates — the SPA's second card opens
  blank.
- **No seed-in / read-out props.** `EditorProps` (`src/editor/Editor.tsx`) is
  `adapter` / `allowUserToSwitchAdapter` / `editorTheme` only. The
  envelope is built/applied by `currentEnvelope()` / `applyEnvelope()` **inside
  `SaveLoadBar.tsx`**, behind the manual Save button, unreachable from the host.
- **`<Craft resolver={resolver}>` passes no options** — so no change signal is
  wired. But Craft's `Options` type DOES expose
  `onNodesChange: (query) => void`, and it fires on `setProp` (prop/style edits)
  as well as add/remove/move — a sufficient `onChange` source (Open Q1 resolved).
- **The editor always owns persistence + chrome:** `Editor` unconditionally
  calls `bootstrapDocumentStore()` and mounts `<Hydrator>`, `<SaveLoadBar>`
  (Save/Load/Import/Export/DocumentMenu), the onboarding tour, quota banners,
  and the concurrent-edit watcher.
- **The stylesheet is a full, unlayered Tailwind v4 build** (`index.css`):
  preflight + `--color-*` theme tokens + `--ed-*` chrome tokens + Geist. Into a
  host that already runs Tailwind v4 it risks a double preflight + token
  clobbering — which is why the consumer iframed it.
- **`setStorageAdapter` is in the runtime surface but missing from
  `core.d.ts`** (it resolves via `/sdk`); a `.d.ts` re-export gap.

## Goal

The consumer's entire integration collapses to:
```tsx
<Editor
  adapter="shadcn"
  persistence={false}
  hideChrome
  value={designJson}
  onChange={(doc) => setDesignJson(JSON.stringify(doc))}
/>
```
previews via an inline `<DocumentRenderer>`. All new props are **additive and
optional** — with none passed, standalone behavior is byte-identical to today.

(Phase 23 delivers the controlled API — `value`/`onChange`/`persistence`/
`hideChrome` — which lets the consumer drop the postMessage bridge, the custom
StorageAdapter, and the DOM-click-Save logic. **Fully inline, iframe-free**
embedding into a Tailwind-v4 host additionally needs the scoped stylesheet
(P6), which ships in the follow-up phase; until then a consumer can keep a
single iframe purely for CSS isolation, or import the global `index.css` with
care.)

## In-scope

| Group | Theme | Feedback items |
|---|---|---|
| A | Controlled `value`/`defaultValue`/`onChange` + `persistence` opt-out + re-seedable hydration | P1, P2, P3 |
| B | Chrome opt-out + the `.d.ts` export gap | P4, P7 |
| C | Imperative ref + `controlled-host` example + docs + close-out | P5 |

A is the unblocking core. **P6 (scoped/layered stylesheet) is pulled into its
own follow-up phase** — it's the hardest piece (CSS isolation), independently
shippable, and the rest of the controlled-embedding API doesn't depend on it.
See "Deferred to a follow-up phase" below.

## Resolved decisions

### 1. `value` makes the editor controlled; that bypasses the store

- `value?: EditorDocument | string` → **controlled**: a `<ControlledHydrator>`
  inside `<Craft>` applies the envelope whenever `value`'s identity changes
  (the supported re-seed path, independent of the §2.1 latch). When `value` is
  present, the document store / persistence Hydrator is bypassed entirely
  (`value` is the single source of truth) — resolves Open Q2.
- `defaultValue?: EditorDocument | string` → **uncontrolled** initial seed
  applied once on mount; edits stay internal, surfaced via `onChange`.
- Both accept the envelope object or its JSON string, normalized through the
  existing `parseDocumentJson` (validate + migrate), so a controlled host gets
  the same robustness as an import.

### 2. `onChange` rides Craft's `onNodesChange`, debounced

Pass `onNodesChange` to the internal `<Craft>`: on fire, debounce, then call
`onChange(currentEnvelope(query))`. `onNodesChange` fires on `setProp` too, so
prop/style edits are captured (verified) — no editorStore polling or DOM hacks
needed. `onChange` debounce is fixed at a sensible default (~150 ms) with an
`onChangeDebounceMs?` escape hatch (Open Q3) — keeps the common case simple.

### 3. `currentEnvelope` / `applyEnvelope` extracted to a shared, tested module

Pull both out of `SaveLoadBar.tsx` into e.g. `src/editor/document/envelope.ts`
(`buildEnvelope(query, store)` / `applyEnvelope(actions, store, doc)`), so the
toolbar, the controlled hydrator, `onChange`, and the imperative ref all share
ONE serialization path (no drift). Pure-ish, unit-testable.

### 4. `persistence?: boolean` (default `true`) — opt out of the store

When `false`: skip `bootstrapDocumentStore()`, don't mount the store-backed
`<Hydrator>`, and the editor runs purely on `value`/`defaultValue`/`onChange`.
Removes any need for `setStorageAdapter` in embeds. `value` present implies
controlled regardless; `persistence={false}` without `value` = an uncontrolled
in-memory editor that never touches IndexedDB.

### 5. Latch fix: reset on `<Editor>` unmount (keep the within-session guard)

The module-level latch exists for a real reason (AdapterProvider's Wrapper
swap remounts `Hydrator` mid-session; a `useRef` would re-fire and snap the
adapter back). Keep it module-level so it survives that remount, but **reset it
when `<Editor>` itself unmounts** (an `Editor`-level effect cleanup) so the next
SPA mount re-hydrates. This fixes the consumer's core pain without regressing
the adapter-swap guard — and controlled mode sidesteps the latch entirely
(Decision 1).

## Group A — Controlled value + onChange + persistence opt-out

**Land**

1. Extract `buildEnvelope` / `applyEnvelope` into a shared module (Decision 3);
   refactor `SaveLoadBar` to use it (no behavior change).
2. `EditorProps`: add `value?`, `defaultValue?`, `onChange?`,
   `onChangeDebounceMs?`, `persistence?`. Types only — `EditorDocument` already
   type-exported.
3. `<ControlledHydrator value>` inside `<Craft>` — applies on `value` identity
   change (deep-equal guard against onChange→re-apply loops).
4. Wire `onNodesChange` on the internal `<Craft>` → debounce → `onChange`.
5. `persistence` gating: skip bootstrap + store Hydrator when controlled or
   `persistence={false}`.
6. Latch fix (Decision 5): reset module flag on `Editor` unmount.
7. Tests: re-seed via `value` change re-hydrates; `onChange` fires on add AND on
   prop/style edit (the open question, asserted); `persistence={false}` does no
   IndexedDB I/O; standalone (`<Editor />`, no props) is unchanged; controlled +
   store don't both run.

**Output** — `<Editor value onChange persistence={false} />` works as a
controlled component; the consumer's iframe + custom-adapter + Save-click
machinery becomes unnecessary.

## Group B — Chrome opt-out + d.ts gap

**Land**

1. `hideChrome?: boolean` — hides `SaveLoadBar` (Save/Load/Import/Export/
   DocumentMenu), the onboarding tour, quota banners, and the concurrent-edit
   watcher, keeping canvas + toolbox + inspector. (A granular
   `chrome?: { … }` object is noted as a later refinement — Open Q4; `hideChrome`
   covers the stated need.)
2. P7: re-export `setStorageAdapter` / `getStorageAdapter` + the
   `StorageAdapter` type through `core.tsx` so they appear in `core.d.ts`
   (runtime value already present; surface-list updated if any runtime name
   moves — these are likely already in the SDK runtime list).
3. Tests: `hideChrome` removes the toolbar but keeps the canvas; the
   surface/`.d.ts` re-export is present.

**Output** — an embed can hide all document-management chrome and type-resolve
the storage seam from `/core`.

## Group C — Imperative ref + example + docs

**Land**

1. P5: `forwardRef` exposing `{ getDocument(): EditorDocument; setDocument(doc):
   void }` for on-demand reads (redundant with `onChange` but convenient).
2. `examples/controlled-host/` — a runnable Vite app embedding `<Editor>` inline
   as a controlled component (seed + onChange + an inline `<DocumentRenderer>`
   preview), CI-typechecked via `check:example` like the others.
3. Docs: INTEGRATION_GUIDE "Embedding as a controlled component" section
   (value/onChange/persistence/hideChrome), FAQ; note CSS isolation still wants
   an iframe (or careful global-`index.css` import) until the scoped-stylesheet
   follow-up lands; CHANGELOG; version cut.

**Output** — phase complete; the controlled contract is documented +
exemplified; release cut.

## Deferred to a follow-up phase — P6 scoped/layered stylesheet

Pulled out into **Phase 24** (`docs/plans/PHASE24_PLAN.md`) deliberately: it's
the hardest, riskiest piece and the controlled API doesn't depend on it. Sketch
(full detail in the Phase 24 plan):

- Ship an additional, opt-in build — `@crafted-design/editor/index.scoped.css` —
  that drops (or scopes) the global preflight and wraps the editor's rules in
  `@layer crafted-design` **and** under a `.crafted-design-scope` root, so a
  Tailwind-v4 host gets no double preflight and no `--color-*` / `--ed-*`
  clobbering. `@layer` is the Tailwind-v4-native mechanism; the wrapper class is
  the belt-and-suspenders for hosts not using cascade layers (Open Q5).
- The default `index.css` stays unchanged (additive, no churn).
- **Why it's risky** (and thus separate): `@layer` subordinates the editor's
  styles so an *unlayered* host rule can override them; a wrapper class raises
  specificity surprises. It must be validated against a real Tailwind-v4 host
  fixture (mirroring this consumer's setup), and if it can't be made robust the
  fallback is to document the iframe as the supported CSS-isolation path.
- Until it lands, fully-inline embedding keeps a single iframe purely for CSS
  isolation; the seed/read-out machinery the consumer flagged is already gone
  via Phase 23.

## Out of scope

| Item | Why |
|---|---|
| Granular per-control chrome toggles / custom toolbar slot | `hideChrome` meets the stated need; revisit on demand (Open Q4). |
| A controlled mode for `<DocumentRenderer>` | It's already a pure controlled component (`document` prop). |
| Multi-editor-instance isolation of the global stores | The module-level registries/stores are app-global by design; one `<Editor>` per app is the supported model (multiple controlled editors on one page is a separate, larger effort). |

## Risks + mitigations

1. **`onChange` ↔ controlled `value` feedback loop.** A naive setup: edit →
   `onChange` → host setState → new `value` → re-hydrate → fires `onChange`…
   Mitigation: `ControlledHydrator` deep-/ref-equality guards before applying;
   `onChange` emits only on genuine user edits (debounced `onNodesChange`), and
   re-applying an identical envelope is a no-op. Test the loop explicitly.
2. **The latch fix re-introduces the adapter-snapback bug.** Mitigation: keep
   the flag module-level (survives the AdapterProvider remount); only reset on
   the OUTER `<Editor>` unmount. A test asserts an adapter switch mid-session
   doesn't re-hydrate.
3. **`onNodesChange` misses a mutation class.** Verified it fires on `setProp`;
   the Group A test asserts prop + style edits emit `onChange`. If a gap
   surfaces, fall back to also subscribing to the editor store.
4. **Surface freeze.** New props/exports are additive (minor); the frozen
   `/sdk` + `/core` runtime surfaces only grow, and `surface.test.ts` is updated
   in the same commit.

## Definition of done

`<Editor value onChange persistence={false} hideChrome />` is a working
controlled component (re-seedable on `value` change, live serialized output,
no IndexedDB, no document chrome), with an imperative ref; a `controlled-host`
example + INTEGRATION_GUIDE section document the contract; standalone
`<Editor />` is unchanged; `setStorageAdapter` resolves from `/core`'s types;
release cut as `1.6.0`. (CSS isolation for fully-inline Tailwind-v4 embedding —
P6 — is the explicit follow-up phase.)
