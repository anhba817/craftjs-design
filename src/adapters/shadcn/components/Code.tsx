import { cn } from '@design/sdk'
import type { CodeProps } from '@/registry/components/code'
import type { AdapterRenderProps } from '../../types'

// Code (Phase 13 § 5.1) — no syntax highlighting in v1. The `language-<id>`
// class is emitted so a host can layer in Shiki / Prism / hljs later
// without coordinating with this code. A small badge in the corner
// surfaces the chosen language for `plain` ≠ identifies.
export function ShadcnCode({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { language, content } = props as CodeProps
  return (
    <pre ref={rootRef as never} className={cn(className)} style={inlineStyle}>
      <code className={`language-${language}`}>{content}</code>
      {language !== 'plain' && (
        <span className="absolute top-1 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
      )}
    </pre>
  )
}
