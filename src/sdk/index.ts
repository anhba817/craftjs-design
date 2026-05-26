// Public SDK entry point. Re-exports the full authoring surface for adapter,
// canonical, and panel extension. Internal module structure under src/sdk/*
// groups related exports for IDE auto-import.
//
// Import paths:
//   - In-tree (this repo + examples/): from '@design/sdk' (Vite alias).
//   - Published consumers: from '@crafted-design/editor/sdk' (the npm
//     subpath defined in package.json's exports field).
//
// Both resolve to the same module — the alias is convenience for the
// monorepo, the subpath is the public-facing identity.
//
// What's stable here:
//   - Adapter authoring: Adapter, AdapterRenderProps, ClassMapFn,
//     ClassMapResult, registerAdapter, listAdapters, useActiveAdapter
//   - Canonical authoring: CanonicalComponent, CanonicalCategory,
//     CanonicalId, PanelId, registerComponent, listComponents, getComponent,
//     getComponentByDisplayName, getApplicablePanels, getCanvasSlots
//   - Style data model: NodeStyle
//   - Panel author hooks: useNodeClasses
//
// What's intentionally NOT exported:
//   - CanonicalNode (the Craft.js bridge component — internal renderer)
//   - The Craft.js resolver builder
//   - The editor store (use your own state for SDK-authored panels)
//
// External callers must import only from '@crafted-design/editor/sdk' (or
// '@design/sdk' in this repo's examples). Reaching into internal modules
// (../adapters/types, ../registry/registry, etc.) is unsupported and can
// break across versions — see docs/INTEGRATION_GUIDE.md "Breaking-change
// policy". The ESLint `no-restricted-imports` rule in eslint.config.js
// enforces this for examples/**.

export * from './adapter'
export * from './canonical'
export * from './style'
export * from './hooks'
export * from './panel'
export * from './fonts'
export * from './themes'
export * from './templates'
