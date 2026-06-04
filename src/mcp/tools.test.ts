// Phase 21 Group C — the MCP tool catalog, exercised directly (no MCP SDK,
// no stdio): build a document end to end through the tool handlers, exactly
// as an agent would, and assert the results.
import { beforeAll, describe, expect, it } from 'vitest'
import { DesignSession } from './session'
import { createTools, type ToolDef } from './tools'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/themes')
  await import('@/persistence/templates')
  await import('@/adapters/html')
})

function harness() {
  const session = new DesignSession()
  const tools = new Map(createTools(session).map((t) => [t.name, t]))
  const call = (name: string, args: Record<string, unknown> = {}) => {
    const tool = tools.get(name) as ToolDef
    if (!tool) throw new Error(`no tool ${name}`)
    return tool.handler(args)
  }
  return { session, tools, call }
}

describe('tool catalog', () => {
  it('exposes a stable, documented set of tools', () => {
    const { tools } = harness()
    // Every tool has a title + description (shown to the model).
    for (const t of tools.values()) {
      expect(t.title, t.name).toBeTruthy()
      expect(t.description.length, t.name).toBeGreaterThan(10)
    }
    expect(tools.has('get_capabilities')).toBe(true)
    expect(tools.has('add_node')).toBe(true)
    expect(tools.has('get_document')).toBe(true)
  })

  it('list_canonicals + describe_canonical surface the registry', () => {
    const { call } = harness()
    const list = call('list_canonicals')
    expect(list.isError).toBeFalsy()
    expect(list.text).toContain('heading')
    expect(list.text).toContain('card · ') // a Pattern B canonical
    const desc = call('describe_canonical', { id: 'heading' })
    expect(desc.text).toContain('propsJsonSchema')
    expect(call('describe_canonical', { id: 'nope' }).isError).toBe(true)
  })
})

describe('build a document through the tools', () => {
  it('create → add (Pattern A + B) → style → render → get', () => {
    const { call, session } = harness()

    expect(call('create_document', { adapterId: 'html', themeId: 'rose' }).isError).toBeFalsy()

    const h = call('add_node', {
      parentId: 'ROOT',
      canonical: 'heading',
      nodeProps: { content: 'Pricing' },
    })
    expect(h.isError).toBeFalsy()
    expect(h.text).toContain('heading-1') // returned id, surfaced to the model
    expect(h.text).toContain('outline:') // status block follows

    // Pattern B: add a card, then a node into its slot.
    call('add_node', { parentId: 'ROOT', canonical: 'card' })
    const inSlot = call('add_node', {
      parentId: 'card-1',
      canonical: 'text',
      nodeProps: { content: 'Everything included.' },
      slot: 'body',
    })
    expect(inSlot.isError).toBeFalsy()

    call('update_node_style', { nodeId: 'heading-1', classes: { root: 'text-4xl font-bold' } })

    const html = call('render_html')
    expect(html.isError).toBeFalsy()
    expect(html.text).toContain('Pricing')
    expect(html.text).toContain('Everything included.')
    expect(html.text).toContain('text-4xl font-bold')

    const outline = call('outline_document')
    expect(outline.text).toMatch(/\[body\] .* · text/)

    const doc = call('get_document')
    const parsed = JSON.parse(doc.text)
    expect(parsed.adapterId).toBe('html')
    expect(parsed.themeId).toBe('rose')
    // get_document output equals the session document.
    expect(parsed.craftJson).toBe(session.document.craftJson)
  })

  it('returns recoverable errors (not throws) for bad input', () => {
    const { call } = harness()
    call('create_document', { adapterId: 'html' })
    expect(call('add_node', { parentId: 'ROOT', canonical: 'nope' }).isError).toBe(true)
    expect(call('add_node', { parentId: 'ghost', canonical: 'text' }).isError).toBe(true)
    expect(
      call('update_node_props', { nodeId: 'ROOT', props: { notAProp: 1 } }).isError,
    ).toBeFalsy() // unknown prop is dropped by schema, not an error
    expect(call('remove_node', { nodeId: 'ROOT' }).isError).toBe(true)
  })

  it('theme_palette + check_contrast give the agent color awareness', () => {
    const { call } = harness()
    call('create_document', { adapterId: 'html' })
    call('add_node', {
      parentId: 'ROOT',
      canonical: 'heading',
      nodeProps: { content: 'Hi' },
    })
    const palette = call('theme_palette')
    expect(palette.isError).toBeFalsy()
    expect(palette.text).toContain('body text')
    expect(palette.text).toMatch(/\d+(\.\d+)?:1/) // a ratio

    const contrast = call('check_contrast')
    expect(contrast.isError).toBeFalsy()
    expect(contrast.text).toContain('heading-1')

    // A literal-color node is flagged indeterminate, not graded.
    call('update_node_style', { nodeId: 'heading-1', classes: { root: 'text-gray-400' } })
    expect(call('check_contrast').text).toContain('indeterminate')
  })

  it('apply_template + validate', () => {
    const { call } = harness()
    const applied = call('apply_template', { id: 'landing-page' })
    expect(applied.isError).toBeFalsy()
    expect(call('validate_document').text).toContain('valid: yes')
    expect(call('outline_document').text).toContain('· box')
  })

  it('load_document round-trips through get_document', () => {
    const { call } = harness()
    call('create_document', { adapterId: 'html' })
    call('add_node', { parentId: 'ROOT', canonical: 'button', nodeProps: { label: 'Go' } })
    const json = call('get_document').text
    const fresh = harness()
    expect(fresh.call('load_document', { json }).isError).toBeFalsy()
    expect(fresh.call('get_document').text).toBe(json)
  })
})
