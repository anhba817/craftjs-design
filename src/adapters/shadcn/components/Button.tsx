import { Button as ShadcnButtonImpl } from '@/components/ui/button'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_VARIANT = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
} as const

type Intent = keyof typeof INTENT_TO_VARIANT

// shadcn's primitive components (button.tsx, input.tsx) are written as plain
// function components, not forwardRef wrappers — they assume React 19's
// ref-as-prop semantics. We're on React 18 (Phase 1 downgrade), so passing
// `ref` directly into <ShadcnButtonImpl> is a no-op with a console warning.
//
// Workaround: wrap with a `display: contents` span so the ref attaches cleanly
// to a real DOM node. This is safe for non-canvas leaves (Button doesn't accept
// drops), so it doesn't trigger Phase 1 risk #2's nested-hit-testing problem.
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
  // The wrapper span keeps `display: contents` so it stays layout-transparent;
  // inlineStyle goes on the actual rendered button where it has a real box to
  // apply to.
  return (
    <span ref={rootRef} style={{ display: 'contents' }}>
      <ShadcnButtonImpl
        variant={INTENT_TO_VARIANT[intent] ?? 'default'}
        disabled={disabled}
        className={className}
        style={inlineStyle}
      >
        {label}
      </ShadcnButtonImpl>
    </span>
  )
}
