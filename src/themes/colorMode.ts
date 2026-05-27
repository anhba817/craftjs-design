import { useEffect, useState } from 'react'
import { useEditorStore, type ColorMode } from '@/state/editorStore'
import type { ColorScheme } from './tokens'

// Phase 12 § 4.13 — resolve the chosen color mode to a concrete scheme.
// Pure so it's testable without a DOM: 'system' defers to the supplied
// OS-preference flag; explicit modes pass through.
export function resolveColorScheme(
  mode: ColorMode,
  systemPrefersDark: boolean,
): ColorScheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Subscribe to the OS preference and the store's color mode, returning the
// effective scheme. Re-renders when either changes.
export function useEffectiveColorScheme(): ColorScheme {
  const mode = useEditorStore((s) => s.colorMode)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    // Sync once in case the preference changed before this effect ran.
    setSystemDark(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return resolveColorScheme(mode, systemDark)
}
