// Lean entry: editor + shadcn + plain-HTML adapters, no MUI (so no MUI peers
// to install). Pin the design system so end users can't switch it — drop the
// `adapter` prop to keep the switcher.
import { Editor } from '@crafted-design/editor/core'
// Phase 23 (P7) regression guard — the SDK surface must resolve through the
// `/core` entry (not only `/sdk`). This import is type-checked by CI's
// `check:example`; it fails if the `core → sdk` re-export chain breaks again
// (as it silently did before the `./sdk/index` fix).
import { setStorageAdapter } from '@crafted-design/editor/core'
import type { StorageAdapter } from '@crafted-design/editor/core'
import '@crafted-design/editor/index.css'

// Reference the imports so they aren't elided before type-checking.
const _storageSurface: typeof setStorageAdapter = setStorageAdapter
void _storageSurface
export type _StorageAdapter = StorageAdapter

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Editor adapter="shadcn" />
    </div>
  )
}
