// Phase 21 — <DocumentRenderer>: display a saved EditorDocument on a
// production page with NO editor (no toolbox/inspector/toolbar, no selection,
// no persistence). It mounts the same proven pipeline the editor's preview
// mode uses — Craft with `enabled={false}` + the canonical resolver + the
// active adapter's impls — so a document renders pixel-identically to preview,
// including runtime overlay behavior (modals portal + open on triggers) and
// per-node responsive inline styles.
//
// Host requirements (same registration model as the editor):
//   import '@crafted-design/editor/adapters/shadcn'   // an adapter
//   import '@crafted-design/editor/index.css'         // the stylesheet
//
// The adapter is PER INSTANCE (the `adapter` prop pins this renderer via
// AdapterProvider's adapterId; several renderers with different adapters can
// coexist). The document/canvas theme + color mode come from the envelope and
// scope to this renderer's wrapper only.
import { Editor as Craft, Frame } from '@craftjs/core'
import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AdapterProvider, getAdapter, listAdapters } from '@/adapters/AdapterContext'
import { getResolver } from '@/craft/resolver'
import { parseDocumentJson } from '@/persistence/importDocument'
import type { EditorDocument } from '@/persistence/schema'
import { getTheme } from '@/themes/registry'

export interface DocumentRendererProps {
  /** The saved document — an `EditorDocument` envelope or its JSON string. */
  document: EditorDocument | string
  /**
   * Adapter to render with. Defaults to the envelope's `adapterId`.
   * The adapter must be registered (side-effect-import its subpath).
   */
  adapter?: string
  /** Class for the wrapper element (sizing/positioning in the host layout). */
  className?: string
}

// Minimal local boundary — a malformed document must not crash the host page.
class RenderBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[DocumentRenderer] render failed:', error)
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded border border-destructive/40 p-4 text-sm text-destructive">
          This document could not be rendered.
        </div>
      )
    }
    return this.props.children
  }
}

// Resolve the envelope's color mode; 'system' follows prefers-color-scheme.
function useColorScheme(mode: EditorDocument['colorMode']): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia)
      return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])
  if (mode === 'dark') return 'dark'
  if (mode === 'system') return systemDark ? 'dark' : 'light'
  return 'light'
}

export function DocumentRenderer({
  document: documentProp,
  adapter,
  className,
}: DocumentRendererProps) {
  // Normalize + validate + migrate through the editor's own import path, so
  // the renderer accepts exactly what the editor accepts (including old
  // document versions).
  const parsed = useMemo(() => {
    try {
      const raw =
        typeof documentProp === 'string'
          ? documentProp
          : JSON.stringify(documentProp)
      return { doc: parseDocumentJson(raw), error: null as string | null }
    } catch (err) {
      return {
        doc: null,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }, [documentProp])

  const scheme = useColorScheme(parsed.doc?.colorMode)

  if (!parsed.doc) {
    console.error('[DocumentRenderer] invalid document:', parsed.error)
    return (
      <div role="alert" className={className}>
        <div className="rounded border border-destructive/40 p-4 text-sm text-destructive">
          This document could not be loaded.
        </div>
      </div>
    )
  }

  // Resolve the adapter:
  //   - explicit `adapter` prop → must be registered (the host asked for it).
  //   - otherwise prefer the document's `adapterId`, but if that isn't
  //     registered, FALL BACK to any registered adapter. Documents are
  //     canonical-id based and render under any adapter, so a host that
  //     imported a different adapter than the document was saved with should
  //     still render (a common case: export with `html`, host uses `shadcn`).
  //     Only erroring when NO adapter is registered at all.
  const requested = adapter ?? parsed.doc.adapterId
  let adapterId = requested
  if (!getAdapter(adapterId)) {
    if (adapter !== undefined) {
      // Explicit prop: don't second-guess the host — surface the mistake.
      console.error(
        `[DocumentRenderer] adapter "${adapterId}" is not registered — ` +
          `side-effect-import it first (e.g. ` +
          `import '@crafted-design/editor/adapters/${adapterId}').`,
      )
      return (
        <div role="alert" className={className}>
          <div className="rounded border border-destructive/40 p-4 text-sm text-destructive">
            Adapter “{adapterId}” is not registered.
          </div>
        </div>
      )
    }
    const fallback = listAdapters()[0]
    if (!fallback) {
      console.error(
        `[DocumentRenderer] no adapter is registered — side-effect-import one ` +
          `before rendering (e.g. import '@crafted-design/editor/adapters/shadcn').`,
      )
      return (
        <div role="alert" className={className}>
          <div className="rounded border border-destructive/40 p-4 text-sm text-destructive">
            No adapter is registered.
          </div>
        </div>
      )
    }
    console.warn(
      `[DocumentRenderer] the document's adapter "${requested}" is not ` +
        `registered; rendering with "${fallback.id}" instead. Import ` +
        `'@crafted-design/editor/adapters/${requested}' for a faithful render, ` +
        `or pass the adapter prop to choose explicitly.`,
    )
    adapterId = fallback.id
  }

  const theme = parsed.doc.themeId ? getTheme(parsed.doc.themeId) : undefined
  const dataTheme = theme?.dataThemeValue || undefined

  return (
    <div
      className={[scheme === 'dark' ? 'dark' : '', className ?? '']
        .filter(Boolean)
        .join(' ') || undefined}
      data-theme={dataTheme}
    >
      <RenderBoundary>
        <AdapterProvider adapterId={adapterId}>
          {/* Craft only reads <Frame data> on mount — key the editor by the
              document content so a document prop change remounts and re-
              deserializes (display pages swap documents rarely; full remount
              is the predictable behavior). enabled={false} = the editor's
              preview mode: editing interactions off, runtime behavior on. */}
          <Craft
            key={parsed.doc.craftJson}
            resolver={getResolver()}
            enabled={false}
          >
            <Frame data={parsed.doc.craftJson} />
          </Craft>
        </AdapterProvider>
      </RenderBoundary>
    </div>
  )
}
