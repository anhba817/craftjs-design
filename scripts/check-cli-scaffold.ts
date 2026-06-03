import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scaffold } from '../src/cli/index.ts'

// Phase 20 — CLI scaffold compile gate (`npm run check:cli`, CI step).
//
// Generates one of each kind into a throwaway dir, then typechecks the
// generated output against the REAL SDK types (the consumer import path
// `@crafted-design/editor/sdk` is mapped to the in-repo SDK source). Proves
// the scaffolding templates stay in sync with the SDK: a breaking SDK change
// fails this in the same commit, so `npx … scaffold` never emits code that
// doesn't compile. The heavyweight `tsc` lives here (not in vitest) to keep
// the unit suite fast.

const ROOT = resolve(import.meta.dirname, '..')
const TMP = resolve(ROOT, '.cli-check') // one level under repo → ../src/* resolves; node_modules resolves upward

function main() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })

  // scaffold() writes relative to process.cwd(); run from the repo root.
  const prevCwd = process.cwd()
  process.chdir(ROOT)
  try {
    scaffold('adapter', 'My Design System', { out: '.cli-check', force: true })
    scaffold('canonical', 'pricing-table', { out: '.cli-check', force: true })
    scaffold('panel', 'seo-meta', { out: '.cli-check', force: true })
  } finally {
    process.chdir(prevCwd)
  }

  writeFileSync(
    resolve(TMP, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'es2023',
          lib: ['ES2023', 'DOM'],
          module: 'esnext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          verbatimModuleSyntax: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          types: ['vite/client'],
          // The generated code imports from the consumer path; map it (and the
          // editor's internal `@/*` alias it transitively pulls) to source.
          paths: {
            '@crafted-design/editor/sdk': ['../src/sdk/index.ts'],
            '@design/sdk': ['../src/sdk/index.ts'],
            '@/*': ['../src/*'],
          },
        },
        include: ['**/*.ts', '**/*.tsx'],
      },
      null,
      2,
    ),
  )

  try {
    execSync('npx tsc --noEmit -p .cli-check/tsconfig.json', {
      cwd: ROOT,
      stdio: 'pipe',
    })
  } catch (err: unknown) {
    const out = err as { stdout?: Buffer; stderr?: Buffer }
    console.error('check:cli — generated scaffold does NOT typecheck against the SDK:\n')
    console.error(out.stdout?.toString() ?? '')
    console.error(out.stderr?.toString() ?? '')
    rmSync(TMP, { recursive: true, force: true })
    process.exit(1)
  }

  rmSync(TMP, { recursive: true, force: true })
  console.log('check:cli — OK (scaffolded adapter/canonical/panel typecheck against the SDK)')
}

main()
