// Display a saved editor document on a production page — no editor, no
// chrome, no editing. Three ingredients:
//   1. <DocumentRenderer /> from the lean /renderer entry,
//   2. the adapter the page should render with (side-effect import),
//   3. the editor stylesheet (Tailwind utilities the document references).
import { DocumentRenderer } from '@crafted-design/editor/renderer'
import '@crafted-design/editor/adapters/shadcn'
import '@crafted-design/editor/index.css'

// A real document exported from the editor (Export → .json). Passed as a
// string so the renderer runs it through the same validation + version
// migrations as an editor import. (`?raw` keeps it a string at build time.)
import documentJson from './portfolio_sample.json?raw'

export default function App() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <DocumentRenderer document={documentJson} />
    </main>
  )
}
