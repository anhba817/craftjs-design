// Phase 13 § 5.2 / Phase 27 — shared icon rendering for adapter impls (the Icon
// canonical, NavItem, …). A thin wrapper over the runtime icon resolver
// (`@/icons/resolver`): lazy lucide by default, host-pluggable via
// `registerIconResolver`. The export name + signature are unchanged so every
// caller (HtmlIcon, HtmlNavItem, the MUI/shadcn NavItems) stays the same.
//
// Empty name → nothing (callers use this for "no icon"). A non-empty but
// unknown name resolves to the resolver's fallback glyph, not null.
import type { ReactNode } from 'react'
import { resolveIcon } from '@/icons/resolver'

export function iconElement(name: string, sizePx: number): ReactNode {
  if (!name) return null
  return resolveIcon(name, sizePx)
}
