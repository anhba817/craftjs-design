// Phase 10 § 2.14 — Chakra UI v3 adapter. Demonstrates an external adapter
// using only `@design/sdk` imports + real `@chakra-ui/react` primitives.
// All 20 canonicals are wired with parity to the shadcn / MUI adapters.
//
// To enable in the editor (already done in src/App.tsx):
//   import '../examples/adapter-chakra'
// The "Chakra (example)" entry appears in the adapter switcher.
//
// Bundle impact: pulling in @chakra-ui/react adds ~200 KB raw / ~50 KB
// gzipped to the editor's dogfood build (see INTEGRATION_GUIDE.md).
// Production hosts using only shadcn / MUI should remove this side-effect
// import.

import { registerAdapter } from '@design/sdk'
import { ChakraWrapper } from './Wrapper'
import { ChakraAlertImpl } from './components/Alert'
import { ChakraAvatarImpl } from './components/Avatar'
import { ChakraBadgeImpl } from './components/Badge'
import { ChakraBoxImpl } from './components/Box'
import { ChakraButtonImpl } from './components/Button'
import { ChakraCardImpl } from './components/Card'
import { ChakraCheckboxImpl } from './components/Checkbox'
import { ChakraDividerImpl } from './components/Divider'
import { ChakraHeadingImpl } from './components/Heading'
import { ChakraIconImpl } from './components/Icon'
import { ChakraImageImpl } from './components/Image'
import { ChakraInputImpl } from './components/Input'
import { ChakraLinkImpl } from './components/Link'
import { ChakraRadioImpl } from './components/Radio'
import { ChakraSelectImpl } from './components/Select'
import { ChakraStackImpl } from './components/Stack'
import { ChakraSwitchImpl } from './components/Switch'
import { ChakraTabsImpl } from './components/Tabs'
import { ChakraTextImpl } from './components/Text'
import { ChakraTextareaImpl } from './components/Textarea'

registerAdapter({
  id: 'chakra-example',
  displayName: 'Chakra (example)',
  // Phase 16 § 7.4 — this example adapter needs Chakra installed by the host.
  peerDependencies: {
    '@chakra-ui/react': '^3',
  },
  Wrapper: ChakraWrapper,
  components: {
    alert: ChakraAlertImpl,
    avatar: ChakraAvatarImpl,
    badge: ChakraBadgeImpl,
    box: ChakraBoxImpl,
    button: ChakraButtonImpl,
    card: ChakraCardImpl,
    checkbox: ChakraCheckboxImpl,
    divider: ChakraDividerImpl,
    heading: ChakraHeadingImpl,
    icon: ChakraIconImpl,
    image: ChakraImageImpl,
    input: ChakraInputImpl,
    link: ChakraLinkImpl,
    radio: ChakraRadioImpl,
    select: ChakraSelectImpl,
    stack: ChakraStackImpl,
    switch: ChakraSwitchImpl,
    tabs: ChakraTabsImpl,
    text: ChakraTextImpl,
    textarea: ChakraTextareaImpl,
  },
})
