import MuiCard from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import type { AdapterRenderProps } from '../../types'

// MUI's CardHeader's `title` / `subheader` props expect strings — for the
// multi-canvas model we ignore them and render dropped children inside the
// header region directly. MUI's CardHeader does accept arbitrary children (it
// renders them after the title/subheader area), so this works visually.
export function MaterialCard({
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  return (
    <MuiCard
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <CardHeader
        className={composedClasses.header}
        style={composedInlineStyles.header}
        title={slotChildren.header}
      />
      <CardContent
        className={composedClasses.body}
        style={composedInlineStyles.body}
      >
        {slotChildren.body}
      </CardContent>
      <CardActions
        className={composedClasses.footer}
        style={composedInlineStyles.footer}
      >
        {slotChildren.footer}
      </CardActions>
    </MuiCard>
  )
}
