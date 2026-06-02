# Tutorial — building an adapter

Goal: add a third UI library to the editor in ~30 minutes. We'll build a
"Chakra (example)" adapter that renders five canonicals (Box, Heading,
Button, Stack, Card) using a minimal Chakra-like primitive library. Real
Chakra is a drop-in replacement at the end.

The completed example lives at
[`examples/adapter-chakra/`](../examples/adapter-chakra/) — refer to it if
you get stuck.

## Prerequisites

- Familiarity with React + TypeScript.
- The editor running locally (`npm run dev`).
- Read [`SDK_GUIDE.md`](./SDK_GUIDE.md) for the public-API reference.

## Step 1 — Scaffold the directory

Create `examples/adapter-mylib/` at the repo root (sibling to `src/`).
Files we'll add:

```
examples/adapter-mylib/
  lib.tsx                # Your library's primitives (or a mock)
  components/
    Box.tsx              # Adapter impls per canonical
    Heading.tsx
    Button.tsx
    Stack.tsx
    Card.tsx
  index.ts               # registerAdapter call
  README.md              # Documentation
```

## Step 2 — Write your first impl (Box)

`AdapterRenderProps` is the contract. Pattern A canonicals (single root slot)
read `className` + `inlineStyle` + `children` + `rootRef`.

```tsx
// components/Box.tsx
import type { AdapterRenderProps } from '@crafted-design/editor/sdk'

export function MyBox({ children, rootRef, className, inlineStyle }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={className} style={inlineStyle}>
      {children}
    </div>
  )
}
```

That's the entire impl. `className` already contains the responsive class
string composed by CanonicalNode; `inlineStyle` already contains the
arbitrary-value inline CSS. Don't read `style.classes.root` directly — you'd
miss the responsive breakpoint prefixes.

## Step 3 — Repeat for Heading / Button / Stack

Each impl is a thin wrapper. Read `props` for canonical props, use
`rootRef`, forward `className` + `inlineStyle`:

```tsx
// components/Button.tsx
import type { AdapterRenderProps } from '@crafted-design/editor/sdk'

export function MyButton({ props, rootRef, className, inlineStyle }: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string; intent: string; disabled: boolean
  }
  return (
    <button ref={rootRef as never} className={className} style={inlineStyle} disabled={disabled}>
      {label}
    </button>
  )
}
```

Canonical prop names + types are documented in `src/registry/components/*.ts`.

## Step 4 — Multi-canvas impl (Card)

Pattern B canonicals (Card, with header/body/footer canvas slots) consume
`composedClasses[slot]`, `composedInlineStyles[slot]`, and
`slotChildren[slot]` per region:

```tsx
// components/Card.tsx
import type { AdapterRenderProps } from '@crafted-design/editor/sdk'

export function MyCard({
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={composedClasses.root} style={composedInlineStyles.root}>
      <header className={composedClasses.header} style={composedInlineStyles.header}>
        {slotChildren.header}
      </header>
      <section className={composedClasses.body} style={composedInlineStyles.body}>
        {slotChildren.body}
      </section>
      <footer className={composedClasses.footer} style={composedInlineStyles.footer}>
        {slotChildren.footer}
      </footer>
    </div>
  )
}
```

The `slotChildren[slot]` entries are React elements that *are themselves*
canvases — drop targets that accept dragged children. You just place them
where you want each region rendered.

## Step 5 — Register the adapter

```ts
// index.ts
import { registerAdapter } from '@crafted-design/editor/sdk'
import { MyBox } from './components/Box'
// ...other imports

registerAdapter({
  id: 'mylib',
  displayName: 'My Library',
  components: {
    box: MyBox,
    heading: MyHeading,
    button: MyButton,
    stack: MyStack,
    card: MyCard,
  },
})
```

Required fields are `id`, `displayName`, and `components`. The shape is
validated via Zod at registration time — bad manifests throw at boot with a
readable error.

## Step 6 — Optional: global provider via Wrapper

If your library needs a global React provider (e.g., theme, locale), add a
`Wrapper`:

```tsx
import { ChakraProvider } from '@chakra-ui/react'

registerAdapter({
  // ...
  Wrapper: ({ children }) => <ChakraProvider>{children}</ChakraProvider>,
})
```

**Critical:** the Wrapper must be a **pure context provider**. No `document`
listeners, no global CSS injection, no browser API mutation. ALL registered
adapters' Wrappers stay mounted (composed around the canvas), even inactive
ones — leaking side effects from a Wrapper applies them unconditionally.

For side-effecting setup (e.g., calling a library's `init()`), use
`mount` / `unmount` — those fire only on active-adapter change.

## Step 7 — Wire into the editor

Add a side-effect import in `src/App.tsx`:

```ts
import '../examples/adapter-mylib'
```

Reload. The AdapterSwitcher (top right of the editor) now shows "My
Library". Pick it — every node re-renders via your impls. Tree state
survives (canonical-based persistence; the document references canonical
ids, not adapter ids).

## Step 8 — Verify the SDK boundary

Your adapter should import only from the SDK entry —
`@crafted-design/editor/sdk` in your own package, or the equivalent
`@design/sdk` alias when working inside this repo's `examples/` (an ESLint
rule enforces it there). Reaching into `../src/...` is unsupported — internal
APIs move between versions.

```bash
grep -r "from '\\.\\./\\.\\./src" examples/adapter-mylib/
# Should print nothing.
```

## Where to next

- **Add more canonicals.** Browse `src/registry/components/*.ts` for the
  full list — 48 canonicals total (`npm run docs:matrix` prints them). Add impls + entries to the
  `components` map.
- **Override built-ins.** Add an alternative impl for an existing canonical;
  users can swap to your adapter to get your styling.
- **Author a custom canonical.** See [`TUTORIAL_CANONICAL.md`](./TUTORIAL_CANONICAL.md).
- **Author a custom inspector panel.** See [`TUTORIAL_PANEL.md`](./TUTORIAL_PANEL.md).
