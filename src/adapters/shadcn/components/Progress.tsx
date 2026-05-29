import { Progress as RadixProgress } from 'radix-ui'
import { cn } from '@/lib/utils'
import type { ProgressProps } from '@/registry/components/progress'
import type { AdapterRenderProps } from '../../types'

// shadcn Progress — linear variant uses Radix's Progress primitive
// (handles aria-valuenow + role=progressbar). Circular variant is a
// hand-rolled SVG arc since neither shadcn nor Radix ships a circular
// progress component. Same `value` prop drives both.
const SQUARE = 40
const STROKE = 4
const RADIUS = (SQUARE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ShadcnProgress({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, variant } = props as ProgressProps
  const clamped = Math.max(0, Math.min(100, value))

  if (variant === 'circular') {
    const dash = (clamped / 100) * CIRCUMFERENCE
    return (
      <div
        ref={rootRef}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('inline-flex', className)}
        style={inlineStyle}
      >
        <svg
          width={SQUARE}
          height={SQUARE}
          viewBox={`0 0 ${SQUARE} ${SQUARE}`}
          // -90° rotation so the arc starts at 12 o'clock instead of 3.
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={SQUARE / 2}
            cy={SQUARE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={STROKE}
          />
          <circle
            cx={SQUARE / 2}
            cy={SQUARE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            className="text-primary"
          />
        </svg>
      </div>
    )
  }

  return (
    <RadixProgress.Root
      ref={rootRef as never}
      value={clamped}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className,
      )}
      style={inlineStyle}
    >
      <RadixProgress.Indicator
        className="h-full bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </RadixProgress.Root>
  )
}
