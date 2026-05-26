// Phase 10 § 2.1 smoke — a sample consumer that imports from the SDK
// subpath using only published-style types. Not bundled into the
// editor; not registered with the app. Its single job is to type-check:
// running `tsc --noEmit` against this file proves the dist's `.d.ts`
// tree resolves end-to-end for an integration consumer.
//
// To run the smoke locally:
//   ./node_modules/.bin/tsc --noEmit examples/sdk-smoke/consumer.ts
//   # passes silently when the SDK boundary types are intact.

import { z } from 'zod'
import {
  registerCanonical,
  registerAdapter,
  registerPanel,
  unregisterPanel,
  registerFontToken,
  registerTheme,
  registerTemplate,
  listComponents,
  listAdapters,
  listPanels,
  listFontTokens,
  listThemes,
  listTemplates,
  unregisterCanonical,
  unregisterFontToken,
  unregisterAdapter,
  unregisterTheme,
  unregisterTemplate,
  useNodeClasses,
  tabSlotKeys,
  uniqueTabValues,
  TAB_SLOT_PREFIX,
} from '@design/sdk'
import type {
  Adapter,
  AdapterRenderProps,
  CanonicalComponent,
  CanonicalCategory,
  CanonicalId,
  PanelDefinition,
  PanelId,
  NodeStyle,
  FontToken,
  Breakpoint,
  TabsProps,
} from '@design/sdk'

// 1. Adapter authoring — minimal stub.
function MyButton({ props, rootRef, className }: AdapterRenderProps) {
  const { label } = props as { label: string }
  return (
    <button ref={rootRef as never} className={className}>
      {label}
    </button>
  )
}
const adapter: Adapter = {
  id: 'smoke-adapter',
  displayName: 'Smoke',
  components: { button: MyButton },
}

// 2. Canonical authoring — Zod schema + defaults.
const schema = z.object({ label: z.string() })
const def: CanonicalComponent<z.infer<typeof schema>> = {
  id: 'smoke-button' as CanonicalId,
  category: 'input' as CanonicalCategory,
  displayName: 'SmokeButton',
  tags: ['smoke'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: schema,
  defaults: {
    props: { label: 'Smoke' },
    style: { classes: { root: '' } } satisfies NodeStyle,
  },
}

// 3. Panel authoring — uses the hook.
function SmokePanel({ nodeId, slot }: { nodeId: string; slot: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId, slot)
  return (
    <textarea
      value={classString}
      onChange={(e) => writeClasses(e.target.value)}
    />
  )
}
const panel: PanelDefinition = {
  id: 'smoke-panel' as PanelId,
  displayName: 'Smoke',
  order: 999,
  applicableTo: () => true,
  component: SmokePanel,
}

// 4. Font / theme / template registration — every register* fn typed.
const font: FontToken = {
  id: 'smoke-font',
  name: 'Smoke',
  family: 'monospace',
}

// 5. Tabs helpers — used by adapter authors writing a Tabs impl.
export function _tabsHelper(tabsProps: TabsProps) {
  const slotKeys = tabSlotKeys(tabsProps.tabs)
  const values = uniqueTabValues(tabsProps.tabs)
  return { slotKeys, values, prefix: TAB_SLOT_PREFIX }
}

// 6. Breakpoint type — flows from useNodeClasses' return shape.
const _bp: Breakpoint = 'md'

// 7. All register / unregister / list helpers are callable. The
//    function bodies don't run here — this file is consumer-shape only,
//    not the runtime. We reference each export so `tsc --noEmit`
//    follows the .d.ts edges.
export const _smoke = {
  // Adapter
  registerAdapter,
  unregisterAdapter,
  listAdapters,
  adapter,
  // Canonical
  registerCanonical,
  unregisterCanonical,
  listComponents,
  def,
  // Panel
  registerPanel,
  unregisterPanel,
  listPanels,
  panel,
  // Fonts
  registerFontToken,
  unregisterFontToken,
  listFontTokens,
  font,
  // Themes
  registerTheme,
  unregisterTheme,
  listThemes,
  // Templates
  registerTemplate,
  unregisterTemplate,
  listTemplates,
  // Breakpoint
  bp: _bp,
}
