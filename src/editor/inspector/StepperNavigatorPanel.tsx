import { useEditor } from '@craftjs/core'
import { cn } from '@/lib/utils'
import type { StepperProps } from '@/registry/components/stepper'

// Phase 13 § 5.2 — Stepper "Active step" navigator. The Stepper's schema
// has a static max of 99 on currentStep, which is fine as a hard ceiling
// but doesn't reflect the runtime constraint "0 ≤ currentStep < steps.length".
// This panel exposes the right UI: a prev/next pair + step dropdown
// labelled with the step names, with the bounds derived from props.steps.
// The default PropsPanel still shows currentStep as a number input
// alongside; this panel is just a nicer way to navigate.

interface CraftWrapperProps {
  nodeProps: StepperProps
}

export function StepperNavigatorPanel({
  nodeId,
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot: string
}) {
  const { actions, steps, currentStep } = useEditor((_state, query) => {
    try {
      const data = query.node(nodeId).get().data as {
        props?: { nodeProps?: StepperProps }
      }
      const np = data.props?.nodeProps
      return {
        steps: np?.steps ?? [],
        currentStep: np?.currentStep ?? 0,
      }
    } catch {
      return { steps: [] as StepperProps['steps'], currentStep: 0 }
    }
  })

  if (steps.length === 0) {
    return (
      <p className="text-[11px] text-ed-text-muted">
        Add steps in the Properties panel to start.
      </p>
    )
  }

  const maxIdx = steps.length - 1
  const clamped = Math.max(0, Math.min(currentStep, maxIdx))

  const setStep = (next: number) => {
    const v = Math.max(0, Math.min(next, maxIdx))
    actions.setProp(nodeId, (p: CraftWrapperProps) => {
      p.nodeProps.currentStep = v
    })
  }

  const btn =
    'inline-flex h-7 min-w-7 items-center justify-center rounded border border-ed-border-2 bg-ed-surface px-2 text-xs text-ed-text hover:bg-ed-surface-2 disabled:opacity-40'

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          className={cn(btn)}
          disabled={clamped <= 0}
          onClick={() => setStep(clamped - 1)}
          aria-label="Previous step"
        >
          ‹
        </button>
        <span className="text-ed-text-muted tabular-nums">
          {clamped + 1} / {steps.length}
        </span>
        <button
          type="button"
          className={cn(btn)}
          disabled={clamped >= maxIdx}
          onClick={() => setStep(clamped + 1)}
          aria-label="Next step"
        >
          ›
        </button>
      </div>
      <select
        value={clamped}
        onChange={(e) => setStep(Number(e.target.value))}
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-xs text-ed-text"
      >
        {steps.map((s, i) => (
          <option key={i} value={i}>
            Step {i + 1}: {s.label}
          </option>
        ))}
      </select>
      {currentStep !== clamped && (
        <p className="text-[11px] text-amber-600">
          Stored value {currentStep} is out of range; rendering step {clamped + 1}.
        </p>
      )}
    </section>
  )
}
