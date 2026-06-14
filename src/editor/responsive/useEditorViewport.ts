import { useEffect, useState } from 'react'

// Phase 25 (Group A) — the editor's responsive breakpoints.
//
// Three queries drive the responsive chrome:
//   - `isDesktop` (≥ lg / 1024px): the structural breakpoint. Side panels are
//     docked columns at/above it, overlay drawers below it.
//   - `isCondensed` (< xl / 1280px): the toolbar collapses its ~11 secondary
//     controls into a `⋯` overflow menu below it. This sits ABOVE the panel
//     breakpoint because the full inline toolbar needs ~1280px to fit — it
//     clips at 1024 even with the panels docked (verified by screenshots).
//   - `isPhone` (< sm / 640px): shows the "optimized for larger screens" hint.
//
// matchMedia-based, SSR/headless-safe (guards `window`/`matchMedia`), mirroring
// `useEffectiveColorScheme` in src/themes/colorMode.ts.

const XL = '(min-width: 1280px)'
const LG = '(min-width: 1024px)'
const SM = '(min-width: 640px)'

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
  /** < xl (1280px) — the toolbar collapses secondary controls into a `⋯` menu. */
  isCondensed: boolean
  /** < sm (640px) — phone; shows the "optimized for larger screens" hint. */
  isPhone: boolean
}

export function useEditorViewport(): EditorViewport {
  const isDesktop = useMediaQuery(LG)
  const atLeastXl = useMediaQuery(XL)
  const atLeastSm = useMediaQuery(SM)
  return { isDesktop, isCondensed: !atLeastXl, isPhone: !atLeastSm }
}
