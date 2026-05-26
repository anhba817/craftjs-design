import { Text } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'
import { EditableText, useStartTextEdit } from '@design/sdk'

export function ChakraTextImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { content } = props as { content: string }
  const startEdit = useStartTextEdit()
  return (
    <Text
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={content} propPath="content" multiline />
    </Text>
  )
}
