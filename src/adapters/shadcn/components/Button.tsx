import { useNode } from '@craftjs/core'
import { Button as ShadcnButtonImpl } from '@/components/ui/button'
import { EditableText } from '@/editor/text-edit/EditableText'
import type { ButtonProps } from '@/registry/components/button'
import { useEditorStore } from '@/state/editorStore'
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
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)
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
        setEditingTextNode(id)
      }}
    >
      <EditableText text={label} propPath="label" />
    </ShadcnButtonImpl>,
  )
}
