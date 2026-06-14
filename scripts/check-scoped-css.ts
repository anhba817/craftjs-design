import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss, { type Rule, type AtRule, type ChildNode } from 'postcss'
import selectorParser from 'postcss-selector-parser'

// Phase 24 (Group B) — guard the scoped stylesheet (CI `check:scoped-css`).
//
// Validates the BUILT `dist-lib/index.scoped.css` so a regression in the
// scoping pass (or a raw token/preflight leaking through) fails CI instead of
// silently shipping a sheet that clobbers a Tailwind-v4 host:
//   1. Every rule selector (outside @keyframes/@font-face/@property) starts
//      with `.crafted-design-scope` — no bare utilities/preflight leak out.
//   2. No top-level `:root` / `html` / `body` / `*` / `#root` / `:host` rule
//      survives un-rehomed (those would re-reset / clobber the host).
//   3. The `.dark` token block emits the on-the-scope-element compound
//      (`.crafted-design-scope.dark`) — else DocumentRenderer's dark mode
//      (which puts `dark` on the scope element) breaks.
//
// (The transform's correctness is exercised end-to-end: build-scoped-css.ts
// produces the file and this validates the real output. We deliberately do NOT
// unit-test the transform through vitest — importing postcss via vitest's Vite
// dep-optimizer hangs, and the transform is build-time code.)

const FILE = resolve(import.meta.dirname, '..', 'dist-lib', 'index.scoped.css')
const SCOPE = '.crafted-design-scope'
const SKIP_INNER = new Set(['keyframes', 'font-face', 'property', 'counter-style'])
const FORBIDDEN_BARE = new Set([':root', ':host', 'html', 'body', '#root', '*'])

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
function startsScoped(sel: string): boolean {
  const s = sel.trim()
  if (s === SCOPE) return true
  // scope class as the first compound: `.crafted-design-scope ` (descendant),
  // `.crafted-design-scope.` (compound), `.crafted-design-scope:`/`[`/`>` etc.
  return /^\.crafted-design-scope(?![\w-])/.test(s)
}

if (!existsSync(FILE)) {
  console.error(
    'check:scoped-css — dist-lib/index.scoped.css not found. Run `npm run build:scoped-css` (build:dist does).',
  )
  process.exit(1)
}

const css = readFileSync(FILE, 'utf8')
const root = postcss.parse(css)
const offenders: string[] = []
let sawDarkCompound = false

root.walkRules((rule) => {
  if (insideSkippedAtRule(rule)) return
  selectorParser((sel) => {
    sel.each((node) => {
      const s = String(node).trim()
      if (s === '') return
      if (FORBIDDEN_BARE.has(s)) {
        offenders.push(`bare root/preflight selector survived: "${s}"`)
        return
      }
      if (!startsScoped(s)) offenders.push(`unscoped selector: "${s}"`)
      if (/^\.crafted-design-scope\.dark(?![\w-])/.test(s)) sawDarkCompound = true
    })
  }).processSync(rule.selector)
})

if (!sawDarkCompound) {
  offenders.push(
    'no `.crafted-design-scope.dark` compound — dark mode on the scope element (DocumentRenderer) would break',
  )
}

if (offenders.length > 0) {
  console.error(
    `check:scoped-css — FAILED (${offenders.length} issue(s)):\n` +
      offenders
        .slice(0, 25)
        .map((o) => `  - ${o}`)
        .join('\n') +
      (offenders.length > 25 ? `\n  …and ${offenders.length - 25} more` : ''),
  )
  process.exit(1)
}

console.log('check:scoped-css — OK (every rule is scoped under .crafted-design-scope)')
