import { Input as ShadcnInputImpl } from '@/components/ui/input'
import type { AdapterRenderProps } from '../../types'

// Phase 9 — React 19's ref-as-prop forwards refs through shadcn's plain
// function components. The Phase-1 `display: contents` wrapper is gone.
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
    <ShadcnInputImpl
      ref={rootRef as never}
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
  )
}
