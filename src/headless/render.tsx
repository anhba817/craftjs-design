// Phase 21 Group B — headless static rendering: document → HTML string, no
// browser, no Craft. The walker maps the serialized node tree to a React tree
// of adapter impls — mirroring CanonicalNode's prop assembly exactly (the
// pure `buildNodeRenderModel` + the adapter classMap + the same
// AdapterRenderProps shape) — and `renderToStaticMarkup`s it.
//
// Faithfulness notes (also in the MCP/docs):
//   - Structure-faithful, not pixel-faithful: the output carries the
//     document's Tailwind classes; styled fidelity needs the editor
//     stylesheet alongside.
//   - Overlays (modal/drawer/toast/…) render their RUNTIME closed state —
//     i.e. nothing inline — exactly like a freshly-loaded page.
//   - The adapter must be registered by the caller (the dependency-free HTML
//     adapter is the intended target: `import '@crafted-design/editor/adapters/html'`).
import { Fragment, createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAdapter } from '@/adapters/AdapterContext'
import { buildNodeRenderModel } from '@/craft/nodeRenderModel'
import { parseDocumentJson } from '@/persistence/importDocument'
import type { EditorDocument } from '@/persistence/schema'
import { getComponentByDisplayName, getComponent } from '@/registry/registry'
import type { Adapter, ClassMapResult } from '@/adapters/types'
import { getTheme } from '@/themes/registry'
import type { SerializedCraftNode, SerializedNodeMap } from './build'

function resolvedNameOf(type: SerializedCraftNode['type']): string {
  return typeof type === 'string' ? type : type.resolvedName
}

function renderNode(
  nodes: SerializedNodeMap,
  id: string,
  adapter: Adapter,
): ReactNode {
  const node = nodes[id]
  if (!node) return null

  const name = resolvedNameOf(node.type)

  // Slot containers (<Element is="div"> wrappers) render as the same plain
  // div they are at runtime.
  if (typeof node.type === 'string') {
    return createElement(
      node.type,
      { key: id, ...(node.props as Record<string, unknown>) },
      ...node.nodes.map((child) => renderNode(nodes, child, adapter)),
    )
  }

  const def =
    (typeof node.props.canonicalId === 'string'
      ? getComponent(node.props.canonicalId)
      : undefined) ?? getComponentByDisplayName(name)
  if (!def) {
    return createElement('div', {
      key: id,
      'data-unknown-canonical': name,
    })
  }

  const Impl = adapter.components[def.id]
  if (!Impl) {
    // Same contract as the editor: a missing impl is a labeled placeholder.
    return createElement(
      'div',
      { key: id, 'data-missing-adapter': adapter.id, role: 'note' },
      `${def.displayName} has no ${adapter.displayName} implementation`,
    )
  }

  const nodeProps = (node.props.nodeProps ?? {}) as Record<string, unknown>
  const style = (node.props.style ?? { classes: {} }) as Parameters<
    typeof buildNodeRenderModel
  >[2]

  // Identical assembly to CanonicalNode (minus editor wiring like rootRef).
  const {
    composedClasses,
    composedInlineStyles,
    responsiveInlineCSS,
    rootClassString,
    canvasSlots,
    usesSlotChildren,
  } = buildNodeRenderModel(def, nodeProps, style, null)

  const styleProps: ClassMapResult = adapter.classMap
    ? adapter.classMap(rootClassString, def.id)
    : { className: rootClassString }
  const rootInline = composedInlineStyles.root
  const inlineStyle = rootInline
    ? { ...styleProps.inlineStyle, ...rootInline }
    : styleProps.inlineStyle

  // Pattern B: hand the impl one rendered container per canvas slot.
  let slotChildren: Record<string, ReactNode> | undefined
  if (usesSlotChildren) {
    slotChildren = {}
    for (const slot of canvasSlots) {
      const linkedId = node.linkedNodes?.[slot]
      slotChildren[slot] = linkedId
        ? renderNode(nodes, linkedId, adapter)
        : createElement('div', { key: slot, className: 'canvas-slot' })
    }
  }

  const children = node.nodes.map((child) => renderNode(nodes, child, adapter))

  return createElement(
    Fragment,
    { key: id },
    responsiveInlineCSS ? createElement('style', null, responsiveInlineCSS) : null,
    createElement(
      Impl,
      {
        canonicalId: def.id,
        props: nodeProps,
        style,
        className: styleProps.className,
        sx: styleProps.sx,
        inlineStyle,
        composedClasses,
        composedInlineStyles,
        slotChildren,
      },
      ...children,
    ),
  )
}

export interface RenderDocumentOptions {
  /** Adapter to render with. Defaults to the envelope's `adapterId`. */
  adapterId?: string
}

/**
 * Render a document to a static HTML string (no browser, no Craft). The
 * adapter must be registered by the caller; the envelope's theme/colorMode
 * are reflected as `data-theme` / `dark` on the wrapper div.
 */
export function renderDocumentToHtml(
  doc: EditorDocument | string,
  options: RenderDocumentOptions = {},
): string {
  const envelope = parseDocumentJson(
    typeof doc === 'string' ? doc : JSON.stringify(doc),
  )
  const adapterId = options.adapterId ?? envelope.adapterId
  const adapter = getAdapter(adapterId)
  if (!adapter) {
    throw new Error(
      `adapter "${adapterId}" is not registered — import it first (e.g. @crafted-design/editor/adapters/${adapterId})`,
    )
  }
  const nodes = JSON.parse(envelope.craftJson) as SerializedNodeMap
  const theme = envelope.themeId ? getTheme(envelope.themeId) : undefined
  const tree = createElement(
    'div',
    {
      'data-theme': theme?.dataThemeValue || undefined,
      className: envelope.colorMode === 'dark' ? 'dark' : undefined,
    },
    renderNode(nodes, 'ROOT', adapter),
  )
  return renderToStaticMarkup(tree)
}

/**
 * A compact, indented text outline of the document tree (id · canonical ·
 * salient prop) — cheap for an agent to read between edits.
 */
export function outlineDocument(doc: EditorDocument | string): string {
  const envelope = parseDocumentJson(
    typeof doc === 'string' ? doc : JSON.stringify(doc),
  )
  const nodes = JSON.parse(envelope.craftJson) as SerializedNodeMap
  const lines: string[] = []
  const salient = (p: Record<string, unknown>): string => {
    const v = p.content ?? p.label ?? p.text ?? p.src ?? p.href
    return typeof v === 'string' && v ? ` ${JSON.stringify(v.slice(0, 60))}` : ''
  }
  const walk = (id: string, depth: number, slotLabel?: string) => {
    const node = nodes[id]
    if (!node) return
    const pad = '  '.repeat(depth)
    const slot = slotLabel ? `[${slotLabel}] ` : ''
    if (typeof node.type === 'string') {
      // Slot container — fold into the label, recurse into its children.
      for (const child of node.nodes) walk(child, depth, slotLabel)
      return
    }
    const canonical =
      (typeof node.props.canonicalId === 'string' && node.props.canonicalId) ||
      resolvedNameOf(node.type)
    lines.push(
      `${pad}${slot}${id} · ${canonical}${salient(
        (node.props.nodeProps ?? {}) as Record<string, unknown>,
      )}`,
    )
    for (const child of node.nodes) walk(child, depth + 1)
    for (const [slotKey, linkedId] of Object.entries(node.linkedNodes ?? {})) {
      const linked = nodes[linkedId]
      if (!linked) continue
      if (typeof linked.type === 'string') {
        // Plain slot container: list its children under the slot label.
        if (linked.nodes.length === 0) {
          lines.push(`${'  '.repeat(depth + 1)}[${slotKey}] (empty)`)
        }
        for (const child of linked.nodes) walk(child, depth + 1, slotKey)
      } else {
        walk(linkedId, depth + 1, slotKey)
      }
    }
  }
  walk('ROOT', 0)
  return lines.join('\n')
}
