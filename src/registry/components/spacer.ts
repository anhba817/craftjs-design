import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.5 — Spacer. A leaf whose only job is to occupy room along
// one axis (the rest is `auto` so it shrinks). Size is the Tailwind
// spacing scale (1 unit = 0.25rem); the adapter applies it as an inline
// dimension so no Tailwind safelist entry is required.
export const SPACER_SIZES = [
  '0', '1', '2', '3', '4', '6', '8', '12', '16', '24', '32', '48', '64',
] as const

export const spacerPropsSchema = z.object({
  size: z.enum(SPACER_SIZES),
  axis: z.enum(['vertical', 'horizontal']),
})
export type SpacerProps = z.infer<typeof spacerPropsSchema>

// Map the Spacer size token to a concrete rem value (Tailwind spacing
// scale: 1 unit = 0.25rem). Shared between the shadcn + MUI adapters.
export function spacerSizeRem(size: SpacerProps['size']): string {
  const n = Number(size)
  return n === 0 ? '0' : `${n * 0.25}rem`
}

registerComponent<SpacerProps>({
  id: 'spacer',
  category: 'layout',
  displayName: 'Spacer',
  tags: ['layout', 'gap', 'space', 'whitespace'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: spacerPropsSchema,
  defaults: {
    props: { size: '8', axis: 'vertical' },
    style: { classes: { root: '' } },
  },
})
