import type { AdapterRenderProps } from '@design/sdk'
import {
  ChakraCardBody,
  ChakraCardFooter,
  ChakraCardHeader,
  ChakraCardRoot,
} from '../lib'

// Pattern B impl — consumes the per-slot maps from CanonicalNode. Each named
// canvas slot (header/body/footer) lands in its own Chakra subregion.
export function ChakraCardImpl({
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  return (
    <ChakraCardRoot
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <ChakraCardHeader
        className={composedClasses.header}
        style={composedInlineStyles.header}
      >
        {slotChildren.header}
      </ChakraCardHeader>
      <ChakraCardBody
        className={composedClasses.body}
        style={composedInlineStyles.body}
      >
        {slotChildren.body}
      </ChakraCardBody>
      <ChakraCardFooter
        className={composedClasses.footer}
        style={composedInlineStyles.footer}
      >
        {slotChildren.footer}
      </ChakraCardFooter>
    </ChakraCardRoot>
  )
}
