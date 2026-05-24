# Chakra adapter — example

A worked example of authoring a third-party adapter using only the public
`@design/sdk` import. Demonstrates:

- Adapter registration via `registerAdapter`.
- Pattern A canonical impls (Box, Heading, Button, Stack).
- Pattern B multi-canvas impl (Card with header/body/footer slots).
- The `AdapterRenderProps` shape — how `className`, `inlineStyle`,
  `composedClasses`, `composedInlineStyles`, and `slotChildren` are consumed.

## What's here

```
examples/adapter-chakra/
  index.ts               # registerAdapter call
  lib.tsx                # Minimal mock primitives (replace with @chakra-ui/react)
  components/
    Box.tsx, Button.tsx, Heading.tsx, Stack.tsx, Card.tsx
```

`lib.tsx` ships a tiny inline primitive library so the example compiles and
runs without installing the real Chakra packages. The visual style (teal
accent, rounded surfaces) is deliberately distinct from shadcn / MUI so the
adapter swap is visually obvious in the editor.

## Enabling in the editor

Add the side-effect import to `src/App.tsx`:

```ts
import '../examples/adapter-chakra'
```

After reload, the AdapterSwitcher shows "Chakra (example)". Pick it — every
node renders via the Chakra impls.

## Swapping in real Chakra

```bash
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

Replace `lib.tsx`'s exports with the corresponding Chakra primitives:

| Mock                      | Real Chakra                       |
|---------------------------|-----------------------------------|
| `ChakraBox`               | `Box` from `@chakra-ui/react`     |
| `ChakraButton`            | `Button`                          |
| `ChakraHeading`           | `Heading`                         |
| `ChakraStack`             | `VStack` / `HStack` / `Stack`     |
| `ChakraCardRoot/Header/…` | `Card`, `CardHeader`, `CardBody`  |

You'll also need a `<ChakraProvider>` wrapper. Add it via the adapter's
`Wrapper` field:

```ts
import { ChakraProvider } from '@chakra-ui/react'

registerAdapter({
  id: 'chakra',
  // ...
  Wrapper: ({ children }) => <ChakraProvider>{children}</ChakraProvider>,
  // ...
})
```

The adapter-Wrapper contract requires the Wrapper to be a *pure context
provider* — no document listeners, no global CSS injection. Chakra's
`<ChakraProvider>` fits.

## Extending coverage

Add more canonicals by:

1. Writing an impl in `components/<Canonical>.tsx` that matches
   `AdapterRenderProps`.
2. Adding the impl to the `components` map in `index.ts`.

The full list of canonical ids and their props is documented in
`docs/SDK_GUIDE.md`. The 5 shipped here are a starter set — production usage
typically covers all 20.

## Tutorial

See `docs/TUTORIAL_ADAPTER.md` for a step-by-step walkthrough of building
this adapter from scratch.
