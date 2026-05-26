// Public SDK — theme registration surface.
//
// A theme is a CSS-variable token pack scoped via a `[data-theme]`
// selector. Built-ins (`default`, `rose`) register at module load;
// SDK consumers add their own theme packs via `registerTheme`.
//
// @example
//   import { registerTheme } from '@crafted-design/editor/sdk'
//
//   registerTheme({
//     id: 'sunset',
//     displayName: 'Sunset',
//     dataThemeValue: 'sunset',
//   })
//
// Add the matching CSS in the host's stylesheet:
//
//   [data-theme="sunset"] {
//     --primary: oklch(...);
//     --primary-foreground: oklch(...);
//     --ring: oklch(...);
//     /* … other token overrides */
//   }
//
// The ThemeProvider sets `data-theme` on the canvas wrapper; the
// cascading custom properties inherit through descendants.

export type { Theme } from '../themes/types'

export {
  registerTheme,
  unregisterTheme,
  getTheme,
  listThemes,
} from '../themes/registry'
