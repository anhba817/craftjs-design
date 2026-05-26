import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reopenOnboardingTour } from './OnboardingTour'

// Phase 11 § 3.8 — the onboarding completion flag is the only piece
// of OnboardingTour testable without a DOM render harness. Pin its
// localStorage + window-event contract here.
//
// vitest's default env is node — no real localStorage/window. We
// stub both with the in-memory pattern documentRegistry.test.ts
// already uses.

const STORAGE_KEY = 'craftjs-design.onboarding-completed:v1'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
    removeItem: (k: string) => {
      data.delete(k)
    },
    clear: () => data.clear(),
    get length() {
      return data.size
    },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
  })
  const listeners = new Map<string, Set<EventListener>>()
  vi.stubGlobal('window', {
    addEventListener: (event: string, fn: EventListener) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(fn)
    },
    removeEventListener: (event: string, fn: EventListener) => {
      listeners.get(event)?.delete(fn)
    },
    dispatchEvent: (e: Event) => {
      for (const fn of listeners.get(e.type) ?? []) fn(e)
      return true
    },
  })
  // CustomEvent isn't in node either; minimal shim.
  vi.stubGlobal(
    'CustomEvent',
    class CustomEventShim {
      type: string
      constructor(type: string) {
        this.type = type
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reopenOnboardingTour', () => {
  it('removes the completion flag from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
    reopenOnboardingTour()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('dispatches the show-onboarding event on window', () => {
    const handler = vi.fn()
    window.addEventListener('craftjs-design:show-onboarding', handler)
    reopenOnboardingTour()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is idempotent when called with no prior flag', () => {
    const handler = vi.fn()
    window.addEventListener('craftjs-design:show-onboarding', handler)
    reopenOnboardingTour()
    expect(handler).toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
