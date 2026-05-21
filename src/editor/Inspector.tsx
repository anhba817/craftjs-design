import { useEditor } from '@craftjs/core'
import { TypographyPanel } from './inspector/TypographyPanel'

export function Inspector() {
  const { selected, isRoot, actions } = useEditor((state, query) => {
    // `events.selected` is a Set in Craft.js 0.2.x — coerce defensively for
    // version-skew safety.
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    const id = ids[0]
    if (!id) return { selected: null, isRoot: false }
    const node = query.node(id).get()
    return {
      selected: { id, displayName: node.data.displayName },
      isRoot: query.node(id).isRoot(),
    }
  })

  return (
    <aside className="w-72 border-l border-gray-200 p-3">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Inspector
      </div>
      {!selected ? (
        <div className="mt-2 text-xs text-gray-400">Nothing selected.</div>
      ) : (
        <>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Type</div>
              <div className="font-medium text-gray-800">{selected.displayName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Id</div>
              <code className="text-xs text-gray-700">{selected.id}</code>
            </div>
            {!isRoot && (
              <button
                type="button"
                className="text-sm text-red-600 underline hover:text-red-700"
                onClick={() => actions.delete(selected.id)}
              >
                Delete
              </button>
            )}
          </div>
          <div className="mt-4 border-t border-gray-200 pt-3">
            <TypographyPanel nodeId={selected.id} />
          </div>
        </>
      )}
    </aside>
  )
}
