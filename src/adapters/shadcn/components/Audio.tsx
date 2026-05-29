import { cn } from '@/lib/utils'
import type { AudioProps } from '@/registry/components/audio'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import type { AdapterRenderProps } from '../../types'

// Native `<audio>` with the browser's player. Autoplay is suppressed in
// editor mode so designing isn't accompanied by surprise playback.
export function ShadcnAudio({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, controls, autoplay, loop } = props as AudioProps
  const editing = useIsEditing()
  return (
    <audio
      ref={rootRef as never}
      src={src}
      controls={controls}
      autoPlay={!editing && autoplay}
      loop={loop}
      className={cn(className)}
      style={inlineStyle}
    />
  )
}
