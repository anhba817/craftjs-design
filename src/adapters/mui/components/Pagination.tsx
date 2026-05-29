import MuiPagination from '@mui/material/Pagination'
import type { PaginationProps } from '@/registry/components/pagination'
import type { AdapterRenderProps } from '../../types'

// MUI Pagination handles the prev/next + ellipsis logic itself given
// count + page. The editor preview is non-interactive (page changes via
// host wiring at runtime), so `onChange` is omitted.
export function MaterialPagination({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { pageCount, currentPage } = props as PaginationProps
  return (
    <MuiPagination
      ref={rootRef as never}
      count={pageCount}
      page={currentPage}
      shape="rounded"
      className={className}
      style={inlineStyle}
    />
  )
}
