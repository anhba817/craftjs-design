import { useNode } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.11 — public hook for adapter impls to open inline
// edit mode on their text node. Adapter impls call this in their
// onDoubleClick handler. Resolves the Craft node id via useNode so
// the adapter doesn't need to thread it through props.
//
// Why exposed as a hook (not direct editorStore access): adapter
// authors should not need to import the editor's internal store.
// The SDK boundary policy explicitly excludes editorStore from
// the public surface — this hook is the supported channel for the
// one capability adapter impls need (entering inline edit mode).

export function useStartTextEdit(): () => void {
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)
  return () => setEditingTextNode(id)
}
