import { buildTemplate } from './builder'
import { registerTemplate } from './registry'

registerTemplate({
  id: 'landing-page',
  name: 'Landing page',
  description: 'A hero section with a headline, supporting paragraph, and CTA button.',
  envelope: buildTemplate({
    root: {
      canonical: 'box',
      style: {
        classes: { root: 'p-12 flex flex-col items-center text-center bg-background' },
      },
      children: [
        {
          canonical: 'heading',
          nodeProps: { level: '1', content: 'Build websites without writing code' },
          style: { classes: { root: 'text-4xl font-bold text-foreground' } },
        },
        {
          canonical: 'text',
          nodeProps: {
            content:
              'Drag components from the toolbox onto the canvas. Edit their props in the inspector. Save your work locally or share with a link.',
          },
          style: { classes: { root: 'mt-4 max-w-xl text-base text-muted-foreground' } },
        },
        {
          canonical: 'button',
          nodeProps: { label: 'Get started', intent: 'primary', disabled: false },
          style: { classes: { root: 'mt-6' } },
        },
      ],
    },
  }),
})
