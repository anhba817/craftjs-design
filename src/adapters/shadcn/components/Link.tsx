import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnLink({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { href, label, target } = props as {
    href: string
    label: string
    target: '_self' | '_blank'
  }
  // In editor mode, clicking the link shouldn't navigate (would yank the user
  // off the canvas). Phase 5 just renders without a real navigation handler —
  // the href is informational for the user authoring the link. Phase 6 polish
  // could intercept clicks within the editor's canvas.
  return (
    <a
      ref={rootRef as never}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(className)}
      style={inlineStyle}
      onClick={(e) => e.preventDefault()}
    >
      {label}
    </a>
  )
}
