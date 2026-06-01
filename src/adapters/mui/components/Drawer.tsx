import MuiDrawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
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

// MUI Drawer — editor portals a preview into the OverlayStage; runtime
// uses real MuiDrawer (anchor + backdrop + sliding).
export function MaterialDrawer({
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

  return (
    <MuiDrawer
      anchor={side}
      open={isOpen}
      onClose={() => setOpen(name, false)}
      slotProps={{
        paper: { sx: isHorizontal ? { width: dim } : { height: dim } },
      }}
    >
      <div
        ref={rootRef as never}
        className={cn('relative h-full w-full p-4', className)}
        style={inlineStyle}
      >
        <IconButton
          aria-label="Close"
          onClick={() => setOpen(name, false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <X size={14} aria-hidden />
        </IconButton>
        {children}
      </div>
    </MuiDrawer>
  )
}
