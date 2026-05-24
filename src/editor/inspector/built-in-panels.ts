import { AppearancePanel } from './AppearancePanel'
import { EffectsPanel } from './EffectsPanel'
import { LayoutPanel } from './LayoutPanel'
import { PropsPanel } from './PropsPanel'
import { registerPanel } from './panel-registry'
import { SizePanel } from './SizePanel'
import { SpacingPanel } from './SpacingPanel'
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

registerPanel({
  id: 'effects',
  displayName: 'Effects',
  order: 60,
  applicableTo: () => true,
  component: EffectsPanel,
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
