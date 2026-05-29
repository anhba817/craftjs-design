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
import type { IconProps } from '@/registry/components/icon'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

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
  const { name, size, triggers } = props as IconProps
  const I = ICONS[name] ?? Star
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  // lucide-react icons are SVG elements; the span wraps them so Craft
  // connectors attach reliably and onClick fires from anywhere on the
  // glyph (the SVG itself doesn't always catch events on transparent
  // pixels).
  return wrap(
    <span
      ref={rootRef}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        cursor: hasTriggers ? 'pointer' : undefined,
        ...inlineStyle,
      }}
      className={cn(className)}
    >
      <I size={SIZE_PX[size] ?? 20} />
    </span>,
  )
}
