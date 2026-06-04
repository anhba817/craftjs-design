// Phase 21 Group C — the MCP tool catalog. SDK-free: each tool is
// { name, title, description, inputShape (zod raw shape), handler } so the
// whole surface is unit-testable without the MCP SDK or a transport. server.ts
// registers each via McpServer.registerTool; handlers return a plain
// { text, isError? } the server maps to MCP's content shape.
import { z } from 'zod'
import {
  describeCanonical,
  describeCanonicals,
  getComponent,
  listComponents,
  listTemplates,
  listThemes,
  type HeadlessNodeSpec,
} from '@/headless'
import { listAdapters } from '@/adapters/AdapterContext'
import { getTemplate } from '@/persistence/templates/registry'
import type { DesignSession } from './session'

export interface ToolResult {
  text: string
  isError?: boolean
}

export interface ToolDef {
  name: string
  title: string
  description: string
  // A zod raw shape ({} = no args); McpServer turns it into the input schema.
  inputShape: z.ZodRawShape
  handler: (args: Record<string, unknown>) => ToolResult
}

const ok = (text: string): ToolResult => ({ text })
const fail = (text: string): ToolResult => ({ text, isError: true })

// Run a mutation, returning the session status (or a recoverable error the
// model can react to — bad canonical, schema violation, unknown node, …).
function withStatus(session: DesignSession, fn: () => string): ToolResult {
  try {
    const head = fn()
    return ok(`${head}\n\n${session.status()}`)
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

// A node spec from tool args (canonical + optional props/style).
function specFromArgs(args: Record<string, unknown>): HeadlessNodeSpec {
  const spec: HeadlessNodeSpec = { canonical: args.canonical as string }
  if (args.nodeProps) spec.nodeProps = args.nodeProps as Record<string, unknown>
  if (args.classes) spec.style = { classes: args.classes as Record<string, string> }
  return spec
}

export function createTools(session: DesignSession): ToolDef[] {
  return [
    {
      name: 'get_capabilities',
      title: 'How to use this server',
      description:
        'Read first. Explains the build-a-document workflow and the tool order.',
      inputShape: {},
      handler: () =>
        ok(
          [
            'crafted-design MCP — build an editor document an AI can hand to <Editor /> or render.',
            '',
            'Workflow:',
            '1. list_canonicals / describe_canonical — discover components + their props (JSON Schema).',
            '2. create_document — start fresh (root is a Box canvas), or apply_template / load_document.',
            '3. add_node — build the tree. Returns the new node id; address later edits by id.',
            '   • Pattern A containers (box, stack, section): pass parentId.',
            '   • Pattern B (card, tabs, table): pass parentId + slot (see describe_canonical → canvasSlots).',
            '4. update_node_props / update_node_style / move_node / remove_node — refine.',
            '5. outline_document (cheap) or render_html (structural HTML) to see the result.',
            '   • theme_palette / check_contrast — know your colors and whether text is legible (WCAG).',
            '   • render_image — SEE the design as a PNG (real design system; needs Playwright).',
            '6. validate_document, then get_document for the final EditorDocument JSON.',
            '',
            'Every mutating tool returns the validation status + a fresh outline, so you stay oriented.',
          ].join('\n'),
        ),
    },

    {
      name: 'list_canonicals',
      title: 'List components',
      description:
        'Every canonical component: id, category, whether it is a container (Pattern A children) or multi-canvas (Pattern B slots). Use describe_canonical for the full props schema.',
      inputShape: {},
      handler: () => {
        const rows = describeCanonicals()
          .filter((c) => !c.hidden)
          .map((c) => {
            const kind = c.canvasSlots
              ? `slots: ${Array.isArray(c.canvasSlots) ? c.canvasSlots.join('/') : 'dynamic'}`
              : c.isCanvas
                ? 'container'
                : 'leaf'
            return `${c.id} · ${c.category} · ${kind}`
          })
        return ok(rows.join('\n'))
      },
    },

    {
      name: 'describe_canonical',
      title: 'Describe a component',
      description:
        'Full description of one canonical: its props JSON Schema, defaults, style slots, canvas slots, and applicable inspector panels.',
      inputShape: { id: z.string().describe('canonical id, e.g. "heading"') },
      handler: (args) => {
        const desc = describeCanonical(args.id as string)
        if (!desc) return fail(`unknown canonical "${args.id as string}"`)
        return ok(JSON.stringify(desc, null, 2))
      },
    },

    {
      name: 'list_adapters',
      title: 'List adapters',
      description: 'Registered design-system adapters (id + display name).',
      inputShape: {},
      handler: () =>
        ok(listAdapters().map((a) => `${a.id} · ${a.displayName}`).join('\n')),
    },

    {
      name: 'list_themes',
      title: 'List themes',
      description: 'Registered document/canvas themes (id + display name).',
      inputShape: {},
      handler: () =>
        ok(listThemes().map((t) => `${t.id} · ${t.displayName}`).join('\n')),
    },

    {
      name: 'list_templates',
      title: 'List starter templates',
      description: 'Registered templates that apply_template can load.',
      inputShape: {},
      handler: () =>
        ok(
          listTemplates().map((t) => `${t.id} · ${t.name}`).join('\n') ||
            '(no templates registered)',
        ),
    },

    {
      name: 'create_document',
      title: 'Start a new document',
      description:
        'Begin a fresh document (root is a Box canvas). Optionally set the adapter, theme, color mode, or a different root canonical.',
      inputShape: {
        adapterId: z.string().optional(),
        themeId: z.string().optional(),
        colorMode: z.enum(['light', 'dark', 'system']).optional(),
        rootCanonical: z.string().optional(),
      },
      handler: (args) =>
        withStatus(session, () => {
          session.create({
            adapterId: args.adapterId as string | undefined,
            themeId: args.themeId as string | undefined,
            colorMode: args.colorMode as 'light' | 'dark' | 'system' | undefined,
            rootCanonical: args.rootCanonical as string | undefined,
          })
          return 'Created a new document.'
        }),
    },

    {
      name: 'apply_template',
      title: 'Load a starter template',
      description: 'Replace the session document with a registered template.',
      inputShape: { id: z.string() },
      handler: (args) =>
        withStatus(session, () => {
          const tpl = getTemplate(args.id as string)
          if (!tpl) throw new Error(`unknown template "${args.id as string}"`)
          session.load(JSON.stringify(tpl.envelope))
          return `Applied template "${tpl.id}".`
        }),
    },

    {
      name: 'add_node',
      title: 'Add a component',
      description:
        'Add a canonical under a parent. For Pattern B parents (card/tabs/table) pass `slot`. Returns the new node id (address later edits by it).',
      inputShape: {
        parentId: z.string().describe('id of the parent node ("ROOT" for the root)'),
        canonical: z.string().describe('canonical id to add, e.g. "heading"'),
        nodeProps: z.record(z.string(), z.unknown()).optional(),
        classes: z
          .record(z.string(), z.string())
          .optional()
          .describe('Tailwind classes per style slot, e.g. { "root": "text-2xl" }'),
        slot: z.string().optional().describe('Pattern B slot on the parent'),
        index: z.number().int().optional().describe('insert position (default: append)'),
      },
      handler: (args) =>
        withStatus(session, () => {
          if (!getComponent(args.canonical as string)) {
            throw new Error(`unknown canonical "${args.canonical as string}"`)
          }
          const id = session.addNode(args.parentId as string, specFromArgs(args), {
            slot: args.slot as string | undefined,
            index: args.index as number | undefined,
          })
          return `Added ${args.canonical as string} as "${id}".`
        }),
    },

    {
      name: 'update_node_props',
      title: 'Edit a node’s props',
      description:
        'Merge a props patch into a node (validated against its canonical schema).',
      inputShape: {
        nodeId: z.string(),
        props: z.record(z.string(), z.unknown()),
      },
      handler: (args) =>
        withStatus(session, () => {
          session.updateProps(
            args.nodeId as string,
            args.props as Record<string, unknown>,
          )
          return `Updated props of "${args.nodeId as string}".`
        }),
    },

    {
      name: 'update_node_style',
      title: 'Edit a node’s styling',
      description:
        'Merge Tailwind classes per style slot into a node, e.g. { "root": "text-2xl font-bold" }.',
      inputShape: {
        nodeId: z.string(),
        classes: z.record(z.string(), z.string()),
      },
      handler: (args) =>
        withStatus(session, () => {
          session.updateStyle(args.nodeId as string, {
            classes: args.classes as Record<string, string>,
          })
          return `Updated style of "${args.nodeId as string}".`
        }),
    },

    {
      name: 'move_node',
      title: 'Move a node',
      description:
        'Reparent a node (optionally into a `slot`, at an `index`). Cycle-safe.',
      inputShape: {
        nodeId: z.string(),
        newParentId: z.string(),
        slot: z.string().optional(),
        index: z.number().int().optional(),
      },
      handler: (args) =>
        withStatus(session, () => {
          session.moveNode(args.nodeId as string, args.newParentId as string, {
            slot: args.slot as string | undefined,
            index: args.index as number | undefined,
          })
          return `Moved "${args.nodeId as string}".`
        }),
    },

    {
      name: 'remove_node',
      title: 'Remove a node',
      description: 'Delete a node and its subtree. ROOT and slot containers are protected.',
      inputShape: { nodeId: z.string() },
      handler: (args) =>
        withStatus(session, () => {
          session.removeNode(args.nodeId as string)
          return `Removed "${args.nodeId as string}".`
        }),
    },

    {
      name: 'set_adapter',
      title: 'Set the document’s adapter',
      description: 'Set which design system the document targets when loaded into the editor.',
      inputShape: { adapterId: z.string() },
      handler: (args) =>
        withStatus(session, () => {
          session.setAdapter(args.adapterId as string)
          return `Adapter set to "${args.adapterId as string}".`
        }),
    },

    {
      name: 'set_theme',
      title: 'Set the document’s theme',
      description: 'Set the canvas theme id (or pass an empty string to clear it).',
      inputShape: { themeId: z.string() },
      handler: (args) =>
        withStatus(session, () => {
          const id = (args.themeId as string) || undefined
          session.setTheme(id)
          return `Theme set to ${id ? `"${id}"` : 'default'}.`
        }),
    },

    {
      name: 'outline_document',
      title: 'Outline the document',
      description: 'A compact id · canonical tree of the current document (cheap to read).',
      inputShape: {},
      handler: () => ok(session.outline()),
    },

    {
      name: 'render_html',
      title: 'Render to HTML',
      description:
        'Static HTML of the current document via the plain-HTML adapter. Structure-faithful (real elements + Tailwind classes), not a pixel screenshot; overlays render their closed state.',
      inputShape: {},
      handler: () => {
        try {
          return ok(session.renderHtml())
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err))
        }
      },
    },

    {
      name: 'validate_document',
      title: 'Validate the document',
      description: 'Report structural + semantic issues (errors block a clean load; warnings do not).',
      inputShape: {},
      handler: () => {
        const result = session.validate()
        if (result.issues.length === 0) return ok('valid: yes (no issues)')
        return ok(
          [
            `valid: ${result.ok ? 'yes (warnings only)' : 'NO'}`,
            ...result.issues.map(
              (i) => `${i.severity}${i.nodeId ? ` [${i.nodeId}]` : ''}: ${i.message}`,
            ),
          ].join('\n'),
        )
      },
    },

    {
      name: 'theme_palette',
      title: 'Theme colors & contrast',
      description:
        "The document's theme resolved to colors, with WCAG contrast ratios + grades for the key semantic pairs (body text, muted text, primary button, …). Use it to know whether the theme itself is legible.",
      inputShape: {},
      handler: () => {
        const r = session.themeContrast()
        const lines = [
          `theme: ${r.themeId} · scheme: ${r.scheme}`,
          ...r.pairs.map(
            (p) =>
              `  ${p.label}: ${p.foreground} on ${p.background} — ${p.ratio}:1 (${p.grade})`,
          ),
        ]
        return ok(lines.join('\n'))
      },
    },

    {
      name: 'check_contrast',
      title: 'Check text contrast',
      description:
        'Per-text-node foreground/background colors + WCAG ratio and grade, worst-first. Nodes using literal or arbitrary colors are flagged "indeterminate" — verify those with render_image. (Deterministic, token-based; an exact in-browser audit is used when a renderer is available.)',
      inputShape: {},
      handler: () => {
        const r = session.documentContrast()
        if (r.nodes.length === 0) return ok('No text nodes to check.')
        const sorted = [...r.nodes].sort(
          (a, b) => (a.ratio ?? Infinity) - (b.ratio ?? Infinity),
        )
        const lines = sorted.map((n) => {
          if (n.indeterminate) {
            return `  [${n.nodeId}] ${n.canonical}: indeterminate — ${n.note}`
          }
          return `  [${n.nodeId}] ${n.canonical}: ${n.foreground} on ${n.background} — ${n.ratio}:1 (${n.grade})`
        })
        const fails = sorted.filter((n) => n.grade === 'Fail').length
        return ok(
          [
            `scheme: ${r.scheme}${fails ? ` · ${fails} failing` : ''}`,
            ...lines,
          ].join('\n'),
        )
      },
    },

    {
      name: 'get_document',
      title: 'Get the document JSON',
      description:
        'The full EditorDocument envelope as JSON — loads unmodified into <Editor /> or <DocumentRenderer />.',
      inputShape: {},
      handler: () => ok(JSON.stringify(session.document, null, 2)),
    },

    {
      name: 'load_document',
      title: 'Load a document',
      description: 'Replace the session document from an EditorDocument JSON string (validated + migrated).',
      inputShape: { json: z.string() },
      handler: (args) =>
        withStatus(session, () => {
          session.load(args.json as string)
          return 'Loaded document.'
        }),
    },

    {
      name: 'reset_document',
      title: 'Reset the document',
      description: 'Discard the session document and start over (empty Box root).',
      inputShape: {},
      handler: () =>
        withStatus(session, () => {
          session.reset()
          return 'Document reset.'
        }),
    },
  ]
}

// Re-export for the server's "available components" startup hint.
export { listComponents }
