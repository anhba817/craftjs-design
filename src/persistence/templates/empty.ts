import { buildTemplate } from './builder'
import { registerTemplate } from './registry'

registerTemplate({
  id: 'empty',
  name: 'Empty',
  description: 'A blank canvas — a single Box to drop components into.',
  envelope: buildTemplate({
    root: {
      canonical: 'box',
    },
  }),
})
