import {
  SPACING_VALUES,
  mergeSpacing,
  parseSpacing,
} from '@/style/tw-classes'
import type { SpacingSlice, SpacingValue } from '@/style/tw-classes'
import { BoxSidesEditor } from './shared/BoxSidesEditor'
import type { BoxSidesValue } from './shared/BoxSidesEditor'
import { useNodeClasses } from './shared/useNodeClasses'

// Maps SpacingSlice padding/margin fields to BoxSidesEditor's {shorthand, sides}
// shape. Inspector intentionally ignores px/py shorthands — they're preserved
// across writes (since they're still in the slice), but the editor's 4-side
// model can't represent them. Users who hand-author px/py see the editor as
// empty until they change something; the px/py values survive untouched.

function readPad(slice: SpacingSlice): BoxSidesValue {
  if (slice.p !== undefined) return { shorthand: slice.p }
  if (slice.pt || slice.pr || slice.pb || slice.pl) {
    return {
      sides: { top: slice.pt, right: slice.pr, bottom: slice.pb, left: slice.pl },
    }
  }
  return {}
}
function writePad(value: BoxSidesValue): Partial<SpacingSlice> {
  if (value.shorthand !== undefined) {
    return { p: value.shorthand as SpacingValue,
             pt: undefined, pr: undefined, pb: undefined, pl: undefined,
             px: undefined, py: undefined }
  }
  if (value.sides) {
    return { p: undefined, px: undefined, py: undefined,
             pt: value.sides.top as SpacingValue | undefined,
             pr: value.sides.right as SpacingValue | undefined,
             pb: value.sides.bottom as SpacingValue | undefined,
             pl: value.sides.left as SpacingValue | undefined }
  }
  return { p: undefined, px: undefined, py: undefined,
           pt: undefined, pr: undefined, pb: undefined, pl: undefined }
}

function readMargin(slice: SpacingSlice): BoxSidesValue {
  if (slice.m !== undefined) return { shorthand: slice.m }
  if (slice.mt || slice.mr || slice.mb || slice.ml) {
    return {
      sides: { top: slice.mt, right: slice.mr, bottom: slice.mb, left: slice.ml },
    }
  }
  return {}
}
function writeMargin(value: BoxSidesValue): Partial<SpacingSlice> {
  if (value.shorthand !== undefined) {
    return { m: value.shorthand as SpacingValue,
             mt: undefined, mr: undefined, mb: undefined, ml: undefined,
             mx: undefined, my: undefined }
  }
  if (value.sides) {
    return { m: undefined, mx: undefined, my: undefined,
             mt: value.sides.top as SpacingValue | undefined,
             mr: value.sides.right as SpacingValue | undefined,
             mb: value.sides.bottom as SpacingValue | undefined,
             ml: value.sides.left as SpacingValue | undefined }
  }
  return { m: undefined, mx: undefined, my: undefined,
           mt: undefined, mr: undefined, mb: undefined, ml: undefined }
}

export function SpacingPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseSpacing(classString)

  const update = (patch: Partial<SpacingSlice>) => {
    writeClasses(mergeSpacing(classString, patch))
  }

  return (
    <section className="space-y-3">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Spacing
      </div>
      <BoxSidesEditor
        label="Padding"
        value={readPad(slice)}
        options={SPACING_VALUES}
        onChange={(next) => update(writePad(next))}
      />
      <BoxSidesEditor
        label="Margin"
        value={readMargin(slice)}
        options={SPACING_VALUES}
        onChange={(next) => update(writeMargin(next))}
      />
    </section>
  )
}
