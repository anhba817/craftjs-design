// Side-effect imports — each canonical component registers itself when this module loads.
import './box'
import './text'
import './button'
import './input'
// Phase 5 — Pattern A breadth
import './heading'
import './link'
import './image'
import './stack'
import './divider'
import './icon'
import './badge'
import './avatar'
import './alert'
// Phase 5 — form canonicals
import './select'
import './checkbox'
import './radio'
import './switch'
import './textarea'
// Phase 5 — Pattern B composites
import './card'
import './tabs'
// Phase 13 § 5.5 — layout primitives.
import './grid'
import './container'
import './spacer'
import './section'
// Phase 13 § 5.1 — data display.
import './table'
// table-cell is registered as hidden — only spawned by Table via
// slotComponent: 'table-cell'.
import './table-cell'
import './data-list'
import './data-list-item'
import './code'
import './skeleton'
// Phase 13 § 5.2 — navigation.
import './breadcrumb'
import './pagination'
import './nav-menu'
import './nav-item'
import './stepper'
// Phase 13 § 5.3 — overlays.
import './modal'
import './drawer'
import './toast'
import './tooltip'
import './popover'
// Phase 13 § 5.4 — feedback.
import './progress'
import './spinner'
