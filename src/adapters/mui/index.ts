import { registerAdapter } from '@design/sdk'
import { MuiWrapper } from './Wrapper'
import { MaterialAlert } from './components/Alert'
import { MaterialAvatar } from './components/Avatar'
import { MaterialBadge } from './components/Badge'
import { MaterialBox } from './components/Box'
import { MaterialButton } from './components/Button'
import { MaterialCard } from './components/Card'
import { MaterialCheckbox } from './components/Checkbox'
import { MaterialContainer } from './components/Container'
import { MaterialDivider } from './components/Divider'
import { MaterialGrid } from './components/Grid'
import { MaterialHeading } from './components/Heading'
import { MaterialIcon } from './components/Icon'
import { MaterialImage } from './components/Image'
import { MaterialInput } from './components/Input'
import { MaterialLink } from './components/Link'
import { MaterialRadio } from './components/Radio'
import { MaterialSection } from './components/Section'
import { MaterialSelect } from './components/Select'
import { MaterialSpacer } from './components/Spacer'
import { MaterialStack } from './components/Stack'
import { MaterialSwitch } from './components/Switch'
import { MaterialTabs } from './components/Tabs'
import { MaterialText } from './components/Text'
import { MaterialTextarea } from './components/Textarea'

registerAdapter({
  id: 'mui',
  displayName: 'MUI',
  Wrapper: MuiWrapper,
  components: {
    box: MaterialBox,
    text: MaterialText,
    button: MaterialButton,
    input: MaterialInput,
    // Phase 5 — Pattern A breadth
    heading: MaterialHeading,
    link: MaterialLink,
    image: MaterialImage,
    stack: MaterialStack,
    divider: MaterialDivider,
    icon: MaterialIcon,
    badge: MaterialBadge,
    avatar: MaterialAvatar,
    alert: MaterialAlert,
    // Phase 5 — form canonicals
    select: MaterialSelect,
    checkbox: MaterialCheckbox,
    radio: MaterialRadio,
    switch: MaterialSwitch,
    textarea: MaterialTextarea,
    // Phase 5 — Pattern B composites
    card: MaterialCard,
    tabs: MaterialTabs,
    // Phase 13 § 5.5 — layout primitives.
    grid: MaterialGrid,
    container: MaterialContainer,
    spacer: MaterialSpacer,
    section: MaterialSection,
  },
})
