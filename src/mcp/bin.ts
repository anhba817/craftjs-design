// Phase 21 Group C — the stdio MCP server an AI client (Claude Code / Claude
// Desktop) spawns to build editor documents. Launched as the `mcp` subcommand
// of the single package bin:
//
//   claude mcp add crafted-design -- npx -y @crafted-design/editor mcp
//
// `src/cli/index.ts` dispatches `mcp` here; this module can also be executed
// directly (`tsx src/mcp/bin.ts`) for dev/debugging.
//
// @modelcontextprotocol/sdk is an OPTIONAL peer (the editor doesn't need it).
// Resolve it lazily so a missing install gives a clear hint instead of a
// module-not-found stack trace.
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { realpathSync } from 'node:fs'
import type { McpTemplateVariable } from './tools'

/** Parse the CRAFTED_DESIGN_TEMPLATE_VARIABLES env (a JSON array of variable
 * descriptors). Returns undefined when unset/invalid so the server falls back
 * to "no variables configured". */
function parseTemplateVariables(
  raw: string | undefined,
): McpTemplateVariable[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('expected a JSON array')
    return parsed
      .filter((v): v is McpTemplateVariable => !!v && typeof v.key === 'string')
      .map((v) => ({
        key: v.key,
        label: typeof v.label === 'string' ? v.label : undefined,
        group: typeof v.group === 'string' ? v.group : undefined,
        sample: typeof v.sample === 'string' ? v.sample : undefined,
      }))
  } catch (err) {
    console.error(
      'crafted-design mcp: ignoring invalid CRAFTED_DESIGN_TEMPLATE_VARIABLES —',
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}

/** Boot the stdio MCP server. Resolves only when the transport closes; the
 * stdio transport otherwise keeps the process alive. Exits the process (1) if
 * the optional MCP SDK isn't installed. */
export async function startMcpServer(): Promise<void> {
  let StdioServerTransport: typeof import('@modelcontextprotocol/sdk/server/stdio.js').StdioServerTransport
  try {
    ;({ StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    ))
  } catch {
    console.error(
      'crafted-design mcp: @modelcontextprotocol/sdk is not installed.\n' +
        'Install it to run the MCP server:\n' +
        '  npm install @modelcontextprotocol/sdk\n',
    )
    process.exit(1)
  }

  // Imported after the SDK check (createMcpServer imports the SDK too).
  const { createMcpServer } = await import('./server')
  const { isRenderImageAvailable } = await import('./renderImage')
  // Probe once at startup: only expose render_image (+ browser-exact
  // check_contrast) when Playwright + the harness are present, so the agent
  // sees a screenshot tool only when it actually works.
  const imageRendering = await isRenderImageAvailable()
  // The host declares template variables (Phase 26) via an env var holding a
  // JSON array of `{ key, label?, group?, sample? }`. Malformed JSON is ignored
  // (with a stderr note) rather than crashing the server.
  const templateVariables = parseTemplateVariables(
    process.env.CRAFTED_DESIGN_TEMPLATE_VARIABLES,
  )
  const server = createMcpServer({ imageRendering, templateVariables })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stdio transport keeps the process alive; nothing else to do.
}

// Allow direct execution for dev/debugging (`tsx src/mcp/bin.ts`). In the
// published package this module is imported by the CLI, not run directly, so
// the guard stays dormant. Compare realpaths so a symlinked invocation still
// matches (see the equivalent note in src/cli/index.ts).
function invokedDirectly(): boolean {
  const argv1 = process.argv[1]
  if (!argv1) return false
  const self = fileURLToPath(import.meta.url)
  try {
    return realpathSync(self) === realpathSync(argv1)
  } catch {
    return self === resolve(argv1)
  }
}
if (invokedDirectly()) {
  startMcpServer().catch((err) => {
    console.error('crafted-design mcp failed to start:', err)
    process.exit(1)
  })
}
