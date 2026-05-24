import { createElement } from 'react'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnHeading({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: string; content: string }
  // Dynamic `h${level}` via createElement — keeps the impl single-file without
  // a six-way if/else.
  return createElement(
    `h${level}`,
    { ref: rootRef, className: cn(className), style: inlineStyle },
    content,
  )
}
