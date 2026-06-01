import { cn } from '@design/sdk'
import type { CodeProps } from '@/registry/components/code'
import type { AdapterRenderProps } from '../../types'

// Code — plain `<pre><code>`. No syntax highlighting in v1 (matches the
// shadcn adapter); the `language-<id>` class lets hosts plug a highlighter
// over the top later.
export function MaterialCode({
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
