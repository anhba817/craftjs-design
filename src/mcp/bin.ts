// Phase 21 Group C — the `crafted-design-mcp` bin. A stdio MCP server an AI
// client (Claude Code / Claude Desktop) spawns to build editor documents.
//
//   claude mcp add crafted-design -- npx -y @crafted-design/editor crafted-design-mcp
//
// @modelcontextprotocol/sdk is an OPTIONAL peer (the editor doesn't need it).
// Resolve it lazily so a missing install gives a clear hint instead of a
// module-not-found stack trace.
async function main() {
  let StdioServerTransport: typeof import('@modelcontextprotocol/sdk/server/stdio.js').StdioServerTransport
  try {
    ;({ StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    ))
  } catch {
    console.error(
      'crafted-design-mcp: @modelcontextprotocol/sdk is not installed.\n' +
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
  const server = createMcpServer({ imageRendering })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stdio transport keeps the process alive; nothing else to do.
}

main().catch((err) => {
  console.error('crafted-design-mcp failed to start:', err)
  process.exit(1)
})
