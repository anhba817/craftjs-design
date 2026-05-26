import { useEditor } from '@craftjs/core'
import { ContextMenu } from 'radix-ui'
import {
  ClipboardCopy,
  ClipboardPaste,
  Copy as CopyIcon,
  Group,
  Scissors,
  Trash2,
} from 'lucide-react'
import { useEditorStore } from '@/state/editorStore'
import { useClipboardActions } from './useClipboardActions'
import type { ReactNode } from 'react'

// Phase 11 § 3.12 — right-click context menu on canvas nodes.
//
// Wraps each canvas region so onContextMenu on any node opens a menu
// targeted at the clicked node. Items: Cut / Copy / Paste / Duplicate
// / Delete + the structural Wrap-in-Stack / Wrap-in-Box helpers.
//
// "Wrap in" creates a new wrapper canonical at the target's position,
// then re-parents the target under it. A single Craft action chain via
// addNodeTree + move so undo rolls it back as one step.
//
// Keyboard-accessible: Radix's ContextMenu handles arrow / Enter /
// Escape internally. The menu also responds to Cmd-equivalent
// shortcuts shown as right-aligned hint text on each item.

interface NodeContextMenuProps {
  children: ReactNode
}

export function NodeContextMenu({ children }: NodeContextMenuProps) {
  const { actions, query } = useEditor()
  const { copy, cut, paste, duplicate } = useClipboardActions()
  const clipboard = useEditorStore((s) => s.clipboard)

  // Phase 11 — right-click should ALWAYS select the clicked node before
  // the menu opens, otherwise the user's first right-click on a fresh
  // document (no prior selection) gets every item disabled because
  // canCutCopy / canWrap key off selection. Craft.js's default
  // connector handles left-click selection but doesn't fire on
  // contextmenu, so we resolve the target here by walking up from
  // event.target to the nearest [data-craft-node-id] (stamped on every
  // canvas node by CanonicalNode.attachRef).
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const startEl = event.target as HTMLElement | null
    if (!startEl) return
    const nodeEl = startEl.closest('[data-craft-node-id]') as HTMLElement | null
    if (!nodeEl) return
    const nodeId = nodeEl.getAttribute('data-craft-node-id')
    if (!nodeId) return
    // Only re-select when the right-click hits a DIFFERENT node from
    // the current selection — avoids redundant Craft dispatches.
    const currentSelection = query.getEvent('selected').first()
    if (currentSelection !== nodeId) {
      actions.selectNode(nodeId)
    }
  }

  // The target node is whatever's currently selected when the user
  // right-clicks. The handleContextMenu above ensures selection is in
  // sync before the menu opens.
  const getTarget = (): string | null => {
    return query.getEvent('selected').first() ?? null
  }

  const handleCopy = () => {
    const id = getTarget()
    if (id) copy(id)
  }

  const handleCut = () => {
    const id = getTarget()
    if (id) cut(id)
  }

  const handlePaste = () => paste()

  const handleDuplicate = () => {
    const id = getTarget()
    if (id) duplicate(id)
  }

  const handleDelete = () => {
    const id = getTarget()
    if (id && id !== 'ROOT') actions.delete(id)
  }

  // "Wrap in X" creates a wrapper canonical at the target's position
  // and reparents the target under it. Uses the editor's resolver to
  // build the wrapper element from the canonical's defaults.
  const handleWrap = (wrapperCanonicalId: 'stack' | 'box') => {
    const targetId = getTarget()
    if (!targetId || targetId === 'ROOT') return
    const target = query.node(targetId).get()
    const parentId = target.data.parent
    if (!parentId) return

    const parent = query.node(parentId).get()
    const siblings = parent.data.nodes ?? []
    const sourceIndex = siblings.indexOf(targetId)
    if (sourceIndex < 0) return

    // Build the wrapper from the canonical registry's defaults. We
    // can't import the registry directly inside this file (boundary
    // discipline), but parseSerializedNode handles a minimal
    // SerializedNode shape — type.resolvedName + props + custom +
    // displayName. The resolver inside Craft.js maps that back to
    // the bound React component.
    const wrapperNodeData: Parameters<
      typeof query.parseSerializedNode
    >[0] = {
      type: { resolvedName: wrapperCanonicalId === 'stack' ? 'Stack' : 'Box' },
      isCanvas: true,
      props:
        wrapperCanonicalId === 'stack'
          ? { direction: 'vertical', gap: '4' }
          : {},
      displayName: wrapperCanonicalId === 'stack' ? 'Stack' : 'Box',
      custom: {},
      parent: parentId,
      hidden: false,
      nodes: [],
      linkedNodes: {},
    }
    const wrapperNode = query
      .parseSerializedNode(wrapperNodeData)
      .toNode()
    actions.add(wrapperNode, parentId, sourceIndex)
    // After add(), wrapperNode.id is the actual id. Move the target
    // into it as the first child.
    actions.move(targetId, wrapperNode.id, 0)
  }

  const hasSelection = getTarget() !== null
  const targetIsRoot = getTarget() === 'ROOT'
  const canCutCopy = hasSelection && !targetIsRoot
  const canPaste = clipboard !== null
  const canWrap = canCutCopy

  return (
    <ContextMenu.Root>
      {/* asChild slotted into <CanvasKeyboardRegion> previously, but
          that's a function component without forwarded refs — Radix's
          Slot then can't attach the contextmenu listener and right-
          click silently does nothing. Wrapping children in a real
          <div> that the Trigger owns fixes it. `contents` keeps the
          wrapper layout-transparent so the canvas's flex sizing isn't
          disturbed. */}
      <ContextMenu.Trigger asChild>
        <div className="contents" onContextMenu={handleContextMenu}>
          {children}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          // Tailwind classes mirror the existing shadcn Popover style
          // so the menu fits the editor's visual language.
          className="z-50 min-w-[12rem] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none"
        >
          <ContextMenu.Item
            disabled={!canCutCopy}
            onSelect={handleCut}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <Scissors size={12} aria-hidden /> Cut
            <span className="ml-auto text-[10px] text-muted-foreground">⌘X</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canCutCopy}
            onSelect={handleCopy}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <ClipboardCopy size={12} aria-hidden /> Copy
            <span className="ml-auto text-[10px] text-muted-foreground">⌘C</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canPaste}
            onSelect={handlePaste}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <ClipboardPaste size={12} aria-hidden /> Paste
            <span className="ml-auto text-[10px] text-muted-foreground">⌘V</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canCutCopy}
            onSelect={handleDuplicate}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <CopyIcon size={12} aria-hidden /> Duplicate
            <span className="ml-auto text-[10px] text-muted-foreground">⌘D</span>
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            disabled={!canWrap}
            onSelect={() => handleWrap('stack')}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <Group size={12} aria-hidden /> Wrap in Stack
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canWrap}
            onSelect={() => handleWrap('box')}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
          >
            <Group size={12} aria-hidden /> Wrap in Box
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            disabled={!canCutCopy}
            onSelect={handleDelete}
            className="flex cursor-default items-center gap-2 rounded px-2 py-1 text-destructive outline-none data-[highlighted]:bg-destructive/10 data-[disabled]:opacity-40"
          >
            <Trash2 size={12} aria-hidden /> Delete
            <span className="ml-auto text-[10px] text-muted-foreground">Del</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
