import { Input as ShadcnInputImpl } from '@/components/ui/input'
import type { AdapterRenderProps } from '../../types'

// Same ref-forwarding workaround as ShadcnButton — see that file's comment.
export function ShadcnInput({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { type, placeholder, value, disabled } = props as {
    type: 'text' | 'email' | 'password' | 'number'
    placeholder: string
    value: string
    disabled: boolean
  }
  return (
    <span ref={rootRef} style={{ display: 'contents' }}>
      <ShadcnInputImpl
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        // readOnly silences React's controlled-component-without-onChange
        // warning. In editor mode users shouldn't be typing into live inputs;
        // the PropsPanel edits the `value` prop directly.
        readOnly
        className={className}
        style={inlineStyle}
      />
    </span>
  )
}
