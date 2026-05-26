import { useEditor } from '@craftjs/core'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useEditorStore } from '@/state/editorStore'
import { getComponentByDisplayName } from '@/registry/registry'
import { searchNodes } from './searchNodes'
import type { SearchableNode } from './searchNodes'

// Stable empty-array constant. The useEditor collector returns this
// when the search overlay is closed, instead of `[]` — fresh arrays
// fail shallow-equality in Craft's useCollector and force a
// re-render on every Craft state change (i.e. every arrow keypress).
// Caused perceptibly slow keyboard navigation after Group F shipped;
// see feedback-zustand-selectors memory for the analogous lesson on
// stable refs in selectors.
const EMPTY_SEARCHABLE: readonly SearchableNode[] = []

// Phase 11 § 3.9 — Cmd/Ctrl+F canvas search.
//
// Top-centre fixed overlay. Filters nodes by displayName / tags /
// common string props (label, content, alt). Enter steps forward
// through the match list; Shift+Enter steps backward. Each step
// scrolls the matched node into view and selects it via the editor
// store (flushSync — see the layer-tree click-fix lesson about
// passive-effect lag).
//
// Esc closes the overlay. Clicking the input doesn't move canvas
// selection; only Enter / Shift+Enter does.

const SHORTCUT_HINT = 'Cmd/Ctrl+F'

export function CanvasSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Global Cmd/Ctrl+F to open. Esc to close. Caller-controlled
  // visibility — the overlay only mounts the search UI when open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is in a form input or contentEditable
      // already — let the browser's native find behavior handle it
      // for inspector inputs, and let our inline-text editor keep
      // Cmd+F as a browser-native action when editing text.
      const target = e.target as HTMLElement | null
      const isFormTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (
        !isFormTarget &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'f'
      ) {
        e.preventDefault()
        setOpen(true)
        // Defer focus to after mount.
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setTerm('')
        setCursor(0)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Subscribe to Craft's nodes map BY REFERENCE — the ref only
  // changes when nodes are added/removed/setProp'd, NOT on every
  // selectNode. That keeps this component out of the arrow-key
  // re-render storm.
  const { nodes, query } = useEditor((state) => ({ nodes: state.nodes }))

  // Walk the tree only when the search overlay is actually open and
  // the underlying tree changed. When closed, return the stable
  // EMPTY_SEARCHABLE constant so the result memo stays stable and
  // downstream useMemo (matches) doesn't recompute either.
  const searchableNodes = useMemo<readonly SearchableNode[]>(() => {
    if (!open) return EMPTY_SEARCHABLE
    if (!nodes || !Object.keys(nodes).includes('ROOT')) return EMPTY_SEARCHABLE
    const ordered: string[] = []
    try {
      const root = query.node('ROOT')
      ordered.push('ROOT')
      ordered.push(...(root.descendants(true) as string[]))
    } catch {
      // Hydration not complete.
    }
    const out: SearchableNode[] = []
    for (const id of ordered) {
      try {
        const data = query.node(id).get().data
        const displayName = (data.displayName as string) || ''
        const tags = getComponentByDisplayName(displayName)?.tags
        const nodeProps =
          (data.props as { nodeProps?: Record<string, unknown> })
            ?.nodeProps ?? {}
        const textProps: Record<string, string | undefined> = {}
        for (const key of ['label', 'content', 'alt']) {
          const v = nodeProps[key]
          if (typeof v === 'string') textProps[key] = v
        }
        out.push({
          id,
          displayName,
          tags: tags as readonly string[] | undefined,
          textProps,
        })
      } catch {
        // Skip nodes that vanished mid-walk.
      }
    }
    return out
  }, [open, nodes, query])

  const matches = useMemo(
    () => searchNodes(searchableNodes, term),
    [searchableNodes, term],
  )

  // Whenever the term changes, reset the cursor + jump to the first
  // match if any.
  useEffect(() => {
    setCursor(0)
  }, [term])

  const { actions } = useEditor()

  const jumpTo = useCallback(
    (idx: number) => {
      if (matches.length === 0) return
      const wrapped = ((idx % matches.length) + matches.length) % matches.length
      const node = matches[wrapped]
      // Update editorStore + Craft in sync (same template as the
      // layer-tree click handler; see feedback-selection-sync
      // memory).
      flushSync(() => {
        useEditorStore.getState().setSelection([node.id])
      })
      actions.selectNode(node.id)
      // Scroll into view.
      try {
        const dom = query.node(node.id).get().dom as HTMLElement | null
        dom?.scrollIntoView({ block: 'center', inline: 'nearest' })
      } catch {
        // Node missing — silent skip.
      }
      setCursor(wrapped)
    },
    [matches, actions, query],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      jumpTo(cursor + (e.shiftKey ? -1 : 1))
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setTerm('')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Search canvas"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
        <Search className="size-3.5 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes…"
          className="w-64 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-keyshortcuts={SHORTCUT_HINT}
        />
        <span className="min-w-12 text-right text-[10px] text-muted-foreground">
          {matches.length === 0
            ? term.trim().length > 0
              ? 'no matches'
              : SHORTCUT_HINT
            : `${cursor + 1} / ${matches.length}`}
        </span>
      </div>
    </div>
  )
}
