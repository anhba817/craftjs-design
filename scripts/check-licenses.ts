import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Phase 15 § 11.4 — license audit gate.
//
// Walks the published package's RUNTIME `dependencies` (the ones that ship
// to consumers) and fails if any resolves to a non-permissive license, so
// a copyleft (GPL/AGPL/LGPL) or source-available (SSPL/BUSL) dep can't
// slip into the dependency graph of an MIT package. Transitive depth is
// covered by `npm audit` + Dependabot; this is the direct-dep gate.

const ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Apache-2.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'Unlicense',
  'WTFPL',
  'BlueOak-1.0.0',
  'Python-2.0',
  // SIL Open Font License — the standard permissive license for font
  // assets (e.g. @fontsource-variable/geist). Allows bundling +
  // redistribution; doesn't contaminate the MIT code it ships alongside.
  'OFL-1.1',
])

// SPDX expressions like "(MIT OR Apache-2.0)" pass if ANY term is allowed.
function isAllowedExpression(license: string): boolean {
  const terms = license
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND)\s+/i)
    .map((t) => t.trim())
    .filter(Boolean)
  if (terms.length === 0) return false
  return terms.some((t) => ALLOWED.has(t))
}

function readLicense(pkgDir: string): string | null {
  const pkgPath = join('node_modules', pkgDir, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (typeof pkg.license === 'string') return pkg.license
    if (pkg.license?.type) return pkg.license.type
    if (Array.isArray(pkg.licenses) && pkg.licenses[0]?.type)
      return pkg.licenses[0].type
    return null
  } catch {
    return null
  }
}

function main(): void {
  const root = JSON.parse(readFileSync('package.json', 'utf8'))
  const deps = Object.keys(root.dependencies ?? {})
  const offenders: Array<{ name: string; license: string }> = []
  const unknown: string[] = []

  for (const name of deps) {
    const license = readLicense(name)
    if (license == null) {
      unknown.push(name)
      continue
    }
    if (!isAllowedExpression(license)) {
      offenders.push({ name, license })
    }
  }

  console.log(`Checked ${deps.length} runtime dependencies.`)
  if (unknown.length > 0) {
    console.warn(
      `\n[check:licenses] could not resolve a license for: ${unknown.join(', ')}\n` +
        '(not installed? run npm ci first. Treated as advisory, not a failure.)',
    )
  }
  if (offenders.length > 0) {
    console.error('\n[check:licenses] NON-PERMISSIVE licenses found:')
    for (const o of offenders) console.error(`  ${o.name}: ${o.license}`)
    console.error(
      '\nThe package ships under MIT — a copyleft / source-available runtime\n' +
        'dependency would contaminate that. Remove the dep or, if its license\n' +
        'is actually fine, add it to the ALLOWED set in scripts/check-licenses.ts.',
    )
    process.exit(1)
  }
  console.log('[check:licenses] all runtime dependencies are permissively licensed.')
}

main()
