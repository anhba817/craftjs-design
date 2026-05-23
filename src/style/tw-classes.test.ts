import { describe, expect, it } from 'vitest'
import {
  mergeAppearance,
  mergeEffects,
  mergeLayout,
  mergeSize,
  mergeSpacing,
  mergeTypography,
  parseAppearance,
  parseEffects,
  parseLayout,
  parseSize,
  parseSpacing,
  parseTypography,
} from './tw-classes'

// Round-trip helper: parse → merge with empty patch → token set unchanged.
function sorted(s: string): string[] {
  return s.split(/\s+/).filter(Boolean).sort()
}

// ============================================================================
// Typography slice
// ============================================================================

describe('parseTypography', () => {
  it('extracts every recognized field', () => {
    const { slice, unknownClasses } = parseTypography(
      'text-2xl font-bold text-center text-primary',
    )
    expect(slice).toEqual({
      fontSize: '2xl',
      fontWeight: 'bold',
      textAlign: 'center',
      textColor: 'primary',
    })
    expect(unknownClasses).toEqual([])
  })

  it('passes unrecognized classes through to unknownClasses', () => {
    const { slice, unknownClasses } = parseTypography('text-lg bg-card border rounded')
    expect(slice).toEqual({ fontSize: 'lg' })
    // bg-card / border / rounded are appearance classes; the typography parser
    // doesn't recognize them — they pass through as unknownClasses.
    expect(sorted(unknownClasses.join(' '))).toEqual(['bg-card', 'border', 'rounded'])
  })

  it('disambiguates text-center (align) from text-foreground (color)', () => {
    const { slice } = parseTypography('text-center text-foreground')
    expect(slice.textAlign).toBe('center')
    expect(slice.textColor).toBe('foreground')
  })

  it('handles empty string', () => {
    expect(parseTypography('')).toEqual({ slice: {}, unknownClasses: [] })
  })

  it('handles extra whitespace', () => {
    const { slice } = parseTypography('  text-base   font-bold  ')
    expect(slice).toEqual({ fontSize: 'base', fontWeight: 'bold' })
  })
})

describe('mergeTypography', () => {
  it('replaces a single field, preserves the rest', () => {
    const result = mergeTypography('text-base text-foreground font-bold', { fontSize: '2xl' })
    expect(sorted(result)).toEqual(['font-bold', 'text-2xl', 'text-foreground'])
  })

  it('passes unknown classes through unchanged', () => {
    const result = mergeTypography('text-base bg-card border', { fontSize: 'xl' })
    expect(sorted(result)).toEqual(['bg-card', 'border', 'text-xl'])
  })

  it('undefined patch field unsets that utility', () => {
    const result = mergeTypography('text-base font-bold', { fontWeight: undefined })
    expect(sorted(result)).toEqual(['text-base'])
  })

  it('empty patch is a no-op (round-trip preserves everything)', () => {
    const input = 'text-base text-primary bg-card'
    expect(sorted(mergeTypography(input, {}))).toEqual(sorted(input))
  })
})

// ============================================================================
// Layout slice
// ============================================================================

describe('parseLayout', () => {
  it('extracts every recognized field', () => {
    const { slice, unknownClasses } = parseLayout('flex flex-col items-center justify-between gap-4')
    expect(slice).toEqual({
      display: 'flex',
      flexDirection: 'col',
      alignItems: 'center',
      justifyContent: 'between',
      gap: '4',
    })
    expect(unknownClasses).toEqual([])
  })

  it('handles bare display utilities', () => {
    const { slice } = parseLayout('grid')
    expect(slice.display).toBe('grid')
  })

  it('passes unrecognized classes through', () => {
    const { slice, unknownClasses } = parseLayout('flex p-4 text-foreground')
    expect(slice).toEqual({ display: 'flex' })
    expect(sorted(unknownClasses.join(' '))).toEqual(['p-4', 'text-foreground'])
  })
})

describe('mergeLayout', () => {
  it('patches one field', () => {
    const result = mergeLayout('flex flex-row gap-2', { flexDirection: 'col' })
    expect(sorted(result)).toEqual(['flex', 'flex-col', 'gap-2'])
  })

  it('preserves non-layout classes', () => {
    const result = mergeLayout('flex p-4 text-foreground', { gap: '4' })
    expect(sorted(result)).toEqual(['flex', 'gap-4', 'p-4', 'text-foreground'])
  })
})

// ============================================================================
// Spacing slice
// ============================================================================

describe('parseSpacing', () => {
  it('extracts padding shorthands and per-side', () => {
    const { slice } = parseSpacing('p-4 px-6 pt-2 m-0 my-1.5')
    expect(slice).toEqual({ p: '4', px: '6', pt: '2', m: '0', my: '1.5' })
  })

  it('handles fractional values (0.5, 1.5)', () => {
    const { slice } = parseSpacing('p-0.5 m-1.5')
    expect(slice.p).toBe('0.5')
    expect(slice.m).toBe('1.5')
  })

  it('passes other classes through', () => {
    const { slice, unknownClasses } = parseSpacing('p-4 flex bg-card')
    expect(slice).toEqual({ p: '4' })
    expect(sorted(unknownClasses.join(' '))).toEqual(['bg-card', 'flex'])
  })
})

describe('mergeSpacing', () => {
  it('patches multiple sides independently', () => {
    const result = mergeSpacing('p-4', { pt: '6', pl: '2' })
    expect(sorted(result)).toEqual(['p-4', 'pl-2', 'pt-6'])
  })

  it('round-trip is stable in serializer order', () => {
    const input = 'm-2 mx-4 p-1 pl-8'
    expect(sorted(mergeSpacing(input, {}))).toEqual(sorted(input))
  })
})

// ============================================================================
// Size slice
// ============================================================================

describe('parseSize', () => {
  it('extracts width, height, min/max', () => {
    const { slice } = parseSize('w-full h-32 min-w-0 max-w-96')
    expect(slice).toEqual({ w: 'full', h: '32', 'min-w': '0', 'max-w': '96' })
  })

  it('handles fractional widths (1/2, 1/3, 2/3)', () => {
    const { slice } = parseSize('w-1/2 h-2/3')
    expect(slice.w).toBe('1/2')
    expect(slice.h).toBe('2/3')
  })

  it('w-auto vs h-auto', () => {
    const { slice } = parseSize('w-auto h-auto')
    expect(slice).toEqual({ w: 'auto', h: 'auto' })
  })
})

describe('mergeSize', () => {
  it('patches a single dimension', () => {
    const result = mergeSize('w-full h-32', { h: '48' })
    expect(sorted(result)).toEqual(['h-48', 'w-full'])
  })
})

// ============================================================================
// Appearance slice
// ============================================================================

describe('parseAppearance', () => {
  it('extracts bg, border (style+width+color), radius', () => {
    const { slice } = parseAppearance('bg-card border-2 border-dashed border-primary rounded-md')
    expect(slice).toEqual({
      bg: 'card',
      borderWidth: '2',
      borderStyle: 'dashed',
      borderColor: 'primary',
      rounded: 'md',
    })
  })

  it('handles bare `border` as default width', () => {
    const { slice } = parseAppearance('border')
    expect(slice.borderWidth).toBe('default')
  })

  it('handles bare `rounded` as default radius', () => {
    const { slice } = parseAppearance('rounded')
    expect(slice.rounded).toBe('default')
  })

  it('disambiguates border-2 (width) vs border-dashed (style) vs border-primary (color)', () => {
    const { slice } = parseAppearance('border-2 border-solid border-foreground')
    expect(slice.borderWidth).toBe('2')
    expect(slice.borderStyle).toBe('solid')
    expect(slice.borderColor).toBe('foreground')
  })

  it('passes other classes through', () => {
    const { slice, unknownClasses } = parseAppearance('bg-card p-4 text-foreground')
    expect(slice).toEqual({ bg: 'card' })
    expect(sorted(unknownClasses.join(' '))).toEqual(['p-4', 'text-foreground'])
  })
})

describe('mergeAppearance', () => {
  it('serializes default values as bare classes', () => {
    const result = mergeAppearance('', { borderWidth: 'default', rounded: 'default' })
    expect(sorted(result)).toEqual(['border', 'rounded'])
  })

  it('round-trips a phase-2 Box default', () => {
    const input = 'border border-dashed border-border rounded-md bg-card'
    const out = mergeAppearance(input, {})
    expect(sorted(out)).toEqual(sorted(input))
  })

  it('patches only border color', () => {
    const result = mergeAppearance('border border-border bg-card', { borderColor: 'primary' })
    expect(sorted(result)).toEqual(['bg-card', 'border', 'border-primary'])
  })
})

// ============================================================================
// Effects slice
// ============================================================================

describe('parseEffects', () => {
  it('extracts shadow, opacity, blur', () => {
    const { slice } = parseEffects('shadow-md opacity-50 blur-sm')
    expect(slice).toEqual({ shadow: 'md', opacity: '50', blur: 'sm' })
  })

  it('handles bare `shadow` as default', () => {
    const { slice } = parseEffects('shadow')
    expect(slice.shadow).toBe('default')
  })

  it('handles bare `blur` as default', () => {
    const { slice } = parseEffects('blur')
    expect(slice.blur).toBe('default')
  })

  it('passes other classes through', () => {
    const { slice, unknownClasses } = parseEffects('shadow-lg p-4 bg-card')
    expect(slice).toEqual({ shadow: 'lg' })
    expect(sorted(unknownClasses.join(' '))).toEqual(['bg-card', 'p-4'])
  })
})

describe('mergeEffects', () => {
  it('serializes default shadow as bare class', () => {
    const result = mergeEffects('', { shadow: 'default' })
    expect(sorted(result)).toEqual(['shadow'])
  })

  it('patches opacity, preserves shadow', () => {
    const result = mergeEffects('shadow-md opacity-100', { opacity: '50' })
    expect(sorted(result)).toEqual(['opacity-50', 'shadow-md'])
  })
})

// ============================================================================
// Cross-slice: each parser only owns its prefix family
// ============================================================================

describe('cross-slice isolation', () => {
  it('typography parser ignores spacing/appearance/layout classes', () => {
    const { slice, unknownClasses } = parseTypography(
      'text-lg p-4 bg-card flex shadow-md',
    )
    expect(slice).toEqual({ fontSize: 'lg' })
    expect(sorted(unknownClasses.join(' '))).toEqual([
      'bg-card', 'flex', 'p-4', 'shadow-md',
    ])
  })

  it('layout parser ignores typography/appearance classes', () => {
    const { slice, unknownClasses } = parseLayout('flex text-lg bg-card')
    expect(slice).toEqual({ display: 'flex' })
    expect(sorted(unknownClasses.join(' '))).toEqual(['bg-card', 'text-lg'])
  })

  it('mergeTypography preserves classes from other slices', () => {
    const input = 'text-base bg-card p-4 flex shadow-md rounded-lg'
    const out = mergeTypography(input, { fontSize: '2xl' })
    expect(sorted(out)).toEqual(['bg-card', 'flex', 'p-4', 'rounded-lg', 'shadow-md', 'text-2xl'])
  })

  it('mergeAppearance preserves classes from other slices', () => {
    const input = 'text-base bg-card p-4 flex shadow-md rounded-lg'
    const out = mergeAppearance(input, { bg: 'muted' })
    expect(sorted(out)).toEqual(['bg-muted', 'flex', 'p-4', 'rounded-lg', 'shadow-md', 'text-base'])
  })
})
