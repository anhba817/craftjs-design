// Phase 21 Group C — the MCP server: wires the SDK-free tool catalog
// (tools.ts) onto an McpServer. Importing this pulls @modelcontextprotocol/sdk
// (an OPTIONAL peer dependency) — only the MCP bin reaches here, so editor /
// headless / renderer consumers never need the SDK installed.
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// render_html previews through the dependency-free HTML adapter — register it.
import '@/adapters/html'
import { DesignSession } from './session'
import { createTools, type ToolDef, type ToolResult } from './tools'
import { createImageRenderer, type ImageRenderer } from './renderImage'

// The MCP server's own protocol identity (independent of the editor version).
const SERVER_NAME = 'crafted-design'
const SERVER_VERSION = '1.0.0'

function toCallToolResult(r: ToolResult) {
  return {
    content: [{ type: 'text' as const, text: r.text }],
    isError: r.isError,
  }
}

/** Build a fully-configured McpServer over a fresh session (no transport). */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  })
  const session = new DesignSession()
  const tools = createTools(session)
  const byName = new Map<string, ToolDef>(tools.map((t) => [t.name, t]))

  // A persistent screenshot renderer (Playwright optional peer). Launched
  // lazily on first render_image / browser check_contrast, reused after; the
  // browser dies with the process on shutdown.
  let rendererPromise: Promise<ImageRenderer | null> | undefined
  const getRenderer = (): Promise<ImageRenderer | null> => {
    if (!rendererPromise) {
      rendererPromise = createImageRenderer().catch(() => null)
    }
    return rendererPromise
  }

  // check_contrast is registered below as an ASYNC, browser-upgrading tool;
  // the catalog's (deterministic) handler is the no-browser fallback.
  for (const tool of tools) {
    if (tool.name === 'check_contrast') continue
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputShape,
      },
      (args: Record<string, unknown>) =>
        toCallToolResult(tool.handler(args ?? {})),
    )
  }

  // render_image — a PNG the multimodal client can SEE (MCP image content).
  // Rendered by the persistent <DocumentRenderer> page through the document's
  // real adapter. Falls back to a text hint when Playwright isn't installed.
  server.registerTool(
    'render_image',
    {
      title: 'Render to an image',
      description:
        'A PNG screenshot of the current document, rendered through its real design system — use it to SEE colors, contrast, spacing, layout. Requires Playwright (an optional peer); falls back to a hint if absent.',
      inputSchema: {
        width: z.number().int().min(200).max(2400).optional(),
      },
    },
    async (args: { width?: number }) => {
      const renderer = await getRenderer()
      if (!renderer) {
        return toCallToolResult({
          text: 'render_image needs Playwright. Install it: `npm i -D playwright && npx playwright install chromium`. Meanwhile use render_html (structure) + check_contrast (colors).',
          isError: true,
        })
      }
      const png = await renderer.render(session.document, { width: args?.width })
      return {
        content: [
          {
            type: 'image' as const,
            data: Buffer.from(png).toString('base64'),
            mimeType: 'image/png',
          },
        ],
      }
    },
  )

  // check_contrast — exact in-browser computed-style audit when a renderer is
  // available; the deterministic token-based report otherwise.
  const deterministicContrast = byName.get('check_contrast')!
  server.registerTool(
    'check_contrast',
    {
      title: deterministicContrast.title,
      description: deterministicContrast.description,
      inputSchema: {},
    },
    async () => {
      const renderer = await getRenderer()
      if (!renderer) return toCallToolResult(deterministicContrast.handler({}))
      const results = await renderer.checkContrast(session.document)
      if (results.length === 0) return toCallToolResult({ text: 'No text nodes to check.' })
      const fails = results.filter((r) => r.grade === 'Fail').length
      return toCallToolResult({
        text: [
          `exact (rendered)${fails ? ` · ${fails} failing` : ''}`,
          ...results.map(
            (r) => `  [${r.nodeId}]: ${r.fg} on ${r.bg} — ${r.ratio}:1 (${r.grade})`,
          ),
        ].join('\n'),
      })
    },
  )

  // Resources: the live document + its HTML preview, for clients that inspect
  // resources rather than (or alongside) calling get_document / render_html.
  server.registerResource(
    'document',
    'craft://document.json',
    {
      title: 'Current document',
      description: 'The in-progress EditorDocument envelope (JSON).',
      mimeType: 'application/json',
    },
    (uri: URL) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(session.document, null, 2),
        },
      ],
    }),
  )

  server.registerResource(
    'preview',
    'craft://preview.html',
    {
      title: 'HTML preview',
      description:
        'Structure-faithful HTML of the current document (plain-HTML adapter).',
      mimeType: 'text/html',
    },
    (uri: URL) => ({
      contents: [
        { uri: uri.href, mimeType: 'text/html', text: session.renderHtml() },
      ],
    }),
  )

  return server
}
