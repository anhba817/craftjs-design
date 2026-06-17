# Phase 27 — Runtime icon library (search the full lucide set)

Replace the fixed 16-icon allowlist with a runtime-resolved icon library: the
author searches and selects from the **full lucide set (~1500)** in the
inspector, glyphs are **lazy-loaded** so the bundle stays small, and a
**pluggable resolver** lets a host swap in its own icon set. Unknown names
render a neutral fallback glyph while preserving the stored name.

## The shape

Today (`src/registry/components/icon.ts`):

- `icon.name: z.enum(ICON_NAMES)` — a hard-coded 16-name enum.
- `nav-item.icon: z.enum(['', ...ICON_NAMES])` — shares the same list.
- Every adapter statically imports those 16 lucide glyphs into a `Record`
  (`ShadcnIcon`'s `ICONS`, `MaterialIcon` re-exports it, `HtmlIcon` uses
  `iconElement` from `src/adapters/_shared/lucide-icons.tsx`).
- Inspector renders the enum as a `ValueSelect` dropdown (16 options).

After Phase 27:

- `icon.name: z.string()` (kebab-case). **Backward-compatible** — all 16 legacy
  names are valid lucide kebab names, so existing documents still validate and
  render. `ICON_NAMES` stays exported as a *suggested / quick-pick* list, not
  the allowlist.
- A single **icon resolver** seam resolves `name → ReactNode`. The built-in
  resolver uses `lucide-react/dynamic`'s `DynamicIcon` (lazy per-icon chunks).
- The inspector renders a **searchable, virtualized icon picker** over the full
  lucide name list (`Object.keys(dynamicIconImports)`), with live glyph previews.
- A host can call `registerIconResolver()` to replace the icon set entirely
  (their design system's icons, Iconify, a curated subset, …); default = lucide.

## Resolved decisions

### 1. Full lucide set (~1500), lazy-loaded
The picker searches the entire library; glyphs load on demand via `DynamicIcon`,
so the editor / renderer entry bundles stay small (only the importer map +
`DynamicIcon` ship eagerly). `lucide-react@1.16.0` already exports
`lucide-react/dynamic` (`DynamicIcon`, `dynamicIconImports`).

### 2. Pluggable resolver — `registerIconResolver`, default lucide
Mirror the adapter/theme registration pattern. One global resolver:

```ts
type IconResolver = (name: string, sizePx: number) => ReactNode
registerIconResolver(resolver: IconResolver): void   // SDK export
```

The default resolver renders `<DynamicIcon name size />`. A host registers its
own **before** `<Editor />` / `<DocumentRenderer />` mounts. Resolvers may be
synchronous (host supplies glyphs directly) or lazy (the lucide default).

### 3. Unknown names → fallback glyph, keep the name
A name the resolver can't load (typo, or a name outside the host's custom set)
renders a neutral placeholder (lucide `Square`/`HelpCircle`), but the document
keeps the original string. Nothing breaks; the author sees a visible "unknown"
marker rather than an empty gap.

### 4. The hard part — headless SSR is synchronous
`src/headless/render.tsx` renders with `renderToStaticMarkup` (sync).
`DynamicIcon` is `React.lazy` + Suspense and **will not resolve in a sync
render**, so a naïve swap makes `renderDocumentToHtml` emit empty/fallback
glyphs. Resolution (Group C): `renderDocumentToHtml` **pre-resolves** — walk the
node tree, collect icon names, `await` their lazy importers into a sync cache,
then render. This keeps lazy loading everywhere (no eager full-lucide import
bloating any bundle) and keeps the sync render correct. The browser
`DocumentRenderer` is unaffected — it renders asynchronously and uses
`DynamicIcon` + Suspense directly.

### 5. Inspector picker via the existing `ICON_FIELDS` seam
`PropsPanel` already swaps in a dedicated control for specific (canonical, prop)
pairs — `IMAGE_FIELDS → <ImagePicker>`. Add an analogous
`ICON_FIELDS = { icon: ['name'], 'nav-item': ['icon'] } → <IconPicker>`. No Zod
metadata plumbing; `name` stays a plain `z.string()` (so headless/MCP authors
can also set it as a string), and only the inspector special-cases it.

### 6. Shared consumers move in lockstep
The 16-name set is referenced in six places that all switch to the resolver:
`registry/components/icon.ts`, `registry/components/nav-item.ts`,
`adapters/_shared/lucide-icons.tsx`, `adapters/shadcn/components/Icon.tsx`,
`adapters/mui/components/Icon.tsx` (re-export), and `adapters/html/components.tsx`
(`HtmlIcon` + `HtmlNavItem`, both via `iconElement`). MUI keeps lucide glyphs
(no `@mui/icons-material` dependency added) — the glyph is design-system-agnostic.

## In-scope

- `name`/`icon` contract → `z.string()`; resolver seam + default lazy lucide
  loader + fallback glyph; searchable virtualized inspector picker; headless
  pre-resolution; `registerIconResolver` SDK export; NavItem parity; docs;
  surface + tests; size guard; version cut **1.10.0**.

## Group A — Contract + resolver seam + default loader

- `src/icons/resolver.ts` (NEW, or under `src/registry/`): `IconResolver` type,
  module-level `currentResolver`, `registerIconResolver(fn)`, `resolveIcon(name,
  sizePx): ReactNode`. Default resolver: `<DynamicIcon name={name}
  size={sizePx} />` wrapped to render the fallback glyph on unknown/missing
  (lucide's `fallback` prop + a known-name check against `dynamicIconImports`).
- `icon.ts`: `name: z.string()`. Keep `ICON_NAMES` (+ `IconName`) exported,
  re-documented as the *suggested quick-pick* list. `defaults.props.name` stays
  `'star'`.
- `nav-item.ts`: `icon: z.string()` (empty string = no icon, as today). Drop the
  `['', ...ICON_NAMES]` enum.
- Gate: tsc + the registry/schema unit tests; existing documents (16 names)
  still validate.

## Group B — Adapters render through the resolver

- `adapters/_shared/lucide-icons.tsx`: `iconElement(name, sizePx)` delegates to
  `resolveIcon` (lazy default). Keep the export name/signature so `HtmlIcon`,
  `HtmlNavItem`, and any other caller are unchanged at the call site.
- `ShadcnIcon`: replace the static `ICONS` map with `resolveIcon(name, px)`;
  keep the `<span>` connector wrapper + triggers.
- `MaterialIcon`: still re-exports `ShadcnIcon` (no change needed).
- `HtmlIcon` / `HtmlNavItem`: already call `iconElement` → now runtime-resolved.
- Gate: build the editor; eyeball icons render in shadcn/MUI/html; verify a
  non-legacy name (e.g. `shopping-cart`) renders; verify an unknown name shows
  the fallback. Screenshot.

## Group C — Headless / SSR pre-resolution

- `src/headless/render.tsx`: before `renderToStaticMarkup`, walk the resolved
  node tree, collect every `icon.name` / `nav-item.icon`, `await` the lazy
  importers (`dynamicIconImports[name]()`) into a sync `Map`, and have the
  headless icon path read from that cache (a sync resolver variant seeded with
  the cache). Missing names → fallback glyph.
- `renderDocumentToHtml` stays its current async signature; confirm
  `renderImage`/`render_html` (MCP) and the renderer host example still emit
  real `<svg>` markup for icons.
- Browser `DocumentRenderer`: no change — `DynamicIcon` + Suspense resolve at
  runtime. Add a Suspense boundary/fallback around icon-bearing trees if needed.
- Gate: headless render test asserts a non-legacy icon emits `<svg>` (not empty
  / not fallback). MCP `render_html` smoke.

## Group D — Inspector icon picker

- `src/editor/inspector/icons/IconPicker.tsx` (NEW): popover with auto-focused
  search input + a **virtualized** grid (`@tanstack/react-virtual`, already a
  dep) of glyph previews over `Object.keys(dynamicIconImports)`. Filter by name;
  click to pick `onChange(name)`; render the current value's glyph in the
  trigger. Reuse the search/close patterns from `TemplateVariablePicker`.
  Chrome-themed via `--ed-*` only (check:chrome).
- `PropsPanel.tsx`: add `ICON_FIELDS = { icon: new Set(['name']), 'nav-item':
  new Set(['icon']) }` + `isIconField`; render `<IconPicker>` for those (mirrors
  the `ImagePicker` branch).
- Lazy-render previews so opening the picker doesn't eagerly load 1500 chunks
  (virtualization renders only on-screen rows; `DynamicIcon` lazy-loads each
  visible glyph).
- Gate: jsdom test — picker lists/filter, selecting writes the kebab name;
  NavItem's icon field shows the picker. Eyeball: search "cart", pick, canvas
  updates.

## Group E — SDK surface + docs + size + close-out

- `src/sdk`: export `registerIconResolver` + `IconResolver` type. Update
  `surface.test.ts` (`SDK_SURFACE` adds `registerIconResolver`; type-only
  `IconResolver` erased). `ICON_NAMES`/`IconName` remain exported.
- `check:size`: confirm no entry eagerly pulls the full lucide set — the
  importer map + `DynamicIcon` are the only eager additions; per-icon chunks are
  lazy (like the `lazyBoundaries: ['mcp.js']` precedent). Bump a budget only if
  a real, explained increase shows up.
- Docs: INTEGRATION_GUIDE "Icons" section (searchable picker; `registerIconResolver`
  with a host example); note the contract change (`z.string()`) in CHANGELOG;
  MCP/SDK guides note `icon.name` accepts any lucide kebab name.
- CHANGELOG `[1.10.0]`; bump `package.json` 1.9.2 → 1.10.0.
- Gate: full vitest, tsc, lint, check:chrome, check:scoped-css, check:size,
  check:cli, docs:matrix. Verify at runtime (editor + headless + MCP).

## Out of scope

- Icon color/stroke-width props (a follow-up; today only `size` + class-based
  `currentColor`).
- Multiple simultaneous icon libraries (one resolver at a time; a host picks
  lucide OR their own set).
- Bundling icons offline for air-gapped hosts (the lazy chunks load from the
  installed `lucide-react` package, not the network — already offline-friendly).

## Risks + mitigations

- **Sync SSR can't lazy-load (the main risk).** → Group C pre-resolves icon
  names before `renderToStaticMarkup`. Alternative if pre-resolution proves
  awkward: a headless-only synchronous full-lucide map (node bundle; size
  acceptable as it's never browser-delivered) — fallback, not the default.
- **Picker performance with ~1500 entries.** → virtualize; lazy glyph previews;
  debounce/trim search.
- **`DynamicIcon` Suspense flashes in the browser renderer.** → small fallback
  (the placeholder glyph) so there's no layout jump.
- **A host's custom resolver returns nothing for a name.** → resolver contract
  returns the fallback glyph for unknowns; never throws.
- **Bundle creep from the importer map.** → measure in Group E; the map is
  name→`() => import()` thunks (small), not the icons themselves.

## Open questions — RESOLVED

- **Set size?** Full lucide (~1500), lazy.
- **Host control?** Yes — `registerIconResolver`, default lucide.
- **Unknown names?** Fallback glyph, keep the stored name.
- **MUI icons?** Keep lucide glyphs across all adapters (no new dependency).

## Definition of done

- Author opens an Icon's `name` field → searches the full lucide set → clicks a
  glyph → canvas updates; the document stores the kebab name.
- Legacy documents (16 names) render unchanged; a non-legacy name renders its
  real glyph in editor, browser renderer, and headless HTML; an unknown name
  renders the fallback.
- A host can `registerIconResolver` to supply its own icon set.
- Entry bundles don't eagerly grow by the full lucide weight (lazy chunks).
- All gates green; 1.10.0 cut.
