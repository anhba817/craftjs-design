import { cn } from '@/lib/utils'
import type { BreadcrumbProps } from '@/registry/components/breadcrumb'
import type { AdapterRenderProps } from '../../types'

export function ShadcnBreadcrumb({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { items } = props as BreadcrumbProps
  return (
    <nav
      ref={rootRef as never}
      aria-label="Breadcrumb"
      className={cn(className)}
      style={inlineStyle}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-muted-foreground/60">
                /
              </span>
            )}
            {it.href ? (
              <a href={it.href} className="hover:text-foreground">
                {it.label}
              </a>
            ) : (
              <span className="text-foreground" aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
