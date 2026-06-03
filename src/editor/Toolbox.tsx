import { Element, useEditor } from '@craftjs/core'
import { Search, Star } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { cn } from '@/lib/utils'
import { getResolver } from '../craft/resolver'
import {
  getRegistryVersion,
  listComponents,
  subscribeRegistry,
} from '../registry/registry'
import type { CanonicalComponent } from '../registry/types'
import { toolboxIcon } from './toolboxIcons'

const CATEGORY_ORDER: string[] = [
  'layout',
  'content',
  'navigation',
  'media',
  'display',
  'input',
  'feedback',
]

const CATEGORY_LABEL: Record<string, string> = {
  layout: 'Layout',
  content: 'Content',
  navigation: 'Navigation',
  media: 'Media',
  display: 'Display',
  input: 'Input',
  feedback: 'Feedback',
  other: 'Other',
}

// Persisted toolbox preferences live in localStorage. We keep them outside
// Zustand to avoid coupling the editor store to UI state that only affects
// this panel.
const TOOLBOX_STORAGE_KEY = 'craftjs-design.toolbox'
const MAX_RECENT = 5

interface ToolboxState {
  favorites: string[]
  recent: string[]
}

function readState(): ToolboxState {
  try {
    const raw = localStorage.getItem(TOOLBOX_STORAGE_KEY)
    if (!raw) return { favorites: [], recent: [] }
    const parsed = JSON.parse(raw)
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    }
  } catch {
    return { favorites: [], recent: [] }
  }
}

function writeState(state: ToolboxState) {
  try {
    localStorage.setItem(TOOLBOX_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded / disabled — acceptable to silently drop.
  }
}

function matchesSearch(def: CanonicalComponent, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (def.displayName.toLowerCase().includes(q)) return true
  if (def.id.toLowerCase().includes(q)) return true
  for (const tag of def.tags) if (tag.toLowerCase().includes(q)) return true
  return false
}

function groupByCategory(
  defs: CanonicalComponent[],
): Map<string, CanonicalComponent[]> {
  const groups = new Map<string, CanonicalComponent[]>()
  for (const cat of CATEGORY_ORDER) groups.set(cat, [])
  for (const def of defs) {
    const key = CATEGORY_ORDER.includes(def.category) ? def.category : 'other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(def)
  }
  for (const [k, v] of groups) if (v.length === 0) groups.delete(k)
  return groups
}

export function Toolbox() {
  const { connectors, actions, query: editorQuery } = useEditor()
  // Phase 7 — re-render on registry-version bumps so hot canonical reload
  // surfaces new entries in the palette without a page reload.
  const version = useSyncExternalStore(
    subscribeRegistry,
    getRegistryVersion,
    getRegistryVersion,
  )
  const resolver = getResolver()
  // Filter out `hidden` canonicals — they're spawned programmatically by
  // a parent composite (Table → table-cell) and shouldn't appear as
  // draggable toolbox tiles.
  const allDefs = useMemo(
    () => listComponents().filter((d) => !d.hidden),
    [version],
  )
  const byId = useMemo(() => {
    const m = new Map<string, CanonicalComponent>()
    for (const d of allDefs) m.set(d.id, d)
    return m
  }, [allDefs])

  const [state, setState] = useState<ToolboxState>(() => readState())
  const [query, setQuery] = useState('')

  useEffect(() => {
    writeState(state)
  }, [state])

  const toggleFavorite = useCallback((id: string) => {
    setState((prev) => {
      const has = prev.favorites.includes(id)
      const favorites = has
        ? prev.favorites.filter((f) => f !== id)
        : [...prev.favorites, id]
      return { ...prev, favorites }
    })
  }, [])

  // Record "recently used" when the interaction ENDS (the tile's dragend, or
  // a keyboard Enter-insert via dropDef) — never on mousedown. Recording on
  // mousedown reordered the Recent section (and reflowed every tile below it)
  // while the pointer was still down, so by the time the browser fired
  // dragstart a DIFFERENT tile sat under the cursor and the wrong component
  // got dragged. Cap to MAX_RECENT entries (LRU). De-duplicating before
  // unshift means re-using an already-recent canonical bumps it to front
  // rather than creating duplicates.
  const recordUse = useCallback((id: string) => {
    setState((prev) => {
      const filtered = prev.recent.filter((r) => r !== id)
      const recent = [id, ...filtered].slice(0, MAX_RECENT)
      return { ...prev, recent }
    })
  }, [])

  // Filtered set drives both section rendering and the empty state.
  const visibleDefs = useMemo(
    () => allDefs.filter((d) => matchesSearch(d, query)),
    [allDefs, query],
  )

  const favoriteDefs = useMemo(
    () =>
      state.favorites
        .map((id) => byId.get(id))
        .filter((d): d is CanonicalComponent => !!d && matchesSearch(d, query)),
    [state.favorites, byId, query],
  )

  const recentDefs = useMemo(
    () =>
      state.recent
        .map((id) => byId.get(id))
        .filter((d): d is CanonicalComponent => !!d && matchesSearch(d, query)),
    [state.recent, byId, query],
  )

  const grouped = useMemo(() => groupByCategory(visibleDefs), [visibleDefs])

  // ARIA roving tabindex — Phase 9 Group D / PRODUCTION_READINESS § 1.5.
  // The flat orderedDefs array reflects DOM order (Favorites → Recent →
  // each category). A favorited def appears twice (once in Favorites,
  // once in its category). Each visual position is a separate roving
  // slot, so the focus index is into this array, not into allDefs.
  const orderedDefs = useMemo(() => {
    const out: CanonicalComponent[] = []
    out.push(...favoriteDefs)
    out.push(...recentDefs)
    for (const defs of grouped.values()) out.push(...defs)
    return out
  }, [favoriteDefs, recentDefs, grouped])

  // Refs indexed by orderedDefs position so a favorited def's two visual
  // slots get distinct refs.
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Phase 17 § 8.7 — `connectors.create(el, …)` attaches the Craft drag
  // source and is moderately expensive. The button ref callback is recreated
  // every render, so React detaches/reattaches it and `create` re-ran for all
  // ~48 buttons on every Toolbox render (each search keystroke, focus move,
  // favorite toggle). Guard by DOM element: each node is keyed by `def.id`
  // (so a node is bound to exactly one canonical for its lifetime) and gets
  // connected once. The WeakSet drops entries when nodes unmount.
  const connectedEls = useRef<WeakSet<HTMLButtonElement>>(new WeakSet())
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Keep focusedIndex inside the orderedDefs range. When favorites toggle
  // or search filters change the list, the previously-focused slot may
  // disappear; snap to the new last item.
  useEffect(() => {
    if (orderedDefs.length === 0) {
      setFocusedIndex(0)
      return
    }
    if (focusedIndex >= orderedDefs.length) {
      setFocusedIndex(orderedDefs.length - 1)
    }
  }, [focusedIndex, orderedDefs.length])

  const focusButtonAt = useCallback((idx: number) => {
    buttonRefs.current[idx]?.focus()
  }, [])

  // Selection-aware drop: Enter on a focused component inserts it.
  //   - no selection → child of ROOT.
  //   - canvas selection → child of the selected canvas.
  //   - non-canvas selection → sibling AFTER the selected node.
  const dropDef = useCallback(
    (def: CanonicalComponent) => {
      const Bound = resolver[def.displayName]
      if (!Bound) return
      const selectedIds = editorQuery.getEvent('selected').all()
      const selectedId = selectedIds[0]
      let parentId = 'ROOT'
      let indexToPlaceAt: number | undefined
      if (selectedId) {
        const selectedNode = editorQuery.node(selectedId).get()
        if (selectedNode.data.isCanvas) {
          parentId = selectedId
        } else {
          parentId = selectedNode.data.parent ?? 'ROOT'
          const parent = editorQuery.node(parentId).get()
          const siblings = parent.data.nodes ?? []
          const sibIdx = siblings.indexOf(selectedId)
          if (sibIdx >= 0) indexToPlaceAt = sibIdx + 1
        }
      }
      const element = (
        <Element
          is={Bound}
          canvas={def.isCanvas}
          nodeProps={def.defaults.props}
          style={def.defaults.style}
        />
      )
      // Craft.js's actions.add() takes a Node (not a React element), so we
      // parse the <Element> JSX into a node tree first. parseReactElement
      // + toNodeTree handles canvas-bearing nodes (creates the linked
      // nodes for canvas children) the same way the connectors.create
      // drag path does.
      const tree = editorQuery.parseReactElement(element).toNodeTree()
      actions.addNodeTree(tree, parentId, indexToPlaceAt)
      recordUse(def.id)
    },
    [resolver, editorQuery, actions, recordUse],
  )

  // Each component renders as a thumbnail tile — a representative icon over
  // its label (Unlayer-style visual palette) — instead of a full-width text
  // button. The drag source, recent-use tracking, roving tabindex, and the
  // favorite star are unchanged; only the visual shape + grid layout differ.
  const renderTile = useCallback(
    (def: CanonicalComponent, rovingIdx: number, sectionKey: string) => {
      const Bound = resolver[def.displayName]
      if (!Bound) return null
      const isFavorite = state.favorites.includes(def.id)
      const isRovingFocused = rovingIdx === focusedIndex
      const Icon = toolboxIcon(def)
      return (
        <div
          // section prefix keeps the React key unique when a favorited def
          // appears in both the Favorites section and its category section.
          key={`${sectionKey}-${def.id}`}
          className="group relative"
        >
          <button
            ref={(el) => {
              buttonRefs.current[rovingIdx] = el
              if (el && !connectedEls.current.has(el)) {
                connectors.create(
                  el,
                  <Element
                    is={Bound}
                    canvas={def.isCanvas}
                    nodeProps={def.defaults.props}
                    style={def.defaults.style}
                  />,
                )
                connectedEls.current.add(el)
              }
            }}
            // dragend (NOT mousedown): the recent-list reorder must wait until
            // the pointer is released, or the grid reflows under the cursor
            // before dragstart and the wrong tile becomes the drag source.
            onDragEnd={() => recordUse(def.id)}
            onFocus={() => setFocusedIndex(rovingIdx)}
            tabIndex={isRovingFocused ? 0 : -1}
            title={def.displayName}
            className="flex w-full cursor-grab flex-col items-center justify-center gap-1.5 rounded-md border border-ed-border bg-ed-surface px-1 py-3 transition-colors hover:border-ed-border-2 hover:bg-ed-surface-2 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-accent"
          >
            <Icon size={22} strokeWidth={1.75} className="text-ed-text-muted" aria-hidden />
            <span className="w-full truncate text-center text-[11px] leading-tight text-ed-text-muted">
              {def.displayName}
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(def.id)}
            aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
            // Star stays out of the roving rotation — keyboard users reach it
            // via `F` while focused on the tile (see handleKeyDown). Hidden
            // until hover / focus-within unless the tile is already favorited.
            tabIndex={-1}
            className={cn(
              'absolute right-1 top-1 rounded p-0.5 text-ed-text-faint opacity-0 transition-opacity hover:text-yellow-500 group-hover:opacity-100 group-focus-within:opacity-100',
              isFavorite && 'opacity-100',
            )}
          >
            <Star
              size={12}
              fill={isFavorite ? 'currentColor' : 'none'}
              className={isFavorite ? 'text-yellow-500' : ''}
            />
          </button>
        </div>
      )
    },
    [connectors, recordUse, resolver, state.favorites, toggleFavorite, focusedIndex],
  )

  const isEmpty =
    favoriteDefs.length === 0 &&
    recentDefs.length === 0 &&
    Array.from(grouped.values()).every((v) => v.length === 0)

  const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (orderedDefs.length === 0) {
      // Only `/` and Escape still make sense when nothing's listed.
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
      return
    }
    switch (e.key) {
      // Grid layout — both axes step linearly through DOM order (tiles flow
      // left-to-right, top-to-bottom), so all four arrows just move ±1.
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault()
        const next = Math.min(focusedIndex + 1, orderedDefs.length - 1)
        setFocusedIndex(next)
        focusButtonAt(next)
        break
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault()
        const next = Math.max(focusedIndex - 1, 0)
        setFocusedIndex(next)
        focusButtonAt(next)
        break
      }
      case 'Home': {
        e.preventDefault()
        setFocusedIndex(0)
        focusButtonAt(0)
        break
      }
      case 'End': {
        e.preventDefault()
        const last = orderedDefs.length - 1
        setFocusedIndex(last)
        focusButtonAt(last)
        break
      }
      case 'Enter':
      case ' ': {
        // Space and Enter both drop the focused def — matches the WAI-ARIA
        // toolbar pattern where activation keys are equivalent on buttons.
        e.preventDefault()
        const def = orderedDefs[focusedIndex]
        if (def) dropDef(def)
        break
      }
      case 'f':
      case 'F': {
        // Star toggle for the focused row — keyboard equivalent of clicking
        // the favorite icon. Avoids re-using Tab (the toolbar is a single
        // tab stop) while still letting power users curate favorites.
        e.preventDefault()
        const def = orderedDefs[focusedIndex]
        if (def) toggleFavorite(def.id)
        break
      }
      case '/': {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        break
      }
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (query) {
        setQuery('')
      }
      // Return focus to the first visible component. orderedDefs may not
      // include the previously-focused entry once the filter is cleared,
      // so always restart at index 0.
      setFocusedIndex(0)
      // Wait for the post-clear render to materialize the button.
      requestAnimationFrame(() => focusButtonAt(0))
    }
  }

  // Phase 11 § 3.4 — Toolbox no longer renders its own <aside>; it
  // returns content that LeftAside slots into a shared sidebar
  // alongside the LayerTree tab. The wrapping div keeps the
  // flex-column shape Toolbox relied on (header + scroll body).
  return (
    <div
      aria-label="Component toolbox"
      role="region"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-ed-border p-2">
        <label className="relative block">
          {/* Visually-hidden accessible name. The placeholder doubles as a
              visual hint but isn't reliable as the input's accessible name
              for screen readers. */}
          <span className="sr-only">Search components</span>
          <Search
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ed-text-faint"
            aria-hidden
          />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search components…"
            className="w-full rounded border border-ed-border bg-ed-surface py-1.5 pl-7 pr-2 text-sm placeholder:text-ed-text-faint focus:border-ed-border-strong focus:outline-none"
          />
        </label>
      </div>

      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Components"
        onKeyDown={handleToolbarKeyDown}
        className="flex-1 space-y-4 overflow-y-auto p-3 focus:outline-none"
      >
        {isEmpty && (
          <div className="text-xs text-ed-text-muted">No components match.</div>
        )}

        {favoriteDefs.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-ed-text-muted">
              Favorites
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {favoriteDefs.map((def, i) =>
                renderTile(def, i, 'fav'),
              )}
            </div>
          </div>
        )}

        {recentDefs.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-ed-text-muted">
              Recently used
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recentDefs.map((def, i) =>
                renderTile(def, favoriteDefs.length + i, 'rec'),
              )}
            </div>
          </div>
        )}

        {(() => {
          // Compute the starting roving index for each category section.
          // Pre-section base = favorites + recents; each preceding
          // category adds its own length.
          let cursor = favoriteDefs.length + recentDefs.length
          return Array.from(grouped.entries()).map(([category, defs]) => {
            const sectionStart = cursor
            cursor += defs.length
            return (
              <div key={category} className="space-y-1.5">
                <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-ed-text-muted">
                  {CATEGORY_LABEL[category] ?? category}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {defs.map((def, i) =>
                    renderTile(def, sectionStart + i, `cat-${category}`),
                  )}
                </div>
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}
