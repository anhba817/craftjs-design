import { z } from 'zod'
import type { NodeStyle } from './types'

// Phase 18 § 4 — runtime schema for `NodeStyle`. The interface in `types.ts`
// is compile-time only; this is the value used by the semantic document
// validation pass (`src/persistence/documentSemantics.ts`) to catch a corrupt
// style block (e.g. `classes` that isn't a string map) before it reaches the
// composition helpers at render time.
//
// The four "quadrants" of NodeStyle are nested string maps of increasing
// depth (see types.ts for the breakpoint × state model):
//   depth-1  slot → class                          (classes)
//   depth-2  bp → slot → class   /  slot → prop → value
//   depth-3  bp → slot → prop → value  /  bp → state → slot → class  / …
//   depth-4  bp → state → slot → prop → value
//
// Non-strict (unknown keys pass through) so a forward-compatible field added
// to a newer document doesn't fail an older runtime.

const map1 = z.record(z.string(), z.string())
const map2 = z.record(z.string(), map1)
const map3 = z.record(z.string(), map2)
const map4 = z.record(z.string(), map3)

export const nodeStyleSchema: z.ZodType<NodeStyle> = z.object({
  classes: map1,
  responsive: map2.optional(),
  inline: map2.optional(),
  responsiveInline: map3.optional(),
  states: map2.optional(),
  stateResponsive: map3.optional(),
  stateInline: map3.optional(),
  stateResponsiveInline: map4.optional(),
}) as z.ZodType<NodeStyle>
