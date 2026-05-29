import { cn } from '@/lib/utils'
import type { VideoProps } from '@/registry/components/video'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import type { AdapterRenderProps } from '../../types'

// Native `<video>` — same primitive across both adapters. Autoplay is
// suppressed in editor mode so the canvas doesn't have a video playing
// at the designer the whole time they're authoring; runtime honors the
// authored value.
export function ShadcnVideo({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, poster, controls, autoplay, loop, muted } = props as VideoProps
  const editing = useIsEditing()
  return (
    <video
      ref={rootRef as never}
      src={src}
      poster={poster || undefined}
      controls={controls}
      autoPlay={!editing && autoplay}
      loop={loop}
      muted={muted || (!editing && autoplay)}
      className={cn(className)}
      style={inlineStyle}
    />
  )
}
