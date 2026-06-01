# Cookbook

Task-oriented recipes for common integration + extension jobs. Each points at
the authoritative reference rather than repeating it — start here when you know
*what* you want to do but not *which* doc covers it.

| I want to… | Recipe |
|---|---|
| Embed the editor in my app | [Minimal embed](#embed-the-editor) |
| Choose what to bundle (skip MUI, etc.) | [Pick an entry point](#pick-an-entry-point) |
| Persist documents to my own backend | [Server-backed storage](#server-backed-storage) |
| Add a component the editor doesn't have | [Custom canonical](#add-a-custom-canonical) |
| Render canonicals with my design system | [Custom adapter](#author-an-adapter) |
| Add a control to the inspector | [Custom panel](#add-an-inspector-panel) |
| Add a theme / brand fonts | [Themes & fonts](#themes-and-fonts) |
| Drop a built-in component | [Remove a canonical](#remove-a-built-in-canonical) |
| Collect errors / metrics | [Telemetry](#wire-telemetry) |

---

## Embed the editor

Render `<Editor />`; it brings its own toolbar (save / load / download / share)
and persists automatically. The full copy-pasteable host app is
[`examples/minimal-host`](../examples/minimal-host/README.md); the embedding
walkthrough + props is [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).

## Pick an entry point

`@crafted-design/editor` (full: + MUI, needs the MUI/Emotion peers) vs
`/core` (shadcn + plain-HTML, no peers) vs opting into `/adapters/*` explicitly.
The full matrix with peer requirements is
[INTEGRATION_GUIDE.md → Subpath exports](./INTEGRATION_GUIDE.md#subpath-exports).

## Server-backed storage

Implement the `StorageAdapter` interface (readIndex / writeIndex /
readDocument / writeDocument / deleteDocument / estimateUsage, plus optional
version methods) and register it **before** `<Editor />` mounts via
`setStorageAdapter`. Don't use the `exportDocument` file helpers for this. Full
interface + a contract test:
[DEVELOPER_GUIDE.md → Writing a StorageAdapter](./DEVELOPER_GUIDE.md) and
[SDK_GUIDE.md → Persistence backend](./SDK_GUIDE.md).

## Add a custom canonical

Register the abstract component (id, props schema, defaults, applicable
panels) with `registerCanonical`, then give each adapter a renderer. Step by
step: [TUTORIAL_CANONICAL.md](./TUTORIAL_CANONICAL.md); the quick version is
[INTEGRATION_GUIDE.md → Add a custom canonical](./INTEGRATION_GUIDE.md).

## Author an adapter

Map canonical ids to your design system's components with `registerAdapter`.
Walkthrough: [TUTORIAL_ADAPTER.md](./TUTORIAL_ADAPTER.md). To ship it as its own
`@your-scope/...adapter` opt-in subpath entry (build entry, `sideEffects`,
`.d.ts`), see
[DEVELOPER_GUIDE.md → Shipping an adapter as a subpath entry](./DEVELOPER_GUIDE.md).
Declare any UI-library peer in the adapter's `peerDependencies`
([ADAPTER_VERSIONING.md](./ADAPTER_VERSIONING.md)).

## Add an inspector panel

`registerPanel` adds a section to the right-hand inspector; `useNodeClasses`
reads/writes the selected node's classes. Walkthrough:
[TUTORIAL_PANEL.md](./TUTORIAL_PANEL.md).

## Themes and fonts

`registerTheme` (token-driven or CSS-driven) adds a theme to the switcher;
`registerFontToken` / `registerSystemFonts` / `registerGoogleFonts` add fonts
to the Typography dropdown. Reference:
[SDK_GUIDE.md → Theme tokens, color variables, fonts](./SDK_GUIDE.md).

## Remove a built-in canonical

`unregisterCanonical('id')` before `<Editor />` mounts drops it from the
palette. Example:
[INTEGRATION_GUIDE.md → Remove a built-in canonical](./INTEGRATION_GUIDE.md).

## Wire telemetry

`setTelemetry(sink)` (or wrap with `<TelemetryProvider>`) routes error-boundary
reports + `document.bootstrap` / `document.apply` metrics to your collector.
Zero collection by default. Reference:
[SDK_GUIDE.md](./SDK_GUIDE.md) + the telemetry section.
