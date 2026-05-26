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

/** A font-family choice the designer can apply via the Typography panel. */
export interface FontToken {
  /**
   * Used as the className suffix: `font-<id>`. Must match
   * `/^[a-z0-9-]+$/` (lowercase + digits + hyphens).
   */
  id: string
  /** Display name shown in the Typography panel dropdown. */
  name: string
  /**
   * CSS `font-family` value, e.g. `'Inter Variable', sans-serif` or
   * `var(--font-sans)`. When `url` is set, the token's id is prepended
   * as the primary family so the loaded font is used.
   */
  family: string
  /**
   * Optional URL for `@font-face`. When set, the runtime injects an
   * `@font-face` declaration that loads the font; the browser fetches
   * and applies it.
   */
  url?: string
}

const tokens = new Map<string, FontToken>()
let injectedStyleEl: HTMLStyleElement | null = null

// Phase 10 § 2.7 — hot-reload subscription. Mirrors the canonical-registry
// pattern (src/registry/registry.ts): the version increments on every
// register / unregister; subscribers re-run via useSyncExternalStore so
// the TypographyPanel's Font dropdown reflects post-mount registrations
// without remounting the panel.
let registryVersion = 0
const registryListeners = new Set<() => void>()

/**
 * Monotonically-increasing counter incremented on every font-token
 * registry mutation (register or unregister). Consumed via
 * `useSyncExternalStore` so the Typography panel's Font dropdown picks
 * up post-mount registrations automatically.
 */
export function getFontRegistryVersion(): number {
  return registryVersion
}

/** Subscribe to font-registry version bumps. Returns an unsubscribe function. */
export function subscribeFontRegistry(cb: () => void): () => void {
  registryListeners.add(cb)
  return () => {
    registryListeners.delete(cb)
  }
}

function bumpFontRegistry(): void {
  registryVersion += 1
  for (const cb of registryListeners) cb()
}

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

/**
 * Register a font token so it appears in the Typography panel's Font
 * dropdown. URL-backed tokens trigger an `@font-face` declaration; the
 * browser fetches the font and the per-token `.font-<id>` CSS rule
 * applies it.
 *
 * Throws if `token.id` doesn't match `/^[a-z0-9-]+$/`. Use
 * `unregisterFontToken(id)` first to replace a built-in.
 *
 * @example
 * ```ts
 * import { registerFontToken } from '@crafted-design/editor/sdk'
 *
 * registerFontToken({
 *   id: 'inter',
 *   name: 'Inter',
 *   family: '"Inter Variable", sans-serif',
 *   url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
 * })
 * ```
 */
export function registerFontToken(token: FontToken): void {
  if (!ID_RE.test(token.id)) {
    throw new Error(
      `[craftjs-design] invalid font token id '${token.id}' — must match /^[a-z0-9-]+$/`,
    )
  }
  tokens.set(token.id, token)
  rebuildStyleSheet()
  bumpFontRegistry()
}

/**
 * Remove a font token by id. Returns `true` if a token was removed,
 * `false` if the id wasn't registered.
 */
export function unregisterFontToken(id: string): boolean {
  const had = tokens.delete(id)
  if (had) {
    rebuildStyleSheet()
    bumpFontRegistry()
  }
  return had
}

/** Look up a font token by id; returns `undefined` if not registered. */
export function getFontToken(id: string): FontToken | undefined {
  return tokens.get(id)
}

/** All registered font tokens, in registration order. */
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
