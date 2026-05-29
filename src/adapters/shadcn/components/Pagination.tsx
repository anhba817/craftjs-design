import { cn } from '@/lib/utils'
import type { PaginationProps } from '@/registry/components/pagination'
import type { AdapterRenderProps } from '../../types'

// Pagination — static preview of prev/next + numbered pages driven by
// currentPage. Pages > 7 collapse the middle into an ellipsis so the
// preview stays readable for big page counts.
function visiblePages(pageCount: number, current: number): Array<number | '…'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }
  const out: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(pageCount - 1, current + 1)
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < pageCount - 1) out.push('…')
  out.push(pageCount)
  return out
}

export function ShadcnPagination({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { pageCount, currentPage } = props as PaginationProps
  const pages = visiblePages(pageCount, currentPage)
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded border border-input bg-background px-2 hover:bg-accent'
  const active = 'border-primary bg-primary text-primary-foreground'
  return (
    <nav
      ref={rootRef as never}
      aria-label="Pagination"
      className={cn(className)}
      style={inlineStyle}
    >
      <button type="button" className={cn(btn)} aria-label="Previous">
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === currentPage ? 'page' : undefined}
            className={cn(btn, p === currentPage && active)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(btn)} aria-label="Next">
        ›
      </button>
    </nav>
  )
}
