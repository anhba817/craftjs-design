// Phase 21 — whole-document validation for headless consumers. Layers:
//   1. envelope shape (zod documentSchema),
//   2. node-map structure (ROOT exists; parent/child/linkedNodes integrity),
//   3. semantics (per-node props/style vs the canonical registry — reuses the
//      editor's own lenient validateDocumentSemantics).
// Errors mean the editor may refuse or mis-load the document; warnings mean
// it loads but something is off (unknown canonical, bad prop value, …).
import { documentSchema, type EditorDocument } from '@/persistence/schema'
import { validateDocumentSemantics } from '@/persistence/documentSemantics'
import type { SerializedCraftNode, SerializedNodeMap } from './build'

export interface DocumentIssue {
  severity: 'error' | 'warning'
  nodeId?: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  issues: DocumentIssue[]
}

export function validateDocument(doc: EditorDocument): ValidationResult {
  const issues: DocumentIssue[] = []

  // 1. Envelope.
  const envelope = documentSchema.safeParse(doc)
  if (!envelope.success) {
    for (const i of envelope.error.issues) {
      issues.push({
        severity: 'error',
        message: `envelope ${i.path.join('.') || '(root)'}: ${i.message}`,
      })
    }
    return { ok: false, issues }
  }

  // 2. Structure.
  let nodes: SerializedNodeMap
  try {
    const parsed = JSON.parse(doc.craftJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object map')
    }
    nodes = parsed as SerializedNodeMap
  } catch {
    issues.push({ severity: 'error', message: 'craftJson is not a JSON node map' })
    return { ok: false, issues }
  }
  if (!nodes['ROOT']) {
    issues.push({ severity: 'error', message: 'node map has no ROOT node' })
  }

  const reachable = new Set<string>()
  const visit = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    const node = nodes[id] as SerializedCraftNode | undefined
    if (!node) return
    for (const child of node.nodes ?? []) {
      if (!nodes[child]) {
        issues.push({
          severity: 'error',
          nodeId: id,
          message: `child "${child}" does not exist`,
        })
        continue
      }
      if (nodes[child].parent !== id) {
        issues.push({
          severity: 'error',
          nodeId: child,
          message: `parent pointer is "${nodes[child].parent}" but "${id}" lists it as a child`,
        })
      }
      visit(child)
    }
    for (const [slot, linked] of Object.entries(node.linkedNodes ?? {})) {
      if (!nodes[linked]) {
        issues.push({
          severity: 'error',
          nodeId: id,
          message: `linked node "${linked}" (slot "${slot}") does not exist`,
        })
        continue
      }
      if (nodes[linked].parent !== id) {
        issues.push({
          severity: 'error',
          nodeId: linked,
          message: `slot container's parent pointer is "${nodes[linked].parent}" but it is linked from "${id}"`,
        })
      }
      visit(linked)
    }
  }
  if (nodes['ROOT']) visit('ROOT')
  for (const id of Object.keys(nodes)) {
    if (!reachable.has(id)) {
      issues.push({
        severity: 'warning',
        nodeId: id,
        message: 'node is not reachable from ROOT (orphan)',
      })
    }
  }

  // 3. Semantics (registry-aware; the editor's own lenient checker).
  for (const issue of validateDocumentSemantics(doc.craftJson)) {
    issues.push({
      severity: 'warning',
      nodeId: issue.nodeId,
      message: issue.message,
    })
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues }
}
