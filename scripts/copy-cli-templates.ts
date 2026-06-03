import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Phase 20 — ship the scaffolding CLI's templates next to the built CLI.
//
// The CLI (dist-lib/cli.js) resolves its templates at runtime relative to its
// own location (`<dir>/cli-templates/`). Vite bundles cli.js but does NOT copy
// the *.tmpl template files (they aren't imported as modules), so this runs
// after `build:dist` to copy src/cli/templates → dist-lib/cli-templates,
// preserving the .tmpl extension (the CLI strips it when generating).

const ROOT = resolve(import.meta.dirname, '..')
const SRC = resolve(ROOT, 'src/cli/templates')
const DEST = resolve(ROOT, 'dist-lib/cli-templates')

if (!existsSync(SRC)) {
  console.error(`copy-cli-templates: source ${SRC} not found`)
  process.exit(1)
}

cpSync(SRC, DEST, { recursive: true })
console.log('copy-cli-templates — copied CLI templates → dist-lib/cli-templates')
