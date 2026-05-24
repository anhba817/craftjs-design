import MuiAlert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { AdapterRenderProps } from '../../types'

// MUI's Alert ships with the four severities our canonical exposes — direct
// 1:1 mapping. Icons and color treatment come for free from the library.
export function MaterialAlert({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { intent, title, description } = props as {
    intent: 'info' | 'warning' | 'error' | 'success'
    title: string
    description: string
  }
  return (
    <MuiAlert
      ref={rootRef as never}
      severity={intent}
      className={className}
      style={inlineStyle}
    >
      <AlertTitle>{title}</AlertTitle>
      {description}
    </MuiAlert>
  )
}
