import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.1 — Code block. v1 ships WITHOUT syntax highlighting (shiki
// / highlight.js are big); the `language` prop drives the corner label and
// the `language-<lang>` class so a host can layer in their own highlighter.
export const CODE_LANGUAGES = [
  'plain', 'ts', 'js', 'tsx', 'jsx', 'json', 'html', 'css', 'bash', 'py', 'md',
] as const

export const codePropsSchema = z.object({
  language: z.enum(CODE_LANGUAGES),
  content: z.string(),
})
export type CodeProps = z.infer<typeof codePropsSchema>

registerComponent<CodeProps>({
  id: 'code',
  category: 'display',
  displayName: 'Code',
  tags: ['code', 'snippet', 'pre'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: codePropsSchema,
  defaults: {
    props: { language: 'ts', content: "const greet = () => 'hello'" },
    style: {
      classes: {
        root: 'relative rounded-md bg-muted text-foreground p-3 font-mono text-sm overflow-auto',
      },
    },
  },
})
