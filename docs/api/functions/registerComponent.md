[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerComponent

# Function: registerComponent()

> **registerComponent**\<`P`\>(`def`): `void`

Defined in: registry/registry.ts:92

Register a canonical component definition. Adds it to the in-memory
registry keyed by `def.id`; subsequent `getComponent(id)` calls return
the definition, and post-mount registrations trigger a registry-version
bump so the Toolbox + Craft resolver pick them up without a reload.

Throws if `def.id` is already registered. Use `unregisterCanonical(id)`
first to replace a built-in.

## Type Parameters

### P

`P`

The canonical's props shape (inferred from `def.propsSchema`).

## Parameters

### def

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`P`\>

The canonical definition: id, category, displayName, tags,
  isCanvas, styleSlots, propsSchema, defaults, plus optional
  applicablePanels / canvasSlots overrides.

## Returns

`void`

## Example

```ts
import { z } from 'zod'
import { registerComponent } from '@crafted-design/editor/sdk'

registerComponent({
  id: 'stepper',
  category: 'navigation',
  displayName: 'Stepper',
  tags: ['progress', 'wizard'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: z.object({ step: z.number() }),
  defaults: { props: { step: 0 }, style: { classes: { root: '' } } },
})
```
