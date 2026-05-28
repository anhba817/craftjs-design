import { registerAdapter } from '@design/sdk'
import { ShadcnAlert } from './components/Alert'
import { ShadcnAvatar } from './components/Avatar'
import { ShadcnBadge } from './components/Badge'
import { ShadcnBox } from './components/Box'
import { ShadcnButton } from './components/Button'
import { ShadcnCard } from './components/Card'
import { ShadcnCheckbox } from './components/Checkbox'
import { ShadcnContainer } from './components/Container'
import { ShadcnDivider } from './components/Divider'
import { ShadcnGrid } from './components/Grid'
import { ShadcnHeading } from './components/Heading'
import { ShadcnIcon } from './components/Icon'
import { ShadcnImage } from './components/Image'
import { ShadcnInput } from './components/Input'
import { ShadcnLink } from './components/Link'
import { ShadcnRadio } from './components/Radio'
import { ShadcnSection } from './components/Section'
import { ShadcnSelect } from './components/Select'
import { ShadcnSpacer } from './components/Spacer'
import { ShadcnStack } from './components/Stack'
import { ShadcnSwitch } from './components/Switch'
import { ShadcnTabs } from './components/Tabs'
import { ShadcnText } from './components/Text'
import { ShadcnTextarea } from './components/Textarea'

registerAdapter({
  id: 'shadcn',
  displayName: 'shadcn',
  components: {
    box: ShadcnBox,
    text: ShadcnText,
    button: ShadcnButton,
    input: ShadcnInput,
    // Phase 5 — Pattern A breadth
    heading: ShadcnHeading,
    link: ShadcnLink,
    image: ShadcnImage,
    stack: ShadcnStack,
    divider: ShadcnDivider,
    icon: ShadcnIcon,
    badge: ShadcnBadge,
    avatar: ShadcnAvatar,
    alert: ShadcnAlert,
    // Phase 5 — form canonicals
    select: ShadcnSelect,
    checkbox: ShadcnCheckbox,
    radio: ShadcnRadio,
    switch: ShadcnSwitch,
    textarea: ShadcnTextarea,
    // Phase 5 — Pattern B composites
    card: ShadcnCard,
    tabs: ShadcnTabs,
    // Phase 13 § 5.5 — layout primitives.
    grid: ShadcnGrid,
    container: ShadcnContainer,
    spacer: ShadcnSpacer,
    section: ShadcnSection,
  },
})
