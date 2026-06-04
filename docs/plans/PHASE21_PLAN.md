# Phase 21 — MCP server: let an AI build designs with the library

**Status:** Group A shipped (the `/headless` document API). REPRIORITIZED
mid-phase: the standalone **`<DocumentRenderer>`** (`/renderer` entry — render
saved documents on production pages without the editor; Craft `enabled=false`
preview pipeline, per-instance adapter pin) was pulled forward and shipped
before the remaining MCP groups. Groups B–E (headless static-HTML render, the
MCP server bin, AI ergonomics, docs) are ON HOLD until resumed. Note for
Group B: the static-HTML render cannot reuse the Craft-mounted renderer
(Frame deserializes in an effect — SSR markup would be empty); it needs the
direct node-map walk as originally planned, plus a runtime-mode seam for
`EditableText`/`useStartTextEdit` (they call Craft's `useNode`
unconditionally today).
**Cuts as:** the next release after `1.2.0` (additive — new public headless API
+ a new `bin`; `1.3.0` recommended).
**Theme:** expose the editor's document model + canonical registry over the
[Model Context Protocol](https://modelcontextprotocol.io) so an AI agent
(Claude Code / Claude Desktop / any MCP client) can author and edit designs
programmatically — producing the same `EditorDocument` JSON the editor loads,
renders, and ships.

## Where things stand (the seams already exist)

This is mostly *assembly* of existing seams, not new invention:

- **Headless document construction already works.**
  `src/persistence/templates/builder.ts` exposes `buildTemplate({ root:
  NodeSpec })` — an authoring-friendly tree spec (`{ canonical, nodeProps?,
  style?, children? }`) compiled into a valid `EditorDocument` (Craft node map
  + envelope), filling canonical defaults and Craft's bookkeeping. **Pattern A
  only** today (single root canvas); Pattern B multi-canvas (Card/Tabs slots)
  is the gap.
- **The envelope is well-defined + validated.** `EditorDocument = { version,
  adapterId, themeId?, colorMode?, nodes }` (`persistence/schema.ts`, zod).
  `exportDocument`, `parseDocumentJson`, and `validateDocumentSemantics`
  (lenient, registry-aware) already exist.
- **Registry is introspectable.** `listComponents()` / `getComponent(id)` give
  every canonical's id, category, tags, prop schema (zod), defaults, style
  slots, applicable panels. **zod 4.4.3 ships `z.toJSONSchema`** — so each
  canonical's props become a JSON Schema with no extra tooling, ideal for MCP
  tool inputs and for telling the AI what props a component takes.
- **Headless rendering is feasible.** The plain-HTML adapter's components are
  pure (no `window`/`document`/`useEffect`), so a document can be rendered to a
  static HTML string with `react-dom/server` — the AI can *see* the structural
  result without a browser.

So the work is: generalize the builder, add edit + render + introspection as a
public headless API, and wrap it in an MCP server.

## Goal

An MCP client configured with the crafted-design server can:

```
list_canonicals            → 48 components, each with a JSON-Schema for its props
create_document            → start a blank doc (pick adapter/theme)
add_node / update_node …   → build the tree incrementally
render_html                → see the current design as static HTML
validate_document          → catch issues before export
get_document               → the EditorDocument JSON (loads straight into <Editor/>)
```

A designer prompt like *"build a pricing page with three plan cards and a CTA"*
becomes a sequence of tool calls producing a real document the host can open in
the editor or render in production.

## In-scope

| Group | Theme |
|---|---|
| A | Headless document API — promote/generalize the builder (+ Pattern B) + edit ops + introspection, as a public entry |
| B | Headless render — document → static HTML (+ structural outline) |
| C | MCP server — tools + resources over stdio, as a `bin` |
| D | AI ergonomics + safety — JSON-Schema tool inputs, descriptions, guardrails, client config |
| E | Docs + close-out |

A is the foundation (and the real engineering — Pattern B + edit ops); B makes
output visible; C is the protocol surface; D/E make it usable and safe.

## Resolved decisions

### 1. The headless API is a new entry `@crafted-design/editor/headless`

The builder needs the canonical registry populated (side-effect imports), so it
can't live in the side-effect-free `/sdk`. A new `headless` entry registers the
canonicals (no React/DOM, no adapters required to *build*) and exports
`buildDocument`, the edit ops, validation, and introspection. Browser editor
consumers never import it; the MCP server does. (Keeps `/sdk` pure and the
editor bundle unaffected.)

### 2. The MCP server is a `bin` with the MCP SDK as an OPTIONAL peer

`crafted-design-mcp` ships as a `bin` on the existing package (same call as the
scaffolding CLI — no second publish pipeline). `@modelcontextprotocol/sdk` is an
**optional peerDependency** (like `@mui/material`): editor consumers don't pay
for it; running the MCP server requires installing it (the bin checks and prints
an install hint if missing). Rejected: a separate `@crafted-design/mcp` package
(needs its own trusted-publisher + workspace setup — disproportionate, and
package #1 isn't even published yet). Revisit extraction if the server grows.

### 3. The server holds a stateful in-progress document (session)

The AI builds incrementally (`add_node`, `update_node`, …) against a single
session document, with `get_document` / `reset_document` / `load_document` to
read, clear, or import. More ergonomic for an agent than threading the full
document JSON through every call. Every mutating tool returns a compact summary
(node id, what changed) + the current validation status, so the model stays
oriented without re-reading the whole tree.

### 4. Node addressing by stable id

`buildDocument` assigns deterministic, human-readable node ids (`box-1`,
`heading-2`, …). Edit ops address nodes by id; `add_node` takes a `parentId` +
optional index. The AI gets ids back from every add and from the outline, so it
can target precise edits. (Craft's random ids are replaced with these in the
headless path; on import into the live editor Craft keeps them.)

### 5. Render fidelity: structure-faithful HTML, not a pixel screenshot

`render_html` emits the document rendered through the **plain-HTML adapter** —
real DOM structure + the Tailwind classes the design uses. Enough for the AI to
verify layout/content and for a quick host preview. A pixel-perfect screenshot
(headless browser + the safelist stylesheet) is **out of scope** for v1 (heavy;
the `/try` editor already gives humans a live view). `render_html` may optionally
inline the generated safelist CSS so the snippet renders standalone.

## Group A — Headless document API

**Land**

1. Promote the template builder into a public headless module: `buildDocument(
   spec)` (generalized `buildTemplate`), exported from a new `src/headless/`
   entry that registers canonicals. Deterministic node ids (Decision 4).
2. **Extend to Pattern B** — multi-canvas canonicals (Card header/body/footer,
   Tabs per-tab content, Stepper, Table cells): the spec gains a `slots`
   field; the builder generates Craft `linkedNodes`. This is the main new
   engineering (the builder is Pattern-A-only today).
3. Edit operations on an envelope (pure functions): `addNode`, `updateNodeProps`,
   `updateNodeStyle`, `removeNode`, `moveNode` — each validates against the
   canonical schema and returns the new envelope (immutable).
4. Introspection: `describeCanonicals()` → per-canonical `{ id, category, tags,
   displayName, propsJsonSchema (via z.toJSONSchema), styleSlots,
   applicablePanels, defaults }`; plus `listAdapters/listThemes/listTemplates`
   re-exports. Validation: wrap `validateDocumentSemantics` + zod envelope
   parse into `validateDocument(doc)`.
5. Tests: round-trip (build → serialize → `parseDocumentJson` → matches),
   Pattern B linked-node shape, edit-op invariants, schema rejection of bad
   props. The output must load into the real editor (assert via the existing
   import path).

**Output** — a pure, tested headless library that builds/edits/validates real
documents and describes the registry as JSON Schema. No MCP yet.

## Group B — Headless render

**Land**

1. `renderDocumentToHtml(doc)` — map the document's node map to a React tree of
   plain-HTML adapter impls and `renderToStaticMarkup`. Handles Pattern A +
   Pattern B (slots) + the canonicals' class/inline-style composition.
2. `outlineDocument(doc)` — a compact text/JSON tree (id · canonical ·
   key props) so the AI can read structure cheaply without full HTML.
3. Optional: inline the generated safelist CSS so the HTML renders standalone.
4. Tests: render a known document, assert key elements/classes/text present;
   outline shape.

**Output** — a document can be turned into static HTML + a structural outline,
headlessly.

## Group C — MCP server

**Land**

1. `src/mcp/server.ts` + a `crafted-design-mcp` bin (stdio transport via
   `@modelcontextprotocol/sdk`, optional peer per Decision 2). Vite dist entry
   + shebang (mirrors the CLI build).
2. **Tools**: `list_canonicals`, `describe_canonical`, `list_adapters`,
   `list_themes`, `list_templates`, `create_document`, `apply_template`,
   `add_node`, `update_node`, `remove_node`, `move_node`, `set_adapter`,
   `set_theme`, `validate_document`, `render_html`, `outline_document`,
   `get_document`, `load_document`, `reset_document`. Inputs typed with the
   JSON Schemas from Group A.
3. **Resources**: the current document JSON and its rendered HTML, exposed as
   MCP resources so clients can subscribe/inspect.
4. Session state (Decision 3); structured errors (unknown canonical, schema
   violation, bad parentId) returned as tool errors the model can recover from.

**Output** — `crafted-design-mcp` runs as a stdio MCP server exposing the full
build/edit/render/export surface.

## Group D — AI ergonomics + safety

**Land**

1. Tool descriptions written for a model: when to use each, what good inputs
   look like, that ids come back from `add_node`. A `get_capabilities` /
   `help` tool summarizing the workflow.
2. Wire each canonical's `propsJsonSchema` as the `add_node`/`update_node`
   input schema (per chosen canonical) so clients validate before calling.
3. Guardrails: mutations validate first and never leave the session document
   in an invalid state; `render_html`/`get_document` always reflect a parseable
   doc. Cap tree size / depth defensively.
4. A ready-to-paste MCP client config (Claude Code `claude mcp add …` and
   Claude Desktop `mcpServers` JSON).

**Output** — the server is pleasant and safe for an agent to drive.

## Group E — Docs + close-out

**Land**

1. `docs/MCP_GUIDE.md` — what it is, install (incl. the optional MCP SDK peer),
   client config, the tool catalog, a worked "build a pricing page" transcript,
   and the chrome/document-theme + adapter notes.
2. README highlight + docs-site guide entry; FAQ ("Can an AI build designs?").
3. CHANGELOG `1.3.0`; new public exports → update `src/sdk/surface.test.ts`
   only if anything lands on `/sdk` (the headless API is its own entry, so the
   frozen SDK surface is likely untouched — confirm). Version cut.

**Output** — phase complete; release cut.

## Out of scope

| Item | Why |
|---|---|
| Pixel-perfect screenshots / headless-browser rendering | Heavy (browser + safelist CSS); `/try` covers human preview. Structure-faithful HTML suffices for the agent (Decision 5). |
| Driving a *live* browser editor instance over MCP | A different architecture (remote control of a running app); the document model is the right interface. |
| AI image/asset generation | Separate concern; the editor takes asset URLs via the existing `EditorImageProvider`. |
| A separate `@crafted-design/mcp` npm package | A `bin` + optional peer covers it without new publish infra (Decision 2). |
| Mutating documents already persisted in a host's storage backend | The server produces envelopes; persistence stays the host's `StorageAdapter`. |

## Risks + mitigations

1. **Pattern B linked-node generation is the hard part** (Card/Tabs slots must
   match Craft's `linkedNodes` shape exactly). Mitigation: round-trip tests that
   build → import into the real editor and assert the tree renders; mirror the
   shape the editor itself serializes for a Card/Tabs.
2. **Generated documents drift from what the editor accepts** as the schema
   evolves. Mitigation: the Group A tests import every built document through
   the real `parseDocumentJson` + `validateDocumentSemantics`, so envelope
   drift fails CI.
3. **MCP SDK is a moving dependency / heavy.** Mitigation: optional peer (not a
   hard dep); the headless API (Groups A–B) is useful and tested independently
   of MCP, so the protocol layer is thin and swappable.
4. **An agent builds an enormous/cyclic tree.** Mitigation: depth/size caps +
   validate-before-commit; ids are acyclic by construction (tree spec).
5. **Render isn't pixel-faithful, agent over-trusts it.** Mitigation: document
   that `render_html` is structure-faithful, not a screenshot; surface the
   class list so the model reasons about styling explicitly.

## Definition of done

A `crafted-design-mcp` stdio server (a `bin`, MCP SDK an optional peer) lets an
MCP client introspect the registry as JSON Schema, build a document
incrementally (Pattern A **and** Pattern B), edit/validate/render it, and export
an `EditorDocument` that loads unmodified into `<Editor />`; the headless
build/edit/render API is public (`@crafted-design/editor/headless`), tested via
round-trip through the real import path; docs include a client config and a
worked transcript; release cut as `1.3.0`.
