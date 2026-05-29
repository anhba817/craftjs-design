import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.2 — Stepper. Pattern B composite: one canvas slot per step
// so each step can hold its own form / page content (the same model as
// Tabs). The visible content swaps to `slotChildren[step-<currentStep>]`;
// content for other steps stays in the tree but is hidden — switch
// currentStep in the PropsPanel to focus + edit a different step.
export const stepperPropsSchema = z.object({
  steps: z.array(
    z.object({
      label: z.string(),
      description: z.string(),
    }),
  ),
  currentStep: z.number().int().min(0).max(99),
})
export type StepperProps = z.infer<typeof stepperPropsSchema>

const STEP_SLOT_PREFIX = 'step-'
export function stepperSlotKey(i: number): string {
  return `${STEP_SLOT_PREFIX}${i}`
}
export function stepperSlotKeys(count: number): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(stepperSlotKey(i))
  return out
}

registerComponent<StepperProps>({
  id: 'stepper',
  category: 'navigation',
  displayName: 'Stepper',
  tags: ['nav', 'wizard', 'progress'],
  // Pattern B — outer node is a wrapper; each step's content is its own
  // canvas slot.
  isCanvas: false,
  styleSlots: ['root'],
  canvasSlots: (props) => {
    const steps = (props as StepperProps).steps ?? []
    return stepperSlotKeys(steps.length)
  },
  // The Active Step inspector panel owns currentStep with proper bounds;
  // hide the default PropsPanel field so the user doesn't see two
  // controls for the same value (and the unconstrained number input is
  // misleading).
  hiddenPropFields: ['currentStep'],
  propsSchema: stepperPropsSchema,
  defaults: {
    props: {
      steps: [
        { label: 'Account', description: 'Sign in' },
        { label: 'Profile', description: 'Tell us about you' },
        { label: 'Review', description: 'Confirm' },
      ],
      currentStep: 0,
    },
    style: {
      classes: { root: 'space-y-4' },
    },
  },
})
