import { AssetLibraryPanel } from '../assets/AssetLibraryPanel'
import { AppearancePanel } from './AppearancePanel'
import { ButtonTriggersPanel } from './ButtonTriggersPanel'
import { EffectsPanel } from './EffectsPanel'
import { FiltersPanel } from './FiltersPanel'
import { FontUploadPanel } from './FontUploadPanel'
import { StepperNavigatorPanel } from './StepperNavigatorPanel'
import { TableMergePanel } from './TableMergePanel'
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

// Carousel opts into typography so designers can set the chevron-icon
// color via its `prevButton` / `nextButton` style slots — lucide icons
// inherit `currentColor`, which the Typography panel's text-color
// picker writes. Video / Audio stay out by category (their <video> /
// <audio> roots ignore color).
const TYPOGRAPHY_OPT_IN_IDS = new Set(['carousel'])
registerPanel({
  id: 'typography',
  displayName: 'Typography',
  order: 40,
  applicableTo: (def) =>
    def.category === 'content' ||
    def.category === 'layout' ||
    TYPOGRAPHY_OPT_IN_IDS.has(def.id),
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

// Phase 13 § 5.3 — overlay triggers. Lists every overlay in the
// document and lets the user check which ones this component should
// trigger at runtime. The raw `triggers: string[]` prop is hidden from
// the default PropsPanel; this panel renders a labeled checklist
// instead. Applies to every canonical that opted in via a `triggers`
// array on its props — Button + the seven additions from § 5.3.
const TRIGGERABLE_IDS = new Set([
  'button',
  'icon',
  'avatar',
  'badge',
  'image',
  'link',
  'nav-item',
  'card',
])
registerPanel({
  id: 'overlayTriggers',
  displayName: 'Triggers',
  order: 75,
  applicableTo: (def) => TRIGGERABLE_IDS.has(def.id),
  component: ButtonTriggersPanel,
})

// Phase 13 § 5.2 — Stepper active-step navigator. Renders prev/next +
// a select bounded by `steps.length`, so the user can't pick an invalid
// step (the default PropsPanel input still shows currentStep as a free
// number for power use).
registerPanel({
  id: 'stepperNav',
  displayName: 'Active step',
  order: 25,
  applicableTo: (def) => def.id === 'stepper',
  component: StepperNavigatorPanel,
})

// Phase 13 § 5.1 — Table cell merge. Applies when a TableCell is selected.
// The panel reads the full selection from editorStore — when multiple
// cells of the same Table are selected (Cmd-click), it offers a Merge
// button; for a single cell inside an existing merge, an Unmerge button.
registerPanel({
  id: 'tableMerge',
  displayName: 'Cell merge',
  order: 35,
  applicableTo: (def) => def.id === 'table-cell',
  component: TableMergePanel,
})
