import Typography from '@mui/material/Typography'
import { EditableText } from '@design/sdk'
import { useStartTextEdit } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// MUI's <Typography> wraps text in a semantic element with Material design
// font-family/sizing defaults. We pass className through so the canonical's
// Tailwind classes (text-base, text-foreground) coexist with MUI's typography
// styles — the final font-size depends on CSS specificity, but font-family
// shifts to MUI's stack which gives a visible (if subtle) adapter divergence.
//
// Variant defaults to body1 — body text scale. The inspector's Typography
// panel still drives concrete font-size via Tailwind utilities when the user
// overrides; otherwise MUI's body1 sizing wins.
export function MaterialText({
  props,
  className,
  rootRef,
  inlineStyle,
}: AdapterRenderProps) {
  const { content } = props as { content: string }
  const startEdit = useStartTextEdit()
  return (
    <Typography
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={content} propPath="content" multiline />
    </Typography>
  )
}
