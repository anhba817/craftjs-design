import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  Heart,
  Home,
  Info,
  Mail,
  Minus,
  Phone,
  Plus,
  Search,
  Settings,
  Star,
  User,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// Explicit imports keep the bundle predictable. Phase 5 ships 16 named icons;
// Phase 6+ can swap to lucide's dynamicIconImports map if breadth becomes a
// real requirement.
const ICONS: Record<string, LucideIcon> = {
  star: Star,
  heart: Heart,
  home: Home,
  user: User,
  settings: Settings,
  mail: Mail,
  phone: Phone,
  search: Search,
  check: Check,
  x: X,
  'arrow-right': ArrowRight,
  'arrow-down': ArrowDown,
  plus: Plus,
  minus: Minus,
  info: Info,
  'alert-circle': AlertCircle,
}

const SIZE_PX: Record<string, number> = {
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
}

export function ShadcnIcon({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { name, size } = props as { name: string; size: string }
  const I = ICONS[name] ?? Star
  // lucide-react icons are SVG elements; we wrap in a span for the rootRef so
  // Craft connectors attach reliably regardless of the icon's internal markup.
  return (
    <span ref={rootRef} style={{ display: 'inline-flex', ...inlineStyle }} className={cn(className)}>
      <I size={SIZE_PX[size] ?? 20} />
    </span>
  )
}
