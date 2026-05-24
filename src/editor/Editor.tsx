import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { useEffect } from 'react'
import { AdapterProvider } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { ThemeProvider } from '../themes/ThemeProvider'
import { ResizeOverlay } from './canvas/ResizeOverlay'
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

  return (
    <AdapterProvider>
      <Craft resolver={resolver}>
        <Hydrator />
        <ResolverUpdater />
        <ResizeOverlay />
        <div className="flex h-screen flex-col">
          <SaveLoadBar />
          <div className="flex min-h-0 flex-1">
            <Toolbox />
            <ThemeProvider>
              <main className="flex-1 overflow-auto bg-muted p-8">
                <Frame>
                  <Element
                    is={Root}
                    canvas
                    nodeProps={boxDef.defaults.props}
                    style={boxDef.defaults.style}
                  />
                </Frame>
              </main>
            </ThemeProvider>
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}
