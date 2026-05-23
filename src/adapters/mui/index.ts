import { registerAdapter } from '../AdapterContext'
import { MuiWrapper } from './Wrapper'
import { MaterialBox } from './components/Box'
import { MaterialButton } from './components/Button'
import { MaterialInput } from './components/Input'
import { MaterialText } from './components/Text'

// MUI adapter — full coverage for Phase 3's four canonicals (box, text,
// button, input). Box + Text pass Tailwind className through, so they look
// nearly identical to shadcn — visual divergence is concentrated at
// Button/Input where the libraries have genuinely different rendering models.
registerAdapter({
  id: 'mui',
  displayName: 'MUI',
  Wrapper: MuiWrapper,
  components: {
    box: MaterialBox,
    text: MaterialText,
    button: MaterialButton,
    input: MaterialInput,
  },
})
