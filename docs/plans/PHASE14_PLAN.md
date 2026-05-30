# Phase 14 — Persistence beyond localStorage (Section 6)

**Status:** ✅ complete — shipped as `0.5.0` (see close-out at bottom).
**Cuts as:** `0.5.0`
**Audience:** whoever implements the storage refactor + the people who'll
plug a server backend into the editor.
**Scope discipline:** PRODUCTION_READINESS § 6 non-Stretch — 6.1
(IndexedDB), 6.2 (storage adapter), 6.3 (versioning), 6.4 (migration
framework). 6.5 (export to React code) was in the original plan but is now
**out of scope — won't be supported** (a source-code generator is a
different product; see close-out). Stretch (6.6 other formats, 6.7
real-time collab, 6.8 templates marketplace) stays queued.

## Goal

`0.4.0` raised the content ceiling (Phase 13 — 48 canonicals). Phase 14
raises the **durability ceiling**: today every document lives in
`localStorage`, capped at ~5 MB (≈100 documents) and trapped in one
browser. Phase 14 makes persistence (a) bigger (IndexedDB), (b) pluggable
(a `StorageAdapter` interface a host fills with its own backend), (c)
recoverable (saved version snapshots, not just Craft's session-only undo),
(d) safely evolvable (a real schema-migration pipeline), and (e)
exportable (generate runnable React/JSX from a document).

That's the difference between "a toy that loses your work when the cache
clears" and "a builder whose documents live in a real backend and ship as
code".

In-scope items (PRODUCTION_READINESS § 6.1–6.5, all non-Stretch):

| § | Group | Deliverable |
|---|---|---|
| 6.2 | A — Storage adapter + async core | `StorageAdapter` interface; refactor `documentRegistry`/`documentStore`/`Hydrator` sync → async; cross-tab via BroadcastChannel |
| 6.1 | B — IndexedDB default adapter | `IndexedDBStorageAdapter` as the default; localStorage adapter as fallback; one-time migration of existing localStorage docs into IDB |
| 6.4 | C — Schema migration framework | Version-stamped envelope; ordered `up()` pipeline; fold the existing ad-hoc Card/Tabs migrations into steps |
| 6.3 | D — Document versioning | Auto-snapshot on save (keep last N), manual "save points", restore + a lightweight version list |
| 6.5 | E — Export to React code | ❌ **Out of scope (won't support)** — prototyped then removed; a source-code generator is a different product, out of step with a runtime editor + document model (see close-out) |
|  | F — Close-out | verification, docs, `0.5.0` cut |

Group A ships first — the adapter interface + async plumbing is the spine
every later group sits on. B, C, D build on it; E (codegen) is independent
and can land any time after A but is sequenced last to keep the risky core
work front-loaded.

---

## Resolved decisions

Settled before writing the plan so the implementer doesn't re-litigate them
mid-refactor.

### 1. The `StorageAdapter` interface is the foundation, not an add-on

6.1 (IndexedDB) and 6.2 (server adapter) are the **same work** viewed two
ways: define one async `StorageAdapter` interface, then ship IndexedDB as
the *default implementation* of it. A server backend is just another
implementation a host registers. We do NOT build IndexedDB as a special
case and bolt an adapter seam on later — the seam comes first.

```ts
export interface StorageAdapter {
  listDocuments(): Promise<DocumentSummary[]>
  readDocument(id: string): Promise<EditorDocument | null>
  writeDocument(id: string, doc: EditorDocument): Promise<WriteResult>
  deleteDocument(id: string): Promise<void>
  // Index = the {documents[], activeId} pointer the picker reads.
  readIndex(): Promise<DocumentIndex>
  writeIndex(index: DocumentIndex): Promise<WriteResult>
  // Optional — adapters that can't support snapshots omit these and
  // Group D's UI hides the version controls.
  listVersions?(id: string): Promise<DocumentVersion[]>
  readVersion?(id: string, versionId: string): Promise<EditorDocument | null>
  writeVersion?(id: string, doc: EditorDocument, label?: string): Promise<WriteResult>
}
```

Host registration via the SDK: `setStorageAdapter(myAdapter)` BEFORE
`<Editor />` mounts (mirrors `registerAdapter` / `registerTheme`). Default
when unset = `IndexedDBStorageAdapter`.

### 2. Async all the way — accept the loading state

IndexedDB is inherently async, so `documentRegistry` and `documentStore`
go async, and `Hydrator` can no longer read synchronously on mount. We add
an explicit **loading state** to the editor shell (a spinner / skeleton
while the active document resolves) rather than faking sync with a cache.
The `WriteResult` typed-result pattern (`{ok} | {ok:false, kind}`) carries
over unchanged — it just returns inside a `Promise` now.

The current sync API (`readDocument`, `writeDocument`, …) is **removed**,
not kept as a shim — keeping a sync facade would tempt callers back into
the "one synchronous active document" model the refactor exists to kill.
This is an internal-module change (these aren't in `src/sdk/`), so it's
non-breaking per the CHANGELOG policy.

### 3. Cross-tab sync moves to BroadcastChannel

`concurrentEditWatcher` currently listens for the `storage` event, which
**only fires for localStorage writes**. The moment the default backend is
IndexedDB, cross-tab edit detection silently dies. We replace it with a
`BroadcastChannel('crafted-design:docs')` that every adapter write posts
to — works regardless of backend (IDB, server, custom). The existing
"sibling tab changed the index → reload without writing back" logic is
preserved; only the transport changes.

### 4. Versioned envelope + one-way migration pipeline

`documentSchema.version` becomes a monotonic integer (currently
`z.literal(1)`). Each migration step is `{ version: number, up(tree) }`.
On load, the pipeline runs every step whose `version` is greater than the
envelope's stamped version, in order, then re-stamps to the latest. The
existing ad-hoc `migrateCardPropsV6` / `migrateTabsPropsV7` /
`migrateTabsIdsV10` functions are **folded into numbered steps** so the
one code path owns all migrations.

**Down-migrations are out of scope.** They're rarely correct (newer
canonicals can't round-trip to an older schema) and the
"export-before-downgrade" policy is already documented. The interface
leaves room (`down?`) but Phase 14 ships no `down` steps.

### 5. Snapshots are adapter entries, capped, with manual save points

Versioning (6.3) rides on the adapter's optional `*Version` methods:

- **Auto-snapshot on save** — every `saveActiveDocument` also writes a
  version; keep the last **N=20** auto-snapshots per document (ring
  buffer, oldest evicted).
- **Manual save points** — a "Save version…" action with a label; manual
  versions are exempt from the ring-buffer eviction.
- **Restore** — load a version into the editor as the current document
  (writes a fresh auto-snapshot first so restore is itself undoable).
- A **version list** in the document menu (timestamp + label); a full diff
  view is a Stretch follow-up — v1 shows the list + restore only.

IndexedDB makes per-save snapshots affordable (hundreds of MB); the
localStorage fallback adapter caps auto-snapshots hard (N=3) or omits them.

### 6. Export-to-React is best-effort, per-adapter, with documented gaps

6.5 generates JSX from the Craft tree. The hard parts (acknowledged, not
solved perfectly in v1):

- **Per-adapter output** — a shadcn emitter and an MUI emitter, picked by
  the document's `adapterId`. Each maps canonical → its library JSX.
- **Style composition** — emit the composed Tailwind class strings
  (shadcn) / `sx` objects (MUI) the adapter already computes, not raw
  `style.classes`.
- **Slots / canvases** — Pattern B canonicals emit nested children per
  slot; dynamic-canvas (Tabs / Carousel) emit one child block per item.
- **Known gaps shipped as comments in the output** — computed/runtime-only
  props (overlay triggers, carousel auto-rotate) emit a `// TODO` marker
  rather than silently dropping. Custom (host-registered) canonicals with
  no emitter emit a placeholder comment naming the canonical.

Output is a downloadable `.tsx` (reusing the `downloadDocument` pattern) +
a copy-to-clipboard preview. Codegen is **pure** (tree → string), so it's
unit-testable without a DOM.

---

## Cross-cutting work

Factored once, used across groups.

1. **`DocumentIndex` / `DocumentSummary` / `WriteResult` move to a
   shared types module** (`src/persistence/types.ts`) so the adapter
   interface, the default adapter, and the store all import from one place
   instead of from `documentRegistry`.
2. **`getStorageUsage` becomes adapter-aware.** The IDB adapter reports
   usage via `navigator.storage.estimate()` (real quota, hundreds of MB);
   the localStorage adapter keeps the current byte-scan. The
   StorageQuotaBanner threshold logic is unchanged — it just reads from
   the active adapter.
3. **Loading + error states in the editor shell.** A `useActiveDocument()`
   resolution state (`loading | ready | error`) drives a skeleton while the
   first read is in flight and a recovery banner if the adapter throws
   (parallels the existing `MalformedDocumentBanner`).
4. **Test pattern.** Each adapter gets a contract test suite (the same
   suite run against IDB via `fake-indexeddb` and against the localStorage
   adapter) so every implementation satisfies identical behavior. Pure
   helpers (migration pipeline, codegen) get targeted unit tests.

---

## Group A — Storage adapter + async core (§ 6.2)

**Land**

1. **`StorageAdapter` interface** + shared `types.ts` (decision 1).
2. **Async refactor.** `documentRegistry` functions return Promises;
   `documentStore` actions become async; `initialState()` is replaced by an
   async bootstrap the store awaits. `migrateLegacyV1` stays but runs inside
   the bootstrap.
3. **`setStorageAdapter` / `getStorageAdapter`** SDK entry points; default
   resolves lazily to the IndexedDB adapter (Group B) with a localStorage
   fallback when IDB is unavailable (private mode, old browsers).
4. **Hydrator + DocumentMenu + Editor shell** updated for the async +
   loading-state world (cross-cutting #3).
5. **BroadcastChannel cross-tab sync** replacing the `storage`-event watcher
   (decision 3).

**Output**

- 1 interface, the async core refactor, ~2 adapters' worth of plumbing,
  contract-test scaffold. No user-visible feature yet — this is the spine.

**Risk:** highest of the phase. The sync→async conversion touches Hydrator
(mount-time read), the concurrent-edit watcher, and every store action.
Mitigation: land the interface + a localStorage adapter implementing it
FIRST (behavior-identical to today, just async), get all tests green, THEN
add IDB in Group B. That way the refactor and the new backend don't land in
the same step.

---

## Group B — IndexedDB default adapter (§ 6.1)

**Land**

1. **`IndexedDBStorageAdapter`** — one object store for documents, one for
   the index, one for versions (Group D uses it). Thin promise wrapper over
   IDB (no library; `idb` is tiny but a hand-rolled wrapper avoids the dep —
   decide at implementation time based on ergonomics).
2. **Default wiring** — unset adapter resolves to IDB; falls back to the
   localStorage adapter when `indexedDB` is unavailable.
3. **One-time localStorage → IDB migration.** On first boot with IDB, if the
   IDB index is empty and localStorage has `craftjs-design:*` docs, copy
   them into IDB and mark localStorage as migrated (leave the old keys in
   place one release for safety; a later phase prunes them).
4. **`getStorageUsage` via `navigator.storage.estimate()`** for the IDB
   adapter (cross-cutting #2).

**Output**

- 1 adapter (default), the localStorage→IDB migration, quota reporting.
  ~100 documents stops being a ceiling.

---

## Group C — Schema migration framework (§ 6.4)

**Land**

1. **Versioned envelope** — `documentSchema.version` becomes an integer;
   add `LATEST_VERSION`. Documents without a version (or `version: 1`)
   migrate forward.
2. **Ordered pipeline** — `migrations: { version, up }[]`, run in order for
   every step above the envelope's stamped version, then re-stamp.
3. **Fold existing migrations** — `migrateCardPropsV6` /
   `migrateTabsPropsV7` / `migrateTabsIdsV10` become numbered steps; the
   unconditional-every-load behavior is preserved for un-versioned legacy
   docs (they're treated as version 0).
4. **Envelope-level migrations** — the framework can migrate the envelope
   (not just `craftJson`), e.g. renaming a top-level field, which the
   ad-hoc functions couldn't do.

**Output**

- 1 framework, existing migrations ported, version stamping. `migrations.ts`
  stops being ad-hoc.

**Risk:** the existing migrations are tested against real legacy shapes;
porting them must not change behavior. Mitigation: keep
`migrations.test.ts` green verbatim — the ported steps must pass the same
assertions.

---

## Group D — Document versioning (§ 6.3)

**Land**

1. **Auto-snapshot on save** — `saveActiveDocument` writes a version via
   the adapter; ring-buffer keep-last-N (decision 5).
2. **Manual save points** — "Save version…" with a label, exempt from
   eviction.
3. **Restore** — load a version as the current document (snapshots the
   current state first so restore is undoable).
4. **Version list UI** — in the DocumentMenu: timestamps + labels + restore.
   Diff view is explicitly deferred (Stretch).

**Output**

- Versioning end-to-end (auto + manual + restore + list). Adapters that
  don't implement the `*Version` methods hide the UI gracefully.

---

## Group E — Export to React code (§ 6.5) — ❌ DROPPED (won't support)

Originally planned as per-adapter JSX codegen (`craftTreeToJsx` + shadcn /
MUI emitters + an export UI). A prototype was built and then **removed**:
exporting framework **source code** is a different product (a
design-to-code generator), out of step with this library's intent — a
runtime, adapter-pluggable editor whose documents are data (JSON) the
chosen adapter renders live. A faithful exporter would re-implement every
adapter component as a string template (48 canonicals × N adapters) plus a
compile-verification harness to stop them drifting — a large, brittle
surface for a capability the library isn't trying to provide.

Portability is served by JSON export / import / share-by-URL and by
embedding `<Editor />` (or rendering the document model at runtime).
Hosts that truly need code can build their own generator on the exported
JSON + the public registry metadata.

---

## Group F — Verification + close-out

**Land**

1. **Smoke pass.** Create / save / reload / delete / duplicate across IDB;
   force the localStorage fallback (disable IDB) and confirm parity; verify
   cross-tab edits surface via BroadcastChannel; restore a version.
2. **`npm run build:dist`** emits `.d.ts` for the new SDK surface
   (`StorageAdapter`, `setStorageAdapter`, `DocumentVersion`).
3. **Doc updates:**
   - PRODUCTION_READINESS § 6 — status banner; ✅ for 6.1–6.4; 6.5 marked
     out of scope; 6.6–6.8 left Stretch.
   - CHANGELOG `0.5.0` entry + version bump.
   - SDK_GUIDE — `StorageAdapter` contract + `setStorageAdapter`.
   - INTEGRATION_GUIDE — "plug your backend" walkthrough (implement the
     interface, register it); note the async store API.
   - DEVELOPER_GUIDE recipes: "Writing a StorageAdapter", "Adding a schema
     migration step".
4. **Close-out section** in this file (per-group deliverables, decisions,
   bundle delta, the adapter contract surface).

**Output**

- Phase 14 complete; `0.5.0` cut. Phase 15 (next PRODUCTION_READINESS
  section) unblocked.

---

## Out of scope (NOT in Phase 14)

| Item | § | Why deferred / target |
|---|---|---|
| **Export to React code** | 6.5 | **Won't support** — a source-code generator is a different product, out of step with a runtime editor + document model. Prototyped and removed in Phase 14. |
| Export to HTML (static, no React) | 6.6 | Stretch — same "code generator" objection as 6.5; not planned. |
| Figma / Sketch import | 6.6 | Stretch — large, separate ingestion pipeline. |
| Real-time collaboration (Yjs / Liveblocks / Automerge) | 6.7 | Stretch — big engineering item; defer until a host requests it. The `StorageAdapter` + BroadcastChannel groundwork is collab-friendly but not collab. |
| Templates marketplace | 6.8 | Stretch — ecosystem/server work beyond local persistence. |
| Version **diff** view | 6.3 follow-up | v1 ships the version list + restore; visual diff is queued. |
| Down-migrations | 6.4 follow-up | One-way only in v1 (decision 4). |
| Pruning legacy localStorage keys after IDB migration | 6.1 follow-up | Left in place one release for safety; a later phase removes them. |
| Server adapter **implementation** | 6.2 | Phase 14 ships the *interface* + the IDB default; an actual HTTP/Supabase/etc. adapter is the host's job (the INTEGRATION_GUIDE recipe shows how). |

---

## Risks + mitigations

No valves. Every risk has a mitigation that delivers the item.

1. **Sync → async refactor is invasive** (Hydrator mount read, store
   actions, concurrent-edit watcher). Mitigation: Group A lands the
   interface + a behavior-identical async localStorage adapter and gets all
   tests green BEFORE IndexedDB exists, so the refactor and the new backend
   never land together.
2. **Cross-tab detection silently breaks on IDB** (`storage` event is
   localStorage-only). Mitigation: BroadcastChannel transport in Group A,
   covered by the concurrent-edit tests rewritten against it.
3. **Folding ad-hoc migrations into the pipeline could change behavior.**
   Mitigation: `migrations.test.ts` stays green verbatim — the ported steps
   must satisfy the existing assertions against real legacy shapes.
4. **Per-save snapshots could bloat storage.** Mitigation: ring-buffer
   keep-last-N (N=20 on IDB, N=3 on localStorage); manual save points are
   the only unbounded set and they're explicit user actions.
5. **Export-to-code can't perfectly represent every document** (runtime
   props, custom canonicals). Mitigation: best-effort with explicit
   `// TODO` gap markers in the output — the generated file names what it
   couldn't express instead of pretending completeness.
6. **IndexedDB unavailable** (private mode, locked-down browsers).
   Mitigation: automatic fallback to the localStorage adapter; the editor
   degrades to today's behavior rather than failing to load.

---

## Definition of done

Documents persist to **IndexedDB by default** through a documented,
host-replaceable `StorageAdapter`; a schema-migration **pipeline** runs
versioned steps on load; and users can **snapshot / restore** versions. The
localStorage fallback keeps the editor working where IDB isn't available.
(Export-to-React-code, § 6.5, is explicitly out of scope — see Group E.)

When 6.1–6.4 satisfy this bar, Phase 14 is complete and `0.5.0` cuts at the
close-out commit.

---

## Close-out (`0.5.0`, 2026-05-30)

**Shipped.** § 6.1–6.4 complete; § 6.5 dropped as out of scope (won't
support); § 6.6–6.8 remain Stretch. Documents persist to IndexedDB by
default behind a host-replaceable `StorageAdapter`, with a localStorage
fallback; a versioned migration pipeline runs on load; documents
auto-snapshot and restore.

### Per-group result

| Group | § | Result | Key files |
|---|---|---|---|
| A — Storage adapter + async core | 6.2 | ✅ | `persistence/types.ts` (`StorageAdapter`), `persistence/storageAdapter.ts`, `persistence/adapters/localStorageAdapter.ts`, `persistence/docBroadcast.ts`, async `documentStore.ts` |
| B — IndexedDB default | 6.1 | ✅ | `persistence/adapters/indexedDBAdapter.ts` (+ localStorage→IDB import), `adapters/adapterContract.ts` (shared suite) |
| C — Migration framework | 6.4 | ✅ | `persistence/schema.ts` (`CURRENT_DOCUMENT_VERSION`), `persistence/migrations.ts` (ordered `up()` steps) |
| D — Versioning | 6.3 | ✅ | IDB version methods, `documentStore` snapshot/restore, `editor/documents/useVersionHistory.ts` + `VersionHistory.tsx` |
| E — Export to React code | 6.5 | ❌ dropped | prototyped + removed — not a feature of this library |
| F — Close-out | — | ✅ | docs + `0.5.0` |

### Key decisions

- **The `StorageAdapter` seam is the foundation** — IndexedDB is its
  default implementation, not a special case; a server backend is just
  another implementation a host registers via `setStorageAdapter`.
- **Async core, sync index** — blob I/O is async; the index stays in
  synchronous Zustand state so the UI is unchanged. `ready` gates a brief
  loading veil on first read.
- **BroadcastChannel** replaces the localStorage `storage` event for
  cross-tab sync (the event is silent on IDB).
- **One-way versioned migrations** — integer `version`, ordered `up()`
  steps, no `down`. The Phase 6/7/10 content migrations became step 2.
- **Snapshots ring-buffer** (last 20 autos/doc) with exempt manual save
  points; the localStorage fallback omits versioning and the UI hides
  itself.
- **Export-to-code is out of scope** — a runtime editor + JSON document
  model is the product; a source-code generator is a different one.

### Bundle delta

`npm run build` (no minification, with sourcemap):

| Asset | `0.4.0` raw / gz | `0.5.0` raw / gz |
|---|---|---|
| `index-*.js` | 608 / 184 KB | 621 / 187 KB |
| `index-*.css` | 311 / 40 KB | 311 / 40 KB |

~+13 KB raw JS for the IDB adapter, migration pipeline, and versioning. No
runtime dependency added (`fake-indexeddb` is devDependency-only).

### Tests

601 passing. New: localStorage + IndexedDB adapter contract suites (shared
spec), IDB localStorage-import + version-snapshot tests, migration
version-gating tests, BroadcastChannel watcher decision tests.

**Phase 14 complete.** The next PRODUCTION_READINESS section is unblocked.
