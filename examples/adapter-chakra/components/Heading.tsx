import { Heading } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'
import { EditableText, useStartTextEdit } from '@design/sdk'

type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
const LEVEL_TO_SIZE: Record<string, HeadingSize> = {
  '1': '4xl',
  '2': '2xl',
  '3': 'xl',
  '4': 'lg',
  '5': 'md',
  '6': 'sm',
}

export function ChakraHeadingImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: string; content: string }
  const startEdit = useStartTextEdit()
  return (
    <Heading
      ref={rootRef as never}
      as={`h${level}` as 'h1'}
      size={LEVEL_TO_SIZE[level] ?? 'xl'}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={content} propPath="content" />
    </Heading>
  )
}
