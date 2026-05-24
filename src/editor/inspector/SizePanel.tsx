import {
  SIZE_VALUES,
  mergeSize,
  parseSize,
} from '@/style/tw-classes'
import type { SizeSlice, SizeValue } from '@/style/tw-classes'
import { NumericInput } from './shared/NumericInput'
import { PanelRow } from './shared/PanelRow'
import { useNodeClasses } from './shared/useNodeClasses'

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

export function SizePanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
  const { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint } =
    useNodeClasses(nodeId, slot)
  const { slice } = parseSize(classString)
  const update = (patch: Partial<SizeSlice>) => {
    writeClasses(mergeSize(classString, patch))
  }

  const hexHint =
    activeBreakpoint !== 'base'
      ? 'Arbitrary values supported at base breakpoint only.'
      : undefined

  return (
    <section className="space-y-2">
      {FIELDS.map(({ label, sliceKey, cssProp }) => {
        const tokenValue = slice[sliceKey as keyof SizeSlice]
        const inlineValue = inlineStyle[cssProp]
        // Inline wins for display (user picked an explicit arbitrary value).
        const current = inlineValue ?? tokenValue ?? ''

        const onChange = (next: string) => {
          if (next === '') {
            update({ [sliceKey]: undefined } as Partial<SizeSlice>)
            writeInline(cssProp, undefined)
            return
          }
          if (isSizeToken(next)) {
            update({ [sliceKey]: next } as Partial<SizeSlice>)
            writeInline(cssProp, undefined)
          } else {
            update({ [sliceKey]: undefined } as Partial<SizeSlice>)
            writeInline(cssProp, next)
          }
        }

        return (
          <PanelRow key={sliceKey} label={label}>
            <NumericInput
              value={current}
              tokens={SIZE_VALUES}
              onChange={onChange}
              arbitraryDisabledHint={hexHint}
            />
          </PanelRow>
        )
      })}
    </section>
  )
}
