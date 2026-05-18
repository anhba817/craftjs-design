import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { AdapterProvider } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import { getComponent } from '../registry/registry'
import { Hydrator } from './Hydrator'
import { Inspector } from './Inspector'
import { SaveLoadBar } from './SaveLoadBar'
import { Toolbox } from './Toolbox'

export function Editor() {
  const resolver = getResolver()
  const boxDef = getComponent('box')
  if (!boxDef) {
    throw new Error(
      'canonical "box" must be registered before <Editor /> mounts — check side-effect imports in App.tsx',
    )
  }
  const Root = resolver[boxDef.displayName]

  return (
    <AdapterProvider adapterId="shadcn">
      <Craft resolver={resolver}>
        <Hydrator />
        <div className="flex h-screen flex-col">
          <SaveLoadBar />
          <div className="flex min-h-0 flex-1">
            <Toolbox />
            <main className="flex-1 overflow-auto bg-canvas-bg p-8">
              <Frame>
                <Element
                  is={Root}
                  canvas
                  nodeProps={boxDef.defaults.props}
                  style={boxDef.defaults.style}
                />
              </Frame>
            </main>
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}
