[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / deriveTokens

# Function: deriveTokens()

> **deriveTokens**(`t`, `scheme?`): `Record`\<`string`, `string`\>

Defined in: themes/tokens.ts:89

Derive the full core token set from a small base set. Pure: same input
→ same output, no globals. Returns an ordered map keyed by CSS var name
(no leading `--`). Tokens the host didn't pass are filled from the
scheme's neutral defaults or derived from related tokens (card =
background, ring = primary, `*-foreground` via the contrast heuristic).
The sidebar brand accents are kept in step with the theme — mirrors the
built-in rose block's convention.

Phase 12 § 4.13 — `scheme` selects the light/dark neutral defaults so a
theme's dark variant only needs to restate the colors that differ.

## Parameters

### t

[`ThemeTokens`](../interfaces/ThemeTokens.md)

### scheme?

[`ColorScheme`](../type-aliases/ColorScheme.md) = `'light'`

## Returns

`Record`\<`string`, `string`\>
