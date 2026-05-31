import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _resetTelemetryForTest,
  emitMetric,
  getTelemetry,
  reportError,
  setTelemetry,
  timed,
} from './telemetry'

afterEach(() => _resetTelemetryForTest())

// Phase 15 § 13 — the editor collects nothing by default; handlers only
// fire when the host installs them.
describe('telemetry singleton', () => {
  it('is a no-op when no handlers are installed', () => {
    expect(getTelemetry()).toEqual({})
    // Neither call throws without a handler.
    expect(() => reportError(new Error('x'), {})).not.toThrow()
    expect(() => emitMetric({ name: 'document.apply' })).not.toThrow()
  })

  it('routes reportError to the installed onError handler', () => {
    const onError = vi.fn()
    setTelemetry({ onError })
    const err = new Error('boom')
    reportError(err, { boundary: 'canvas', componentStack: 'stack' })
    expect(onError).toHaveBeenCalledWith(err, {
      boundary: 'canvas',
      componentStack: 'stack',
    })
  })

  it('routes emitMetric to the installed onMetric handler', () => {
    const onMetric = vi.fn()
    setTelemetry({ onMetric })
    emitMetric({ name: 'document.apply', durationMs: 12, docId: 'doc-1' })
    expect(onMetric).toHaveBeenCalledWith({
      name: 'document.apply',
      durationMs: 12,
      docId: 'doc-1',
    })
  })

  it('timed() emits a duration metric and returns the result', async () => {
    const onMetric = vi.fn()
    setTelemetry({ onMetric })
    const result = await timed('op', () => 42, { tag: 'x' })
    expect(result).toBe(42)
    expect(onMetric).toHaveBeenCalledTimes(1)
    const metric = onMetric.mock.calls[0][0]
    expect(metric.name).toBe('op')
    expect(metric.tag).toBe('x')
    expect(typeof metric.durationMs).toBe('number')
  })

  it('timed() still emits the metric when the op throws', async () => {
    const onMetric = vi.fn()
    setTelemetry({ onMetric })
    await expect(
      timed('op', () => {
        throw new Error('fail')
      }),
    ).rejects.toThrow('fail')
    expect(onMetric).toHaveBeenCalledTimes(1)
  })

  it('setTelemetry({}) clears handlers (Provider unmount path)', () => {
    const onError = vi.fn()
    setTelemetry({ onError })
    setTelemetry({})
    reportError(new Error('x'), {})
    expect(onError).not.toHaveBeenCalled()
  })
})
