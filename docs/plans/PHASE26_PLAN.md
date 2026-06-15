# Phase 26 — Template variables (host-provided merge fields)

**Status:** planned
**Cuts as:** `1.9.0` (additive — a new provider, render props, a headless helper,
new SDK exports; no document-schema change).
**Origin:** host request — "Host can provide a list of variables and the user can
select from the list or enter directly, putting the value into the content using
`{{ }}` (Jinja-style) tokens." For an NFC business-card / mail-merge style flow:
design once with `{{ contact.name }}`, render N cards with N data rows.

## The shape

```
Host (design time)                Host (render time)
  ┌──────────────────────────┐      ┌─────────────────────────────────┐
  │ <EditorTemplateVariables  │      │ <DocumentRenderer               │
  │    Provider variables=[   │      │    document={doc}               │
  │      {key:'contact.name', │      │    variables={{                 │
  │       label:'Full name',  │      │      'contact.name':'Jane Doe', │
  │       sample:'Jane Doe'}  │      │      'contact.title':'CTO' }} />│
  │    ]}>                     │      └─────────────────────────────────┘
  │   <Editor … />             │      renderDocumentToHtml(doc, { variables })
  └──────────────────────────┘
        user inserts {{ contact.name }} into a Text/Heading/Button
        canvas previews "Jane Doe" (sample) with a variable chip
        document stores the literal "{{ contact.name }}"
```

The document is a **template**: content props store the literal `{{ token }}`.
Values are never baked in. The **canvas resolves each token in precedence order:
host-provided value → the variable's `sample` → the raw `{{ token }}`** (so the
designer sees real data when the host supplies it, a representative sample
otherwise, and an obvious unbound token if neither exists). The renderer
substitutes the host's real values, falling back to the raw token. This is the
CSS-tokens story's twin for content.

## Resolved decisions

### 1. Syntax: `{{ path.to.var }}` interpolation only — a safe Jinja/Mustache subset

Double-brace interpolation with dot-paths (`{{ contact.name }}`,
`{{ company }}`), whitespace-tolerant. **No** control flow / loops / filters /
expressions. Rationale:
- Full Jinja (`{% if %}`, `| filter`, arbitrary expressions) is a security +
  complexity trap inside a visual editor and a renderer we ship.
- Plain interpolation is the 90% case **and** is valid Jinja/Nunjucks/Liquid
  *for that case* — so a host that already runs a real template engine
  server-side can render the exported document's `{{ contact.name }}` directly
  with its own engine. The editor emits a genuine template; it only does *light
  preview* substitution itself.
- Reserve `{{ var | default('…') }}` as a possible future filter (out of scope
  now).

`{{` / `}}` are reserved; literal braces in content are an edge case (escape via
a future `{{ '{{' }}` — out of scope; documented).

### 2. No document-schema change — values are host data, not design

- The **document** stores only the `{{ tokens }}` (already plain text inside the
  `content`/`label` props in `craftJson`). No `documentSchema` change, no
  `CURRENT_DOCUMENT_VERSION` bump.
- The **variable list** (`key`, `label`, `group`, `sample`) **and an optional live
  `values` map** are host config, supplied per-session via
  `<EditorTemplateVariablesProvider variables=[…] values={…}>` (mirrors
  `EditorColorVariablesProvider`). Not persisted. The editor preview resolves a
  token as `values[key] ?? sample ?? raw` (dot-path lookup — see Decision 7).
- The **real values** for production output are runtime data, supplied at render
  via a `variables` prop / option. Not persisted.

### 3. One interpolation engine in `/headless`, shared everywhere

`src/headless/interpolate.ts` (pure, no React/DOM):
- `interpolate(template: string, values: Record<string, unknown>, opts?): string`
  — replaces `{{ path }}` via dot-path lookup; `opts.onMissing: 'keep' | 'blank'`
  (default `'keep'` — an unbound token stays visible as `{{ token }}`).
- `extractTemplateRefs(template: string): string[]` — the distinct keys a string
  references (drives "which variables does this node use", the picker's
  used-state, and validation).
Used by the editor preview, `<DocumentRenderer>`, `renderDocumentToHtml`, and
(read-only) the MCP outline.

### 4. Substitution rides `EditableText`'s display mode (the unifying seam)

`EditableText` already splits **edit mode** (contentEditable, raw text) vs
**display mode** (renders the string). The fix:
- **Display mode** interpolates `text` against the active values from a new
  `TemplateValuesContext`, and wraps each resolved `{{ }}` span in a subtle
  **variable chip** (so designers see what's dynamic). 
- **Edit mode** stays **raw** — the user edits `{{ contact.name }}`, never the
  substituted value.
- The context is fed by `<EditorTemplateVariablesProvider>` **sample** values in
  the editor, and by the `variables` prop in `<DocumentRenderer>` (both mount the
  real Craft tree → EditableText). One code path serves preview *and* render.
- Headless `renderDocumentToHtml` doesn't use `EditableText` (it walks the node
  map), so it interpolates text props explicitly in `renderNode` — same engine.

### 5. Security: values are TEXT, never HTML

Substituted values are rendered as React text children / `textContent` (as today),
so React/`react-dom/server` auto-escape them — a value of `<script>` renders as
literal text. No `dangerouslySetInnerHTML`. Stated + tested.

### 6. Scope: text content props first

`content` (text, heading), `label` (button), and other string *text* props that
flow through `EditableText`. Attribute/URL interpolation (`href`, `src`, `alt`)
is a noted follow-up (different injection surface — URL sanitization needed),
out of scope here.

### 7. Dot-path keys

Variable keys are dot-paths resolved against the (possibly nested) host
values/object: `{{ contact.name }}` → `values['contact.name'] ?? values.contact?.name`.
`interpolate` accepts either a flat map (`{'contact.name': 'Jane'}`) or a nested
object (`{contact: {name: 'Jane'}}`) and looks up both — flat keys are just the
depth-0 case. The picker lists whatever `key`s the provider declares.

## In-scope

| Group | Theme |
|---|---|
| A | Engine + host provider + render threading — the spine (`interpolate`, `EditorTemplateVariablesProvider`, `variables` on DocumentRenderer + renderDocumentToHtml) |
| B | Canvas preview — EditableText display-mode substitution + the variable chip; edit mode stays raw |
| C | Insertion UX — the `{{ }}` variable picker in the inspector content field + in-canvas, click-to-insert |
| D | MCP + docs + example + close-out (cut 1.9.0) |

## Group A — Engine + provider + render threading

**Land**
1. `src/headless/interpolate.ts`: `interpolate` + `extractTemplateRefs` + types
   (`TemplateValues = Record<string, unknown>`). Exported from
   `@crafted-design/editor/headless`. Pure, fully unit-tested (dot-paths,
   missing→keep/blank, whitespace, non-string values stringified, `{{`-only /
   malformed left as-is, nested objects).
2. `src/editor/variables/EditorTemplateVariablesProvider.tsx`: provider +
   `useTemplateVariables()` (mirrors `EditorColorVariablesProvider`). Props:
   `variables: TemplateVariable[]` (`{ key; label?; group?; sample? }`) **and**
   `values?: TemplateValues` (host's live values for the editor canvas). A
   `TemplateValuesContext` carries the resolved lookup the preview uses, built as
   `values[key] ?? sample` per declared variable (a missing both → left to render
   raw by `interpolate`); `useTemplateValues()` reads it. Exposed via
   `src/sdk/variables.ts` → `src/sdk/index.ts`.
3. Render threading:
   - `DocumentRenderer` gains `variables?: TemplateValues` (+ `onMissingVariable?`),
     supplied into `TemplateValuesContext` around the Craft tree.
   - `renderDocumentToHtml(doc, { …, variables })` — `renderNode` runs
     `interpolate` over the canonical's text props before building the element.
4. Tests: `interpolate` unit; `<DocumentRenderer variables>` substitutes a real
   value (jsdom); `renderDocumentToHtml(doc,{variables})` substitutes in the HTML;
   a `<script>` value renders escaped.

**Output** — a document with `{{ tokens }}` renders real values via the renderer;
the provider seam exists. No editor-UX change yet.

## Group B — Canvas preview + the variable chip

**Land**
1. `EditableText` display mode: `interpolate(text, useTemplateValues())` and wrap
   each `{{ }}` occurrence in a `.crafted-design-var` chip (subtle bg/underline,
   `title` = the key; an *unknown* key — not in the provider list — gets a warning
   variant). Edit mode unchanged (raw token).
2. The editor feeds `TemplateValuesContext` from the provider — `value ?? sample`
   per variable — so the canvas shows the host's live value, else the sample, else
   (neither) the raw `{{ token }}` (left by `interpolate`'s `onMissing:'keep'`).
   (A toolbar "show values / show tokens" toggle is a noted Group-D nicety, not
   required.)
3. Chip styling uses `--ed-*` tokens? No — the chip renders **inside the canvas**
   (document content), so it uses canvas/neutral styling, NOT chrome tokens, and
   must be display-only (never exported: it's editor-preview chrome around the
   text, so it appears only when `useIsEditing()` is true — at runtime/renderer
   the text renders plain).
4. Tests (real Craft under jsdom): a node with `{{ contact.name }}` + provider
   sample `Jane` → canvas shows `Jane` wrapped in a chip; entering edit mode shows
   the raw `{{ contact.name }}`; an unknown `{{ nope }}` shows the token + warning
   chip.

**Output** — designers see realistic, clearly-marked dynamic content; editing is
on the real template token.

## Group C — Insertion UX (the picker)

**Land**
1. A `TemplateVariablePicker` popover: lists `useTemplateVariables()` grouped by
   `group`, each row = `label` + `key` + `sample` preview; selecting inserts
   `{{ key }}` at the caret. Empty/host-provided-nothing → hidden.
2. Wire it into:
   - the **inspector** content field (a `{{ }}` button beside the text input in
     `PropField` for string props that opt in / for the known text props), inserting
     at the input caret via `setProp`;
   - the **in-canvas** EditableText edit toolbar (an insert-variable affordance).
3. Inserting writes the same `{{ key }}` string the user could type — one code
   path. (Inline `{{`-triggered autocomplete is a noted stretch.)
4. Tests: picker lists provider vars; selecting inserts the token into the
   `content` prop (assert via serialized craftJson / the input value).

**Output** — users insert variables without memorizing keys; typing still works.

## Group D — MCP + docs + example + close-out

**Land**
1. MCP (modest): a `list_template_variables` tool returning the host-configured
   variable list (the MCP host passes it into the `DesignSession`), and a nudge in
   `get_capabilities` that text props accept `{{ key }}` tokens. So an agent can
   author templates. Gated/empty when the host configures none.
2. Docs: INTEGRATION_GUIDE "Template variables" (the provider, the `variables`
   render prop, the `{{ }}` syntax + Jinja-compat note, missing-var behavior, the
   text-only/escape scope); SDK_GUIDE note; CHANGELOG; surface.test.ts updated
   (`EditorTemplateVariablesProvider`, `useTemplateVariables`, `useTemplateValues`,
   `TemplateVariable`, `interpolate`, `extractTemplateRefs`).
3. Example: extend `examples/controlled-host` (or a new `template-variables` example)
   — a provider with 2-3 sample variables + a `<DocumentRenderer variables>` preview
   driven by an input, showing one design rendered with different data. CI-typechecked.
4. Version cut 1.9.0.

**Output** — documented, exemplified, AI-authorable; release cut.

## Out of scope

| Item | Why |
|---|---|
| Full Jinja (control flow, filters, expressions) | Security + complexity; interpolation is the requested 90%. Host's own engine can run the exported template for the rest. |
| Attribute/URL interpolation (`href`, `src`, `alt`) | Different injection surface (needs URL sanitization); follow-up. |
| Persisting variable VALUES in the document | They're host runtime data; the doc stays a template (no schema churn). |
| Loops / repeating a design per data row | A host concern — render the same document N times with N `variables` maps. |
| Rich-text / per-span formatting of variables | EditableText is plain-text; unchanged. |

## Risks + mitigations

1. **`{{ }}` collides with literal content.** Rare; documented as reserved, with a
   future escape. `interpolate` leaves malformed/unclosed braces untouched.
2. **The chip leaks into exported output.** Mitigation: the chip renders only in
   edit mode (`useIsEditing()`); the renderer/headless path emits plain
   interpolated text. A test asserts the renderer output has no chip markup.
3. **XSS via a variable value.** Mitigation: values are text children (escaped);
   tested with a `<script>` value. Never `dangerouslySetInnerHTML`.
4. **Preview ≠ render (sample vs real).** By design — sample is design-time only.
   Documented; the renderer is the source of truth for real output.
5. **Surface freeze.** New exports are additive (minor); `surface.test.ts` updated
   in the same commit.
6. **Naming vs the existing document-template system** (`registerTemplate`/
   `getTemplate`). Kept distinct: `TemplateVariable`/`useTemplateVariables` vs
   `Template`; documented.

## Open questions — RESOLVED

1. ~~Canvas default — sample values or raw tokens?~~ **The host can pass live
   `values` to the editor; the canvas shows `value ?? sample ?? raw`** (real data
   when available, sample otherwise, raw token if neither) — each marked with the
   variable chip.
2. ~~Missing variable at render — keep `{{ raw }}` or blank?~~ **Keep the raw
   `{{ token }}`** (`onMissing: 'keep'` default; `'blank'` available as an opt-out).
3. ~~Key format — flat or dotted?~~ **Dot-paths** (Decision 7) — flat keys are the
   depth-0 case.

## Definition of done

A host provides variables (and optional live `values`) via
`<EditorTemplateVariablesProvider>`; a user inserts `{{ key }}` into text content
via the picker or by typing; the canvas resolves `value ?? sample ?? raw` with a
variable chip while editing on the raw token; `<DocumentRenderer variables>` /
`renderDocumentToHtml(doc,{variables})` substitute real values (dot-path,
text-escaped, missing→keep raw by default); the document stores only the tokens
(no schema change); an example + INTEGRATION_GUIDE document the flow;
`interpolate`/`extractTemplateRefs` + the provider are on the frozen SDK surface;
release cut as 1.9.0.
