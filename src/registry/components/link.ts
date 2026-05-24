import { z } from 'zod'
import { registerComponent } from '../registry'

export const linkPropsSchema = z.object({
  href: z.string(),
  label: z.string(),
  target: z.enum(['_self', '_blank']),
})
export type LinkProps = z.infer<typeof linkPropsSchema>

registerComponent<LinkProps>({
  id: 'link',
  category: 'navigation',
  displayName: 'Link',
  tags: ['anchor', 'href'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: linkPropsSchema,
  defaults: {
    props: { href: '#', label: 'Link', target: '_self' },
    style: { classes: { root: 'text-primary underline-offset-4 hover:underline' } },
  },
})
