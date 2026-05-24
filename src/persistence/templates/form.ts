import { buildTemplate } from './builder'
import { registerTemplate } from './registry'

registerTemplate({
  id: 'form',
  name: 'Sign-up form',
  description: 'A stacked form: name, email, password, terms checkbox, and submit button.',
  envelope: buildTemplate({
    root: {
      canonical: 'stack',
      nodeProps: { direction: 'vertical', gap: '4' },
      style: {
        classes: { root: 'max-w-md mx-auto p-6 rounded-md border border-border bg-card' },
      },
      children: [
        {
          canonical: 'heading',
          nodeProps: { level: '2', content: 'Create your account' },
        },
        {
          canonical: 'input',
          nodeProps: {
            type: 'text',
            placeholder: 'Full name',
            value: '',
            disabled: false,
          },
        },
        {
          canonical: 'input',
          nodeProps: {
            type: 'email',
            placeholder: 'Email address',
            value: '',
            disabled: false,
          },
        },
        {
          canonical: 'input',
          nodeProps: {
            type: 'password',
            placeholder: 'Password',
            value: '',
            disabled: false,
          },
        },
        {
          canonical: 'checkbox',
          nodeProps: {
            label: 'I agree to the terms and conditions',
            checked: false,
            disabled: false,
          },
        },
        {
          canonical: 'button',
          nodeProps: { label: 'Sign up', intent: 'primary', disabled: false },
        },
      ],
    },
  }),
})
