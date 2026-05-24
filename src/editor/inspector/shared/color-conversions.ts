// Pure color-space conversions for the ColorPicker's HSL/RGB slider modes.
// Hex is the canonical string format throughout the editor (matches the
// existing ColorPickerValue.hex contract); these helpers shuttle between hex
// and the slider-friendly RGB / HSL tuples.
//
// All inputs are clamped to valid ranges. Invalid hex inputs (malformed string,
// wrong length) parse to black (#000000) rather than throwing — sliders should
// stay responsive even mid-edit.

export interface Rgb {
  r: number // 0..255
  g: number // 0..255
  b: number // 0..255
}

export interface Hsl {
  h: number // 0..360
  s: number // 0..100
  l: number // 0..100
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function pad2(s: string): string {
  return s.length === 1 ? `0${s}` : s
}

// Normalizes a hex string to lowercase 6-char form. Accepts '#rgb', '#rrggbb',
// with or without the leading hash. Returns null on garbage so callers can
// fall back gracefully.
export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) {
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
  }
  if (/^[0-9a-f]{6}$/.test(s)) {
    return `#${s}`
  }
  return null
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex)
  if (!normalized) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

export function rgbToHex(rgb: Rgb): string {
  const r = clamp(Math.round(rgb.r), 0, 255)
  const g = clamp(Math.round(rgb.g), 0, 255)
  const b = clamp(Math.round(rgb.b), 0, 255)
  return `#${pad2(r.toString(16))}${pad2(g.toString(16))}${pad2(b.toString(16))}`
}

// RGB → HSL via the standard min/max formula. Hue is undefined for grayscale
// (delta = 0); we return 0 in that case, which keeps the hue slider stable.
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = clamp(rgb.r, 0, 255) / 255
  const g = clamp(rgb.g, 0, 255) / 255
  const b = clamp(rgb.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6
        break
      case g:
        h = (b - r) / delta + 2
        break
      default:
        h = (r - g) / delta + 4
        break
    }
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// HSL → RGB via the chroma/X/M algorithm. Inputs are clamped first so out-of-
// range slider values (e.g., negative drag) don't produce NaN.
export function hslToRgb(hsl: Hsl): Rgb {
  // Hue is angular — wrap into [0, 360) rather than clamping. Clamping would
  // collapse 420 → 360 → 0 (red), which loses the intent (420 means yellow).
  const h = ((hsl.h % 360) + 360) % 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c
    gp = x
  } else if (h < 120) {
    rp = x
    gp = c
  } else if (h < 180) {
    gp = c
    bp = x
  } else if (h < 240) {
    gp = x
    bp = c
  } else if (h < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl))
}
