import {
  ChakraProvider,
  createSystem,
  defaultConfig,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'

// Phase 10 § 2.14 + Phase 11 hotfix — Chakra adapter's Wrapper.
//
// Chakra v3's `defaultSystem` ships with `preflight: true` by default. The
// preflight emits a sweeping CSS reset (`* { margin: 0; padding: 0;
// border-width: 0; font: inherit; ... }`) and a Tailwind-incompatible
// `border-width: 0` in particular kills every `border-*` utility.
//
// Why scoping doesn't help here: `AdapterContext.composeAllWrappers`
// wraps ALL registered adapters' Wrappers around the editor children,
// regardless of which adapter is active. So a `.chakra-bridge` ancestor
// (even one with `display: contents`) ends up containing the entire
// editor — Toolbox, Inspector, SaveLoadBar, the canvas. A descendant-
// scoped preflight would still nuke every Tailwind utility inside.
//
// Fix: build a custom system with `preflight: false` — Chakra components
// render without the global reset. The downside is minor (a few base
// styles Chakra normally provides via the reset, like `box-sizing:
// border-box` on its own elements, are absent), but the Chakra
// primitives in `examples/adapter-chakra/components/*` already render
// correctly without them because Chakra's own component-level styles
// account for both cases.
//
// Same composition behaviour as the MUI Wrapper: AdapterContext composes
// ALL adapters' Wrappers around the editor's children regardless of
// which adapter is active. ChakraProvider only registers CSS variables
// and a context provider; with preflight disabled, it's truly inert for
// the shadcn / MUI subtrees that ignore it. `display: contents` on the
// inner div keeps the wrapper layout-transparent so flex sizing further
// up the tree isn't disturbed.
//
// The system is created once at module load so React doesn't see a new
// instance per render.
const noResetSystem = createSystem(defaultConfig, {
  preflight: false,
})

export function ChakraWrapper({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={noResetSystem}>
      <div className="chakra-bridge" style={{ display: 'contents' }}>
        {children}
      </div>
    </ChakraProvider>
  )
}
