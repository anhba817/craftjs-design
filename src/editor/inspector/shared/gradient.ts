import { normalizeHex } from './color-conversions'

// Pure data + (de)serialization for the GradientEditor. We only handle the
// gradient shapes we *generate* — no attempt to parse arbitrary user CSS
// (could contain color names, rgb(), CSS variables, multiple positions per
// stop, etc.). `parseGradient` returns null on anything we don't recognize so
// the caller can fall back to "this is a solid color" or treat the inline
// value as opaque pass-through.

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  color: string // normalized hex — '#rrggbb' lowercase
  position: number // 0..100, integer
}

export interface Gradient {
  type: GradientType
  // Linear only — direction in degrees, 0=up, 90=right, 180=down, 270=left.
  angle: number
  // Radial only — center position as percent of the box.
  position: { x: number; y: number }
  stops: GradientStop[]
}

export const MIN_STOPS = 2
export const MAX_STOPS = 8

// Builders -----------------------------------------------------------------

export function defaultGradient(): Gradient {
  return {
    type: 'linear',
    angle: 90,
    position: { x: 50, y: 50 },
    stops: [
      { color: '#2563eb', position: 0 }, // Tailwind blue-600
      { color: '#7c3aed', position: 100 }, // Tailwind violet-600
    ],
  }
}

export function sortStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((a, b) => a.position - b.position)
}

// Serialize ----------------------------------------------------------------

export function gradientToCss(g: Gradient): string {
  // Stops are sorted at serialization time so the CSS reflects ascending
  // positions regardless of the editor's internal order. Designers can drag
  // stops in any order; the rendered output stays consistent.
  const stopList = sortStops(g.stops)
    .map((s) => `${s.color} ${roundPos(s.position)}%`)
    .join(', ')
  if (g.type === 'linear') {
    return `linear-gradient(${roundAngle(g.angle)}deg, ${stopList})`
  }
  return `radial-gradient(circle at ${roundPos(g.position.x)}% ${roundPos(
    g.position.y,
  )}%, ${stopList})`
}

function roundAngle(v: number): number {
  return ((Math.round(v) % 360) + 360) % 360
}
function roundPos(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}

// Parse --------------------------------------------------------------------

const LINEAR_RE = /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\s*\)$/
const RADIAL_RE =
  /^radial-gradient\(\s*circle\s+at\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*,\s*(.+)\s*\)$/
const STOP_RE = /^(#[0-9a-fA-F]{3,6})\s+(\d+(?:\.\d+)?)%$/

function parseStops(rest: string): GradientStop[] | null {
  const parts = rest.split(',').map((s) => s.trim())
  const stops: GradientStop[] = []
  for (const p of parts) {
    const m = STOP_RE.exec(p)
    if (!m) return null
    const color = normalizeHex(m[1])
    if (!color) return null
    const position = Number(m[2])
    if (Number.isNaN(position) || position < 0 || position > 100) return null
    stops.push({ color, position: Math.round(position) })
  }
  if (stops.length < MIN_STOPS) return null
  return stops
}

export function parseGradient(css: string): Gradient | null {
  const trimmed = css.trim()
  const linear = LINEAR_RE.exec(trimmed)
  if (linear) {
    const stops = parseStops(linear[2])
    if (!stops) return null
    return {
      type: 'linear',
      angle: roundAngle(Number(linear[1])),
      position: { x: 50, y: 50 },
      stops,
    }
  }
  const radial = RADIAL_RE.exec(trimmed)
  if (radial) {
    const stops = parseStops(radial[3])
    if (!stops) return null
    return {
      type: 'radial',
      angle: 90,
      position: {
        x: roundPos(Number(radial[1])),
        y: roundPos(Number(radial[2])),
      },
      stops,
    }
  }
  return null
}

// Stop helpers — used by the editor's add/remove/update operations ---------

export function addStop(
  g: Gradient,
  beforeStops = g.stops,
): Gradient | null {
  if (beforeStops.length >= MAX_STOPS) return null
  // Insert at the median position between the two stops with the largest gap.
  const sorted = sortStops(beforeStops)
  let bestGap = -1
  let insertPos = 50
  let prevColor = sorted[0].color
  let nextColor = sorted[sorted.length - 1].color
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].position - sorted[i].position
    if (gap > bestGap) {
      bestGap = gap
      insertPos = sorted[i].position + gap / 2
      prevColor = sorted[i].color
      nextColor = sorted[i + 1].color
    }
  }
  // Blend the two neighbor colors so the new stop sits visually between them.
  const newStop: GradientStop = {
    color: blendHex(prevColor, nextColor),
    position: Math.round(insertPos),
  }
  return { ...g, stops: [...beforeStops, newStop] }
}

export function removeStop(g: Gradient, index: number): Gradient {
  if (g.stops.length <= MIN_STOPS) return g
  return { ...g, stops: g.stops.filter((_, i) => i !== index) }
}

export function updateStop(
  g: Gradient,
  index: number,
  patch: Partial<GradientStop>,
): Gradient {
  return {
    ...g,
    stops: g.stops.map((s, i) => (i === index ? { ...s, ...patch } : s)),
  }
}

// Simple per-channel midpoint blend. Good enough for "give me a color between
// these two stops"; not a perceptual interpolation.
function blendHex(a: string, b: string): string {
  const na = normalizeHex(a)
  const nb = normalizeHex(b)
  if (!na || !nb) return '#808080'
  const ar = parseInt(na.slice(1, 3), 16)
  const ag = parseInt(na.slice(3, 5), 16)
  const ab = parseInt(na.slice(5, 7), 16)
  const br = parseInt(nb.slice(1, 3), 16)
  const bg = parseInt(nb.slice(3, 5), 16)
  const bb = parseInt(nb.slice(5, 7), 16)
  const r = Math.round((ar + br) / 2)
  const g = Math.round((ag + bg) / 2)
  const blue = Math.round((ab + bb) / 2)
  return `#${[r, g, blue]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}
