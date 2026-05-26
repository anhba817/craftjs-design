import {
  SIZE_VALUES,
  mergeSize,
  parseSize,
} from '@/style/tw-classes'
import type { SizeSlice, SizeValue } from '@/style/tw-classes'
import { NumericInput } from './shared/NumericInput'
import { PanelRow } from './shared/PanelRow'
import { mergeSlices } from './shared/mergeSlices'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// Each dimension supports token OR arbitrary value at base. Maps inspector
// fields ↔ slice/inline storage:
//   w     ↔ slice.w (token) | inline.width (arbitrary)
//   h     ↔ slice.h         | inline.height
//   min-w ↔ slice['min-w']  | inline.minWidth
//   min-h ↔ slice['min-h']  | inline.minHeight
//   max-w ↔ slice['max-w']  | inline.maxWidth
//   max-h ↔ slice['max-h']  | inline.maxHeight

const FIELDS = [
  { label: 'Width', sliceKey: 'w', cssProp: 'width' },
  { label: 'Height', sliceKey: 'h', cssProp: 'height' },
  { label: 'Min W', sliceKey: 'min-w', cssProp: 'minWidth' },
  { label: 'Min H', sliceKey: 'min-h', cssProp: 'minHeight' },
  { label: 'Max W', sliceKey: 'max-w', cssProp: 'maxWidth' },
  { label: 'Max H', sliceKey: 'max-h', cssProp: 'maxHeight' },
] as const

function isSizeToken(v: string): v is SizeValue {
  return (SIZE_VALUES as readonly string[]).includes(v)
}

export function SizePanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  // Phase 11 § 3.3 — multi-aware. In single-mode nodeIds is [primary]
  // and mergeSlices returns the only slice verbatim (mixed is empty).
  const { classStrings, inlineStyles, writeClassesAll, writeInlineAll } =
    useNodeClassesMulti(nodeIds, slot)
  const slices: Record<string, string | undefined>[] = classStrings.map(
    (cs) => parseSize(cs).slice as Record<string, string | undefined>,
  )
  const { merged: mergedSlice, mixed: mixedSliceKeys } = mergeSlices(slices)
  // Inline values are keyed by CSS prop (width / height / …) — separate
  // namespace from slice keys. Merge inline as objects too.
  const { merged: mergedInline, mixed: mixedInlineKeys } = mergeSlices(
    inlineStyles as readonly Record<string, string>[],
  )

  return (
    <section className="space-y-2">
      {FIELDS.map(({ label, sliceKey, cssProp }) => {
        const tokenValue = mergedSlice[sliceKey]
        const inlineValue = mergedInline[cssProp]
        const isMixed =
          mixedSliceKeys.has(sliceKey) || mixedInlineKeys.has(cssProp)
        // Inline wins for display (user picked an explicit arbitrary value).
        const current = isMixed ? '' : (inlineValue ?? tokenValue ?? '')

        const onChange = (next: string) => {
          if (next === '') {
            writeClassesAll((current) =>
              mergeSize(current, { [sliceKey]: undefined } as Partial<SizeSlice>),
            )
            writeInlineAll(cssProp, undefined)
            return
          }
          if (isSizeToken(next)) {
            writeClassesAll((current) =>
              mergeSize(current, { [sliceKey]: next } as Partial<SizeSlice>),
            )
            writeInlineAll(cssProp, undefined)
          } else {
            writeClassesAll((current) =>
              mergeSize(current, { [sliceKey]: undefined } as Partial<SizeSlice>),
            )
            writeInlineAll(cssProp, next)
          }
        }

        return (
          <PanelRow key={sliceKey} label={label}>
            <NumericInput
              value={current}
              tokens={SIZE_VALUES}
              onChange={onChange}
              placeholder={isMixed ? '— Mixed' : undefined}
            />
          </PanelRow>
        )
      })}
    </section>
  )
}
