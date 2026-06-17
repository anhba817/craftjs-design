// Phase 27 — the runtime icon resolver seam. The Icon canonical (and NavItem)
// no longer carry a fixed 16-name enum; an icon `name` is any string, resolved
// to a renderable node at render time. The built-in resolver lazy-loads lucide
// glyphs (`DynamicIcon` — one network/import chunk per glyph, so the entry
// bundle stays small). A host can replace the entire icon set with
// `registerIconResolver` (their design system's icons, Iconify, a curated
// subset, …). Unknown names render a neutral fallback glyph; the stored name is
// never mutated.
//
// NOTE (headless): `DynamicIcon` loads its glyph in a `useEffect`, which does
// NOT run under `renderToStaticMarkup`. The synchronous headless renderer
// therefore pre-resolves icon names itself (see `src/headless/render.tsx`) —
// this resolver is the interactive (editor / browser renderer) path.
import type { ReactNode } from 'react'
import { Square } from 'lucide-react'
import {
  DynamicIcon,
  dynamicIconImports,
  type IconName as LucideIconName,
} from 'lucide-react/dynamic'

/** Resolve an icon name + pixel size to a renderable node. */
export type IconResolver = (name: string, sizePx: number) => ReactNode

/** Whether the built-in (lucide) resolver knows this name. */
export function isKnownLucideIcon(name: string): boolean {
  return name in dynamicIconImports
}

/** Neutral placeholder for an unknown / still-loading glyph. */
function FallbackGlyph({ sizePx }: { sizePx: number }) {
  return <Square size={sizePx} aria-hidden />
}

// The built-in resolver. DynamicIcon shows `fallback` until its effect resolves
// the glyph (and for any name it can't find), so unknown names degrade to the
// placeholder without throwing.
const lucideResolver: IconResolver = (name, sizePx) => (
  <DynamicIcon
    name={name as LucideIconName}
    size={sizePx}
    fallback={() => <FallbackGlyph sizePx={sizePx} />}
  />
)

let currentResolver: IconResolver = lucideResolver
let resolverIsBuiltin = true

/**
 * Replace the global icon resolver with a host-supplied one (call BEFORE the
 * editor / renderer mounts). The resolver may be synchronous (return a glyph
 * directly) or lazy. Pass no argument to restore the built-in lucide resolver.
 */
export function registerIconResolver(resolver?: IconResolver): void {
  currentResolver = resolver ?? lucideResolver
  resolverIsBuiltin = resolver == null
}

/**
 * Whether the active resolver is the built-in (lazy lucide) one. The headless
 * renderer uses this to decide whether to substitute its synchronous lucide
 * resolver (the lazy default can't render under `renderToStaticMarkup`) — a
 * host's custom resolver is left untouched.
 */
export function isBuiltinResolver(): boolean {
  return resolverIsBuiltin
}

/** Resolve an icon name to a node using the active resolver. */
export function resolveIcon(name: string, sizePx: number): ReactNode {
  return currentResolver(name, sizePx)
}
