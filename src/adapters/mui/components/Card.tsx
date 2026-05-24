import MuiCard from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import type { AdapterRenderProps } from '../../types'

export function MaterialCard({
  props,
  children,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
}: AdapterRenderProps) {
  const { title, description, showFooter, footerText } = props as {
    title: string
    description: string
    showFooter: boolean
    footerText: string
  }
  return (
    <MuiCard
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <CardHeader
        title={title}
        subheader={description || undefined}
        className={composedClasses.header}
        style={composedInlineStyles.header}
      />
      <CardContent
        className={composedClasses.body}
        style={composedInlineStyles.body}
      >
        {children}
      </CardContent>
      {showFooter && (
        <CardActions
          className={composedClasses.footer}
          style={composedInlineStyles.footer}
        >
          {footerText}
        </CardActions>
      )}
    </MuiCard>
  )
}
