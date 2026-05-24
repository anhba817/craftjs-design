// Phase 8 font-token registry. Designers pick fonts via the TypographyPanel;
// SDK consumers register custom fonts via registerFontToken({ id, name, family,
// url? }). The runtime injects a single <style data-craftjs-fonts> element
// into document.head and rewrites it on every register / unregister.
//
// For URL-backed fonts (Google Fonts, hosted webfonts, etc.) the style block
// includes an `@font-face` declaration so the browser fetches the font; the
// per-token `.font-<id> { font-family: ... }` rule then attaches the loaded
// font to elements using the matching Tailwind-style class.
//
// Built-ins (sans, heading, mono) are seeded at module load. They map to the
// CSS variables defined in index.css's `@theme inline` block — the injected
// rules are redundant with Tailwind's own utilities, but injecting them keeps
// the lookup path consistent (every font in listFontTokens() resolves the
// same way regardless of provenance).

export interface FontToken {
  // Used as the className suffix: `font-<id>`. Lowercase + digits + hyphens.
  id: string
  // Display name shown in the Typography panel dropdown.
  name: string
  // CSS font-family value — e.g., `'Inter Variable', sans-serif` or
  // `var(--font-sans)`.
  family: string
  // Optional URL for @font-face. When set, the runtime injects a font-face
  // declaration loading the font; the browser fetches and applies it.
  url?: string
}

const tokens = new Map<string, FontToken>()
let injectedStyleEl: HTMLStyleElement | null = null

function ensureStyleElement(): HTMLStyleElement | null {
  if (typeof document === 'undefined') return null
  if (!injectedStyleEl) {
    injectedStyleEl = document.createElement('style')
    injectedStyleEl.setAttribute('data-craftjs-fonts', '')
    document.head.appendChild(injectedStyleEl)
  }
  return injectedStyleEl
}

function rebuildStyleSheet(): void {
  const el = ensureStyleElement()
  if (!el) return
  const css: string[] = []
  for (const token of tokens.values()) {
    if (token.url) {
      // The font-family inside @font-face is what the browser uses to find
      // the loaded font. We use the token id as the family name; the per-class
      // rule below attaches it. Quoting the family handles IDs with hyphens.
      css.push(
        `@font-face { font-family: "${token.id}"; src: url("${token.url}"); font-display: swap; }`,
      )
      css.push(
        `.font-${token.id} { font-family: "${token.id}", ${escapeFamily(token.family)}; }`,
      )
    } else {
      css.push(`.font-${token.id} { font-family: ${escapeFamily(token.family)}; }`)
    }
  }
  el.textContent = css.join('\n')
}

// Pass through identifiers and quoted strings; light defense against
// trivially-bad input. The TypeScript boundary handles most validation;
// this is belt-and-suspenders.
function escapeFamily(family: string): string {
  return family.trim()
}

const ID_RE = /^[a-z0-9-]+$/

export function registerFontToken(token: FontToken): void {
  if (!ID_RE.test(token.id)) {
    throw new Error(
      `[craftjs-design] invalid font token id '${token.id}' — must match /^[a-z0-9-]+$/`,
    )
  }
  tokens.set(token.id, token)
  rebuildStyleSheet()
}

export function unregisterFontToken(id: string): boolean {
  const had = tokens.delete(id)
  if (had) rebuildStyleSheet()
  return had
}

export function getFontToken(id: string): FontToken | undefined {
  return tokens.get(id)
}

export function listFontTokens(): FontToken[] {
  return [...tokens.values()]
}

/** @internal Test-only — clears the registry between cases. */
export function _resetFontTokensForTest(): void {
  tokens.clear()
  if (injectedStyleEl) injectedStyleEl.textContent = ''
}

// Built-in tokens. They mirror the CSS variables in index.css's @theme block
// (`--font-sans`, `--font-heading`). Built-ins inject their own .font-<id>
// rule too — redundant with Tailwind's own utility CSS, but harmless.
registerFontToken({
  id: 'sans',
  name: 'Sans',
  family: 'var(--font-sans)',
})
registerFontToken({
  id: 'heading',
  name: 'Heading',
  family: 'var(--font-heading)',
})
registerFontToken({
  id: 'mono',
  name: 'Mono',
  family: 'ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Monaco, Consolas, monospace',
})
