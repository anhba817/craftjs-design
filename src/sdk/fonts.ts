// Public SDK — custom font token registration.
//
// Designers pick fonts via the TypographyPanel's Font dropdown. The editor
// ships three built-in tokens (`sans`, `heading`, `mono`) that map to the
// CSS variables in index.css. SDK consumers add more via registerFontToken;
// the runtime injects an `@font-face` declaration (for URL-backed fonts) and
// a `.font-<id> { font-family: ... }` rule into document.head, then the
// dropdown lists the new token on next panel render.
//
// @example
//   import { registerFontToken } from '@design/sdk'
//
//   registerFontToken({
//     id: 'inter',
//     name: 'Inter',
//     family: '"Inter Variable", sans-serif',
//     url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
//   })
//
// After registration, "inter" appears in the Typography panel's Font dropdown.
// Selecting it applies `font-inter` to the slot's classes; the rendered
// element uses the loaded font.

export type { FontToken } from '../registry/fonts'

export {
  registerFontToken,
  unregisterFontToken,
  listFontTokens,
} from '../registry/fonts'
