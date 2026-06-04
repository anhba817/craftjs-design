// Phase 22 Group B — the screenshot render harness. A tiny page that mounts
// <DocumentRenderer> and exposes a window hook the headless browser drives:
//
//   window.__render(envelopeJson, adapterId?) → Promise (resolves after paint)
//
// This is the "export from our own renderer" model (Decision 2): the screenshot
// is literally what a host ships with <DocumentRenderer>, rendered through the
// real adapter + stylesheet — not a re-render into a foreign engine.
//
// Built into dist-harness/ by `npm run build:harness`; Playwright loads it via
// file:// in scripts/render-image (Group B orchestration). Registers shadcn +
// html (the no-extra-peer adapters); a document targeting another adapter
// falls back gracefully (DocumentRenderer handles it).
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
// Register the canonicals + themes documents reference EXPLICITLY (not via the
// renderer entry's side-effect re-exports, which the app bundler may drop) —
// without them the Craft resolver is empty and deserialize throws.
import '@/registry/components'
import '@/themes'
import '@/adapters/shadcn'
import '@/adapters/html'
import '@/index.css'
import { DocumentRenderer } from './DocumentRenderer'

interface RenderRequest {
  doc: string
  adapter?: string
}

let push: (req: RenderRequest | null) => void = () => {}

function Harness() {
  const [req, setReq] = useState<RenderRequest | null>(null)
  // Wire the imperative push hook + signal readiness in an effect (not during
  // render — reassigning an outer binding in render is a side effect). The
  // browser waits on window.__ready, so __render is only driven after this.
  useEffect(() => {
    push = setReq
    window.__ready = true
  }, [])
  if (!req) return null
  return (
    <div id="harness-root">
      <DocumentRenderer document={req.doc} adapter={req.adapter} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)

declare global {
  interface Window {
    /** Render an envelope; resolves after two animation frames (paint settled). */
    __render: (envelopeJson: string, adapterId?: string) => Promise<void>
    __ready: boolean
  }
}

window.__render = (envelopeJson: string, adapterId?: string) =>
  new Promise<void>((resolve) => {
    push({ doc: envelopeJson, adapter: adapterId })
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
