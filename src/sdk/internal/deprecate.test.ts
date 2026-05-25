import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetDeprecationCacheForTests, deprecate } from './deprecate'

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  _resetDeprecationCacheForTests()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warnSpy.mockRestore()
})

describe('deprecate', () => {
  it('emits a console.warn with the standardised prefix on first call', () => {
    deprecate({
      api: 'oldThing',
      since: '0.2.0',
      removeIn: '1.0.0',
      migration: 'Use newThing instead.',
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = warnSpy.mock.calls[0][0] as string
    expect(msg).toContain('[deprecated]')
    expect(msg).toContain('oldThing')
    expect(msg).toContain('0.2.0')
    expect(msg).toContain('1.0.0')
    expect(msg).toContain('Use newThing instead.')
  })

  it("doesn't double-warn for the same api within a session", () => {
    const notice = {
      api: 'oldThing',
      since: '0.2.0',
      removeIn: '1.0.0',
      migration: 'Use newThing instead.',
    }
    deprecate(notice)
    deprecate(notice)
    deprecate(notice)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('emits separately for different apis', () => {
    deprecate({ api: 'a', since: '0.2', removeIn: '1.0', migration: 'use A2' })
    deprecate({ api: 'b', since: '0.2', removeIn: '1.0', migration: 'use B2' })
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it('_resetDeprecationCacheForTests re-arms warnings between tests', () => {
    deprecate({ api: 'x', since: '0.2', removeIn: '1.0', migration: 'use X2' })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    _resetDeprecationCacheForTests()
    deprecate({ api: 'x', since: '0.2', removeIn: '1.0', migration: 'use X2' })
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })
})
