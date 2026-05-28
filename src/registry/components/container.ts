import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.5 — Container. A max-width wrapper that centers its content
// horizontally. `maxWidth` is enumerated against the Tailwind breakpoint
// widths (so "lg" Container = "stops growing at the lg breakpoint"), which
// matches the mental model of "cap my page at md / lg / xl". Width is
// applied as an inline `max-width` in the adapter, so no safelist work.
export const CONTAINER_MAX_WIDTHS = ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const

export const containerPropsSchema = z.object({
  maxWidth: z.enum(CONTAINER_MAX_WIDTHS),
})
export type ContainerProps = z.infer<typeof containerPropsSchema>

// Map the Container maxWidth token to a concrete CSS value. Tailwind v4
// breakpoint widths (rem) — matches the mental model of "cap my page at
// md / lg / xl".
const MAX_WIDTH_REM: Record<ContainerProps['maxWidth'], string> = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
  full: '100%',
}

export function containerMaxWidth(token: ContainerProps['maxWidth']): string {
  return MAX_WIDTH_REM[token]
}

registerComponent<ContainerProps>({
  id: 'container',
  category: 'layout',
  displayName: 'Container',
  tags: ['layout', 'wrapper', 'centered', 'max-width'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: containerPropsSchema,
  defaults: {
    props: { maxWidth: 'lg' },
    style: {
      classes: {
        root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
