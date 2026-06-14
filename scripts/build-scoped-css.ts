import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scopeCss } from '../src/style/scopeCss'

// Phase 24 (Group B) — produce the opt-in scoped stylesheet.
//
// Reads the COMPILED `dist-lib/index.css` (after Tailwind has resolved
// @theme/@layer/@import) and rewrites it so every editor rule applies ONLY
// inside `.crafted-design-scope` — never clobbering a Tailwind-v4 host's
// preflight or `--color-*` tokens. The default `index.css` is left untouched;
// this writes a sibling `index.scoped.css`.
//
// Operating on the COMPILED output (Decision 2) means we see real selectors:
//   - `:root` / `:host` / `html` / `body` / `#root`  → `.crafted-design-scope`
//     (rehome the token blocks + reset onto the scope element)
//   - the `*` preflight                              → `.crafted-design-scope *`
//     (a reset scoped to the editor subtree; the host page isn't re-reset)
//   - `.dark` token block                            → `.crafted-design-scope.dark`
//     AND `.crafted-design-scope .dark` (DocumentRenderer puts `dark` on the
//     SAME element as the scope class; the editor canvas puts it on a
//     descendant — cover both)
//   - everything else (utilities, components)        → `.crafted-design-scope X`
// `@keyframes` stops, `@font-face`, `@property`, and `@media`/`@layer`/
// `@supports` conditions are left intact (animation/font names + custom-property
// registrations are global by nature; the at-rules' INNER rules are still
// scoped). The transform itself lives in src/style/scopeCss.ts (unit-tested).

const DIST = resolve(import.meta.dirname, '..', 'dist-lib')
const SOURCE = resolve(DIST, 'index.css')
const OUT = resolve(DIST, 'index.scoped.css')

if (!existsSync(SOURCE)) {
  console.error(
    'build:scoped-css — dist-lib/index.css not found. Run the lib build first.',
  )
  process.exit(1)
}

const banner =
  '/*! @crafted-design/editor — scoped stylesheet. Every rule is prefixed ' +
  'with .crafted-design-scope so the editor can be embedded inline in a ' +
  'Tailwind-v4 host without a double preflight or token clobbering. ' +
  'Generated from index.css — do not edit. */\n'

writeFileSync(OUT, banner + scopeCss(readFileSync(SOURCE, 'utf8')))
console.log(`build:scoped-css — wrote ${OUT}`)
