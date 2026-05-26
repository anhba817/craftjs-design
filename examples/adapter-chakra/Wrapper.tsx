import {
  ChakraProvider,
  createSystem,
  defaultConfig,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'

// Phase 10 § 2.14 + Phase 11 hotfix — Chakra adapter's Wrapper.
//
// Chakra v3's `defaultSystem` ships with `preflight: true` by default,
// which injects a CSS reset (`* { margin: 0; padding: 0; border-width:
// 0; font: inherit; … }`) at the document root via `@layer reset`.
// That reset is fine for a Chakra-only app, but in our editor it
// torpedoes every Tailwind utility — the `border-width: 0` rule alone
// breaks every `border-*` class because `@layer reset` outranks
// utilities at equal specificity.
//
// Fix: build a custom system with the preflight scoped to
// `.chakra-bridge` (the wrapper div below). Reset CSS now only
// applies to elements that live inside a Chakra subtree; Tailwind
// utilities outside (Toolbox, Inspector, SaveLoadBar, the entire
// editor chrome) render normally.
//
// Same composition behaviour as the MUI Wrapper: AdapterContext
// composes ALL adapters' Wrappers around the editor's children
// regardless of which adapter is active. ChakraProvider only
// registers CSS variables and a context provider; with the preflight
// scoped, it's truly inert for the shadcn / MUI subtrees that ignore
// it. `display: contents` on the inner div keeps the wrapper
// layout-transparent so flex sizing further up the tree isn't
// disturbed.
//
// The system is created once at module load so React doesn't see a
// new instance per render.
const scopedSystem = createSystem(defaultConfig, {
  preflight: { scope: '.chakra-bridge', level: 'parent' },
})

export function ChakraWrapper({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={scopedSystem}>
      <div className="chakra-bridge" style={{ display: 'contents' }}>
        {children}
      </div>
    </ChakraProvider>
  )
}
