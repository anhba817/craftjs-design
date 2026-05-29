import { registerAdapter } from '@design/sdk'
import { MuiWrapper } from './Wrapper'
import { MaterialAlert } from './components/Alert'
import { MaterialAvatar } from './components/Avatar'
import { MaterialBadge } from './components/Badge'
import { MaterialBox } from './components/Box'
import { MaterialBreadcrumb } from './components/Breadcrumb'
import { MaterialButton } from './components/Button'
import { MaterialCard } from './components/Card'
import { MaterialCheckbox } from './components/Checkbox'
import { MaterialCode } from './components/Code'
import { MaterialContainer } from './components/Container'
import { MaterialDataList } from './components/DataList'
import { MaterialDataListItem } from './components/DataListItem'
import { MaterialDivider } from './components/Divider'
import { MaterialDrawer } from './components/Drawer'
import { MaterialGrid } from './components/Grid'
import { MaterialHeading } from './components/Heading'
import { MaterialIcon } from './components/Icon'
import { MaterialImage } from './components/Image'
import { MaterialInput } from './components/Input'
import { MaterialLink } from './components/Link'
import { MaterialModal } from './components/Modal'
import { MaterialNavItem } from './components/NavItem'
import { MaterialNavMenu } from './components/NavMenu'
import { MaterialPagination } from './components/Pagination'
import { MaterialPopover } from './components/Popover'
import { MaterialRadio } from './components/Radio'
import { MaterialSection } from './components/Section'
import { MaterialSelect } from './components/Select'
import { MaterialSkeleton } from './components/Skeleton'
import { MaterialSpacer } from './components/Spacer'
import { MaterialStack } from './components/Stack'
import { MaterialStepper } from './components/Stepper'
import { MaterialSwitch } from './components/Switch'
import { MaterialTable } from './components/Table'
import { MaterialTableCell } from './components/TableCell'
import { MaterialTabs } from './components/Tabs'
import { MaterialText } from './components/Text'
import { MaterialTextarea } from './components/Textarea'
import { MaterialAudio } from './components/Audio'
import { MaterialCarousel } from './components/Carousel'
import { MaterialDatePicker } from './components/DatePicker'
import { MaterialDateRangePicker } from './components/DateRangePicker'
import { MaterialProgress } from './components/Progress'
import { MaterialSpinner } from './components/Spinner'
import { MaterialTimePicker } from './components/TimePicker'
import { MaterialVideo } from './components/Video'
import { MaterialToast } from './components/Toast'
import { MaterialTooltip } from './components/Tooltip'

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
    // Phase 13 § 5.1 — data display.
    table: MaterialTable,
    'table-cell': MaterialTableCell,
    'data-list': MaterialDataList,
    'data-list-item': MaterialDataListItem,
    code: MaterialCode,
    skeleton: MaterialSkeleton,
    // Phase 13 § 5.2 — navigation.
    breadcrumb: MaterialBreadcrumb,
    pagination: MaterialPagination,
    'nav-menu': MaterialNavMenu,
    'nav-item': MaterialNavItem,
    stepper: MaterialStepper,
    // Phase 13 § 5.3 — overlays.
    modal: MaterialModal,
    drawer: MaterialDrawer,
    toast: MaterialToast,
    tooltip: MaterialTooltip,
    popover: MaterialPopover,
    // Phase 13 § 5.4 — feedback.
    progress: MaterialProgress,
    spinner: MaterialSpinner,
    // Phase 13 § 5.6 — time.
    'date-picker': MaterialDatePicker,
    'time-picker': MaterialTimePicker,
    'date-range-picker': MaterialDateRangePicker,
    // Phase 13 § 5.7 — media.
    video: MaterialVideo,
    audio: MaterialAudio,
    carousel: MaterialCarousel,
  },
})
