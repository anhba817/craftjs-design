import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@design/sdk'
import type { ModalProps } from '@/registry/components/modal'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import { useOverlayStageTarget } from '@design/sdk'
import { OverlayCard } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const SIZE_CLASS: Record<ModalProps['size'], string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  full: 'max-w-full',
}

const SIZE_TO_MUI: Record<ModalProps['size'], 'xs' | 'sm' | 'md' | 'lg'> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  full: 'lg',
}

// MUI Modal — editor portals a preview into the OverlayStage. Runtime
// uses real MuiDialog with its built-in portal + backdrop + esc.
export function MaterialModal({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { title, description, size, name, defaultOpen } = props as ModalProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Modal" name={name}>
        <div
          ref={rootRef as never}
          role="dialog"
          aria-modal="true"
          className={cn('relative w-full', SIZE_CLASS[size], className)}
          style={inlineStyle}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X size={14} aria-hidden />
          </button>
          <div className="space-y-1 pr-6">
            <div className="text-lg font-semibold">{title}</div>
            {description && (
              <div className="text-sm text-muted-foreground">{description}</div>
            )}
          </div>
          <div className="mt-3">{children}</div>
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => setOpen(name, false)}
      maxWidth={SIZE_TO_MUI[size]}
      fullWidth
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          aria-label="Close"
          onClick={() => setOpen(name, false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <X size={14} aria-hidden />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={rootRef as never} className={className} style={inlineStyle}>
        {description && <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>}
        {children}
      </DialogContent>
    </Dialog>
  )
}
