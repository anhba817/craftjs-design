import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { ReactNode } from 'react'

// Phase 10 § 2.14 — the Chakra adapter's Wrapper. Provides the Chakra UI
// context (`defaultSystem` is Chakra v3's built-in design token system).
//
// Same composition behaviour as the MUI Wrapper: AdapterContext composes
// ALL adapters' Wrappers around the editor's children regardless of which
// adapter is active. ChakraProvider only registers CSS variables and a
// context provider; it's inert for the shadcn / MUI subtrees that ignore it.
// `display: contents` on the inner div keeps the wrapper layout-transparent
// so flex sizing further up the tree isn't disturbed.
export function ChakraWrapper({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <div className="chakra-bridge" style={{ display: 'contents' }}>
        {children}
      </div>
    </ChakraProvider>
  )
}
