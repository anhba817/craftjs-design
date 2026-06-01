import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@design/sdk'
import {
  slideSlotKeys,
  type CarouselProps,
} from '@/registry/components/carousel'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// MUI Carousel — same shape as the shadcn adapter. Chevrons use plain
// buttons rather than IconButton so the hover-reveal opacity + absolute
// positioning the canonical's default classes carry stays under the
// designer's control via the prevButton / nextButton style slots.
export function MaterialCarousel({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { slides, currentSlide, showChevrons, showDots } = props as CarouselProps
  const editing = useIsEditing()
  const keys = slideSlotKeys(slides ?? [])
  const total = keys.length
  const clampedAuthored = Math.max(0, Math.min(total - 1, currentSlide))

  const [runtimeIndex, setRuntimeIndex] = useState(clampedAuthored)
  const activeIndex = editing ? clampedAuthored : Math.min(runtimeIndex, total - 1)
  const activeKey = keys[activeIndex]

  if (total === 0) {
    return (
      <div
        ref={rootRef as never}
        className={cn(composedClasses.root)}
        style={composedInlineStyles.root}
      >
        <div className="p-4 text-sm text-gray-500">No slides.</div>
      </div>
    )
  }

  const goPrev = () => setRuntimeIndex((i) => (i - 1 + total) % total)
  const goNext = () => setRuntimeIndex((i) => (i + 1) % total)
  const goTo = (i: number) => setRuntimeIndex(i)

  return (
    <div
      ref={rootRef as never}
      className={cn(composedClasses.root)}
      style={composedInlineStyles.root}
      aria-roledescription="carousel"
    >
      <div className="relative flex flex-1 flex-col">
        <div
          data-carousel-slide
          className={cn(composedClasses.slide)}
          style={composedInlineStyles.slide}
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${total}`}
        >
          {slotChildren[activeKey]}
        </div>

        {showChevrons && (
          <>
            <button
              type="button"
              onClick={editing ? undefined : goPrev}
              aria-label="Previous slide"
              className={cn(composedClasses.prevButton)}
              style={composedInlineStyles.prevButton}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={editing ? undefined : goNext}
              aria-label="Next slide"
              className={cn(composedClasses.nextButton)}
              style={composedInlineStyles.nextButton}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </>
        )}

        {/* Dots float over the bottom of the slide area — see shadcn
            adapter for the rationale. Hidden when `showDots` is false. */}
        {showDots && (
          <div
            className={cn(composedClasses.controls)}
            style={composedInlineStyles.controls}
          >
            {keys.map((k, i) => (
              <button
                key={k}
                type="button"
                onClick={editing ? undefined : () => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === activeIndex ? 'true' : undefined}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === activeIndex
                    ? 'bg-blue-600'
                    : 'bg-gray-400/60 hover:bg-gray-400',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
