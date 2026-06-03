import { execSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Phase 20 — minimal-host drift guard (`npm run check:example`, CI step).
//
// examples/minimal-host is a pristine, copy-pasteable project: it imports the
// PUBLISHED package paths (`@crafted-design/editor/core`, `/sdk`, `/index.css`)
// and lists the package in its own dependencies. We can't `npm install` an
// unpublished version, so instead we typecheck its source against the LOCAL
// built declarations (dist-lib/*.d.ts) by mapping the consumer paths there.
// This catches API/subpath/types drift exactly as a real consumer would — a
// breaking change to the editor's public surface fails this in the same
// commit. Requires `npm run build:dist` first (CI runs it before this).

const ROOT = resolve(import.meta.dirname, '..')
const EXAMPLE = resolve(ROOT, 'examples/minimal-host')
const DIST = resolve(ROOT, 'dist-lib')
const CHECK_TSCONFIG = resolve(EXAMPLE, '.tsconfig.check.json')

if (!existsSync(resolve(DIST, 'core.d.ts'))) {
  console.error('check:example — dist-lib not built. Run `npm run build:dist` first.')
  process.exit(1)
}

// Map the published specifiers to the local declaration files. Relative to the
// example dir (where the temp tsconfig lives); react/react-dom resolve from the
// repo's node_modules (found by walking up from the example dir).
writeFileSync(
  CHECK_TSCONFIG,
  JSON.stringify(
    {
      // Extend the example's REAL app config (jsx, skipLibCheck, bundler
      // resolution, …) — `tsconfig.json` is just a references-only solution
      // file (Vite's scaffold), so it carries no compilerOptions.
      extends: './tsconfig.app.json',
      compilerOptions: {
        paths: {
          '@crafted-design/editor': ['../../dist-lib/main-app.d.ts'],
          '@crafted-design/editor/core': ['../../dist-lib/core.d.ts'],
          '@crafted-design/editor/sdk': ['../../dist-lib/sdk.d.ts'],
        },
      },
      include: ['src'],
    },
    null,
    2,
  ),
)

try {
  execSync(`npx tsc --noEmit -p ${JSON.stringify(CHECK_TSCONFIG)}`, {
    cwd: ROOT,
    stdio: 'pipe',
  })
} catch (err: unknown) {
  const out = err as { stdout?: Buffer; stderr?: Buffer }
  console.error('check:example — minimal-host does NOT typecheck against the built package:\n')
  console.error(out.stdout?.toString() ?? '')
  console.error(out.stderr?.toString() ?? '')
  rmSync(CHECK_TSCONFIG, { force: true })
  process.exit(1)
}

rmSync(CHECK_TSCONFIG, { force: true })
console.log('check:example — OK (minimal-host typechecks against the built package surface)')
