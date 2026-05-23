import { z } from 'zod'
import { registerComponent } from '../registry'

export const buttonPropsSchema = z.object({
  label: z.string(),
  intent: z.enum(['primary', 'secondary', 'destructive']),
  disabled: z.boolean(),
})
export type ButtonProps = z.infer<typeof buttonPropsSchema>

registerComponent<ButtonProps>({
  id: 'button',
  category: 'input',
  displayName: 'Button',
  tags: ['cta', 'action'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: buttonPropsSchema,
  defaults: {
    props: { label: 'Button', intent: 'primary', disabled: false },
    // Adapters own the visual styling. Inspector panels (Phase 4) write here
    // when the user explicitly overrides.
    style: { classes: { root: '' } },
  },
  // Override the category default — typography panel is omitted because
  // shadcn's button primitive uses inline-flex centering + fixed `h-*` size
  // variants that ignore Tailwind text utilities. Component-native sizing
  // (Button has its own size variant) belongs in PropsPanel via the canonical
  // schema, not in a typography panel.
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
