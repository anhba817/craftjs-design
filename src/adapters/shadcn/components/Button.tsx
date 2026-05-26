import { useNode } from '@craftjs/core'
import { Button as ShadcnButtonImpl } from '@/components/ui/button'
import { EditableText } from '@/editor/text-edit/EditableText'
import { useEditorStore } from '@/state/editorStore'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_VARIANT = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
} as const

type Intent = keyof typeof INTENT_TO_VARIANT

// Phase 9 — React 19 forwards refs through plain function components as a
// prop, so the `display: contents` wrapper from Phase 1 is no longer needed.
// shadcn's Button spreads `{...props}` onto its inner <button>, which under
// React 19 includes ref → ref attaches to the real DOM button.
export function ShadcnButton({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string
    intent: Intent
    disabled: boolean
  }
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)

  return (
    <ShadcnButtonImpl
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditingTextNode(id)
      }}
    >
      <EditableText text={label} propPath="label" />
    </ShadcnButtonImpl>
  )
}
