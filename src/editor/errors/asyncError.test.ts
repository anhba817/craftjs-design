import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { normalizeErrorEvent, normalizeRejectionEvent } from './asyncError'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-25T00:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('normalizeErrorEvent', () => {
  // ErrorEvent constructor isn't available in the Node test environment;
  // manufacture an object with the same shape. Only the .message + .error
  // fields are read by normalizeErrorEvent.
  function errorEvent(
    init: Partial<{ message: string; error: unknown }>,
  ): ErrorEvent {
    return {
      message: init.message ?? '',
      error: init.error,
    } as unknown as ErrorEvent
  }

  it('extracts message + Error from a standard ErrorEvent', () => {
    const err = new Error('boom')
    const out = normalizeErrorEvent(errorEvent({ message: 'boom', error: err }))
    expect(out).toEqual({
      message: 'boom',
      source: 'window-error',
      error: err,
      timestamp: expect.any(Number),
    })
  })

  it('prefers Error.message over ErrorEvent.message (cross-origin "Script error.")', () => {
    const err = new Error('real reason')
    // Browsers strip detail for cross-origin scripts; .message becomes
    // "Script error." but .error still carries the original.
    const out = normalizeErrorEvent(
      errorEvent({ message: 'Script error.', error: err }),
    )
    expect(out.message).toBe('real reason')
  })

  it('falls back to ErrorEvent.message when no Error instance is attached', () => {
    const out = normalizeErrorEvent(errorEvent({ message: 'naked message' }))
    expect(out.message).toBe('naked message')
    expect(out.error).toBeNull()
  })

  it('falls back to "Uncaught error" when nothing useful is provided', () => {
    expect(normalizeErrorEvent(errorEvent({})).message).toBe('Uncaught error')
  })
})

describe('normalizeRejectionEvent', () => {
  // PromiseRejectionEvent's constructor isn't available in all JSDOM
  // versions; manufacture an object with the same shape instead.
  function rejectionEvent(reason: unknown): PromiseRejectionEvent {
    return {
      reason,
      promise: Promise.reject(reason).catch(() => {}) as unknown as Promise<unknown>,
    } as unknown as PromiseRejectionEvent
  }

  it('extracts message from an Error reason', () => {
    const err = new Error('async boom')
    const out = normalizeRejectionEvent(rejectionEvent(err))
    expect(out).toEqual({
      message: 'async boom',
      source: 'promise-rejection',
      error: err,
      timestamp: expect.any(Number),
    })
  })

  it('uses a string reason directly', () => {
    const out = normalizeRejectionEvent(rejectionEvent('something failed'))
    expect(out.message).toBe('something failed')
    expect(out.error).toBeNull()
  })

  it("extracts .message from object-shaped reasons", () => {
    const out = normalizeRejectionEvent(
      rejectionEvent({ message: 'thrown literal', status: 500 }),
    )
    expect(out.message).toBe('thrown literal')
    expect(out.error).toBeNull()
  })

  it('falls back to "Promise rejected" for unknown reasons', () => {
    expect(normalizeRejectionEvent(rejectionEvent(undefined)).message).toBe(
      'Promise rejected',
    )
    expect(normalizeRejectionEvent(rejectionEvent(42)).message).toBe(
      'Promise rejected',
    )
    expect(normalizeRejectionEvent(rejectionEvent({})).message).toBe(
      'Promise rejected',
    )
  })

  it('handles an empty Error message gracefully', () => {
    const out = normalizeRejectionEvent(rejectionEvent(new Error('')))
    expect(out.message).toBe('Promise rejected')
    expect(out.error).toBeInstanceOf(Error)
  })
})
