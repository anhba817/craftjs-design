import MuiAlert from '@mui/material/Alert'
import MuiAlertTitle from '@mui/material/AlertTitle'
import Snackbar from '@mui/material/Snackbar'
import { createPortal } from 'react-dom'
import { cn } from '@design/sdk'
import type { ToastProps } from '@/registry/components/toast'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import { useOverlayStageTarget } from '@design/sdk'
import { OverlayCard } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const INTENT_SEVERITY = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const

// MUI Toast — editor portals into the OverlayStage; runtime uses
// MuiSnackbar + MuiAlert (anchor + portal + transitions).
export function MaterialToast({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { title, description, intent, name, defaultOpen } = props as ToastProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Toast" name={name}>
        <MuiAlert
          ref={rootRef as never}
          severity={INTENT_SEVERITY[intent]}
          variant="standard"
          className={cn(className)}
          style={inlineStyle}
        >
          <MuiAlertTitle>{title}</MuiAlertTitle>
          {description}
        </MuiAlert>
      </OverlayCard>,
      stageTarget,
    )
  }

  return (
    <Snackbar
      open={isOpen}
      onClose={() => setOpen(name, false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <MuiAlert
        ref={rootRef as never}
        severity={INTENT_SEVERITY[intent]}
        variant="standard"
        onClose={() => setOpen(name, false)}
        className={cn(className)}
        style={inlineStyle}
      >
        <MuiAlertTitle>{title}</MuiAlertTitle>
        {description}
      </MuiAlert>
    </Snackbar>
  )
}
