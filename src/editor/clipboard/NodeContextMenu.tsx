import { Element, useEditor } from '@craftjs/core'
import { ContextMenu } from 'radix-ui'
import {
  Bell,
  Bookmark,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Copy as CopyIcon,
  Group,
  MessageSquare,
  PanelRightOpen,
  Scissors,
  Square,
  Trash2,
} from 'lucide-react'
import { getResolver } from '../../craft/resolver'
import { getComponent } from '../../registry/registry'
import { useEditorStore } from '@/state/editorStore'
import { useClipboardActions } from './useClipboardActions'
import type { ReactNode } from 'react'

// Phase 11 § 3.12 — right-click context menu on canvas nodes.
//
// Phase 13 § 5.3 adds an "Attach overlay" submenu for trigger
// components (Button) that creates a hidden overlay canonical
// (Modal / Drawer / Toast / Tooltip / Popover) parented to ROOT,
// auto-generates a unique `name`, links it into the trigger's
// `triggers: string[]`, and selects the new overlay so it appears in
// the OverlayStage with focus.

interface NodeContextMenuProps {
  children: ReactNode
}

const OVERLAY_KINDS = [
  { id: 'modal', displayName: 'Modal', icon: Square, label: 'Modal' },
  { id: 'drawer', displayName: 'Drawer', icon: PanelRightOpen, label: 'Drawer' },
  { id: 'toast', displayName: 'Toast', icon: Bell, label: 'Toast' },
  { id: 'tooltip', displayName: 'Tooltip', icon: MessageSquare, label: 'Tooltip' },
  { id: 'popover', displayName: 'Popover', icon: Bookmark, label: 'Popover' },
] as const

// Triggerable components — every canonical that opted into the
// `triggers: string[]` prop. Kept in sync with `TRIGGERABLE_IDS` in
// `built-in-panels.ts`.
const TRIGGERABLE_DISPLAY_NAMES = new Set([
  'Button',
  'Icon',
  'Avatar',
  'Badge',
  'Image',
  'Link',
  'Nav Item',
  'Card',
])

export function NodeContextMenu({ children }: NodeContextMenuProps) {
  const { actions, query, selectedId, selectedDisplayName } = useEditor(
    (state) => {
      const ids = state.events.selected
        ? Array.from(state.events.selected)
        : []
      const id = (ids[0] as string | undefined) ?? null
      const dn = id ? (state.nodes[id]?.data.displayName as string | undefined) : undefined
      return { selectedId: id, selectedDisplayName: dn ?? null }
    },
  )
  const { copy, cut, paste, duplicate } = useClipboardActions()
  const clipboard = useEditorStore((s) => s.clipboard)

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const startEl = event.target as HTMLElement | null
    if (!startEl) return
    const nodeEl = startEl.closest('[data-craft-node-id]') as HTMLElement | null
    if (!nodeEl) return
    const nodeId = nodeEl.getAttribute('data-craft-node-id')
    if (!nodeId) return
    if (selectedId !== nodeId) {
      actions.selectNode(nodeId)
    }
  }

  const getTarget = (): string | null => selectedId

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
    actions.move(targetId, wrapperNode.id, 0)
  }

  // Phase 13 § 5.3 — attach an overlay to the selected trigger.
  // Creates the overlay node at ROOT with a unique `name`, appends
  // the name to the trigger's `triggers` array, selects the new
  // overlay so the OverlayStage focuses on it.
  const handleAttachOverlay = (kind: typeof OVERLAY_KINDS[number]) => {
    const targetId = getTarget()
    if (!targetId) return
    const def = getComponent(kind.id)
    if (!def) return
    const resolver = getResolver()
    const Bound = resolver[kind.displayName]
    if (!Bound) return

    // Generate a unique `name` across all overlay nodes in the doc so
    // triggers don't collide.
    const taken = new Set<string>()
    const allNodes = query.getNodes()
    for (const node of Object.values(allNodes)) {
      const dn = node.data.displayName as string | undefined
      if (
        dn &&
        (OVERLAY_KINDS as readonly { displayName: string }[]).some(
          (k) => k.displayName === dn,
        )
      ) {
        const nm = (node.data.props as { nodeProps?: { name?: string } })
          .nodeProps?.name
        if (nm) taken.add(nm)
      }
    }
    let candidate: string = kind.id
    let n = 0
    while (taken.has(candidate)) {
      n++
      candidate = `${kind.id}-${n}`
    }

    const nodeProps = { ...def.defaults.props, name: candidate }
    const element = (
      <Element
        is={Bound}
        canvas={def.isCanvas}
        nodeProps={nodeProps}
        style={def.defaults.style}
      />
    )
    const tree = query.parseReactElement(element).toNodeTree()
    actions.addNodeTree(tree, 'ROOT')

    // Append to the trigger's triggers array.
    actions.setProp(
      targetId,
      (p: { nodeProps?: { triggers?: string[] } }) => {
        if (!p.nodeProps) return
        const existing = p.nodeProps.triggers ?? []
        p.nodeProps.triggers = [...existing, candidate]
      },
    )

    // Select the new overlay so the user immediately sees it in the
    // OverlayStage.
    actions.selectNode(tree.rootNodeId)
  }

  const hasSelection = getTarget() !== null
  const targetIsRoot = getTarget() === 'ROOT'
  const canCutCopy = hasSelection && !targetIsRoot
  const canPaste = clipboard !== null
  const canWrap = canCutCopy
  const canAttachOverlay =
    hasSelection &&
    !targetIsRoot &&
    selectedDisplayName !== null &&
    TRIGGERABLE_DISPLAY_NAMES.has(selectedDisplayName)

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="contents" onContextMenu={handleContextMenu}>
          {children}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[12rem] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
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
          {/* Phase 13 § 5.3 — Attach overlay (only for triggerable
              components). Submenu lists every overlay canonical;
              picking one creates it parented to ROOT and links it
              into the trigger's `triggers` array. */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger
              disabled={!canAttachOverlay}
              className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
            >
              <PanelRightOpen size={12} aria-hidden /> Attach overlay
              <ChevronRight size={12} aria-hidden className="ml-auto" />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="z-50 min-w-[10rem] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
                {OVERLAY_KINDS.map((kind) => {
                  const Icon = kind.icon
                  return (
                    <ContextMenu.Item
                      key={kind.id}
                      onSelect={() => handleAttachOverlay(kind)}
                      className="flex cursor-default items-center gap-2 rounded px-2 py-1 outline-none data-[highlighted]:bg-muted"
                    >
                      <Icon size={12} aria-hidden /> {kind.label}
                    </ContextMenu.Item>
                  )
                })}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
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
