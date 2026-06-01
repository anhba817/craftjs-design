import {
  AppWindow,
  AudioLines,
  Bell,
  Calendar,
  CalendarRange,
  ChevronRight,
  ChevronsUpDown,
  CircleDot,
  CircleUser,
  Clock,
  Code,
  CreditCard,
  Ellipsis,
  FormInput,
  Gauge,
  Heading,
  Image,
  Images,
  LayoutGrid,
  Link,
  List,
  ListOrdered,
  Loader,
  Maximize2,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelRight,
  PanelTop,
  RectangleHorizontal,
  Rows3,
  Shapes,
  Square,
  SquareCheck,
  SquareDashed,
  Table,
  Tag,
  TextCursorInput,
  ToggleLeft,
  TriangleAlert,
  Type,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { CanonicalComponent } from '../registry/types'

// Toolbox thumbnail icons. Each canonical gets a representative lucide glyph
// so the palette reads as a visual grid (Unlayer-style) rather than a list of
// text buttons. Kept in the editor (not the canonical contract) so it's not
// part of the SDK surface; a custom / third-party canonical with no entry here
// falls back to its category icon, then a generic square.
const BY_ID: Record<string, LucideIcon> = {
  // layout
  box: Square,
  stack: Rows3,
  grid: LayoutGrid,
  container: RectangleHorizontal,
  section: PanelTop,
  spacer: MoveVertical,
  divider: Minus,
  card: CreditCard,
  // content
  text: Type,
  heading: Heading,
  // input
  button: MousePointerClick,
  input: TextCursorInput,
  textarea: FormInput,
  checkbox: SquareCheck,
  switch: ToggleLeft,
  radio: CircleDot,
  select: ChevronsUpDown,
  'date-picker': Calendar,
  'time-picker': Clock,
  'date-range-picker': CalendarRange,
  // display
  avatar: CircleUser,
  badge: Tag,
  icon: Shapes,
  code: Code,
  skeleton: SquareDashed,
  table: Table,
  'data-list': List,
  'data-list-item': Minus,
  // navigation
  link: Link,
  breadcrumb: ChevronRight,
  pagination: Ellipsis,
  'nav-menu': Menu,
  'nav-item': List,
  stepper: ListOrdered,
  tabs: AppWindow,
  // feedback
  alert: TriangleAlert,
  modal: Maximize2,
  drawer: PanelRight,
  toast: Bell,
  tooltip: MessageCircle,
  popover: MessageSquare,
  progress: Gauge,
  spinner: Loader,
  // media
  image: Image,
  video: Video,
  audio: AudioLines,
  carousel: Images,
}

const BY_CATEGORY: Record<string, LucideIcon> = {
  layout: LayoutGrid,
  content: Type,
  input: FormInput,
  display: Image,
  navigation: Menu,
  feedback: TriangleAlert,
  media: Video,
}

export function toolboxIcon(def: CanonicalComponent): LucideIcon {
  return BY_ID[def.id] ?? BY_CATEGORY[def.category] ?? Square
}
