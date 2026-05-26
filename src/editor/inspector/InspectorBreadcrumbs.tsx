import { useEditor } from '@craftjs/core'
import { ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.5 — ancestor chain breadcrumb above the Inspector.
//
// Walks from ROOT → parent → … → primary selection. Each chip is a
// button that calls actions.selectNode(ancestorId). The active chip
// (== selection[0]) is non-interactive and visually emphasized.
//
// Overflow: when there are more than MAX_INLINE chips, the middle
// segments collapse into a single "…" Radix dropdown that lists the
// truncated middle items.
//
// Hidden when selection is empty. In multi-select the breadcrumb
// renders the chain of selection[0] only; that's the most useful
// signal for "where are we in the tree".

const MAX_INLINE = 4

export function InspectorBreadcrumbs() {
  const primaryId = useEditorStore((s) => s.selection[0] ?? null)
  const { actions, chain } = useEditor((_state, query) => {
    if (!primaryId) return { chain: [] as Array<{ id: string; label: string }> }
    try {
      // Craft's ancestors() returns parents-first. Prepend the primary
      // itself so the breadcrumb's last entry is the current node.
      const ancestorIds = query
        .node(primaryId)
        .ancestors() as readonly string[]
      // ancestors() is parent → grandparent → … → ROOT (parent-first).
      // For a left-to-right breadcrumb (ROOT first, primary last) we
      // reverse, then append the primary id at the end.
      const idsRootFirst = [...ancestorIds].reverse().concat(primaryId)
      const chain = idsRootFirst.map((id) => {
        const n = query.node(id).get()
        return { id, label: (n.data.displayName as string) || id }
      })
      return { chain }
    } catch {
      return { chain: [] as Array<{ id: string; label: string }> }
    }
  })

  if (!primaryId || chain.length === 0) return null

  // Overflow split: if chain.length > MAX_INLINE, keep first + last and
  // collapse the middle into a dropdown. The first chip is always
  // ROOT (or whatever the topmost ancestor is), the last is always
  // the primary selection.
  const overflow = chain.length > MAX_INLINE
  const head = overflow ? chain[0] : null
  const tail = overflow ? chain.slice(-2) : chain
  const middle = overflow ? chain.slice(1, -2) : []

  const Chip = ({
    id,
    label,
    isLast,
  }: {
    id: string
    label: string
    isLast: boolean
  }) =>
    isLast ? (
      <span
        aria-current="true"
        className="truncate rounded px-1.5 py-0.5 text-xs font-medium text-gray-900"
      >
        {label}
      </span>
    ) : (
      <button
        type="button"
        onClick={() => actions.selectNode(id)}
        className="truncate rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-muted hover:text-gray-900"
      >
        {label}
      </button>
    )

  return (
    <nav
      aria-label="Selection breadcrumbs"
      className="flex min-w-0 items-center gap-0.5 border-b border-gray-200 px-2 py-1.5 text-xs"
    >
      {head && (
        <>
          <Chip id={head.id} label={head.label} isLast={false} />
          <ChevronRight aria-hidden className="size-3 shrink-0 text-gray-300" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Show ${middle.length} hidden ancestors`}
                className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-muted"
              >
                …
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              {middle.map((node) => (
                <DropdownMenuItem
                  key={node.id}
                  onSelect={() => actions.selectNode(node.id)}
                >
                  {node.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight aria-hidden className="size-3 shrink-0 text-gray-300" />
        </>
      )}
      {tail.map((node, idx) => {
        const isLast = idx === tail.length - 1
        return (
          <span key={node.id} className="flex min-w-0 items-center gap-0.5">
            <Chip id={node.id} label={node.label} isLast={isLast} />
            {!isLast && (
              <ChevronRight
                aria-hidden
                className="size-3 shrink-0 text-gray-300"
              />
            )}
          </span>
        )
      })}
    </nav>
  )
}
