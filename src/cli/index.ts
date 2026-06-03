// Phase 20 — scaffolding CLI. Shipped as the package `bin` (`scaffold`),
// invoked as `npx @crafted-design/editor scaffold <kind> <name>`. Generates a
// typed skeleton for an adapter / canonical / inspector panel, pre-wired to
// `@crafted-design/editor/sdk`, so authoring an extension starts from working
// code instead of a blank file.
//
// Zero runtime dependencies — Node built-ins only (`util.parseArgs`, `fs`,
// `path`, `url`). Templates live alongside the built CLI under
// `cli-templates/` (copied there by `scripts/copy-cli-templates.ts` at build
// time) and are resolved relative to this module via `import.meta.url`.
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const KINDS = ['adapter', 'canonical', 'panel'] as const
type Kind = (typeof KINDS)[number]

const USAGE = `crafted-design scaffold — generate an SDK-wired skeleton

Usage:
  npx @crafted-design/editor scaffold <adapter|canonical|panel> <name> [--out <dir>] [--force]

Examples:
  npx @crafted-design/editor scaffold adapter   my-design-system
  npx @crafted-design/editor scaffold canonical pricing-table
  npx @crafted-design/editor scaffold panel     seo-meta

Options:
  --out <dir>   Directory to generate into (default: current directory).
  --force       Overwrite existing files instead of refusing.
  -h, --help    Show this help.
`

// ---- name casing ---------------------------------------------------------

/** kebab-case id: lowercase, words joined by hyphens. The canonical id. */
function toKebab(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .toLowerCase()
}

/** PascalCase identifier, e.g. for component/function names. */
function toPascal(raw: string): string {
  return toKebab(raw)
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
}

/** Title Case display name, e.g. "Pricing Table". */
function toTitle(raw: string): string {
  return toKebab(raw)
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

interface Tokens {
  id: string // kebab — pricing-table
  Name: string // Pascal — PricingTable
  title: string // Title — Pricing Table
}

function substitute(text: string, t: Tokens): string {
  return text
    .replaceAll('__id__', t.id)
    .replaceAll('__Name__', t.Name)
    .replaceAll('__title__', t.title)
}

// ---- template resolution -------------------------------------------------

// Built layout: dist-lib/cli.js  +  dist-lib/cli-templates/<kind>/...
// Dev (tsx) layout: src/cli/index.ts  +  src/cli/templates/<kind>/...
function templatesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const built = resolve(here, 'cli-templates')
  if (existsSync(built)) return built
  return resolve(here, 'templates')
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

interface ScaffoldResult {
  files: string[] // written paths, repo/cwd-relative
  outDir: string
}

function scaffold(
  kind: Kind,
  name: string,
  opts: { out: string; force: boolean },
): ScaffoldResult {
  const t: Tokens = { id: toKebab(name), Name: toPascal(name), title: toTitle(name) }
  if (!t.id) throw new Error(`invalid name "${name}" — use letters, digits, and hyphens`)

  const srcDir = join(templatesRoot(), kind)
  if (!existsSync(srcDir)) throw new Error(`no template for kind "${kind}"`)

  // Adapters scaffold a folder named by id; canonicals/panels are loose files
  // dropped directly into --out (their filenames already carry the name).
  const destBase = kind === 'adapter' ? join(opts.out, t.id) : opts.out

  const written: string[] = []
  for (const abs of walk(srcDir)) {
    const relPath = relative(srcDir, abs)
    const outRel = substitute(relPath, t).replace(/\.tmpl$/, '')
    const destPath = join(destBase, outRel)
    if (existsSync(destPath) && !opts.force) {
      throw new Error(
        `${relative(process.cwd(), destPath)} already exists — pass --force to overwrite`,
      )
    }
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, substitute(readFileSync(abs, 'utf8'), t))
    written.push(relative(process.cwd(), destPath))
  }
  return { files: written, outDir: relative(process.cwd(), destBase) || '.' }
}

// ---- next-steps guidance -------------------------------------------------

function nextSteps(kind: Kind, t: Tokens, outDir: string): string {
  const importPath =
    kind === 'adapter' ? `./${outDir}` : `./${outDir}/${kind === 'panel' ? `${t.Name}Panel` : t.id}`
  const lines: Record<Kind, string[]> = {
    adapter: [
      `1. Implement the remaining canonicals in ${outDir}/components/ (the`,
      `   skeleton wires Box + Button; the registry has 48 canonicals).`,
      `2. Add a side-effect import BEFORE you render <Editor />:`,
      `      import '${importPath}'`,
      `3. The "${t.title}" adapter then appears in the adapter switcher (or pin`,
      `   it: <Editor adapter="${t.id}" />).`,
    ],
    canonical: [
      `1. Add adapter impls for "${t.id}" in your adapter(s) so it renders.`,
      `2. Add a side-effect import BEFORE you render <Editor />:`,
      `      import '${importPath}'`,
      `3. "${t.title}" then appears in the Toolbox.`,
    ],
    panel: [
      `1. Add a side-effect import BEFORE you render <Editor />:`,
      `      import '${importPath}'`,
      `2. Whitelist it on a canonical via applicablePanels: ['${t.id}'], or rely`,
      `   on the applicableTo predicate in the generated file.`,
    ],
  }
  return lines[kind].join('\n')
}

// ---- entry ---------------------------------------------------------------

export function run(argv: string[]): number {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string', default: '.' },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err))
    console.error(`\n${USAGE}`)
    return 1
  }

  const { positionals, values } = parsed
  if (values.help || positionals.length === 0) {
    console.log(USAGE)
    return values.help ? 0 : 1
  }

  const [command, kind, name] = positionals
  if (command !== 'scaffold') {
    console.error(`unknown command "${command}". Did you mean "scaffold"?\n`)
    console.error(USAGE)
    return 1
  }
  if (!kind || !KINDS.includes(kind as Kind)) {
    console.error(`unknown kind "${kind ?? ''}". Expected one of: ${KINDS.join(', ')}\n`)
    console.error(USAGE)
    return 1
  }
  if (!name) {
    console.error(`missing <name> for "scaffold ${kind}".\n`)
    console.error(USAGE)
    return 1
  }

  try {
    const t: Tokens = { id: toKebab(name), Name: toPascal(name), title: toTitle(name) }
    const result = scaffold(kind as Kind, name, {
      out: values.out as string,
      force: values.force as boolean,
    })
    console.log(`Scaffolded ${kind} "${t.title}" → ${result.outDir}/`)
    for (const f of result.files) console.log(`  + ${f}`)
    console.log(`\nNext:\n${nextSteps(kind as Kind, t, result.outDir)}`)
    return 0
  } catch (err) {
    console.error(`scaffold failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}

// Only auto-run when executed as the bin (not when imported by tests).
// import.meta.url === the invoked script's URL in that case.
const invokedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invokedAsScript) {
  process.exit(run(process.argv.slice(2)))
}

// re-export internals for the test suite
export { scaffold, toKebab, toPascal, toTitle }
