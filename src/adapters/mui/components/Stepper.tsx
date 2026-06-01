import MuiStep from '@mui/material/Step'
import MuiStepLabel from '@mui/material/StepLabel'
import MuiStepper from '@mui/material/Stepper'
import { cn } from '@design/sdk'
import {
  stepperSlotKey,
  type StepperProps,
} from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// MUI Stepper — Pattern B. Header is MUI's <Stepper>; below it, the
// current step's canvas slot renders its content.
export function MaterialStepper({
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
      <MuiStepper activeStep={safeCurrent} alternativeLabel>
        {steps.map((s, i) => (
          <MuiStep key={i}>
            <MuiStepLabel
              optional={
                s.description ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    {s.description}
                  </span>
                ) : undefined
              }
            >
              {s.label}
            </MuiStepLabel>
          </MuiStep>
        ))}
      </MuiStepper>
      <div>{content}</div>
    </div>
  )
}
