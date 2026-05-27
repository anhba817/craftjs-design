// Public SDK — theme registration surface.
//
// A theme is a CSS-variable token pack scoped via a `[data-theme]`
// selector. Built-ins register at module load (`default`, `rose`, plus
// the token-authored `green`/`blue`/`slate`/`zinc`/`neutral`); SDK
// consumers add their own packs via `registerTheme`.
//
// There are two ways to author a theme:
//
// 1. Token-driven (recommended) — pass a small `tokens` map; the full
//    shadcn core token set is derived and the `[data-theme]` CSS block is
//    generated + injected for you. Hosts pass 3–4 colors, not 20:
//
//      import { registerTheme } from '@crafted-design/editor/sdk'
//
//      registerTheme({
//        id: 'sunset',
//        displayName: 'Sunset',
//        tokens: {
//          primary: 'oklch(0.7 0.18 40)',
//          primaryForeground: 'oklch(0.98 0.02 40)',
//        },
//      })
//
//    `dataThemeValue` defaults to the id. Unspecified tokens
//    (card/popover/border/ring/…) are derived from the ones you pass.
//
// 2. CSS-driven (legacy) — omit `tokens` and write the matching block in
//    the host's own stylesheet. This is how the built-in 'rose' works:
//
//      registerTheme({ id: 'sunset', displayName: 'Sunset', dataThemeValue: 'sunset' })
//
//      [data-theme="sunset"] { --primary: oklch(...); /* … */ }
//
// The ThemeProvider sets `data-theme` on the canvas wrapper; the
// cascading custom properties inherit through descendants.

export type { Theme, ThemeInput } from '../themes/types'
export type { ThemeTokens } from '../themes/tokens'
export { deriveTokens } from '../themes/tokens'

export {
  registerTheme,
  unregisterTheme,
  getTheme,
  listThemes,
} from '../themes/registry'
