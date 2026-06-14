import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss, { type Rule, type AtRule, type ChildNode } from 'postcss'
import selectorParser from 'postcss-selector-parser'

// Phase 24 (Group B) — produce the opt-in scoped stylesheet.
//
// Reads the COMPILED `dist-lib/index.css` (after Tailwind has resolved
// @theme/@layer/@import) and rewrites it so every editor rule applies ONLY
// inside `.crafted-design-scope` — never clobbering a Tailwind-v4 host's
// preflight or `--color-*` tokens. The default `index.css` is left untouched;
// this writes a sibling `index.scoped.css`.
//
// SELF-CONTAINED on purpose: imports postcss directly rather than reaching into
// a `src/` module. A `scripts/` → `src/` import of a postcss-importing module
// under tsx hangs intermittently in this environment, so the transform lives
// here. `scripts/check-scoped-css.ts` validates the BUILT output independently.
//
// Selector taxonomy (operating on COMPILED output, so we see real selectors):
//   - `:root` / `:host` / `html` / `body` / `#root`  → `.crafted-design-scope`
//     (rehome the token blocks + reset onto the scope element)
//   - the `*` preflight                              → `.crafted-design-scope *`
//   - `.dark` token block → `.crafted-design-scope.dark` AND
//     `.crafted-design-scope .dark` (DocumentRenderer puts `dark` on the SAME
//     element as the scope class; the editor canvas on a descendant)
//   - everything else (utilities, components)        → `.crafted-design-scope X`
// `@keyframes` stops / `@font-face` / `@property` and `@media`/`@layer`/
// `@supports` conditions are left intact.

const SCOPE = '.crafted-design-scope'
const ROOT_SELECTORS = new Set([':root', ':host', 'html', 'body', '#root'])
const SKIP_INNER = new Set(['keyframes', 'font-face', 'property', 'counter-style'])

function atRuleName(node: AtRule): string {
  return node.name.toLowerCase().replace(/^-\w+-/, '')
}
function insideSkippedAtRule(rule: Rule): boolean {
  let p: ChildNode | undefined = rule.parent as ChildNode | undefined
  while (p) {
    if (p.type === 'atrule' && SKIP_INNER.has(atRuleName(p as AtRule))) return true
    p = p.parent as ChildNode | undefined
  }
  return false
}
function scopeOne(sel: string): string[] {
  const trimmed = sel.trim()
  if (trimmed === '') return []
  if (ROOT_SELECTORS.has(trimmed)) return [SCOPE]
  if (trimmed === '*') return [`${SCOPE} *`]
  if (/^\.dark(?=[\s>+~]|$)/.test(trimmed)) {
    const rest = trimmed.slice('.dark'.length)
    return [`${SCOPE}.dark${rest}`, `${SCOPE} .dark${rest}`]
  }
  return [`${SCOPE} ${trimmed}`]
}
function scopeSelectorList(selectorList: string): string {
  const out: string[] = []
  selectorParser((root) => {
    root.each((selNode) => out.push(...scopeOne(String(selNode))))
  }).processSync(selectorList)
  return [...new Set(out)].join(', ')
}
const DIST = resolve(import.meta.dirname, '..', 'dist-lib')
const SOURCE = resolve(DIST, 'index.css')
const OUT = resolve(DIST, 'index.scoped.css')

if (!existsSync(SOURCE)) {
  console.error('build:scoped-css — dist-lib/index.css not found. Run the lib build first.')
  process.exit(1)
}

const banner =
  '/*! @crafted-design/editor — scoped stylesheet. Every rule is prefixed ' +
  'with .crafted-design-scope so the editor can be embedded inline in a ' +
  'Tailwind-v4 host without a double preflight or token clobbering. ' +
  'Generated from index.css — do not edit. */\n'

// Parse + walk + toString (mirrors check-scoped-css.ts), NOT
// postcss([plugin]).process().css — the LazyResult plugin runner hangs under
// tsx in this environment (near-zero CPU); the bare parser path is reliable.
const root = postcss.parse(readFileSync(SOURCE, 'utf8'))
root.walkRules((rule) => {
  if (insideSkippedAtRule(rule)) return
  rule.selector = scopeSelectorList(rule.selector)
})
writeFileSync(OUT, banner + root.toString())
console.log(`build:scoped-css — wrote ${OUT}`)
