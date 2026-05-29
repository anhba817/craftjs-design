import { useEditor } from '@craftjs/core'
import { cn } from '@/lib/utils'
import type { ButtonProps } from '@/registry/components/button'

// Phase 13 § 5.3 — Button triggers panel. Lists every overlay
// (Modal / Drawer / Toast / Alert) in the current document with its
// human display name and the value of its `name` prop, and lets the
// user check which ones this button toggles on click.

interface OverlayInfo {
  id: string
  type: string // 'Modal' / 'Drawer' / 'Toast' / 'Alert'
  name: string
}

interface CraftWrapperProps {
  nodeProps: ButtonProps
}

const OVERLAY_DISPLAYNAMES = ['Modal', 'Drawer', 'Toast', 'Alert'] as const

export function ButtonTriggersPanel({
  nodeId,
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot: string
}) {
  const { actions, overlays, triggers } = useEditor((state, query) => {
    const out: OverlayInfo[] = []
    for (const [id, node] of Object.entries(state.nodes)) {
      const dn = node.data.displayName as string | undefined
      if (!dn || !OVERLAY_DISPLAYNAMES.includes(dn as never)) continue
      const overlayName = (
        node.data.props as { nodeProps?: { name?: string } }
      ).nodeProps?.name
      if (!overlayName) continue
      out.push({ id, type: dn, name: overlayName })
    }
    let triggers: string[] = []
    try {
      const node = query.node(nodeId).get()
      triggers =
        (node.data.props as { nodeProps?: ButtonProps }).nodeProps?.triggers ??
        []
    } catch {
      triggers = []
    }
    return { overlays: out, triggers }
  })

  const selected = new Set(triggers)
  const toggle = (overlayName: string) => {
    const next = new Set(selected)
    if (next.has(overlayName)) next.delete(overlayName)
    else next.add(overlayName)
    actions.setProp(nodeId, (p: CraftWrapperProps) => {
      p.nodeProps.triggers = [...next]
    })
  }

  if (overlays.length === 0) {
    return (
      <p className="text-[11px] text-gray-500">
        No overlays in this document. Drop a Modal / Drawer / Toast /
        Alert and give it a name to trigger from this button.
      </p>
    )
  }

  return (
    <section className="space-y-1.5 text-xs">
      <p className="text-[11px] text-gray-500">
        Check the overlays this button should open / close on click
        (runtime only — clicks in editor mode are inert).
      </p>
      {overlays.map((o) => {
        const isOn = selected.has(o.name)
        return (
          <label
            key={o.id}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5',
              isOn ? 'border-primary bg-primary/5' : 'border-gray-200',
            )}
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => toggle(o.name)}
            />
            <span className="font-medium text-gray-700">{o.type}</span>
            <span className="text-gray-500">
              name=<code>{o.name}</code>
            </span>
          </label>
        )
      })}
    </section>
  )
}
