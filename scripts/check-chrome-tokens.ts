import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Phase 19 Group B — editor-chrome token guard.
//
// Every color in the editor chrome (src/editor/**) must flow through the
// scoped --ed-* tokens (bg-ed-surface, text-ed-text-muted, …) so the host's
// `editorTheme` can restyle the whole chrome by swapping CSS variables.
// This guard fails CI when a chrome file reintroduces either:
//
//   1. a hardcoded palette literal (`bg-white`, any `*-gray-N` utility), or
//   2. a borrowed CANVAS theme token (`bg-primary`, `text-muted-foreground`,
//      `border-border`, …) — those belong to the DOCUMENT theme
//      (registerTheme / colorMode) and must not leak into chrome styling.
//
// Allowed on purpose (theme-independent):
//   - `bg-black` — scrims/backdrops are black in light AND dark chrome.
//   - `text-white` — labels on fixed-color status buttons (amber, danger).
//   - ThemeEditorDialog.tsx — its PreviewStrip intentionally paints with
//     canvas tokens to preview the document theme being edited.
//
// Run: npm run check:chrome   (CI runs it next to check:size)

const CHROME_DIR = 'src/editor'

// Files allowed to use CANVAS tokens (rule 2 only — palette literals are
// still forbidden everywhere).
const CANVAS_TOKEN_ALLOWLIST = new Set([
  'src/editor/theme/ThemeEditorDialog.tsx',
])

const UTILITY_PREFIX = String.raw`(?<![\w-])(?:[a-z-]+:)*`
const SUFFIX = String.raw`(?![\w-])`

const PALETTE_LITERALS = new RegExp(
  UTILITY_PREFIX +
    String.raw`(?:(?:bg|text|border(?:-[trblxy])?|ring|outline|divide|placeholder|fill|stroke|from|via|to|shadow|caret|decoration|accent)-gray-\d+|bg-white)` +
    SUFFIX,
  'g',
)

const CANVAS_TOKENS = new RegExp(
  UTILITY_PREFIX +
    String.raw`(?:bg|text|border(?:-[trblxy])?|ring|outline|divide|placeholder|fill|stroke)-(?!ed-)(?:muted-foreground|muted|primary-foreground|primary|secondary-foreground|secondary|accent-foreground|accent|destructive-foreground|destructive|background|foreground|popover-foreground|popover|card-foreground|card|border|input|ring|sidebar(?:-[a-z-]+)?)` +
    SUFFIX,
  'g',
)

// `text-white` / `bg-black` are intentionally NOT matched by
// PALETTE_LITERALS above (white is only forbidden as `bg-white`; black not
// at all) — see the allowlist note in the header.

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx)$/.test(name)) yield p
  }
}

let failures = 0

for (const file of walk(CHROME_DIR)) {
  const rel = relative('.', file).replaceAll('\\', '/')
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    // Skip comment lines — prose like "the text-input hex display" isn't a
    // utility class. (Utilities only matter inside string literals, and
    // those never start a line with // or *.)
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
    for (const m of line.matchAll(PALETTE_LITERALS)) {
      failures++
      console.error(
        `${rel}:${i + 1}  hardcoded palette literal "${m[0]}" — use an --ed-* chrome token (see src/index.css)`,
      )
    }
    if (!CANVAS_TOKEN_ALLOWLIST.has(rel)) {
      for (const m of line.matchAll(CANVAS_TOKENS)) {
        failures++
        console.error(
          `${rel}:${i + 1}  canvas theme token "${m[0]}" in chrome — chrome must use --ed-* tokens, the document theme stays on the canvas`,
        )
      }
    }
  })
}

if (failures > 0) {
  console.error(
    `\ncheck:chrome — ${failures} forbidden color${failures === 1 ? '' : 's'} in src/editor. ` +
      `Chrome colors flow through the --ed-* tokens so editorTheme can restyle them.`,
  )
  process.exit(1)
}

console.log('check:chrome — OK (editor chrome uses only --ed-* tokens)')
