// Public SDK entry point. Re-exports the full authoring surface for adapter,
// canonical, and panel extension. Internal module structure under src/sdk/*
// groups related exports for IDE auto-import; consumers can import from the
// root path '@design/sdk' for everything.
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
// External callers must import only from '@design/sdk'. Reaching into
// internal modules (../adapters/types, ../registry/registry, etc.) is
// unsupported and can break across versions.

export * from './adapter'
export * from './canonical'
export * from './style'
export * from './hooks'
export * from './panel'
export * from './fonts'
