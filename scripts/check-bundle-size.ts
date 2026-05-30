import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Phase 15 § 12.3 — bundle-size budget gate.
//
// Reads the published library output (`dist-lib/`, produced by
// `npm run build:dist`) and fails if any tracked artifact's GZIPPED size
// exceeds its budget. Gzip is the number that matters for delivery; raw
// bytes vary too much with comments/whitespace. Budgets are seeded from
// the `0.5.0` baseline with ~20% headroom — bump them deliberately (in a
// PR, with a reason) when a feature legitimately grows the bundle, so an
// accidental regression can't slip through.
//
// Run after a dist build:  npm run build:dist && npm run check:size
// CI wires both steps together.

const DIST_DIR = 'dist-lib'

interface Budget {
  label: string
  // Matches a filename in DIST_DIR (hashes allowed via the regex).
  match: RegExp
  maxGzipKB: number
}

// Budgets are gzipped KB, seeded from the corrected `0.6.0` baseline with
// ~10% headroom. The editor JS bundles BOTH adapter sets (shadcn + MUI)
// eagerly — MUI is ~290 KB gz of `index.js`. Splitting the heavy adapter
// onto its own subpath entry so consumers opt in (§ 8.3) is a queued
// optimization; until then this budget reflects the honest full size.
// (The pre-0.6.0 ~120 KB figure was a BROKEN bundle: a too-aggressive
// `sideEffects` field had tree-shaken the adapter/canonical registrations
// out entirely — fixed in Phase 15 Group C.)
const BUDGETS: Budget[] = [
  { label: 'editor JS (index.js)', match: /^index\.js$/, maxGzipKB: 460 },
  { label: 'editor CSS (index.css)', match: /^index\.css$/, maxGzipKB: 150 },
  { label: 'SDK chunk (sdk-*.js)', match: /^sdk-.*\.js$/, maxGzipKB: 60 },
  { label: 'vite-plugin', match: /^vite-plugin\.js$/, maxGzipKB: 5 },
]

function gzipKB(path: string): number {
  return gzipSync(readFileSync(path)).length / 1024
}

function main(): void {
  if (!existsSync(DIST_DIR)) {
    console.error(
      `[check:size] ${DIST_DIR}/ not found — run "npm run build:dist" first.`,
    )
    process.exit(1)
  }

  const files = readdirSync(DIST_DIR)
  const rows: Array<{ label: string; sizeKB: number; maxKB: number; ok: boolean }> = []
  let failed = false

  for (const budget of BUDGETS) {
    const match = files.find((f) => budget.match.test(f))
    if (!match) {
      console.error(
        `[check:size] no file matched ${budget.match} for "${budget.label}" — did the build output change?`,
      )
      failed = true
      continue
    }
    const sizeKB = gzipKB(join(DIST_DIR, match))
    const ok = sizeKB <= budget.maxGzipKB
    if (!ok) failed = true
    rows.push({ label: budget.label, sizeKB, maxKB: budget.maxGzipKB, ok })
  }

  // Human-readable report.
  console.log('Bundle size (gzipped):')
  for (const r of rows) {
    const flag = r.ok ? 'ok  ' : 'OVER'
    console.log(
      `  [${flag}] ${r.label.padEnd(26)} ${r.sizeKB.toFixed(1).padStart(7)} KB / ${r.maxKB} KB`,
    )
  }

  if (failed) {
    console.error(
      '\n[check:size] FAILED — an artifact is over budget (or a tracked file went missing).\n' +
        'If the growth is intended, raise the budget in scripts/check-bundle-size.ts in the same PR.',
    )
    process.exit(1)
  }
  console.log('\n[check:size] all artifacts within budget.')
}

main()
