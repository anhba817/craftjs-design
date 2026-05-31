[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / Breakpoint

# Type Alias: Breakpoint

> **Breakpoint** = `"base"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` \| `"2xl"`

Defined in: state/editorStore.ts:28

Tailwind v4's responsive breakpoints. `'base'` is the no-prefix bucket
(writes to `style.classes`); `'sm'` / `'md'` / `'lg'` / `'xl'` / `'2xl'`
write to `style.responsive[<bp>]`. The active breakpoint is editor UI
state, not part of the saved document.
