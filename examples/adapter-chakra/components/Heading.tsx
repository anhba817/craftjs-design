import type { AdapterRenderProps } from '@design/sdk'
import { ChakraHeading } from '../lib'

const LEVEL_TO_SIZE: Record<string, 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'> = {
  '1': '3xl',
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
  return (
    <ChakraHeading
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      size={LEVEL_TO_SIZE[level] ?? 'lg'}
      as={`h${level}` as 'h2'}
    >
      {content}
    </ChakraHeading>
  )
}
