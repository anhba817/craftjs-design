// Phase 12 § 4.14 — WCAG color-contrast checking. The pure math
// (relativeLuminance / contrastRatio / contrastGrade) is fully testable;
// the DOM resolvers below let the browser do the heavy lifting of turning
// any CSS color (hex, rgb, oklch, var(--x), named) into concrete sRGB so
// the math works regardless of the source color space.

import type { Rgb } from './color-conversions'

// WCAG 2.x relative luminance. Channels are 0..255.
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// WCAG contrast ratio, 1..21. Order-independent (lighter/darker sorted).
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

export type ContrastGrade = 'AAA' | 'AA' | 'AA Large' | 'Fail'

// Grade a ratio per WCAG 2.x.
//   Normal text: AA ≥ 4.5, AAA ≥ 7. Between 3 and 4.5 it only clears AA
//   for *large* text, reported as 'AA Large'.
//   Large text (≥ 18pt, or 14pt bold): AA ≥ 3, AAA ≥ 4.5.
export function contrastGrade(ratio: number, largeText = false): ContrastGrade {
  if (largeText) {
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3) return 'AA'
    return 'Fail'
  }
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

// Convert an OKLCH triple to sRGB (0..255). Björn Ottosson's reference
// matrices (OKLab → linear sRGB) + the sRGB transfer function. Needed
// because modern browsers return `getComputedStyle().color` for oklch
// tokens *as* oklch (preserving the color space), not as legacy rgb — so a
// theme token / design variable resolves to e.g. "oklch(0.205 0 0)".
function srgbFromLinear(x: number): number {
  const v =
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, v)) * 255)
}

export function oklchToRgb(L: number, C: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return {
    r: srgbFromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: srgbFromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: srgbFromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

const RGB_RE =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/
const OKLCH_RE = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?(?:[\s/]+([\d.]+%?))?/i

const pct = (s: string): number =>
  s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s)

// Parse a computed color string into r/g/b (+ alpha) — handles both the
// legacy `rgb(…)`/`rgba(…)` form and the modern `oklch(…)` form browsers
// now emit for oklch-defined custom properties.
function parseComputedColor(value: string): (Rgb & { a: number }) | null {
  const v = value.trim()
  const m = RGB_RE.exec(v)
  if (m) {
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] === undefined ? 1 : Number(m[4]),
    }
  }
  const o = OKLCH_RE.exec(v)
  if (o) {
    const rgb = oklchToRgb(pct(o[1]), parseFloat(o[2]), parseFloat(o[3]))
    return { ...rgb, a: o[4] === undefined ? 1 : pct(o[4]) }
  }
  return null
}

// Resolve any CSS color string to sRGB by letting the browser compute it.
// Returns null outside the DOM or when the value can't be parsed.
export function resolveCssColorToRgb(color: string): Rgb | null {
  if (typeof document === 'undefined') return null
  let probe: HTMLDivElement | null = null
  try {
    probe = document.createElement('div')
    probe.style.color = color
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    document.body.appendChild(probe)
    const parsed = parseComputedColor(getComputedStyle(probe).color)
    return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : null
  } catch {
    return null
  } finally {
    probe?.remove()
  }
}

// The element's own resolved text color (handles inherited colors — a text
// node with no explicit color still computes to its inherited value).
export function resolveElementTextColor(el: Element | null): Rgb | null {
  if (!el || typeof window === 'undefined') return null
  const parsed = parseComputedColor(getComputedStyle(el).color)
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : null
}

// Find the effective background behind an element by walking ancestors until
// a non-transparent backgroundColor is found. Returns null if everything up
// the tree is transparent (the contrast badge then shows "unknown bg").
export function resolveEffectiveBackground(el: Element | null): Rgb | null {
  if (typeof window === 'undefined') return null
  let node: Element | null = el
  while (node) {
    const parsed = parseComputedColor(getComputedStyle(node).backgroundColor)
    if (parsed && parsed.a > 0) return { r: parsed.r, g: parsed.g, b: parsed.b }
    node = node.parentElement
  }
  return null
}
