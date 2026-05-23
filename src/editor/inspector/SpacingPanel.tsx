import {
  SPACING_VALUES,
  mergeSpacing,
  parseSpacing,
} from '@/style/tw-classes'
import type { SpacingSlice, SpacingValue } from '@/style/tw-classes'
import { BoxSidesEditor } from './shared/BoxSidesEditor'
import type { BoxSidesValue } from './shared/BoxSidesEditor'
import { useNodeClasses } from './shared/useNodeClasses'

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

export function SpacingPanel({ nodeId }: { nodeId: string }) {
  const { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint } =
    useNodeClasses(nodeId)
  const { slice } = parseSpacing(classString)

  const update = (patch: Partial<SpacingSlice>) => {
    writeClasses(mergeSpacing(classString, patch))
  }

  const hexHint =
    activeBreakpoint !== 'base'
      ? 'Arbitrary values supported at base breakpoint only.'
      : undefined

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
        writeInline(cssShorthand, undefined)
      } else {
        update(sliceClear)
        writeInline(cssShorthand, value.shorthand)
      }
      return
    }

    if (value.sides) {
      writeInline(cssShorthand, undefined)
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
    writeInline(cssShorthand, undefined)
  }

  return (
    <section className="space-y-3">
      <BoxSidesEditor
        label="Padding"
        value={readPad(slice, inlineStyle)}
        options={SPACING_VALUES}
        arbitraryDisabledHint={hexHint}
        onChange={(next) =>
          applyTo(next, 'padding', 'p', 'px', 'py', {
            top: 'pt', right: 'pr', bottom: 'pb', left: 'pl',
          })
        }
      />
      <BoxSidesEditor
        label="Margin"
        value={readMargin(slice, inlineStyle)}
        options={SPACING_VALUES}
        arbitraryDisabledHint={hexHint}
        onChange={(next) =>
          applyTo(next, 'margin', 'm', 'mx', 'my', {
            top: 'mt', right: 'mr', bottom: 'mb', left: 'ml',
          })
        }
      />
    </section>
  )
}
