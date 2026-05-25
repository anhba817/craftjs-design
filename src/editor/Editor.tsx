import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { useEffect } from 'react'
import { AdapterProvider } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { useEditorStore } from '../state/editorStore'
import { ThemeProvider } from '../themes/ThemeProvider'
import { CanvasKeyboardRegion } from './canvas/CanvasKeyboardRegion'
import { ResizeOverlay } from './canvas/ResizeOverlay'
import { AsyncErrorBanner } from './errors/AsyncErrorBanner'
import { ErrorBoundary } from './errors/ErrorBoundary'
import { MalformedDocumentBanner } from './errors/MalformedDocumentBanner'
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
  // Phase 9 § 1.9 — when applyEnvelopeSafely detects a structural or
  // deserialize failure, Frame is swapped for MalformedDocumentBanner
  // so the user has a recovery path instead of a half-loaded canvas.
  const malformedDocument = useEditorStore((s) => s.malformedDocument)

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
        {/* Phase 9 § 1.6 — toast for uncaught async errors (effects,
            event handlers, fetch promises) that the React render-path
            ErrorBoundaries don't see. Critical async failures
            (Hydrator deserialize) still bubble to a boundary; this
            handles everything else. */}
        <AsyncErrorBanner />
        <div className="flex h-screen flex-col">
          <SaveLoadBar />
          <div className="flex min-h-0 flex-1">
            <ErrorBoundary fallback={ToolboxErrorFallback}>
              <Toolbox />
            </ErrorBoundary>
            <ThemeProvider>
              <main className="flex-1 overflow-auto bg-muted p-8">
                <ErrorBoundary fallback={CanvasErrorFallback}>
                  {malformedDocument ? (
                    <MalformedDocumentBanner />
                  ) : (
                    <CanvasKeyboardRegion>
                      <Frame>
                        <Element
                          is={Root}
                          canvas
                          nodeProps={boxDef.defaults.props}
                          style={boxDef.defaults.style}
                        />
                      </Frame>
                    </CanvasKeyboardRegion>
                  )}
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
