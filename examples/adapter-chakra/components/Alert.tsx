import { Alert } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

const INTENT_TO_STATUS: Record<
  string,
  'info' | 'success' | 'warning' | 'error' | 'neutral'
> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  destructive: 'error',
}

export function ChakraAlertImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { intent, title, description } = props as {
    intent: string
    title: string
    description: string
  }
  return (
    <Alert.Root
      ref={rootRef as never}
      status={INTENT_TO_STATUS[intent] ?? 'info'}
      className={className}
      style={inlineStyle}
    >
      <Alert.Indicator />
      <Alert.Content>
        {title ? <Alert.Title>{title}</Alert.Title> : null}
        {description ? <Alert.Description>{description}</Alert.Description> : null}
      </Alert.Content>
    </Alert.Root>
  )
}
