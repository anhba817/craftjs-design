import { AssetLibraryPanel } from '../assets/AssetLibraryPanel'
import { AppearancePanel } from './AppearancePanel'
import { EffectsPanel } from './EffectsPanel'
import { FiltersPanel } from './FiltersPanel'
import { FontUploadPanel } from './FontUploadPanel'
import { LayoutPanel } from './LayoutPanel'
import { PropsPanel } from './PropsPanel'
import { registerPanel } from './panel-registry'
import { SizePanel } from './SizePanel'
import { SpacingPanel } from './SpacingPanel'
import { TransformsPanel } from './TransformsPanel'
import { TransitionsPanel } from './TransitionsPanel'
import { TypographyPanel } from './TypographyPanel'

// Phase 6 — built-in panels register themselves via the same panel-registry
// SDK consumers use. App.tsx imports this file for its side effect.
//
// `applicableTo` predicates encode the legacy default rules from
// getApplicablePanels — they only fire when a canonical does NOT explicitly
// declare `applicablePanels`. Canonicals like Button that whitelist a subset
// continue to work via the whitelist branch in panel-registry.ts's
// getPanelsFor.

registerPanel({
  id: 'layout',
  displayName: 'Layout',
  order: 10,
  applicableTo: (def) => def.isCanvas,
  component: LayoutPanel,
})

registerPanel({
  id: 'size',
  displayName: 'Size',
  order: 20,
  applicableTo: () => true,
  component: SizePanel,
})

registerPanel({
  id: 'spacing',
  displayName: 'Spacing',
  order: 30,
  applicableTo: () => true,
  component: SpacingPanel,
})

registerPanel({
  id: 'typography',
  displayName: 'Typography',
  order: 40,
  applicableTo: (def) => def.category === 'content' || def.category === 'layout',
  component: TypographyPanel,
})

registerPanel({
  id: 'appearance',
  displayName: 'Appearance',
  order: 50,
  applicableTo: () => true,
  component: AppearancePanel,
})

// Phase 12 § 4.4 — Transforms. Order 45: after Appearance (50)? No —
// slot it before Appearance so geometric transforms sit near layout.
registerPanel({
  id: 'transforms',
  displayName: 'Transforms',
  order: 45,
  applicableTo: () => true,
  component: TransformsPanel,
})

registerPanel({
  id: 'effects',
  displayName: 'Effects',
  order: 60,
  applicableTo: () => true,
  component: EffectsPanel,
})

// Phase 12 § 4.5 — Filters. Order 62: right after Effects (blur /
// shadow live there; filters are the same conceptual neighborhood).
registerPanel({
  id: 'filters',
  displayName: 'Filters',
  order: 62,
  applicableTo: () => true,
  component: FiltersPanel,
})

// Phase 12 § 4.3 — Transitions. Order 65, after Filters.
registerPanel({
  id: 'transitions',
  displayName: 'Transitions',
  order: 65,
  applicableTo: () => true,
  component: TransitionsPanel,
})

// PropsPanel edits canonical props (not slot classes). It ignores the `slot`
// arg from the panel-registry component signature — the slot prop is harmless
// when unused.
registerPanel({
  id: 'componentProps',
  displayName: 'Properties',
  order: 70,
  applicableTo: () => true,
  component: PropsPanel,
})

// Phase 11 § 3.10 — asset library. applicableTo can't read the
// image-provider context (it only gets the canonical def), so the
// registry marks it applicable everywhere and the Inspector filters
// it out when the active provider can't list (the default base64
// provider). When a host supplies a listing-capable provider, this
// surfaces a thumbnail grid for browsing + inserting uploaded
// images.
registerPanel({
  id: 'assetLibrary',
  displayName: 'Assets',
  order: 80,
  applicableTo: () => true,
  component: AssetLibraryPanel,
})

// Phase 12 § 4.15 — font upload. Global tool surfaced in the inspector
// (like Assets); upload routes through the active image/asset provider.
registerPanel({
  id: 'fonts',
  displayName: 'Fonts',
  order: 85,
  applicableTo: () => true,
  component: FontUploadPanel,
})
