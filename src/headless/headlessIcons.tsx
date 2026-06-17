// Phase 27 Group C — synchronous icon resolution for the headless renderer.
//
// The built-in resolver renders lucide's `DynamicIcon`, which loads its glyph in
// a `useEffect` — and effects DON'T run under `renderToStaticMarkup`. So a
// headless render with the default resolver would emit only the fallback glyph.
//
// Here we resolve glyphs SYNCHRONOUSLY from the full lucide set (every named
// export, aliases included — e.g. `alert-circle`/`AlertCircle`) so the static
// HTML carries the real `<svg>`. lucide is pulled via `createRequire` at call
// time rather than a static `import *`, so the ~1700-icon set is NOT bundled
// into headless.js — it's resolved from the consumer's installed `lucide-react`
// (a hard dependency) at runtime. This module is node-only and imported solely
// by `render.tsx`; nothing in the browser graph reaches it.
import { createRequire } from 'node:module'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { isBuiltinResolver, registerIconResolver, type IconResolver } from '@/icons/resolver'

type SizedIcon = ComponentType<{ size?: number }>

let lucideNs: Record<string, unknown> | null = null
function lucide(): Record<string, unknown> {
  if (!lucideNs) {
    // Runtime require (not a static import) keeps lucide out of the bundle.
    const req = createRequire(import.meta.url)
    lucideNs = req('lucide-react') as Record<string, unknown>
  }
  return lucideNs
}

// 'shopping-cart' → 'ShoppingCart', 'x' → 'X', 'alert-circle' → 'AlertCircle'.
function toPascal(name: string): string {
  return name
    .split('-')
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
    .join('')
}

const headlessResolver: IconResolver = (name, sizePx): ReactNode => {
  const ns = lucide()
  const Comp = (ns[toPascal(name)] ?? ns.Square) as SizedIcon
  return createElement(Comp, { size: sizePx })
}

/**
 * Run a synchronous render `fn` with synchronously-resolvable lucide icons, so
 * the effect-based `DynamicIcon` default doesn't render blank under
 * `renderToStaticMarkup`. Only substitutes when the built-in resolver is active
 * — a host's custom resolver is respected as-is. Fully synchronous:
 * register → run → restore cannot interleave with another render.
 */
export function withHeadlessIcons<T>(fn: () => T): T {
  if (!isBuiltinResolver()) return fn()
  registerIconResolver(headlessResolver)
  try {
    return fn()
  } finally {
    registerIconResolver() // restore the built-in (lazy) resolver
  }
}
