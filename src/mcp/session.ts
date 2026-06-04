// Phase 21 Group C — the MCP session: a single in-progress EditorDocument an
// AI builds incrementally. Pure (no MCP SDK, no stdio) so it's unit-testable;
// the server (server.ts) wires these methods to MCP tools. Every mutation
// validates first and never leaves the session in an unparseable state — a
// failed op throws and the prior document stands.
import {
  addNode,
  analyzeDocumentContrast,
  analyzeThemeContrast,
  buildDocument,
  moveNode,
  outlineDocument,
  parseDocumentJson,
  removeNode,
  renderDocumentToHtml,
  updateNodeProps,
  updateNodeStyle,
  validateDocument,
  type DocumentContrastReport,
  type EditorDocument,
  type HeadlessNodeSpec,
  type ThemeContrastReport,
} from '@/headless'
import type { NodeStyle } from '@/registry/types'
import { getAdapter } from '@/adapters/AdapterContext'

// Renders structural previews with the dependency-free HTML adapter: pure
// (no DOM needed) and always available in a server process, regardless of the
// design system the document targets. Structure-faithful, not pixel-faithful.
const PREVIEW_ADAPTER = 'html'

export class DesignSession {
  private doc: EditorDocument

  constructor() {
    this.doc = buildDocument({ root: { canonical: 'box' } })
  }

  /** Start fresh (optionally choosing adapter/theme/color mode + root). */
  create(opts: {
    adapterId?: string
    themeId?: string
    colorMode?: 'light' | 'dark' | 'system'
    rootCanonical?: string
  }): void {
    this.doc = buildDocument({
      root: { canonical: opts.rootCanonical ?? 'box' },
      adapterId: opts.adapterId,
      themeId: opts.themeId,
      colorMode: opts.colorMode,
    })
  }

  /** Replace the session document from raw envelope JSON (validated + migrated). */
  load(json: string): void {
    this.doc = parseDocumentJson(json)
  }

  reset(): void {
    this.doc = buildDocument({ root: { canonical: 'box' } })
  }

  get document(): EditorDocument {
    return this.doc
  }

  addNode(
    parentId: string,
    spec: HeadlessNodeSpec,
    opts: { slot?: string; index?: number },
  ): string {
    const { document, nodeId } = addNode(this.doc, spec, parentId, opts)
    this.doc = document
    return nodeId
  }

  updateProps(nodeId: string, props: Record<string, unknown>): void {
    this.doc = updateNodeProps(this.doc, nodeId, props)
  }

  updateStyle(nodeId: string, patch: Partial<NodeStyle>): void {
    this.doc = updateNodeStyle(this.doc, nodeId, patch)
  }

  removeNode(nodeId: string): void {
    this.doc = removeNode(this.doc, nodeId)
  }

  moveNode(
    nodeId: string,
    newParentId: string,
    opts: { slot?: string; index?: number },
  ): void {
    this.doc = moveNode(this.doc, nodeId, newParentId, opts)
  }

  setAdapter(adapterId: string): void {
    this.doc = { ...this.doc, adapterId }
  }

  setTheme(themeId: string | undefined): void {
    this.doc = { ...this.doc, themeId }
  }

  validate() {
    return validateDocument(this.doc)
  }

  /** WCAG ratios for the document's theme's semantic token pairs. */
  themeContrast(): ThemeContrastReport {
    return analyzeThemeContrast(this.doc.themeId, this.doc.colorMode ?? 'light')
  }

  /** Deterministic per-text-node contrast (token colors; flags literals). */
  documentContrast(): DocumentContrastReport {
    return analyzeDocumentContrast(this.doc)
  }

  outline(): string {
    return outlineDocument(this.doc)
  }

  /** Static HTML preview via the HTML adapter (structure-faithful). */
  renderHtml(): string {
    if (!getAdapter(PREVIEW_ADAPTER)) {
      throw new Error(
        `the "${PREVIEW_ADAPTER}" adapter is not registered — the MCP server must import it`,
      )
    }
    return renderDocumentToHtml(this.doc, { adapterId: PREVIEW_ADAPTER })
  }

  /** Compact orientation block returned after each mutation. */
  status(): string {
    const result = this.validate()
    const errors = result.issues.filter((i) => i.severity === 'error')
    const warnings = result.issues.filter((i) => i.severity === 'warning')
    const lines = [
      `adapter: ${this.doc.adapterId}${this.doc.themeId ? ` · theme: ${this.doc.themeId}` : ''}${this.doc.colorMode ? ` · ${this.doc.colorMode}` : ''}`,
      result.ok ? 'valid: yes' : 'valid: NO (errors below)',
    ]
    if (errors.length) {
      lines.push(
        'errors:',
        ...errors.map((i) => `  - ${i.nodeId ? `[${i.nodeId}] ` : ''}${i.message}`),
      )
    }
    if (warnings.length) {
      lines.push(`warnings: ${warnings.length}`)
    }
    lines.push('outline:', this.outline())
    return lines.join('\n')
  }
}
