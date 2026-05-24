import type { AdapterRenderProps } from '../../types'

const ASPECT_VALUE: Record<string, string> = {
  auto: 'auto',
  square: '1 / 1',
  '16/9': '16 / 9',
}

// MUI doesn't have a dedicated Image primitive — use a plain <img>. The aspect
// ratio is applied via the CSS aspect-ratio property (inline style) since MUI's
// sx prop also accepts standard CSS properties.
export function MaterialImage({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, aspectRatio } = props as {
    src: string
    alt: string
    aspectRatio: 'auto' | 'square' | '16/9'
  }
  const aspect = ASPECT_VALUE[aspectRatio] ?? 'auto'
  return (
    <img
      ref={rootRef as never}
      src={src}
      alt={alt}
      className={className}
      style={{ aspectRatio: aspect, objectFit: 'cover', ...inlineStyle }}
    />
  )
}
