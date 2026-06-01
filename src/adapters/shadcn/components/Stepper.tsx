import { Check } from 'lucide-react'
import { cn } from '@design/sdk'
import {
  stepperSlotKey,
  type StepperProps,
} from '@/registry/components/stepper'
import type { AdapterRenderProps } from '../../types'

// Stepper — Pattern B. Renders the progress header on top + the current
// step's canvas slot below; content for other steps stays in the tree
// but is hidden (change `currentStep` in PropsPanel to swap focus).
export function ShadcnStepper({
  props,
  rootRef,
  className,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { steps, currentStep } = props as StepperProps
  const safeCurrent = Math.max(0, Math.min(currentStep, steps.length - 1))
  const activeSlot = stepperSlotKey(safeCurrent)
  const content = slotChildren[activeSlot]
  return (
    <div
      ref={rootRef as never}
      className={cn(composedClasses.root, className)}
      style={composedInlineStyles.root}
    >
      <ol className="flex items-start gap-2 text-sm">
        {steps.map((s, i) => {
          const state =
            i < safeCurrent ? 'done' : i === safeCurrent ? 'current' : 'upcoming'
          return (
            <li key={i} className="flex flex-1 items-start gap-2">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    state === 'done' && 'bg-primary text-primary-foreground',
                    state === 'current' &&
                      'border-2 border-primary text-primary',
                    state === 'upcoming' &&
                      'border border-border text-muted-foreground',
                  )}
                >
                  {state === 'done' ? <Check size={14} /> : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 h-6 w-px',
                      state === 'done' ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className="pt-0.5">
                <div className="font-medium text-foreground">{s.label}</div>
                {s.description && (
                  <div className="text-xs text-muted-foreground">
                    {s.description}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {/* Step content — only the active step's canvas shows; others stay
         in the Craft tree (hidden) so their content survives currentStep
         changes. */}
      <div>{content}</div>
    </div>
  )
}
