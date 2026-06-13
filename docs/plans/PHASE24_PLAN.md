# Phase 24 — Scoped stylesheet for inline embedding (P6)

**Status:** planned
**Cuts as:** the release after Phase 23 (`1.6.0`) — additive (a new optional CSS
entry + scope plumbing); `1.7.0` recommended.
**Origin:** `EMBEDDING_FEEDBACK.md` §2.5 / P6, split out of Phase 23 as its own
phase because it's the hardest, riskiest piece and the controlled-embedding API
(Phase 23) doesn't depend on it. This phase is what makes **fully inline,
iframe-free** embedding into a Tailwind-v4 host safe — the last bit of the
consumer's workaround (a single iframe kept purely for CSS isolation) it lets
them delete.

## The problem (verified against source)

`@crafted-design/editor/index.css` is a single compiled Tailwind-v4 build
(`vite.config.dist.ts` emits one `dist-lib/index.css`). It contains, all
global:
- **Preflight** — the universal `*` reset, from `@import "tailwindcss"` +
  `shadcn/tailwind.css`. A host already running Tailwind v4 gets a **second**
  global reset.
- **Token VALUES at `:root` / `.dark`** — `--background`, `--primary`,
  `--ed-*`, `--radius`, the shadcn palette, `--brand-*`. These **clobber** a
  host's same-named tokens (and vice-versa) globally.
- Utilities, `@font-face` (Geist), keyframes.

So importing it into a Tailwind-v4 host double-resets and cross-contaminates
tokens — which is why the consumer iframed it.

**The crux — portals escape any scope root.** Runtime overlays (modal / drawer /
toast / popover) `createPortal` to **`document.body`**
(`src/adapters/html/components.tsx`), and the chrome/`--ed-*` tokens were
deliberately put on `:root` (Phase 19) precisely so body-portaled content
resolves them. Any approach that scopes styles/tokens under a root element
therefore *breaks portaled overlays* unless the portals are also brought into
the scope. This is the reason P6 is a phase, not a one-liner.

## Goal

```tsx
// Tailwind-v4 host, inline, no iframe:
import '@crafted-design/editor/index.scoped.css'   // instead of index.css
<Editor persistence={false} hideChrome value={doc} onChange={...} />
```
The editor (and `<DocumentRenderer>`) render correctly — overlays included —
with **no second preflight** and **no token clobbering** of the host. The
default `@crafted-design/editor/index.css` is unchanged (standalone /
iframe / non-Tailwind hosts keep the global sheet).

## In-scope

| Group | Theme |
|---|---|
| A | Scope plumbing — a `.crafted-design-scope` root on `<Editor>` + `<DocumentRenderer>`, and overlay portals routed into a scope-classed container (not bare `<body>`) |
| B | The scoped CSS build — a PostCSS pass that scopes the compiled sheet into `index.scoped.css` + the exports entry |
| C | Validation (Tailwind-v4 host fixture) + inline example + docs + close-out |

A makes the scope *reachable everywhere the editor renders* (incl. portals); B
produces the scoped sheet; C proves it against a real host.

## Resolved decisions

### 1. Specificity scoping (selector-prefix), not `@layer` subordination

Scope by prefixing every editor selector with a root class
(`.crafted-design-scope`) at build time, so editor rules apply **only inside**
the editor and never leak out. Rejected `@layer crafted-design` as the primary
mechanism: a layer *subordinates* the editor's styles, so an unlayered host
rule would override the editor's own look (Open Q5). `@layer` may still wrap
the output as a secondary nicety, but specificity scoping is what makes it
robust both directions.

### 2. Scope the COMPILED css, not the source

Run the PostCSS scoping pass over the emitted `dist-lib/index.css` (after
Tailwind compiles `@theme`/`@import`), producing `dist-lib/index.scoped.css`.
Operating on compiled output means: `:root` token blocks → `.crafted-design-scope`;
the preflight `*` reset → `.crafted-design-scope *` (a reset scoped to the
editor subtree, so the host page isn't re-reset); utilities → scoped; while
`@font-face` and `@keyframes` stay global (correct — fonts/animation names are
global by nature). The default `index.css` build is untouched.

### 3. The scope root is always present; the host picks the sheet

`<Editor>` and `<DocumentRenderer>` always render their root with
`crafted-design-scope` (harmless under the global `index.css` — its rules
aren't scoped). The host opts in purely by importing `index.scoped.css`
instead of `index.css`. No new prop needed.

### 4. Portals render into a scope-classed container (the crux fix)

Provide one editor-owned portal container that itself carries
`crafted-design-scope`, appended under the editor (or to `<body>` but
class-tagged), and route the overlay portals (`useOverlayStageTarget` + the
html-adapter runtime `createPortal(...)` targets) into it instead of bare
`document.body`. Then scoped CSS + scoped tokens reach portaled overlays even
though they're DOM-detached from the canvas. This is a behavior-preserving
change for the global sheet (the container is just a tagged div).

### 5. Scoped sheet targets Tailwind-v4 hosts; default stays universal

The scoped sheet omits a *global* preflight on the assumption the host already
provides one (Tailwind v4) — the editor subtree gets the scoped reset. A host
with no CSS framework, or standalone usage, keeps `index.css` (full global
build). Documented explicitly; not auto-detected.

## Group A — Scope plumbing + portal routing

**Land**

1. Add `crafted-design-scope` to the `<Editor>` shell root (alongside
   `cd-editor-chrome`) and the `<DocumentRenderer>` wrapper — always on.
2. A single overlay portal container tagged `crafted-design-scope`
   (one per editor/renderer instance); route `useOverlayStageTarget` and the
   html-adapter runtime overlay portals to it instead of `document.body`.
3. Tests: overlays still portal + render (global sheet unaffected); the portal
   container carries the scope class; a modal's content sits under a
   `.crafted-design-scope` ancestor.

**Output** — everything the editor renders, canvas + portaled overlays, lives
under a scope root, so scoped CSS can reach all of it.

## Group B — The scoped CSS build

**Land**

1. A PostCSS scoping pass (e.g. `postcss-prefix-selector` + a small custom
   plugin) that transforms the compiled `dist-lib/index.css` →
   `dist-lib/index.scoped.css`: prefix selectors with `.crafted-design-scope`,
   rewrite `:root`/`html`/`body` to it, scope the `*` preflight under it, leave
   `@font-face`/`@keyframes`/media queries intact. Wired into `build:dist`
   after the lib build emits `index.css`.
2. `exports` entry `"./index.scoped.css": "./dist-lib/index.scoped.css"` +
   `files` already covers `dist-lib`.
3. A build-time assertion (a `check:scoped-css` script, like the other guards):
   the scoped sheet contains **no top-level `:root {`**, no unscoped universal
   `*` preflight, and every utility selector is prefixed — fails CI if the
   scoping regresses.

**Output** — `@crafted-design/editor/index.scoped.css` exists, scoped, shipped.

## Group C — Validation + example + docs

**Land**

1. **Real-host fixture** (the make-or-break test): a tiny Tailwind-v4 host page
   that defines its OWN `--color-primary` / preflight, imports
   `index.scoped.css`, mounts `<Editor>`, and asserts — via the existing
   Playwright harness (Phase 22) or jsdom + computed styles — that (a) the
   host's `--color-primary` is NOT clobbered, (b) there's no double reset, and
   (c) the editor + an open overlay still render with the editor's own tokens.
2. Extend `examples/controlled-host` (Phase 23) to import the scoped sheet and
   embed inline with no iframe; CI-typechecked.
3. Docs: INTEGRATION_GUIDE "Inline embedding into a Tailwind-v4 app" (scoped
   sheet + the scope root + the Tailwind-v4 assumption + when to use global vs
   scoped); FAQ; CHANGELOG; version cut.

**Output** — inline embedding into a Tailwind-v4 host is proven safe; phase
complete; release cut.

## Out of scope

| Item | Why |
|---|---|
| Changing/removing the default `index.css` | Additive only — global sheet stays for standalone / iframe / non-Tailwind hosts. |
| Shadow-DOM encapsulation | Heavier, breaks portals + the Tailwind token model further; specificity scoping is the lighter fit. |
| Auto-detecting the host's framework to pick a sheet | The host imports the sheet it wants; auto-detection is fragile. |
| Multiple editor instances with *different* scoped themes on one page | The scope class is a single shared root; per-instance scoping is a separate, larger effort. |

## Risks + mitigations

1. **Portaled overlays miss the scope (the crux).** Mitigation: Group A routes
   all portals into a scope-classed container; the Group C fixture asserts an
   OPEN overlay renders with editor tokens under the scoped sheet — this is the
   gating test for the whole phase.
2. **PostCSS prefixing mangles an at-rule / `:where`/`:is`/keyframes.**
   Mitigation: operate on the *compiled* CSS (Decision 2), exclude
   `@font-face`/`@keyframes`/`@property`, and the `check:scoped-css` guard +
   the host fixture catch breakage; if a construct can't be safely prefixed,
   document the limitation.
3. **Specificity scoping makes editor utilities un-overridable by the host.**
   This is intended (the editor owns its look); documented. Hosts theme the
   *canvas* via `registerTheme` and the *chrome* via `editorTheme`, not by
   overriding editor utilities.
4. **Scoped sheet assumes a Tailwind-v4 host preflight.** A host without one
   would see the editor under-reset (it relies on the scoped `*` reset, which
   we keep — so this is actually covered; the omission is only the *global*
   page reset). Validate both "host has Tailwind v4" and "host has no global
   reset" in the fixture.
5. **If it can't be made robust** — selector prefixing fights some host setup
   the fixture exposes — fall back to documenting the iframe as the supported
   isolation path and ship only the scope plumbing (Group A) + the build behind
   an "experimental" note, rather than claiming inline safety we can't back.

## Definition of done

`@crafted-design/editor/index.scoped.css` lets a Tailwind-v4 host embed
`<Editor>` and `<DocumentRenderer>` **inline, iframe-free** with no double
preflight and no token clobbering — verified against a real-host fixture
including an open overlay (portals scoped); the default `index.css` is
unchanged; `examples/controlled-host` embeds inline; docs explain global-vs-
scoped; release cut as `1.7.0`.
