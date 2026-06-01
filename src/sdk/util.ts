// Public SDK — shared utilities for adapter authors (Phase 18 § 5).
//
// `cn` = clsx + tailwind-merge: the class-composition helper the built-in
// adapters use to merge a canonical's composed class string with their own
// (later classes win conflicts via tailwind-merge). Adapter authors almost
// always need it; exposing it here saves every adapter re-deriving the same
// `clsx`/`tailwind-merge` wrapper.

export { cn } from '../lib/utils'
