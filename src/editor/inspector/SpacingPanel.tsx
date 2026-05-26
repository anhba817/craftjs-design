import {
  SPACING_VALUES,
  mergeSpacing,
  parseSpacing,
} from '@/style/tw-classes'
import type { SpacingSlice, SpacingValue } from '@/style/tw-classes'
import { BoxSidesEditor } from './shared/BoxSidesEditor'
import type { BoxSidesValue } from './shared/BoxSidesEditor'
import { mergeSlices } from './shared/mergeSlices'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// Inspector ignores px/py shorthands — they pass through unchanged in the slice
// but the editor's 4-side model can't represent them.
//
// Read prefers slice over inline; inline is only consulted as a fallback for
// the shorthand (linked mode) when no slice value is set. Per-side arbitrary
// is not supported in Phase 4.5 — unlinked mode is token-only.

function isSpacingToken(v: string): v is SpacingValue {
  return (SPACING_VALUES as readonly string[]).includes(v)
}

function readPad(slice: SpacingSlice, inline: Record<string, string>): BoxSidesValue {
  if (slice.p !== undefined) return { shorthand: slice.p }
  if (inline.padding) return { shorthand: inline.padding }
  if (slice.pt || slice.pr || slice.pb || slice.pl) {
    return {
      sides: { top: slice.pt, right: slice.pr, bottom: slice.pb, left: slice.pl },
    }
  }
  return {}
}

function readMargin(slice: SpacingSlice, inline: Record<string, string>): BoxSidesValue {
  if (slice.m !== undefined) return { shorthand: slice.m }
  if (inline.margin) return { shorthand: inline.margin }
  if (slice.mt || slice.mr || slice.mb || slice.ml) {
    return {
      sides: { top: slice.mt, right: slice.mr, bottom: slice.mb, left: slice.ml },
    }
  }
  return {}
}

// Phase 11 § 3.3 — spacing keys that participate in the padding /
// margin merged-value check.
const PADDING_KEYS = ['p', 'pt', 'pr', 'pb', 'pl'] as const
const MARGIN_KEYS = ['m', 'mt', 'mr', 'mb', 'ml'] as const
const PADDING_INLINE = ['padding'] as const
const MARGIN_INLINE = ['margin'] as const

export function SpacingPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { classStrings, inlineStyles, writeClassesAll, writeInlineAll } =
    useNodeClassesMulti(nodeIds, slot)
  const slices: Record<string, string | undefined>[] = classStrings.map(
    (cs) => parseSpacing(cs).slice as Record<string, string | undefined>,
  )
  const { merged, mixed } = mergeSlices(slices)
  const { merged: mergedInline, mixed: mixedInline } = mergeSlices(
    inlineStyles as readonly Record<string, string>[],
  )

  // BoxSidesEditor lacks a per-side mixed marker, so we treat the whole
  // box as mixed if ANY relevant key disagrees across nodes.
  const padMixed =
    PADDING_KEYS.some((k) => mixed.has(k)) ||
    PADDING_INLINE.some((k) => mixedInline.has(k))
  const marginMixed =
    MARGIN_KEYS.some((k) => mixed.has(k)) ||
    MARGIN_INLINE.some((k) => mixedInline.has(k))

  const update = (patch: Partial<SpacingSlice>) => {
    writeClassesAll((current) => mergeSpacing(current, patch))
  }

  // Handles a BoxSidesValue → slice + inline writes for padding OR margin.
  // shorthand can be token (→ slice.p / slice.m) or arbitrary (→ inline.padding /
  // inline.margin). Per-side values are token-only in 4.5; arbitrary side
  // values are silently dropped.
  const applyTo = (
    value: BoxSidesValue,
    cssShorthand: 'padding' | 'margin',
    shortField: 'p' | 'm',
    xField: 'px' | 'mx',
    yField: 'py' | 'my',
    sideFields: { top: 'pt' | 'mt'; right: 'pr' | 'mr'; bottom: 'pb' | 'mb'; left: 'pl' | 'ml' },
  ) => {
    const sliceClear: Partial<SpacingSlice> = {
      [shortField]: undefined,
      [xField]: undefined,
      [yField]: undefined,
      [sideFields.top]: undefined,
      [sideFields.right]: undefined,
      [sideFields.bottom]: undefined,
      [sideFields.left]: undefined,
    }

    if (value.shorthand !== undefined) {
      if (isSpacingToken(value.shorthand)) {
        update({ ...sliceClear, [shortField]: value.shorthand })
        writeInlineAll(cssShorthand, undefined)
      } else {
        update(sliceClear)
        writeInlineAll(cssShorthand, value.shorthand)
      }
      return
    }

    if (value.sides) {
      writeInlineAll(cssShorthand, undefined)
      const patch: Partial<SpacingSlice> = { ...sliceClear }
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        const v = value.sides[side]
        if (v && isSpacingToken(v)) {
          patch[sideFields[side]] = v
        }
        // Arbitrary side values dropped — Phase 4.5 unlinked mode is token-only.
      }
      update(patch)
      return
    }

    // Cleared
    update(sliceClear)
    writeInlineAll(cssShorthand, undefined)
  }

  return (
    <section className="space-y-3">
      <BoxSidesEditor
        label="Padding"
        value={
          padMixed ? {} : readPad(merged as SpacingSlice, mergedInline as Record<string, string>)
        }
        options={SPACING_VALUES}
        mixed={padMixed}
        placeholder={padMixed ? '— Mixed' : undefined}
        onChange={(next) =>
          applyTo(next, 'padding', 'p', 'px', 'py', {
            top: 'pt', right: 'pr', bottom: 'pb', left: 'pl',
          })
        }
      />
      <BoxSidesEditor
        label="Margin"
        value={
          marginMixed ? {} : readMargin(merged as SpacingSlice, mergedInline as Record<string, string>)
        }
        options={SPACING_VALUES}
        mixed={marginMixed}
        placeholder={marginMixed ? '— Mixed' : undefined}
        onChange={(next) =>
          applyTo(next, 'margin', 'm', 'mx', 'my', {
            top: 'mt', right: 'mr', bottom: 'mb', left: 'ml',
          })
        }
      />
    </section>
  )
}
