import postcss, { type Rule, type AtRule, type ChildNode } from 'postcss'
import selectorParser from 'postcss-selector-parser'

// Phase 24 (Group B) — the pure CSS-scoping transform.
//
// Rewrites a COMPILED Tailwind-v4 stylesheet so every rule applies ONLY inside
// `.crafted-design-scope`. Pure (string in → string out) so it's unit-tested
// directly; scripts/build-scoped-css.ts is the thin file-I/O wrapper. Not part
// of the shipped runtime — only the build + tests import it (so postcss never
// reaches a shipped bundle).
//
// See the doc in scripts/build-scoped-css.ts for the selector taxonomy.

export const SCOPE = '.crafted-design-scope'

// Selectors that target the document root → become the scope element itself.
const ROOT_SELECTORS = new Set([':root', ':host', 'html', 'body', '#root'])

// At-rules whose inner rules must NOT have their selectors prefixed.
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

// Transform ONE already-split selector (no top-level commas).
function scopeOne(sel: string): string[] {
  const trimmed = sel.trim()
  if (trimmed === '') return []
  if (ROOT_SELECTORS.has(trimmed)) return [SCOPE]
  if (trimmed === '*') return [`${SCOPE} *`]
  // `.dark`-led written WITHOUT the `:is(.dark *)` form (the token block, or a
  // class-dark ancestor). `dark` can sit ON the scope element (DocumentRenderer)
  // or a descendant (editor canvas) — emit both. `.dark\:foo` utilities start
  // with `.dark\:` (escaped colon), not a combinator, so they fall through.
  if (/^\.dark(?=[\s>+~]|$)/.test(trimmed)) {
    const rest = trimmed.slice('.dark'.length)
    return [`${SCOPE}.dark${rest}`, `${SCOPE} .dark${rest}`]
  }
  return [`${SCOPE} ${trimmed}`]
}

function scopeSelectorList(selectorList: string): string {
  const out: string[] = []
  selectorParser((root) => {
    root.each((selNode) => {
      out.push(...scopeOne(String(selNode)))
    })
  }).processSync(selectorList)
  return [...new Set(out)].join(', ')
}

const scopePlugin = {
  postcssPlugin: 'crafted-design-scope',
  Rule(rule: Rule) {
    if (insideSkippedAtRule(rule)) return
    rule.selector = scopeSelectorList(rule.selector)
  },
}

// Scope a compiled stylesheet. Synchronous — the plugin only rewrites
// selectors (no async transforms).
export function scopeCss(css: string): string {
  return postcss([scopePlugin]).process(css, { from: undefined }).css
}
