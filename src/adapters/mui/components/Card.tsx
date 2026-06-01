import MuiCard from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { useRef } from 'react'
import { cn } from '@design/sdk'
import type { CardProps } from '@/registry/components/card'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

// MUI's CardHeader's `title` / `subheader` props expect strings — for the
// multi-canvas model we ignore them and render dropped children inside the
// header region directly. MUI's CardHeader does accept arbitrary children (it
// renders them after the title/subheader area), so this works visually.
export function MaterialCard({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { triggers } = props as CardProps
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const { onClick, wrap } = useMuiTriggers(triggers, anchorRef)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <MuiCard
      ref={(el) => {
        anchorRef.current = el as HTMLDivElement | null
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLDivElement | null) => void)(el as HTMLDivElement | null)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLDivElement | null>).current =
            el as HTMLDivElement | null
      }}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', composedClasses.root)}
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
    </MuiCard>,
  )
}
