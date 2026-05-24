// Example adapter — proves an external author can build a working adapter
// using only `@design/sdk` imports. Five canonicals shipped (Box, Heading,
// Button, Stack, Card) as a documented MVP; extend by adding more entries to
// the `components` map and writing impls in the components/ folder.
//
// See ./README.md for the integration steps. To enable in the editor:
//   import '../examples/adapter-chakra'   // in src/App.tsx
// The new "Chakra (example)" entry appears in the adapter switcher.

import { registerAdapter } from '@design/sdk'
import { ChakraBoxImpl } from './components/Box'
import { ChakraButtonImpl } from './components/Button'
import { ChakraCardImpl } from './components/Card'
import { ChakraHeadingImpl } from './components/Heading'
import { ChakraStackImpl } from './components/Stack'

registerAdapter({
  id: 'chakra-example',
  displayName: 'Chakra (example)',
  components: {
    box: ChakraBoxImpl,
    heading: ChakraHeadingImpl,
    button: ChakraButtonImpl,
    stack: ChakraStackImpl,
    card: ChakraCardImpl,
  },
})
