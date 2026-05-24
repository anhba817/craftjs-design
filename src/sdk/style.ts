// Public SDK — style data model.
//
// NodeStyle is the per-node styling envelope: base Tailwind class strings per
// slot, responsive (breakpoint-prefixed) overrides, inline CSS for arbitrary
// values, and the Phase 6 responsiveInline shape for per-breakpoint arbitrary
// values. Adapter impls don't author this directly — CanonicalNode composes
// it into the `className` / `composedClasses` / `inlineStyle` /
// `composedInlineStyles` fields on AdapterRenderProps.
//
// SDK consumers typically only need this type when:
//   - Defining a canonical's `defaults.style`.
//   - Reading raw style data from a custom inspector panel.
//
// @example
//   const defaults: { props: MyProps; style: NodeStyle } = {
//     props: { ... },
//     style: { classes: { root: 'p-4 rounded-md' } },
//   }

export type { NodeStyle } from '../registry/types'
