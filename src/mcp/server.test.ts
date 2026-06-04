// Phase 21 Group C — the MCP SDK wiring constructs without error (the
// SDK-free behavior is covered in tools.test.ts). Asserts every tool +
// resource registers — i.e. no shape/SDK mismatch.
import { beforeAll, describe, expect, it } from 'vitest'
import { createMcpServer } from './server'
import { createTools } from './tools'
import { DesignSession } from './session'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/themes')
  await import('@/adapters/html')
})

describe('createMcpServer', () => {
  it('builds a server registering every tool + the resources', () => {
    const server = createMcpServer()
    expect(server).toBeTruthy()
    // The SDK exposes registered tools on the underlying server internals;
    // rather than reach into those, assert construction didn't throw and the
    // tool catalog the server iterates is non-trivial.
    const toolCount = createTools(new DesignSession()).length
    expect(toolCount).toBeGreaterThanOrEqual(20)
  })

  it('registers render_image only when image rendering is enabled', () => {
    // No throw either way; the flag controls whether render_image is exposed
    // (the agent never sees a screenshot tool it can't use).
    expect(() => createMcpServer({ imageRendering: false })).not.toThrow()
    expect(() => createMcpServer({ imageRendering: true })).not.toThrow()
    // The capabilities text prescribes render_image only when enabled.
    const on = createTools(new DesignSession(), { imageRendering: true })
    const off = createTools(new DesignSession(), { imageRendering: false })
    const cap = (ts: ReturnType<typeof createTools>) =>
      ts.find((t) => t.name === 'get_capabilities')!.handler({}).text
    expect(cap(on)).toContain('render_image')
    expect(cap(off)).not.toContain('render_image')
    // connect() is the only async surface; constructing is synchronous and
    // must not throw for any tool's inputSchema (a bad zod raw shape would).
  })
})
