# Chakra adapter — example

A real Chakra UI v3 adapter built on top of `@design/sdk` /
`@crafted-design/editor/sdk`. It implements a **20-canonical subset** of the
48-canonical registry — deliberately partial: it's a reference for authoring
your own adapter, not a complete one (the three built-ins — shadcn, MUI,
plain-HTML — each cover all 48; unimplemented canonicals render the
missing-renderer placeholder). Demonstrates:

- Adapter registration via `registerAdapter`.
- Pattern A canonical impls (Box, Heading, Button, Text, Badge, Image,
  Link, Divider, Icon, Input, Textarea, Stack, Switch, Checkbox, Radio,
  Select, Avatar, Alert).
- Pattern B multi-canvas impls (Card with header/body/footer slots;
  Tabs with one canvas per tab).
- The `AdapterRenderProps` shape — how `className`, `inlineStyle`,
  `composedClasses`, `composedInlineStyles`, and `slotChildren` are
  consumed.
- The Wrapper pattern — `<ChakraProvider value={defaultSystem}>` is
  installed via the adapter's `Wrapper` field.

## What's here

```
examples/adapter-chakra/
  index.ts                 # registerAdapter call wiring the 20 example components
  Wrapper.tsx              # <ChakraProvider value={defaultSystem}>
  components/
    Box.tsx, Button.tsx, Heading.tsx, Stack.tsx, Text.tsx, Badge.tsx,
    Avatar.tsx, Image.tsx, Link.tsx, Divider.tsx, Icon.tsx, Alert.tsx,
    Card.tsx, Tabs.tsx, Input.tsx, Textarea.tsx, Checkbox.tsx,
    Switch.tsx, Radio.tsx, Select.tsx
```

Each component file is ~10–30 lines: import a Chakra primitive, type the
canonical's props off `AdapterRenderProps['props']`, render with
`rootRef` + `className` + `style={inlineStyle}` forwarded.

## Dependencies

```bash
npm install @chakra-ui/react@^3 @emotion/react @emotion/styled
```

`@emotion/react` + `@emotion/styled` are already in the editor's
`dependencies` (MUI uses them too); only `@chakra-ui/react` is the
Chakra-specific install.

## Enabling in the editor

Already enabled in `src/App.tsx` via the side-effect import:

```ts
import '../examples/adapter-chakra'
```

The "Chakra (example)" entry appears in the AdapterSwitcher dropdown.
Pick it — every node renders via the Chakra impls.

## Bundle impact

Adding Chakra to the editor's dogfood app increases the dist by roughly
+200 KB raw / +50 KB gzipped (varies with tree-shaking and which
canonicals are imported). **Production hosts using only shadcn or MUI
should remove the `import '../examples/adapter-chakra'` line from
their copy of `App.tsx`** so the unused Chakra code tree-shakes out
entirely.

## Pattern notes

- **Compound components.** Chakra v3 uses dot-notation compound APIs
  for many primitives — `Card.Root` / `Card.Header` / `Card.Body`,
  `Checkbox.Root` / `Checkbox.Control` / `Checkbox.Indicator`,
  `Switch.Root` / `Switch.Control` / `Switch.Thumb`, etc. The impls in
  this folder show the minimum tree each one needs to render.
- **NativeSelect for Select.** The compound `Select.Root` requires a
  `collection` + portal positioner; for this example the
  keyboard-accessible `NativeSelect` is enough and renders inline.
- **Tabs slot keys.** Multi-canvas Tabs uses `tabSlotKeys` +
  `uniqueTabValues` from the SDK to derive the slot lookup key and the
  Chakra `Tabs.Trigger` `value` prop. The SDK exports these because
  any third-party adapter writing a Tabs impl needs the same logic.
- **Icon canonical.** The editor's icon library is Lucide React; the
  Chakra adapter wraps the Lucide component in a Chakra `Box` so
  className / inline style flow through.

## Extracting to a standalone package

Future plan: lift this folder into a separate `@crafted-design/adapter-
chakra` workspace package so consumers who want Chakra without
forking can `npm install` it directly. The current single-package
layout keeps the example colocated with the editor for development +
discoverability; the extraction is a Phase 11 candidate after the
publish workflow in Phase 10 § 2.1 is settled.

## Tutorial

See `docs/TUTORIAL_ADAPTER.md` for a step-by-step walkthrough of
building an adapter from scratch.
