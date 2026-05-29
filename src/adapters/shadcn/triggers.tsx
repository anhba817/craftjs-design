import type { ReactElement } from 'react'
import {
  Popover as PopoverPrimitive,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../editor/canvas/useIsEditing'

// Phase 13 § 5.3 — shared trigger semantics for shadcn adapters.
//
// Every triggerable canonical (Button, Icon, Avatar, Badge, Image, Link,
// NavItem, Card) calls `useShadcnTriggers(triggers)` and consumes:
//   • `onClick` — handles modal/drawer/toast/alert kinds by toggling the
//     runtime store entry. Returns undefined in editor mode.
//   • `wrap(element)` — wraps the rendered element in Radix Tooltip /
//     Popover primitives for any trigger of those kinds. Editor branch
//     returns the element unchanged (no hover / click semantics fire
//     while the designer is editing).
//
// Centralizing this keeps the per-adapter code to a few lines, and a
// future kind (e.g., command palette trigger) only needs to be added
// here once.
export function useShadcnTriggers(triggers: readonly string[] | undefined) {
  const editing = useIsEditing()
  const toggleOverlay = useOverlayRuntime((s) => s.toggle)
  const defs = useOverlayRuntime((s) => s.defs)

  const onClick = editing
    ? undefined
    : () => {
        for (const name of triggers ?? []) {
          const kind = defs[name]?.kind
          if (
            kind === 'modal' ||
            kind === 'drawer' ||
            kind === 'toast' ||
            kind === 'alert' ||
            kind === undefined
          ) {
            toggleOverlay(name)
          }
        }
      }

  const wrap = (element: ReactElement): ReactElement => {
    if (editing) return element
    let result = element
    // Tooltip on the inside so the hover anchor stays on the original
    // element. Popover on the outside.
    for (const name of triggers ?? []) {
      const def = defs[name]
      if (def?.kind === 'tooltip' && def.text) {
        result = (
          <TooltipProvider key={`tt-${name}`}>
            <TooltipPrimitive>
              <TooltipTrigger asChild>{result}</TooltipTrigger>
              <TooltipContent>{def.text}</TooltipContent>
            </TooltipPrimitive>
          </TooltipProvider>
        )
      }
    }
    for (const name of triggers ?? []) {
      const def = defs[name]
      if (def?.kind === 'popover') {
        result = (
          <PopoverPrimitive key={`pop-${name}`}>
            <PopoverTrigger asChild>{result}</PopoverTrigger>
            <PopoverContent>{def.content}</PopoverContent>
          </PopoverPrimitive>
        )
      }
    }
    return result
  }

  return { onClick, wrap }
}
