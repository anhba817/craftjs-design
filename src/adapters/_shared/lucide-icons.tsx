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

// Phase 13 § 5.2 — shared lucide icon lookup for adapter impls that need
// the same icon set as the Icon canonical (NavItem, etc.). Same 16 names
// as src/registry/components/icon.ts.
export const LUCIDE_ICONS: Record<string, LucideIcon> = {
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

export function iconElement(name: string, sizePx: number) {
  const I = LUCIDE_ICONS[name]
  if (!I) return null
  return <I size={sizePx} />
}
