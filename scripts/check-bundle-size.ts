import { gzipSync } from 'node:zlib'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

// Phase 15 § 12.3 / Phase 16 § 8.3 — bundle-size budget gate.
//
// The published library (`dist-lib/`) is code-split: each entry is a thin
// wrapper that imports shared chunks. So a per-FILE size check is
// meaningless — what matters is the TRANSITIVE reachable size of each
// entry point (the entry + every chunk it imports, deduped). This walks
// the relative-import graph from each entry and sums the gzipped bytes,
// then fails if an entry exceeds its budget. Gzip is the delivery number.
//
// Bump a budget deliberately (in the PR that grows it, with a reason) so
// an accidental regression can't slip through.
//
// Run after a dist build:  npm run build:dist && npm run check:size

const DIST_DIR = 'dist-lib'

interface Budget {
  label: string
  entry: string // file under dist-lib
  maxGzipKB: number
}

// Budgets are the gzipped TRANSITIVE size of each JS entry (sum of the
// entry + all chunks it imports). MUI/Chakra/Emotion are externalized
// (Phase 16 § 8.3) so they're NOT counted here — they're the consumer's
// peer deps. That's also why `core` and `index` are close in OUR bundle
// (~8 KB apart, the MUI adapter glue): the big MUI weight (~290 KB) is
// external in both. The real /core win is consumer-side — a /core app
// never imports @mui, so MUI never enters the consumer's bundle and
// needn't be installed; the full entry's external @mui import does pull it.
const BUDGETS: Budget[] = [
  { label: 'full editor (index.js)', entry: 'index.js', maxGzipKB: 275 },
  { label: 'lean core (core.js)', entry: 'core.js', maxGzipKB: 265 },
  // Phase 18 § 5 — bumped 60 → 70: the SDK gained the overlay-authoring seam
  // (useOverlayRuntime / readOverlayOpen / useOverlayStageTarget / OverlayCard)
  // + the `cn` class-merge util (pulls tailwind-merge). This is the FULL-surface
  // number; /sdk is side-effect-free, so a consumer importing one symbol
  // tree-shakes the rest (guarded by side-effect-free.test.ts).
  { label: 'SDK (sdk.js)', entry: 'sdk.js', maxGzipKB: 70 },
  // Phase 21 — headless document API. Registers canonicals/themes/templates
  // (data + zod, no React UI), so it's mid-sized; it must NOT pull the editor
  // chrome or adapters into its graph.
  { label: 'headless (headless.js)', entry: 'headless.js', maxGzipKB: 60 },
  // Phase 21 — standalone document renderer: canonical registry + the Craft
  // render path (CanonicalNode/resolver) but NO editor chrome (toolbox,
  // inspector, persistence UI). A blow-past here means chrome leaked in.
  { label: 'renderer (renderer.js)', entry: 'renderer.js', maxGzipKB: 130 },
  // Phase 21 — the MCP server bin. It pulls the headless API + the HTML
  // adapter (for render previews); the MCP SDK + react-dom/server are
  // externalized, so this should stay modest.
  // Not browser-delivered (a Node bin) — the budget guards accidental bloat,
  // not page weight.
  { label: 'MCP server (mcp.js)', entry: 'mcp.js', maxGzipKB: 110 },
  { label: 'vite-plugin', entry: 'vite-plugin.js', maxGzipKB: 5 },
  // Phase 20 — the scaffolding CLI (`bin`). Node built-ins only; must stay tiny
  // and must NEVER pull the editor runtime/React into its graph. A regression
  // here (e.g. an accidental `@/...` import) would blow past this budget.
  { label: 'CLI (cli.js)', entry: 'cli.js', maxGzipKB: 5 },
]

// CSS is a single emitted file (not code-split), checked directly.
const CSS_BUDGET = { label: 'editor CSS (index.css)', file: 'index.css', maxGzipKB: 150 }

function gzipKB(path: string): number {
  return gzipSync(readFileSync(path)).length / 1024
}

// Collect every relatively-imported file reachable from `entry` (deduped).
function reachableFiles(entryRel: string): Set<string> {
  const seen = new Set<string>()
  const stack = [entryRel]
  // Matches `from"./x.js"`, `import"./x.js"`, `import(..."./x.js")`.
  const importRe = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g
  while (stack.length) {
    const rel = stack.pop()!
    if (seen.has(rel)) continue
    seen.add(rel)
    const abs = join(DIST_DIR, rel)
    if (!existsSync(abs)) continue
    const src = readFileSync(abs, 'utf8')
    const dir = dirname(rel)
    let m: RegExpExecArray | null
    while ((m = importRe.exec(src))) {
      const spec = m[1]
      if (!spec.startsWith('.')) continue // external/bare — not our bundle
      // Resolve relative to the importing file, normalize to a dist-rel path.
      stack.push(relative(DIST_DIR, join(DIST_DIR, dir, spec)))
    }
  }
  return seen
}

function transitiveGzipKB(entryRel: string): number {
  let total = 0
  for (const rel of reachableFiles(entryRel)) {
    const abs = join(DIST_DIR, rel)
    if (existsSync(abs)) total += gzipKB(abs)
  }
  return total
}

function main(): void {
  if (!existsSync(DIST_DIR)) {
    console.error(`[check:size] ${DIST_DIR}/ not found — run "npm run build:dist" first.`)
    process.exit(1)
  }

  const rows: Array<{ label: string; sizeKB: number; maxKB: number; ok: boolean }> = []
  let failed = false

  for (const b of BUDGETS) {
    if (!existsSync(join(DIST_DIR, b.entry))) {
      console.error(`[check:size] entry ${b.entry} not found for "${b.label}".`)
      failed = true
      continue
    }
    const sizeKB = transitiveGzipKB(b.entry)
    const ok = sizeKB <= b.maxGzipKB
    if (!ok) failed = true
    rows.push({ label: b.label, sizeKB, maxKB: b.maxGzipKB, ok })
  }

  // CSS (single file).
  if (existsSync(join(DIST_DIR, CSS_BUDGET.file))) {
    const sizeKB = gzipKB(join(DIST_DIR, CSS_BUDGET.file))
    const ok = sizeKB <= CSS_BUDGET.maxGzipKB
    if (!ok) failed = true
    rows.push({ label: CSS_BUDGET.label, sizeKB, maxKB: CSS_BUDGET.maxGzipKB, ok })
  }

  console.log('Bundle size (gzipped, transitive per entry; externals excluded):')
  for (const r of rows) {
    console.log(
      `  [${r.ok ? 'ok  ' : 'OVER'}] ${r.label.padEnd(24)} ${r.sizeKB.toFixed(1).padStart(7)} KB / ${r.maxKB} KB`,
    )
  }

  if (failed) {
    console.error(
      '\n[check:size] FAILED — an entry is over budget (or a tracked entry went missing).\n' +
        'If the growth is intended, raise the budget in scripts/check-bundle-size.ts in the same PR.',
    )
    process.exit(1)
  }
  console.log('\n[check:size] all entries within budget.')
}

main()
