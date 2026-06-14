import { useEffect, useState } from 'react'

// Phase 25 (Group A) — the editor's responsive breakpoints.
//
// Two queries drive the responsive chrome:
//   - `isDesktop` (≥ lg / 1024px): the structural breakpoint. Side panels are
//     docked columns at/above it, overlay drawers below it.
//   - `isCompact` (< md / 768px): the toolbar collapses its secondary controls
//     into an overflow menu below it (controls clip before the panels do).
//
// matchMedia-based, SSR/headless-safe (guards `window`/`matchMedia`), mirroring
// `useEffectiveColorScheme` in src/themes/colorMode.ts.

const LG = '(min-width: 1024px)'
const MD = '(min-width: 768px)'

function matches(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true // default to desktop
  return window.matchMedia(query).matches
}

// Subscribe to a single media query; re-renders when it changes.
function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(() => matches(query))
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const onChange = () => setM(mq.matches)
    mq.addEventListener('change', onChange)
    // Sync once in case it changed before this effect ran.
    setM(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return m
}

export interface EditorViewport {
  /** ≥ lg (1024px) — side panels are docked columns; below, they're drawers. */
  isDesktop: boolean
  /** < md (768px) — the toolbar collapses secondary controls into a menu. */
  isCompact: boolean
}

export function useEditorViewport(): EditorViewport {
  const isDesktop = useMediaQuery(LG)
  const atLeastMd = useMediaQuery(MD)
  return { isDesktop, isCompact: !atLeastMd }
}
