import { cn } from '@design/sdk'
import type { NavItemProps } from '@/registry/components/nav-item'
import { iconElement } from '../../_shared/lucide-icons'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

// NavItem — Pattern A canvas. The label / icon / href render on top; any
// dropped children render below as the nested submenu (drop a NavMenu or
// more NavItems inside).
export function ShadcnNavItem({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, href, icon, triggers } = props as NavItemProps
  const { onClick: triggersOnClick, wrap } = useShadcnTriggers(triggers)

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    triggersOnClick?.()
  }

  return wrap(
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      <a
        href={href}
        className="flex items-center gap-2"
        onClick={handleClick}
      >
        {icon ? iconElement(icon, 16) : null}
        <span>{label}</span>
      </a>
      {children}
    </div>,
  )
}
