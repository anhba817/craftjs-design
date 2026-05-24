import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// Pattern B impl — consumes composedClasses / composedInlineStyles per slot.
// Each named slot (root/header/body/footer) gets its own composed class
// string from CanonicalNode. The Inspector's SlotPicker toggles which one
// the user is currently editing.
export function ShadcnCard({
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
    <Card
      ref={rootRef as never}
      className={cn(composedClasses.root)}
      style={composedInlineStyles.root}
    >
      <CardHeader
        className={cn(composedClasses.header)}
        style={composedInlineStyles.header}
      >
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent
        className={cn(composedClasses.body)}
        style={composedInlineStyles.body}
      >
        {children}
      </CardContent>
      {showFooter && (
        <CardFooter
          className={cn(composedClasses.footer)}
          style={composedInlineStyles.footer}
        >
          {footerText}
        </CardFooter>
      )}
    </Card>
  )
}
