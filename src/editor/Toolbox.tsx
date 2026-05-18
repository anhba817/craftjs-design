import { Element, useEditor } from '@craftjs/core'
import { getResolver } from '../craft/resolver'
import { listComponents } from '../registry/registry'

export function Toolbox() {
  const { connectors } = useEditor()
  const resolver = getResolver()

  return (
    <aside className="w-56 space-y-2 border-r border-gray-200 p-3">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Components
      </div>
      {listComponents().map((def) => {
        const Bound = resolver[def.displayName]
        if (!Bound) return null
        return (
          <button
            key={def.id}
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
            className="w-full cursor-grab rounded border border-gray-200 bg-white px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 active:cursor-grabbing"
          >
            {def.displayName}
          </button>
        )
      })}
    </aside>
  )
}
