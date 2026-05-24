import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import '../examples/adapter-chakra'
import './themes'
import './editor/inspector/built-in-panels'
import { Editor } from './editor/Editor'

export default function App() {
  return <Editor />
}
