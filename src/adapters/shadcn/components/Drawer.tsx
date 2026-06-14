import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@design/sdk'
import type { DrawerProps } from '@/registry/components/drawer'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import { useOverlayStageTarget } from '@design/sdk'
import { getScopedPortalRoot } from '@design/sdk'
import { OverlayCard } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const SIZE_DIM: Record<DrawerProps['size'], string> = {
  sm: '16rem',
  md: '24rem',
  lg: '32rem',
}

const BORDER_BY_SIDE: Record<DrawerProps['side'], string> = {
  left: 'border-r',
  right: 'border-l',
  top: 'border-b',
  bottom: 'border-t',
}

const SIDE_POSITION: Record<DrawerProps['side'], string> = {
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
}

// Drawer — editor portals a preview into the OverlayStage. Runtime
// portals to <body> with backdrop, anchored to the configured side.
export function ShadcnDrawer({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { side, size, name, defaultOpen } = props as DrawerProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()

  const dim = SIZE_DIM[size]
  const isHorizontal = side === 'left' || side === 'right'

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label={`Drawer · ${side}`} name={name}>
        <div
          ref={rootRef as never}
          role="dialog"
          aria-label="Drawer"
          className={cn('relative bg-card', BORDER_BY_SIDE[side], className)}
          style={{
            ...inlineStyle,
            ...(isHorizontal
              ? { width: '100%', maxWidth: dim, minHeight: '12rem' }
              : { height: dim, width: '100%' }),
          }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X size={14} aria-hidden />
          </button>
          {children}
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onClick={() => setOpen(name, false)}
    >
      <div
        ref={rootRef as never}
        role="dialog"
        aria-label="Drawer"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute bg-card shadow-xl',
          SIDE_POSITION[side],
          BORDER_BY_SIDE[side],
          className,
        )}
        style={{
          ...inlineStyle,
          ...(isHorizontal
            ? { width: dim, height: '100%' }
            : { height: dim, width: '100%' }),
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(name, false)}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent"
        >
          <X size={14} aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    getScopedPortalRoot(),
  )
}
