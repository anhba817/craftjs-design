import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { cn } from '@design/sdk'
import type { CardProps } from '@/registry/components/card'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

// Phase 6 multi-canvas Card; Phase 13 § 5.3 adds overlay trigger linking
// so a card can act as the trigger for a detail modal (etc.).
export function ShadcnCard({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { triggers } = props as CardProps
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <Card
      ref={rootRef as never}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', composedClasses.root)}
      style={composedInlineStyles.root}
    >
      <CardHeader
        className={cn(composedClasses.header)}
        style={composedInlineStyles.header}
      >
        {slotChildren.header}
      </CardHeader>
      <CardContent
        className={cn(composedClasses.body)}
        style={composedInlineStyles.body}
      >
        {slotChildren.body}
      </CardContent>
      <CardFooter
        className={cn(composedClasses.footer)}
        style={composedInlineStyles.footer}
      >
        {slotChildren.footer}
      </CardFooter>
    </Card>,
  )
}
