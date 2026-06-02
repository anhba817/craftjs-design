[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / uniqueTabValues

# Function: uniqueTabValues()

> **uniqueTabValues**(`tabs`): `string`[]

Defined in: registry/components/dynamic-slots.ts:38

Synthesises a unique render value per tab. Phase 10's stable-id work
(§ 2.11) makes this largely obsolete for slot-key derivation —
`tabSlotKeys` handles that now. The helper survives as the source
of truth for the Radix/MUI `value` prop (which still keys on the
user-authored `value` field), and as the migration path's tool for
picking ids that preserve existing slot keys.

Returns one synthetic value per input tab, in index order:
  - Unique non-empty `value` → passes through unchanged.
  - Empty `value` → `_unset_<index>`.
  - Duplicate `value` → first occurrence keeps the value; second gets
    `<value>__1`, third `<value>__2`, etc.

## Parameters

### tabs

readonly `object`[]

## Returns

`string`[]
