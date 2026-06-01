import { Button as ShadcnButtonImpl } from '@/components/ui/button'
import { EditableText } from '@design/sdk'
import type { ButtonProps } from '@/registry/components/button'
import { useStartTextEdit } from '@design/sdk'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_VARIANT = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
} as const

export function ShadcnButton({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled, triggers } = props as ButtonProps
  const startEdit = useStartTextEdit()
  const { onClick, wrap } = useShadcnTriggers(triggers)

  return wrap(
    <ShadcnButtonImpl
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={label} propPath="label" />
    </ShadcnButtonImpl>,
  )
}
