// Lean entry: editor + shadcn + plain-HTML adapters, no MUI (so no MUI peers
// to install). Pin the design system so end users can't switch it — drop the
// `adapter` prop to keep the switcher.
import { Editor } from '@crafted-design/editor/core'
import '@crafted-design/editor/index.css'

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Editor adapter="shadcn" />
    </div>
  )
}
