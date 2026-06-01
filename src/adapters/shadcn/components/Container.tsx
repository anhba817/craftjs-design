import { cn } from '@design/sdk'
import {
  containerMaxWidth,
  type ContainerProps,
} from '@/registry/components/container'
import type { AdapterRenderProps } from '../../types'

// Container (Phase 13 § 5.5). Centers horizontally and caps width at the
// chosen breakpoint. `maxWidth` is applied inline to avoid safelisting the
// non-numeric tokens (sm/md/lg/xl/2xl); user-authored inline values still
// override via the spread.
export function ShadcnContainer({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { maxWidth } = props as ContainerProps
  return (
    <div
      ref={rootRef}
      className={cn(className)}
      style={{
        marginInline: 'auto',
        maxWidth: containerMaxWidth(maxWidth),
        ...inlineStyle,
      }}
    >
      {children}
    </div>
  )
}
