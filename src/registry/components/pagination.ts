import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.2 — Pagination. Leaf component; the editor renders a
// static preview of prev/next + numbered pages based on `pageCount` and
// `currentPage`. Real navigation happens at runtime via host wiring
// (the editor doesn't model click handlers).
export const paginationPropsSchema = z.object({
  pageCount: z.number().int().min(1).max(999),
  currentPage: z.number().int().min(1).max(999),
})
export type PaginationProps = z.infer<typeof paginationPropsSchema>

registerComponent<PaginationProps>({
  id: 'pagination',
  category: 'navigation',
  displayName: 'Pagination',
  tags: ['nav', 'pages', 'paginate'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: paginationPropsSchema,
  defaults: {
    props: { pageCount: 5, currentPage: 1 },
    style: {
      classes: { root: 'flex items-center gap-1 text-sm' },
    },
  },
})
