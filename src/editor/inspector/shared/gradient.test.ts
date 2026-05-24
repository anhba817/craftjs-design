import { describe, expect, it } from 'vitest'
import {
  MAX_STOPS,
  MIN_STOPS,
  addStop,
  defaultGradient,
  gradientToCss,
  parseGradient,
  removeStop,
  sortStops,
  updateStop,
  type Gradient,
} from './gradient'

const linear: Gradient = {
  type: 'linear',
  angle: 45,
  position: { x: 50, y: 50 },
  stops: [
    { color: '#ff0000', position: 0 },
    { color: '#00ff00', position: 100 },
  ],
}

const radial: Gradient = {
  type: 'radial',
  angle: 90,
  position: { x: 30, y: 70 },
  stops: [
    { color: '#000000', position: 0 },
    { color: '#ffffff', position: 100 },
  ],
}

describe('gradientToCss', () => {
  it('serializes a linear gradient', () => {
    expect(gradientToCss(linear)).toBe(
      'linear-gradient(45deg, #ff0000 0%, #00ff00 100%)',
    )
  })

  it('serializes a radial gradient', () => {
    expect(gradientToCss(radial)).toBe(
      'radial-gradient(circle at 30% 70%, #000000 0%, #ffffff 100%)',
    )
  })

  it('sorts stops before serializing', () => {
    const g: Gradient = {
      ...linear,
      stops: [
        { color: '#0000ff', position: 50 },
        { color: '#ff0000', position: 0 },
        { color: '#00ff00', position: 100 },
      ],
    }
    expect(gradientToCss(g)).toBe(
      'linear-gradient(45deg, #ff0000 0%, #0000ff 50%, #00ff00 100%)',
    )
  })

  it('normalizes angle to [0, 360)', () => {
    expect(gradientToCss({ ...linear, angle: 720 })).toContain('0deg')
    expect(gradientToCss({ ...linear, angle: -90 })).toContain('270deg')
  })
})

describe('parseGradient', () => {
  it('round-trips a linear gradient', () => {
    const css = gradientToCss(linear)
    expect(parseGradient(css)).toEqual(linear)
  })

  it('round-trips a radial gradient', () => {
    const css = gradientToCss(radial)
    expect(parseGradient(css)).toEqual(radial)
  })

  it('accepts a 3-char hex stop (normalized to 6-char)', () => {
    const css = 'linear-gradient(0deg, #f00 0%, #0f0 100%)'
    expect(parseGradient(css)).toEqual({
      type: 'linear',
      angle: 0,
      position: { x: 50, y: 50 },
      stops: [
        { color: '#ff0000', position: 0 },
        { color: '#00ff00', position: 100 },
      ],
    })
  })

  it('returns null for unknown formats', () => {
    expect(parseGradient('linear-gradient(red, blue)')).toBeNull()
    expect(parseGradient('conic-gradient(from 0deg, red, blue)')).toBeNull()
    expect(parseGradient('not a gradient')).toBeNull()
    expect(parseGradient('linear-gradient(45deg, #ff0000 0%)')).toBeNull() // 1 stop
  })

  it('returns null when a stop position is out of range', () => {
    expect(
      parseGradient('linear-gradient(0deg, #f00 -5%, #0f0 100%)'),
    ).toBeNull()
    expect(
      parseGradient('linear-gradient(0deg, #f00 0%, #0f0 150%)'),
    ).toBeNull()
  })
})

describe('sortStops', () => {
  it('orders by position ascending', () => {
    const out = sortStops([
      { color: '#000', position: 80 },
      { color: '#fff', position: 20 },
      { color: '#888', position: 50 },
    ])
    expect(out.map((s) => s.position)).toEqual([20, 50, 80])
  })

  it('does not mutate the input', () => {
    const input = [
      { color: '#000', position: 50 },
      { color: '#fff', position: 0 },
    ]
    sortStops(input)
    expect(input.map((s) => s.position)).toEqual([50, 0])
  })
})

describe('addStop / removeStop / updateStop', () => {
  it('addStop inserts at the largest gap with a blended color', () => {
    const g: Gradient = {
      ...linear,
      stops: [
        { color: '#000000', position: 0 },
        { color: '#ffffff', position: 100 },
      ],
    }
    const next = addStop(g)!
    expect(next.stops).toHaveLength(3)
    // The new stop sits roughly in the middle.
    const newStop = next.stops[2]
    expect(newStop.position).toBeGreaterThan(30)
    expect(newStop.position).toBeLessThan(70)
    // And its color is the blend of black + white = gray.
    expect(newStop.color).toBe('#808080')
  })

  it('addStop returns null at MAX_STOPS', () => {
    const g: Gradient = {
      ...linear,
      stops: Array.from({ length: MAX_STOPS }, (_, i) => ({
        color: '#000000',
        position: (i * 100) / (MAX_STOPS - 1),
      })),
    }
    expect(addStop(g)).toBeNull()
  })

  it('removeStop honors MIN_STOPS', () => {
    const g: Gradient = {
      ...linear,
      stops: [
        { color: '#000000', position: 0 },
        { color: '#ffffff', position: 100 },
      ],
    }
    // At minimum already — removing must be a no-op.
    expect(removeStop(g, 0)).toEqual(g)
  })

  it('removeStop drops the stop at the given index', () => {
    const g: Gradient = {
      ...linear,
      stops: [
        { color: '#000000', position: 0 },
        { color: '#888888', position: 50 },
        { color: '#ffffff', position: 100 },
      ],
    }
    expect(removeStop(g, 1).stops.map((s) => s.color)).toEqual([
      '#000000',
      '#ffffff',
    ])
  })

  it('updateStop patches only the target stop', () => {
    const next = updateStop(linear, 1, { color: '#0000ff', position: 80 })
    expect(next.stops).toEqual([
      { color: '#ff0000', position: 0 },
      { color: '#0000ff', position: 80 },
    ])
  })
})

describe('defaultGradient', () => {
  it('returns a 2-stop linear gradient', () => {
    const g = defaultGradient()
    expect(g.type).toBe('linear')
    expect(g.stops.length).toBe(MIN_STOPS)
  })
})
