# Tutorial — adding a canonical

Goal: add a new abstract palette entry the editor's Toolbox exposes. We'll
build a `Stepper` — a horizontal progress indicator with `currentStep` and
`totalSteps` props.

The canonical contract is just data + a Zod schema. Adapters provide the
actual rendering — see [`TUTORIAL_ADAPTER.md`](./TUTORIAL_ADAPTER.md).

## Step 1 — Define the props schema

```ts
import { z } from 'zod'

export const stepperPropsSchema = z.object({
  currentStep: z.number().int().min(0),
  totalSteps: z.number().int().min(1).max(10),
  showLabels: z.boolean(),
})
export type StepperProps = z.infer<typeof stepperPropsSchema>
```

The schema drives PropsPanel's auto-form. Supported Zod kinds:
- `z.string()` → text input
- `z.number()` → number input
- `z.boolean()` → checkbox
- `z.enum([...])` → dropdown
- `z.array(z.object({...}))` → list editor with add/remove/reorder
- `z.object({...})` → recursive nested form

Other kinds render an "unsupported" badge — file an issue if you hit a real
case.

## Step 2 — Register the canonical

```ts
import { registerCanonical } from '@crafted-design/editor/sdk'

registerCanonical<StepperProps>({
  id: 'stepper',                       // stable — persisted in documents
  category: 'navigation',
  displayName: 'Stepper',
  tags: ['wizard', 'progress'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: stepperPropsSchema,
  defaults: {
    props: { currentStep: 0, totalSteps: 3, showLabels: true },
    style: { classes: { root: 'flex items-center gap-2' } },
  },
})
```

### Field-by-field

- `id` — stable string. Persisted in saved documents. Don't rename without a
  migration.
- `category` — buckets components in the Toolbox. One of `'layout'`,
  `'input'`, `'display'`, `'navigation'`, `'feedback'`, `'media'`,
  `'content'`. Unknown categories fall into "Other".
- `displayName` — shown in the Toolbox and persisted as Craft's resolver
  key.
- `tags` — keywords for Toolbox search. Lowercase, no spaces.
- `isCanvas` — true if dropped instances accept children. False for leaves
  (Button, Text, Stepper).
- `styleSlots` — named class buckets. `['root']` for single-region
  canonicals. For Pattern B composites with sub-regions, add more
  (`['root', 'header', 'body', 'footer']` for Card).
- `propsSchema` — your Zod schema.
- `defaults` — initial values for new instances.
- `applicablePanels` (optional) — whitelist of inspector panel ids that
  apply. Omit to let each panel's `applicableTo` predicate decide.

## Step 3 — Add to the barrel

If your canonical lives at `src/registry/components/stepper.ts`, append one
line to `src/registry/components/index.ts`:

```ts
import './stepper'
```

The side-effect import triggers registration at module load.

## Step 4 — Provide adapter impls

Without an impl, dropped Steppers render a "no impl in adapter" placeholder.
Add an impl per adapter you support:

```tsx
// src/adapters/shadcn/components/Stepper.tsx
import type { AdapterRenderProps } from '@crafted-design/editor/sdk'

export function ShadcnStepper({ props, rootRef, className, inlineStyle }: AdapterRenderProps) {
  const { currentStep, totalSteps, showLabels } = props as {
    currentStep: number; totalSteps: number; showLabels: boolean
  }
  return (
    <div ref={rootRef} className={className} style={inlineStyle}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={
            'h-2 w-8 rounded-full ' +
            (i <= currentStep ? 'bg-primary' : 'bg-muted')
          }
          title={showLabels ? `Step ${i + 1}` : undefined}
        />
      ))}
    </div>
  )
}
```

Register the impl in the adapter's `index.ts`:

```ts
import { ShadcnStepper } from './components/Stepper'

registerAdapter({
  // ...
  components: {
    // ...existing
    stepper: ShadcnStepper,
  },
})
```

## Step 5 — Pattern B (multi-canvas) variant

If your canonical has named sub-regions that should each accept dropped
children — say, a `Splitter` with a `left` and `right` panel — declare them
as `canvasSlots`:

```ts
registerCanonical({
  id: 'splitter',
  // ...
  isCanvas: false,                            // outer is not a canvas
  styleSlots: ['root', 'left', 'right'],
  canvasSlots: ['left', 'right'],             // both panels accept drops
  defaults: {
    props: {},
    style: { classes: { root: '', left: '', right: '' } },
  },
})
```

The adapter impl receives `slotChildren.left` and `slotChildren.right` —
React elements that wrap independent Craft canvases. Place each one in the
appropriate DOM region.

## Step 6 — Inspector behavior

Once registered, your canonical appears in the Toolbox grouped by category
and is selectable on the canvas. The Inspector mounts:
- The applicable inspector panels (based on `applicablePanels` whitelist or
  each panel's `applicableTo` predicate).
- A SlotPicker if `styleSlots.length > 1`.
- The PropsPanel auto-form derived from your schema.
- Per-slot class editing via the existing panels.

## Step 7 — Tailwind safelist (if you emit dynamic classes)

If the inspector panels can write Tailwind classes outside `tw-classes.ts`'s
known vocabulary (e.g., your default uses `gap-3` and no other canonical
does), make sure the utility is in `scripts/gen-safelist.ts`. The script
runs on `npm run dev` / `npm run build`; missing safelist entries silently
fail to apply CSS even though the class appears in the DOM.

For tokens from existing slices (typography, layout, spacing, size,
appearance, effects), the safelist already covers them at every
breakpoint — no action needed.

## Step 8 — Register at module load

Register at module load via side-effect imports in `src/App.tsx` (the
canonical app does this for all 48 built-ins). Post-mount registration is
also supported — the registry bumps a version counter and the editor
re-resolves, so a hot-reloaded canonical appears in the toolbox without a
page reload — but module-load registration is the predictable default.

## Verifying

1. Reload the dev server.
2. Toolbox shows "Stepper" in the Navigation category.
3. Drag onto canvas — three dots appear (your default `totalSteps: 3`).
4. Inspector's PropsPanel exposes `currentStep`, `totalSteps`, `showLabels`.
5. Change `currentStep` to 1 — first two dots highlight.
6. Edit the root slot's classes via the existing panels — the Stepper
   responds.

## Where to next

- **Override defaults from an external adapter.** Call
  `unregisterCanonical('stepper')` and re-register with different defaults.
- **Author a custom panel for your canonical.** See
  [`TUTORIAL_PANEL.md`](./TUTORIAL_PANEL.md).
