import { registerAdapter } from '@design/sdk'
import { ShadcnAlert } from './components/Alert'
import { ShadcnAvatar } from './components/Avatar'
import { ShadcnBadge } from './components/Badge'
import { ShadcnBox } from './components/Box'
import { ShadcnBreadcrumb } from './components/Breadcrumb'
import { ShadcnButton } from './components/Button'
import { ShadcnCard } from './components/Card'
import { ShadcnCheckbox } from './components/Checkbox'
import { ShadcnCode } from './components/Code'
import { ShadcnContainer } from './components/Container'
import { ShadcnDataList } from './components/DataList'
import { ShadcnDataListItem } from './components/DataListItem'
import { ShadcnDivider } from './components/Divider'
import { ShadcnDrawer } from './components/Drawer'
import { ShadcnGrid } from './components/Grid'
import { ShadcnHeading } from './components/Heading'
import { ShadcnIcon } from './components/Icon'
import { ShadcnImage } from './components/Image'
import { ShadcnInput } from './components/Input'
import { ShadcnLink } from './components/Link'
import { ShadcnModal } from './components/Modal'
import { ShadcnNavItem } from './components/NavItem'
import { ShadcnNavMenu } from './components/NavMenu'
import { ShadcnPagination } from './components/Pagination'
import { ShadcnPopover } from './components/Popover'
import { ShadcnRadio } from './components/Radio'
import { ShadcnSection } from './components/Section'
import { ShadcnSelect } from './components/Select'
import { ShadcnSkeleton } from './components/Skeleton'
import { ShadcnSpacer } from './components/Spacer'
import { ShadcnStack } from './components/Stack'
import { ShadcnStepper } from './components/Stepper'
import { ShadcnSwitch } from './components/Switch'
import { ShadcnTable } from './components/Table'
import { ShadcnTableCell } from './components/TableCell'
import { ShadcnTabs } from './components/Tabs'
import { ShadcnText } from './components/Text'
import { ShadcnTextarea } from './components/Textarea'
import { ShadcnAudio } from './components/Audio'
import { ShadcnCarousel } from './components/Carousel'
import { ShadcnDatePicker } from './components/DatePicker'
import { ShadcnDateRangePicker } from './components/DateRangePicker'
import { ShadcnProgress } from './components/Progress'
import { ShadcnSpinner } from './components/Spinner'
import { ShadcnTimePicker } from './components/TimePicker'
import { ShadcnVideo } from './components/Video'
import { ShadcnToast } from './components/Toast'
import { ShadcnTooltip } from './components/Tooltip'

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
    // Phase 13 § 5.1 — data display.
    table: ShadcnTable,
    'table-cell': ShadcnTableCell,
    'data-list': ShadcnDataList,
    'data-list-item': ShadcnDataListItem,
    code: ShadcnCode,
    skeleton: ShadcnSkeleton,
    // Phase 13 § 5.2 — navigation.
    breadcrumb: ShadcnBreadcrumb,
    pagination: ShadcnPagination,
    'nav-menu': ShadcnNavMenu,
    'nav-item': ShadcnNavItem,
    stepper: ShadcnStepper,
    // Phase 13 § 5.3 — overlays.
    modal: ShadcnModal,
    drawer: ShadcnDrawer,
    toast: ShadcnToast,
    tooltip: ShadcnTooltip,
    popover: ShadcnPopover,
    // Phase 13 § 5.4 — feedback.
    progress: ShadcnProgress,
    spinner: ShadcnSpinner,
    // Phase 13 § 5.6 — time.
    'date-picker': ShadcnDatePicker,
    'time-picker': ShadcnTimePicker,
    'date-range-picker': ShadcnDateRangePicker,
    // Phase 13 § 5.7 — media.
    video: ShadcnVideo,
    audio: ShadcnAudio,
    carousel: ShadcnCarousel,
  },
})
