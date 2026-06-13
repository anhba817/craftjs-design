import { execSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Phase 20/21 — standalone-example drift guard (`npm run check:example`, CI).
//
// examples/minimal-host and examples/renderer-host are pristine,
// copy-pasteable projects: they import the PUBLISHED package paths
// (`@crafted-design/editor/core`, `/renderer`, `/adapters/*`, …) and list the
// package in their own dependencies. We can't `npm install` an unpublished
// version, so instead each example's source is typechecked against the LOCAL
// built declarations (dist-lib/*.d.ts) by mapping the consumer paths there.
// This catches API/subpath/types drift exactly as a real consumer would — a
// breaking change to the public surface fails in the same commit. Requires
// `npm run build:dist` first (CI runs it before this).
//
// Each example follows Vite's scaffold layout: `tsconfig.json` is a
// references-only solution file, so the check extends `tsconfig.app.json`
// (the real compiler config).

const ROOT = resolve(import.meta.dirname, '..')
const DIST = resolve(ROOT, 'dist-lib')

const EXAMPLES = [
  'examples/minimal-host',
  'examples/renderer-host',
  'examples/controlled-host',
]

// Published specifier → local declaration file (relative to each example dir).
const PATHS = {
  '@crafted-design/editor': ['../../dist-lib/main-app.d.ts'],
  '@crafted-design/editor/core': ['../../dist-lib/core.d.ts'],
  '@crafted-design/editor/sdk': ['../../dist-lib/sdk.d.ts'],
  '@crafted-design/editor/headless': ['../../dist-lib/headless/index.d.ts'],
  '@crafted-design/editor/renderer': ['../../dist-lib/renderer/index.d.ts'],
  '@crafted-design/editor/adapters/shadcn': [
    '../../dist-lib/adapters/shadcn/index.d.ts',
  ],
  '@crafted-design/editor/adapters/mui': [
    '../../dist-lib/adapters/mui/index.d.ts',
  ],
  '@crafted-design/editor/adapters/html': [
    '../../dist-lib/adapters/html/index.d.ts',
  ],
}

if (!existsSync(resolve(DIST, 'core.d.ts'))) {
  console.error('check:example — dist-lib not built. Run `npm run build:dist` first.')
  process.exit(1)
}

let failed = false
for (const example of EXAMPLES) {
  const dir = resolve(ROOT, example)
  const checkTsconfig = resolve(dir, '.tsconfig.check.json')
  writeFileSync(
    checkTsconfig,
    JSON.stringify(
      {
        extends: './tsconfig.app.json',
        compilerOptions: { paths: PATHS },
        include: ['src'],
      },
      null,
      2,
    ),
  )
  try {
    execSync(`npx tsc --noEmit -p ${JSON.stringify(checkTsconfig)}`, {
      cwd: ROOT,
      stdio: 'pipe',
    })
    console.log(`check:example — ${example} OK`)
  } catch (err: unknown) {
    const out = err as { stdout?: Buffer; stderr?: Buffer }
    console.error(
      `check:example — ${example} does NOT typecheck against the built package:\n`,
    )
    console.error(out.stdout?.toString() ?? '')
    console.error(out.stderr?.toString() ?? '')
    failed = true
  } finally {
    rmSync(checkTsconfig, { force: true })
  }
}

if (failed) process.exit(1)
console.log('check:example — OK (examples typecheck against the built package surface)')
