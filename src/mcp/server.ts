// Phase 21 Group C — the MCP server: wires the SDK-free tool catalog
// (tools.ts) onto an McpServer. Importing this pulls @modelcontextprotocol/sdk
// (an OPTIONAL peer dependency) — only the MCP bin reaches here, so editor /
// headless / renderer consumers never need the SDK installed.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// render_html previews through the dependency-free HTML adapter — register it.
import '@/adapters/html'
import { DesignSession } from './session'
import { createTools, type ToolResult } from './tools'

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

  for (const tool of createTools(session)) {
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
