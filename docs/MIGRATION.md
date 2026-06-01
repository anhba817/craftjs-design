# Migration guide

How to move a host integration across **major** versions of
`@crafted-design/editor`. Minor/patch upgrades within a major are
non-breaking by policy (see [CHANGELOG.md](../CHANGELOG.md) "What counts as a
breaking change") and need no migration.

> **No `0.x → 1.0` entry yet.** The package has only ever lived behind the
> `next` dist-tag with no published stable release, so there is nothing to
> migrate *from*. This file is the **template** every future major-version
> entry follows; the first real entry lands when a `2.0.0` (or a breaking
> `1.x` during preview) ships.

---

## Template — `<old> → <new>`

Each major-version section answers three questions in order.

### 1. What changed

A bullet list of every breaking change, grouped by area (entry points /
exports, the document envelope, canonical ids, peer dependencies, rendered
output contracts). Link each to its CHANGELOG line.

### 2. How to update integration code

Concrete before/after for each break. For example:

```ts
// before (<old>)
import { Editor } from '@crafted-design/editor'

// after (<new>)
import { Editor } from '@crafted-design/editor/core'
```

Cover: renamed/removed exports (the frozen surface in
`src/sdk/surface.test.ts` is the source of truth for what exists each major),
changed call signatures, and any new required peer dependencies
(`npm install …`).

### 3. Document migrations (if the envelope changed)

If `EditorDocument` (the saved-document envelope) changed shape, a migration
ships in `src/persistence/migrations.ts` and runs automatically on load — old
documents upgrade in place. State here:

- the envelope `version` bump,
- whether the upgrade is automatic (it should be) or needs host action,
- any data that can't be migrated and how it's handled (dropped vs. preserved
  as-is).

Hosts that persist documents themselves should re-save after load so the
upgraded envelope is written back.

---

## Deprecation policy

Breaking removals don't happen without warning. To retire a public export we
ship the replacement first, mark the old one `@deprecated` (with a JSDoc
pointer to the replacement) for at least one minor, then remove it in the next
major — recording it in the relevant section above. See
[SDK_GUIDE.md](./SDK_GUIDE.md) "Public API stability".
