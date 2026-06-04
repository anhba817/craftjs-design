# MCP server — let an AI build designs

`crafted-design-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes the editor's component registry and document model as
tools. An AI client (Claude Code, Claude Desktop, any MCP client) can use it to
**author and edit editor documents** — producing the same `EditorDocument`
JSON the editor loads, the `<DocumentRenderer />` renders, and you ship.

It builds on the headless API ([`SDK_GUIDE`](./SDK_GUIDE.md) →
`@crafted-design/editor/headless`): the agent works against an in-progress
document with no browser and no editor running.

## Install

The server ships as a `bin` on the package. Its only extra dependency is the
MCP SDK, an **optional peer** (the editor itself doesn't need it):

```bash
npm install @crafted-design/editor @modelcontextprotocol/sdk
```

For the `render_image` tool (and the exact, in-browser `check_contrast`), also
install Playwright + a browser — both are optional; the rest of the server
works without them:

```bash
npm i -D playwright && npx playwright install chromium
```

## Connect a client

**Claude Code:**

```bash
claude mcp add crafted-design -- npx -y @crafted-design/editor crafted-design-mcp
```

**Claude Desktop** (`claude_desktop_config.json` → `mcpServers`):

```jsonc
{
  "mcpServers": {
    "crafted-design": {
      "command": "npx",
      "args": ["-y", "@crafted-design/editor", "crafted-design-mcp"]
    }
  }
}
```

(Both spawn the `crafted-design-mcp` bin over stdio. If the MCP SDK isn't
installed, the bin prints an install hint and exits.)

## Other MCP clients

Nothing here is Claude-specific — this is a standard **stdio** MCP server, so
any MCP client registers it with the *same command and args*:

```
command: npx   args: ["-y", "@crafted-design/editor", "crafted-design-mcp"]
```

(Before the package is published, point at the built bin instead:
`command: node`, `args: ["<abs>/dist-lib/mcp.js"]`.) Only the config file and
its key differ per client:

| Client | Where | Key |
|---|---|---|
| **VS Code** (Copilot agent) | `.vscode/mcp.json` | `servers` |
| **Cursor** | `.cursor/mcp.json` (or `~/.cursor/mcp.json`) | `mcpServers` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| **Cline / Roo** (VS Code) | extension "MCP Servers" settings | `mcpServers` |
| **Continue.dev** | `~/.continue/config.yaml` | `mcpServers:` |
| **Zed** | `settings.json` | `context_servers` |
| **Gemini CLI** | `~/.gemini/settings.json` | `mcpServers` |

Most use the JSON shape:

```jsonc
{
  "mcpServers": {
    "crafted-design": {
      "command": "npx",
      "args": ["-y", "@crafted-design/editor", "crafted-design-mcp"]
    }
  }
}
```

**Codex** (OpenAI CLI) uses **TOML**, with a snake_case key — `~/.codex/config.toml`:

```toml
[mcp_servers.crafted-design]
command = "npx"
args = ["-y", "@crafted-design/editor", "crafted-design-mcp"]
```

(or `codex mcp add crafted-design -- npx -y @crafted-design/editor crafted-design-mcp`).

**Custom agents / frameworks** connect programmatically — no config file. Pass
the same stdio command to an MCP client SDK or an agent framework's MCP
adapter:

```python
# OpenAI Agents SDK
from agents.mcp import MCPServerStdio
server = MCPServerStdio(params={
    "command": "npx",
    "args": ["-y", "@crafted-design/editor", "crafted-design-mcp"],
})
```

```ts
// Raw MCP TypeScript SDK
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@crafted-design/editor', 'crafted-design-mcp'],
})
```

The same works with LangChain (`langchain-mcp-adapters`), LlamaIndex,
Pydantic-AI, and others.

> **Transport:** the server speaks **stdio** (every desktop / CLI client
> supports it). A client that needs HTTP/SSE can't connect directly — open an
> issue if you need a streamable-HTTP transport.

## The workflow

Call `get_capabilities` first — it returns this in-band. The shape:

1. **Discover** — `list_canonicals` (every component, container vs leaf vs
   multi-canvas) and `describe_canonical` (full props **JSON Schema**,
   defaults, slots, panels).
2. **Start** — `create_document` (root is a Box canvas), or `apply_template` /
   `load_document`.
3. **Build** — `add_node` returns the new node's id; address later edits by it.
   - Pattern A containers (box, stack, section): pass `parentId`.
   - Pattern B (card, tabs, table): pass `parentId` **and** `slot` (see
     `describe_canonical` → `canvasSlots`).
4. **Refine** — `update_node_props`, `update_node_style`, `move_node`,
   `remove_node`.
5. **See it** — `render_image` (a PNG you can look at), `outline_document`
   (cheap text tree), or `render_html` (structure-faithful HTML).
6. **Check colors** — `theme_palette` (the theme's pairs) + `check_contrast`
   (per text node, worst-first) so you don't ship illegible text.
7. **Finish** — `validate_document`, then `get_document` for the
   `EditorDocument` JSON.

Every mutating tool returns the validation status + a fresh outline, so the
model stays oriented. Bad input (unknown canonical, schema violation, missing
node) comes back as a recoverable tool error, not a crash.

## Tool catalog

| Tool | What it does |
|---|---|
| `get_capabilities` | The workflow + tool order (read first). |
| `list_canonicals` | All components: id · category · container/leaf/slots. |
| `describe_canonical` | One component: props JSON Schema, defaults, slots, panels. |
| `list_adapters` / `list_themes` / `list_templates` | Registered design systems / themes / templates. |
| `create_document` | Fresh document (adapter / theme / colorMode / root). |
| `apply_template` | Load a registered starter template. |
| `add_node` | Add a canonical under a parent (or a Pattern B `slot`); returns its id. |
| `update_node_props` | Merge a props patch (schema-checked). |
| `update_node_style` | Merge Tailwind classes per style slot. |
| `move_node` | Reparent (slot/index); cycle-safe. |
| `remove_node` | Delete a node + subtree (ROOT / slot containers protected). |
| `set_adapter` / `set_theme` | Set the document's design system / canvas theme. |
| `outline_document` | Compact id · canonical tree. |
| `render_html` | Static structural HTML preview. |
| `render_image` | A PNG screenshot of the design (needs Playwright). |
| `theme_palette` | The theme's token colors + WCAG ratios for key pairs. |
| `check_contrast` | Per-text-node contrast + grade, worst-first. |
| `validate_document` | Structural + semantic issues. |
| `get_document` | The full `EditorDocument` JSON. |
| `load_document` / `reset_document` | Replace from JSON / start over. |

Resources: `craft://document.json` (the live envelope) and
`craft://preview.html` (its HTML preview).

## A worked example

> **Prompt:** "Build a pricing hero — a headline, a subheading, and a card with
> a plan name and a Subscribe button."

A capable agent runs roughly:

```
create_document        { adapterId: "shadcn" }
add_node               { parentId: "ROOT", canonical: "heading",
                         nodeProps: { content: "Simple, honest pricing" },
                         classes: { root: "text-4xl font-bold" } }      → heading-1
add_node               { parentId: "ROOT", canonical: "text",
                         nodeProps: { content: "One plan. Everything included." } } → text-1
add_node               { parentId: "ROOT", canonical: "card" }          → card-1
add_node               { parentId: "card-1", slot: "header", canonical: "heading",
                         nodeProps: { content: "Pro", level: "3" } }     → heading-2
add_node               { parentId: "card-1", slot: "footer", canonical: "button",
                         nodeProps: { label: "Subscribe" } }            → button-1
render_image                                                             # SEE it
check_contrast                                                           # is the text legible?
get_document                                                             # → EditorDocument JSON
```

The resulting JSON drops straight into the editor or the renderer:

```tsx
import { DocumentRenderer } from '@crafted-design/editor/renderer'
<DocumentRenderer document={generated} />
```

## Seeing colors & contrast

Structure tools (`outline_document`, `render_html`) tell the agent *what* it
built, not *how it looks*. Three tools close that gap:

- **`render_image`** → a PNG, rendered by a persistent headless page that
  mounts the real `<DocumentRenderer>` through the document's design system
  (the same output a host ships). The multimodal client sees it inline.
  Requires Playwright (optional); without it the tool returns a hint.
- **`theme_palette`** → the theme's token colors with WCAG ratios for the key
  pairs (body / muted / card text, primary / secondary / accent buttons). No
  browser needed.
- **`check_contrast`** → every text node's foreground/background + ratio +
  grade, worst-first. Exact (in-browser computed styles) when Playwright is
  installed; a deterministic token-based report otherwise — which flags nodes
  using literal/arbitrary colors as `indeterminate` (verify those with
  `render_image`).

The loop: **build → `render_image` (look) → `check_contrast` (measure) → fix
the failing nodes → look again.**

> Fonts: offline renders may substitute glyphs, but color, contrast, spacing,
> and layout — what these tools are for — are faithful.

## What it is and isn't

- **`render_image` is structure + style faithful, not a design mockup** — it's
  exactly what `<DocumentRenderer>` produces. `render_html` is the lighter,
  no-browser structural view (real DOM + classes, no resolved colors).
- **Stateless across sessions.** The server holds one in-progress document per
  process; persisting it is the host's job (`get_document` → your storage /
  `StorageAdapter`).
- **Adapter-independent build.** Documents are canonical-id based; the agent
  can target any registered adapter via `set_adapter`. `render_html` always
  previews through the dependency-free HTML adapter for reliability.
