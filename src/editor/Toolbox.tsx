import { Element, useEditor } from '@craftjs/core'
import { Search, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getResolver } from '../craft/resolver'
import {
  getRegistryVersion,
  listComponents,
  subscribeRegistry,
} from '../registry/registry'
import type { CanonicalComponent } from '../registry/types'

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
  const { connectors } = useEditor()
  // Phase 7 — re-render on registry-version bumps so hot canonical reload
  // surfaces new entries in the palette without a page reload.
  const version = useSyncExternalStore(
    subscribeRegistry,
    getRegistryVersion,
    getRegistryVersion,
  )
  const resolver = getResolver()
  const allDefs = useMemo(() => listComponents(), [version])
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

  // Record "intent to use" on mousedown of the toolbox button — fires whether
  // or not the drag completes. Cap to MAX_RECENT entries (LRU). De-duplicating
  // before unshift means re-using an already-recent canonical bumps it to
  // front rather than creating duplicates.
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

  const renderButton = useCallback(
    (def: CanonicalComponent) => {
      const Bound = resolver[def.displayName]
      if (!Bound) return null
      const isFavorite = state.favorites.includes(def.id)
      return (
        <div
          key={def.id}
          className="group flex items-center gap-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50"
        >
          <button
            ref={(el) => {
              if (el) {
                connectors.create(
                  el,
                  <Element
                    is={Bound}
                    canvas={def.isCanvas}
                    nodeProps={def.defaults.props}
                    style={def.defaults.style}
                  />,
                )
              }
            }}
            onMouseDown={() => recordUse(def.id)}
            className="flex-1 cursor-grab px-2 py-1.5 text-left text-sm text-gray-700 active:cursor-grabbing"
          >
            {def.displayName}
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(def.id)}
            aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
            className="px-1.5 py-1.5 text-gray-300 hover:text-yellow-500"
          >
            <Star
              size={14}
              fill={isFavorite ? 'currentColor' : 'none'}
              className={isFavorite ? 'text-yellow-500' : ''}
            />
          </button>
        </div>
      )
    },
    [connectors, recordUse, resolver, state.favorites, toggleFavorite],
  )

  const isEmpty =
    favoriteDefs.length === 0 &&
    recentDefs.length === 0 &&
    Array.from(grouped.values()).every((v) => v.length === 0)

  return (
    <aside
      aria-label="Component toolbox"
      className="flex w-56 flex-col border-r border-gray-200"
    >
      <div className="border-b border-gray-200 p-2">
        <label className="relative block">
          {/* Visually-hidden accessible name. The placeholder doubles as a
              visual hint but isn't reliable as the input's accessible name
              for screen readers. */}
          <span className="sr-only">Search components</span>
          <Search
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-7 pr-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {isEmpty && (
          <div className="text-xs text-gray-400">No components match.</div>
        )}

        {favoriteDefs.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Favorites
            </div>
            <div className="space-y-1">{favoriteDefs.map(renderButton)}</div>
          </div>
        )}

        {recentDefs.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Recently used
            </div>
            <div className="space-y-1">{recentDefs.map(renderButton)}</div>
          </div>
        )}

        {Array.from(grouped.entries()).map(([category, defs]) => (
          <div key={category} className="space-y-1.5">
            <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {CATEGORY_LABEL[category] ?? category}
            </div>
            <div className="space-y-1">{defs.map(renderButton)}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}
