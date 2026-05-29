import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.7 — Carousel. Pattern B dynamic-canvas: one canvas per
// slide, keyed by a stable `id` so renaming or reordering preserves
// dropped content. `currentSlide` is the active index; adapters branch
// on `useIsEditing` to pin to that index in the editor and drive their
// own next/prev state at runtime. `showChevrons` lets a designer hide
// the chevron buttons if dots alone are enough.

function genSlideId(): string {
  return `slide-${Math.random().toString(36).slice(2, 10)}`
}

export const carouselPropsSchema = z.object({
  slides: z.array(
    z.object({
      id: z.string().default(() => genSlideId()),
    }),
  ),
  currentSlide: z.number().int().min(0),
  showChevrons: z.boolean(),
  showDots: z.boolean(),
})
export type CarouselProps = z.infer<typeof carouselPropsSchema>

export const SLIDE_SLOT_PREFIX = 'slide-'

/**
 * Resolves the slot key for each slide. Same shape as `tabSlotKeys`.
 * Returns one key per slide, in index order; double-prefixed
 * (`slide-slide-${id}`) is intentional — `id` already starts with
 * `slide-` from genSlideId, and ALL slot keys share the SLIDE_SLOT_PREFIX
 * so the registry / serializer can recognise them.
 */
export function slideSlotKeys(
  slides: readonly { id: string }[],
): string[] {
  return slides.map((s) => `${SLIDE_SLOT_PREFIX}${s.id}`)
}

registerComponent<CarouselProps>({
  id: 'carousel',
  category: 'media',
  displayName: 'Carousel',
  tags: ['media', 'slideshow', 'gallery'],
  isCanvas: false,
  // Style slots: `prevButton` / `nextButton` are pickable in the
  // Appearance SlotPicker so designers can restyle the chevron pill
  // (background, ring, color) without forking the adapter.
  styleSlots: ['root', 'slide', 'controls', 'prevButton', 'nextButton'],
  canvasSlots: (props) => slideSlotKeys((props as CarouselProps).slides ?? []),
  propsSchema: carouselPropsSchema,
  defaults: {
    props: {
      slides: [
        { id: 'slide-first' },
        { id: 'slide-second' },
        { id: 'slide-third' },
      ],
      currentSlide: 0,
      showChevrons: true,
      showDots: true,
    },
    style: {
      classes: {
        // `group` enables Tailwind's group-hover on the chevrons; `relative`
        // is required because the chevrons + controls are absolutely
        // positioned. `flex flex-col` lets the slide area inherit any
        // explicit height the user sets via the resize handles, so the
        // drop zone grows / shrinks with the carousel.
        root: 'group relative flex flex-col overflow-hidden rounded-md border border-border',
        // flex-1 stretches the slide to fill any height the root inherits
        // from resize; min-h-32 is the natural-size floor. The
        // [data-carousel-slide] CSS rule (in src/index.css) forces the
        // inner canvas-slot to flex-fill so the drop zone covers the
        // whole slide rather than hugging the dropped content. Bottom
        // padding leaves room for the absolutely-positioned dots.
        slide: 'flex flex-1 flex-col min-h-32 px-4 pb-10 pt-4',
        // Floating row — no background / no border. Positioned at the
        // bottom-center of the slide area; only the dots are visible.
        controls:
          'absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-1.5',
        // Hidden by default; revealed on root hover. Pill background so the
        // chevron stays visible over any slide content.
        prevButton:
          'absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100',
        nextButton:
          'absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100',
      },
    },
  },
})
