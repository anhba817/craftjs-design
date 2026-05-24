import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { useEffect } from 'react'
import { AdapterProvider } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { ThemeProvider } from '../themes/ThemeProvider'
import { ResizeOverlay } from './canvas/ResizeOverlay'
import { ErrorBoundary } from './errors/ErrorBoundary'
import {
  CanvasErrorFallback,
  ToolboxErrorFallback,
  TopShellErrorFallback,
} from './errors/fallbacks'
import { Hydrator } from './Hydrator'
import { Inspector } from './Inspector'
import { ResolverUpdater } from './ResolverUpdater'
import { SaveLoadBar } from './SaveLoadBar'
import { Toolbox } from './Toolbox'

export function Editor() {
  // Phase 6 — flip the registry's post-mount flag so any registerCanonical
  // calls after this point warn instead of silently failing to appear.
  useEffect(() => {
    _markEditorMounted()
  }, [])

  const resolver = getResolver()
  const boxDef = getComponent('box')
  if (!boxDef) {
    throw new Error(
      'canonical "box" must be registered before <Editor /> mounts — check side-effect imports in App.tsx',
    )
  }
  const Root = resolver[boxDef.displayName]

  // Phase 8 — three boundary layers below the top shell. The outermost
  // (TopShellErrorFallback) is mounted by App.tsx so it catches anything
  // that bubbles out of <Editor /> itself, including a thrown getResolver()
  // or AdapterProvider failure. Inner boundaries (Canvas, Toolbox) handle
  // localized failures so the rest of the editor stays alive.
  return (
    <AdapterProvider>
      <Craft resolver={resolver}>
        <Hydrator />
        <ResolverUpdater />
        <ResizeOverlay />
        <div className="flex h-screen flex-col">
          <SaveLoadBar />
          <div className="flex min-h-0 flex-1">
            <ErrorBoundary fallback={ToolboxErrorFallback}>
              <Toolbox />
            </ErrorBoundary>
            <ThemeProvider>
              <main className="flex-1 overflow-auto bg-muted p-8">
                <ErrorBoundary fallback={CanvasErrorFallback}>
                  <Frame>
                    <Element
                      is={Root}
                      canvas
                      nodeProps={boxDef.defaults.props}
                      style={boxDef.defaults.style}
                    />
                  </Frame>
                </ErrorBoundary>
              </main>
            </ThemeProvider>
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}

// Re-export for App.tsx to wrap the entire editor in a top-shell boundary.
export { ErrorBoundary, TopShellErrorFallback }
