import { Card } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

// Pattern B multi-canvas Card. Chakra v3's Card is a compound component:
// Card.Root / Card.Header / Card.Body / Card.Footer. We render the
// CanonicalNode-supplied slotChildren wrappers into each region so each
// region is its own drop zone.
export function ChakraCardImpl({
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  return (
    <Card.Root
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <Card.Header
        className={composedClasses.header}
        style={composedInlineStyles.header}
      >
        {slotChildren.header}
      </Card.Header>
      <Card.Body
        className={composedClasses.body}
        style={composedInlineStyles.body}
      >
        {slotChildren.body}
      </Card.Body>
      <Card.Footer
        className={composedClasses.footer}
        style={composedInlineStyles.footer}
      >
        {slotChildren.footer}
      </Card.Footer>
    </Card.Root>
  )
}
