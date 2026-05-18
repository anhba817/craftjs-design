import './registry/components'
import { listComponents } from './registry/registry'

export default function App() {
  const registered = listComponents()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-canvas-bg text-sm text-gray-600">
      <div>craftjs-design — scaffold ready. Editor lands in Step 6.</div>
      <div className="text-xs">
        registered canonical components ({registered.length}):{' '}
        {registered.map((c) => c.displayName).join(', ') || '—'}
      </div>
    </div>
  )
}
