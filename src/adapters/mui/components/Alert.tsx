import MuiAlert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { AlertProps } from '@/registry/components/alert'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// MUI's Alert ships with the four severities our canonical exposes —
// direct 1:1 mapping. Runtime open/close via the overlay runtime store
// (Alert defaults open: most alerts are persistent banners).
export function MaterialAlert({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { intent, title, description, name, defaultOpen } = props as AlertProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  if (!editing && !isOpen) return null
  return (
    <MuiAlert
      ref={rootRef as never}
      severity={intent}
      onClose={editing ? undefined : () => setOpen(name, false)}
      className={className}
      style={inlineStyle}
    >
      <AlertTitle>{title}</AlertTitle>
      {description}
    </MuiAlert>
  )
}
