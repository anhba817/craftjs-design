# Phase 22 — Visual feedback for the MCP agent (colors & contrast)

**Status:** planned
**Cuts as:** the next release after `1.4.0` (additive — new MCP tools + new
`/headless` exports + a new optional peer; `1.5.0` recommended).
**Theme:** today an AI agent driving the MCP server builds *blind to
appearance*. `render_html` returns structure + class names, and
`outline_document` a text tree — neither lets the model perceive the **actual
colors, contrast, and layout** of what it built. So it can't tell that white
text landed on a near-white card, or that a theme's muted text fails WCAG AA.
This phase gives the agent two complementary senses: **a rendered image** it
can look at, and a **deterministic contrast/palette report** it can reason
over.

## Where things stand

- `renderDocumentToHtml` (Phase 21 B) produces structure-faithful HTML — real
  elements + the document's Tailwind classes — but **no resolved colors**: the
  classes (`text-foreground`, `bg-card`, theme tokens) only become colors when
  a browser applies the stylesheet. The agent never sees that step.
- The WCAG math already exists and is pure/tested:
  `src/editor/inspector/shared/contrast.ts` — `relativeLuminance`,
  `contrastRatio`, `contrastGrade` (`'AAA' | 'AA' | 'AA Large' | 'Fail'`).
- Theme palettes are resolvable headlessly: `src/themes/tokens.ts`
  (`themeTokensToCss` + the per-theme token maps in `src/themes/*.ts`) define
  each theme's token → color values, with `darkTokens` for dark mode.
- The editor ships the full stylesheet at `dist-lib/index.css` (the Tailwind
  build incl. the token CSS), readable by the MCP server (a sibling of
  `mcp.js`) for an offline render.
- The MCP SDK supports **image tool results** (`ImageContent`:
  `{ type: 'image', data: <base64>, mimeType }`), so a screenshot tool returns
  an image a multimodal client renders inline.
- No headless browser is a dependency yet.

## Goal

```
theme_palette            → the active theme's token colors + key-pair WCAG ratios
check_contrast           → per-text-node foreground/background + ratio + AA/AAA flag
render_image             → a PNG of the current document the agent can SEE
```

The agent builds → looks (`render_image`) → checks (`check_contrast`) → fixes
the nodes that fail → looks again. Colors and contrast stop being invisible.

## In-scope

| Group | Theme |
|---|---|
| A | Deterministic palette + contrast report (no browser, always available) |
| B | Screenshot — document → PNG via a persistent headless page mounting our own `<DocumentRenderer>` (optional) |
| C | Accurate per-node contrast via that same warm page (upgrades A when a browser is present) |
| D | MCP ergonomics — wire the tools, capabilities, guardrails |
| E | Docs + close-out |

A ships value with zero new heavy deps; B is the headline (true visual
perception); C makes the contrast audit exact when B's browser is available.

## Resolved decisions

### 1. Two senses, layered — deterministic first, browser-rendered on top

- **Always-on (Group A):** resolve the theme's token colors from
  `src/themes/*` and compute WCAG ratios for the semantic pairs
  (`foreground`/`background`, `muted-foreground`/`background`,
  `primary-foreground`/`primary`, `destructive-foreground`/`destructive`, …),
  plus a best-effort per-node pass that maps a node's `text-*` / `bg-*`
  utilities to token/literal colors. No browser, no new dependency — the agent
  always gets *some* color/contrast awareness.
- **Browser-rendered (Groups B/C):** a true raster + exact computed-style
  contrast, behind an optional peer. The deterministic path is the fallback
  when no browser is installed.

### 2. Screenshots = a PERSISTENT headless page mounting our OWN renderer

This is how mature design tools (Figma, Pencil, …) produce screenshots: they
**export from the renderer they already own** rather than re-rendering into a
foreign engine. crafted-design has no standalone render *service* — our
designs only become pixels in a DOM with `<DocumentRenderer>` running — so we
recreate that property with a long-lived headless page:

1. Launch a headless browser (Playwright, chromium) **once** per server
   process and open **one page** that loads a tiny render harness — the
   `dist-lib` demo/renderer bundle that mounts `<DocumentRenderer>` and listens
   for documents (`postMessage` / an exposed function).
2. Per `render_image` call: push the current envelope + chosen adapter into
   that page (it re-renders through the *real* adapter — shadcn/MUI/html — with
   the actual stylesheet + token cascade, exactly what `/try` shows), wait for
   paint, screenshot the renderer root.
3. The same warm page answers Group C's contrast audit via `page.evaluate` +
   `getComputedStyle` — no second launch.

Why this over "render HTML string → inline `index.css` → screenshot a cold
page": **fidelity and reuse.** It renders the document's actual design system
(not the plain-HTML approximation), reuses `<DocumentRenderer>` instead of
hand-assembling an HTML document, and amortizes the browser launch (Pencil's
"renderer stays alive" property → fast repeated screenshots).

### 3. Playwright is an OPTIONAL peer; everything degrades without it

`playwright` is an optional peer (like `@modelcontextprotocol/sdk` / MUI). The
screenshot + accurate-contrast tools print an install hint (`npm i -D
playwright && npx playwright install chromium`) and fall back to Group A's
deterministic report when it's absent. We can't avoid a browser the way Pencil
does — we don't ship a standalone renderer process — so launching our own
chromium is the best self-contained default. **Rejected:** `satori`
(HTML→SVG→PNG, no browser; can't render the full Tailwind/token cascade) and a
cold-page-per-render approach (no fidelity gain, no launch amortization).
**Considered, deferred:** pointing the server at an already-running `/try`
instance instead of launching a browser — avoids the Playwright dep but pushes
"keep the app running" setup onto the host; can be added later as an opt-in
endpoint.

### 4. The render harness is built from the existing renderer (no new app)

The headless page loads a small harness entry (`src/renderer/harness.tsx` or
similar, built into `dist-lib`) that mounts `<DocumentRenderer>` and exposes a
`__render(envelopeJson, adapterId)` hook. It reuses the published
`/renderer` + an adapter + `index.css` — i.e. the same code a host uses on a
production page — so a screenshot is literally "what a host would ship."
Web-font glyphs may differ offline; color/contrast/layout (the point) are
faithful (noted in the tool description).

### 4. New `/headless` exports + new MCP tools (no editor-surface change)

- `/headless`: `analyzeThemeContrast(themeId, colorMode)` +
  `analyzeDocumentContrast(doc)` (deterministic, no browser).
- A new node-only `/render-image` entry (or `src/mcp/renderImage.ts`) owns the
  persistent-browser harness — it imports `playwright` lazily, so it's NOT on
  `/headless` (which must stay browser-free for server-side document tooling).
  Exposes `createImageRenderer()` → `{ render(doc, opts), checkContrast(doc),
  close() }` over the warm page; throws a typed `MissingBrowserError` if
  Playwright is absent.
- MCP tools: `theme_palette`, `check_contrast`, `render_image`. The editor /
  sdk / renderer runtime surfaces are untouched; `/headless` gets its
  frozen-surface-list update for the two `analyze*` exports.

## Group A — Deterministic palette + contrast report

**Land**

1. A color parser → `Rgb` for the values the tokens + utilities use (`oklch(…)`,
   hex, `rgb()`), feeding the existing `contrastRatio` / `contrastGrade`.
2. `analyzeThemeContrast(themeId, colorMode)` → resolved token colors + WCAG
   ratio + grade for the semantic foreground/background pairs.
3. `analyzeDocumentContrast(doc)` → per-text-node best-effort: parse the node's
   `text-*` / `bg-*` (walking ancestors for an inherited background), map to
   colors, report ratio + grade; flag nodes whose colors can't be resolved
   statically (arbitrary values, gradients) as "indeterminate — use
   render_image / check_contrast".
4. Tests: known theme pairs grade as expected; a deliberately low-contrast node
   is flagged; indeterminate cases are marked, not wrong.

**Output** — color/contrast awareness with no browser and no new dependency.

## Group B — Persistent renderer screenshot

**Land**

1. A **render harness** entry built into `dist-lib` (e.g.
   `src/renderer/harness.tsx`): a minimal page that mounts `<DocumentRenderer>`
   and exposes `window.__render(envelopeJson, adapterId)` returning when paint
   settles. Reuses `/renderer` + `index.css` — the same code a host ships.
2. `createImageRenderer()` (lazy-imports `playwright`; typed
   `MissingBrowserError` if absent): launches chromium **once**, opens **one**
   page on the harness (network-blocked), and exposes
   `render(doc, { adapterId?, width?, colorMode? }) → PNG Uint8Array`. Each
   call pushes the envelope into the warm page, waits for paint, and
   screenshots the renderer root. `close()` tears down on shutdown.
3. The server holds one renderer instance for its lifetime (launch on first
   `render_image`, amortized thereafter), so repeated screenshots are fast.
   Caps width/height.
4. Tests: gated on Playwright being installed (skipped otherwise; a CI browser
   job can opt in) — render a known document through the real shadcn adapter,
   assert a non-empty PNG of sane dimensions and that it differs from a
   blank/empty-document render.

**Output** — a document becomes a real image, rendered by our own renderer
through its actual design system.

## Group C — Accurate per-node contrast (same warm page)

**Land**

1. When Playwright is present, `checkContrast` reuses the SAME warm renderer
   page: push the document, then `page.evaluate` an in-page pass — for each
   text-bearing node id, read computed `color` + the nearest non-transparent
   ancestor `background-color`, compute the ratio +
   grade. Returns node id → {fg, bg, ratio, grade}, sorted worst-first.
2. Falls back to Group A's deterministic report (clearly labeled
   "approximate") when no browser.

**Output** — exact, node-addressable contrast the agent can act on.

## Group D — MCP ergonomics

**Land**

1. Wire `theme_palette`, `check_contrast`, `render_image` into the tool catalog
   (`render_image` returns MCP `ImageContent`; the others text).
2. `get_capabilities` updated: after building, **look** (`render_image`) and
   **check** (`check_contrast`); note `render_image` needs Playwright and falls
   back gracefully.
3. Guardrails: cap image width/height (token cost); the render browser is
   sandboxed + offline; large images noted as costly.

**Output** — the agent has "see" + "check" in its loop.

## Group E — Docs + close-out

**Land**

1. `MCP_GUIDE.md` — a "Seeing colors & contrast" section: install Playwright,
   the three tools, the build→look→check→fix loop, the offline-fonts caveat.
2. CHANGELOG; `/headless` frozen-surface update; version cut.

**Output** — phase complete; release cut.

## Out of scope

| Item | Why |
|---|---|
| Generating decorative/content images (logos, photos) | Different concern; the editor takes asset URLs via `EditorImageProvider`. This phase renders the DESIGN, not artwork. |
| Bundling a browser in the package | Playwright's browsers are a multi-hundred-MB download; an optional peer the host installs is the only sane distribution. |
| satori / pure-JS rasterizers | Can't render the Tailwind/token cascade faithfully (Decision 2). |
| Pixel-diff / visual regression of documents | A testing concern, not agent feedback. |
| Screenshots inside the `/renderer` or editor entries | Server-side only; browser entries never need Playwright. |

## Risks + mitigations

1. **Playwright is heavy (browser download).** Optional peer + clear install
   hint + the always-on Group A deterministic report, so the server is useful
   without it. Screenshot/accurate-contrast tools degrade, never crash.
2. **Deterministic color resolution is approximate** (can't follow the full CSS
   cascade or arbitrary values). Flag indeterminate nodes explicitly and point
   to `render_image` / browser `check_contrast`; never report a wrong ratio as
   if exact.
3. **Offline fonts.** Color/contrast/layout (the point) are unaffected; the
   tool description says glyph fidelity may differ offline.
4. **Image token cost.** Cap dimensions, default to a reasonable width, return
   PNG; capabilities notes images are costly.
5. **Harness asset resolution** (the headless page must load the built renderer
   bundle + `index.css` from `dist-lib`). Resolve via `import.meta.url`; serve
   the harness to the page from disk (or `page.setContent` with absolute file
   URLs); documented error if the build is missing.
6. **A persistent browser is a long-lived resource in the server process.**
   Launch lazily on first `render_image`; reuse one page; `close()` on server
   shutdown; guard against a crashed page by relaunching on the next call.

## Definition of done

The MCP agent can call `theme_palette` and `check_contrast` (deterministic,
always available) to learn the document's colors + WCAG grades, and
`render_image` to see a faithful PNG — rendered by a **persistent headless
page mounting our own `<DocumentRenderer>` through the document's real adapter**
(launched once, reused) when Playwright is installed, degrading to the
deterministic report otherwise; the build→look→check→fix loop is documented;
new `/headless` `analyze*` exports are tested and surface-listed; the
editor/sdk/renderer runtime surfaces are unchanged; release cut as `1.5.0`.
