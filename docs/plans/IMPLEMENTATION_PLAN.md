# Drag-Drop Website Builder — Implementation Plan

Tuned to three architectural choices:
- **Style storage:** Tailwind class strings per node
- **Output target:** Runtime-rendered JSON
- **Library-swap scope:** Primitives + plugin SDK

---

## 1. Stack

- **React 19 + Vite** — fast dev loop; SSR not required for the editor.
- **Craft.js** — tree + selection + drag/drop + history. Use it as the kernel, nothing more.
- **Tailwind v4** with CSS-variable theming (`@theme`).
- **Radix primitives** directly (Shadcn is the *default adapter*, not a hard dependency).
- **Zustand** for editor-side state outside the Craft tree (panels, current theme, current adapter).
- **Zod** for validating the saved JSON document and plugin manifests.

## 2. Architectural layers

The whole design hinges on keeping these four layers strictly separate. Mixing them is what kills builders like this.

```
┌──────────────────────────────────────────────────────────┐
│  Editor UI            (Toolbox, Inspector, Canvas chrome)│
├──────────────────────────────────────────────────────────┤
│  Canonical Component Registry  (abstract Button, Input…) │
├──────────────────────────────────────────────────────────┤
│  Adapter Layer        (Shadcn / MUI / Chakra → canonical)│
├──────────────────────────────────────────────────────────┤
│  Craft.js kernel + Document JSON                          │
└──────────────────────────────────────────────────────────┘
```

### 2a. Canonical Component Registry

Define ~20 abstract components with a stable prop schema. Each entry declares:

```ts
{
  id: 'button',
  category: 'input',
  tags: ['cta', 'action'],
  propsSchema: zod schema,         // variant, size, intent, etc.
  styleSlots: ['root', 'icon'],    // where Tailwind classes attach
  defaults: { props, classes }
}
```

Craft user-components reference *only* the canonical id. The renderer resolves it at runtime through the active adapter. This is what makes the interchangeable-library requirement actually work.

### 2b. Adapter SDK (the plugin surface)

An adapter is a module that exports:

```ts
{
  id: 'shadcn',
  components: { button: ShadcnButtonImpl, input: ShadcnInputImpl, … },
  themeTokens: { … },              // optional, can extend the theme
  classMap?: (canonicalClasses) => libraryClasses   // optional rewrite
}
```

Ship Shadcn as the reference adapter so the SDK is exercised from day one. A second adapter (Radix-only, or MUI) early on will surface every leaky assumption — do not skip this.

Plugins are registered at boot via `registerAdapter()` and `registerComponent()`. Validate manifests with Zod so a broken plugin can't corrupt the tree.

### 2c. Theme system

- One CSS file per theme defining the Tailwind v4 `@theme` token block (`--color-primary`, `--radius-md`, etc.).
- A `<ThemeProvider>` sets `data-theme="..."` on the canvas root; CSS variables cascade.
- Themes are first-class documents: name, tokens, optional adapter overrides. Stored alongside the page document.
- Switching theme = changing one attribute. **No re-serialization, no class rewriting.** That is the payoff for choosing Tailwind class storage.

### 2d. Style storage on nodes

Each node stores:

```ts
{
  type: 'button',
  props: { variant: 'primary', text: 'Buy' },
  classes: { root: 'px-4 py-2 rounded-md text-sm font-medium' },
  responsive: { md: { root: 'px-6 py-3' } }   // breakpoint overrides
}
```

The inspector edits the `classes` map. Never write raw style objects unless a control needs a token outside Tailwind's vocabulary (rare — handle as escape hatch).

## 3. The Figma-like inspector

Build it as a **set of independent panels**, each operating on a slice of the Tailwind class string. This is the single hardest piece — budget for it.

Panels (in order of priority):

1. **Layout** — display, flex direction/gap/align, grid.
2. **Size & position** — w/h with `auto | px | %`, min/max, position.
3. **Spacing** — padding/margin with linked-corners UI.
4. **Typography** — font, size, weight, leading, tracking, align, color.
5. **Fill / Border / Radius** — color picker bound to theme tokens first, arbitrary hex as fallback (`bg-[#xxxxxx]`).
6. **Effects** — shadow, opacity, blur.
7. **Responsive bar** — switches which breakpoint slice the panels write to.

Each panel needs a small **class parser/serializer** (e.g. `px-4` ↔ `{padding-x: 16}`). Write a single `tw-classes` utility with parse/serialize/merge — every panel funnels through it. Don't let panels touch class strings directly.

## 4. Toolbox (component organization)

Drives off the canonical registry:

- Categories: Layout, Input, Display, Navigation, Feedback, Media, Content.
- Sidebar tree grouped by category, with fuzzy search across name + tags + description.
- "Recently used" and "Favorites" sections backed by Zustand + localStorage.
- Each entry is a Craft `<Element canvas={…}>` ghost that renders the canonical component with default props/classes.

## 5. Phased roadmap

Each phase is shippable in isolation. Don't merge phases.

### Phase 1 — Kernel + first canonical component (1–2 weeks)
- Craft.js editor scaffold, canvas, selection, drag/drop.
- Canonical registry with one component (Box/Container).
- Shadcn adapter wired through. Save/load JSON to localStorage.
- *Exit criteria:* drag a Box on the canvas, save the JSON, reload, see it.

### Phase 2 — Theme + Tailwind class storage (1 week)
- **Run `npx shadcn init`** as the first action. Adopt their CSS-variable token convention (`--background`, `--foreground`, `--primary`, …) before defining our own theme tokens — retrofitting later is rework. This also replaces the Phase 1 stub `utils/cn.ts` with the shadcn `tailwind-merge`-backed version, and lands `components.json` so future `npx shadcn add <name>` calls have a home. Note: Phase 1 ships a `ShadcnBox` that's just a styled `<div>` because Box has no Radix primitive — the CLI is not needed until theming work begins here.
- ThemeProvider + 2 themes (one light, one dark — different *tokens*, not just dark mode).
- Node class storage + a single Typography panel as proof.
- *Exit criteria:* swap theme, colors update without touching nodes.

### Phase 3 — Adapter SDK + second adapter (1–2 weeks)
- Formalize the SDK. Build a Radix-only or MUI adapter for Button + Input.
- Adapter selector in the editor chrome.
- *Exit criteria:* swap adapter at runtime; the canvas re-renders with the other library, same JSON.

### Phase 4 — Inspector buildout (3–4 weeks, the long pole)
- All seven panels, responsive bar, class parser/serializer with tests.
- **Per-canonical panel filtering.** Phase 2's Typography panel shows for every selected node — fine for Text and Box, misleading for Button/Input where flex-centering and `h-*` size variants make text-align / font-size land in the DOM but produce no visible effect. Phase 4 routes panels by canonical metadata: declare which panels apply per canonical (or per category) and hide the rest. This is also the seam where canonicals like Button can declare component-native controls (a Size panel that maps to shadcn's `size` variant / MUI's `size` prop, not Tailwind's `text-*`).
- **Inspector panel state.** Phase 3 originally required panels to hold persistent UI state in Zustand because adapter swaps remounted everything inside `AdapterProvider`. That constraint is **gone** — Phase 3's "compose all Wrappers" fix (see `ARCHITECTURE.md` § Wrappers compose, not switch) keeps the React tree shape stable across swaps. Phase 4 panels can safely use `useState` / `useRef` for transient UI state.
- **Generated Tailwind safelist.** Phase 2 ships a hand-written `@source inline()` block in `index.css` for the typography slice (~24 utilities). Phase 4 fans out to ~7 panels × dozens of utilities × an arbitrary-value escape hatch — drift becomes the dominant risk. Replace the hand-written safelist with a generation step: a script reads the slice arrays from `style/tw-classes.ts` (the single source of truth), emits `src/style/safelist.generated.css` with `@source inline()` directives, runs via a `predev` / `prebuild` npm hook. Decision points to make at the time: (a) commit vs. gitignore the generated file; (b) watch-mode regeneration in dev or accept one-time staleness; (c) whether to handle the arbitrary-value escape hatch (`text-[#hex]`) via a wildcard `@source` pattern or by emitting per-document safelists at save time.
- *Exit criteria:* a non-trivial landing page built entirely from the inspector, no code.

### Phase 5 — Component breadth (2–3 weeks)
- Fill out the ~20 canonical components. Toolbox search/categories/favorites.
- Second adapter reaches parity.

### Phase 6 — Plugin SDK hardening (1–2 weeks)
- Public `registerAdapter` / `registerComponent` API, manifest validation, docs, sample plugin.
- **Split `AdapterProvider` for a cleaner Wrapper-composition scope (mental-model cleanup, not a bugfix).** Phase 3 fixed the original remount bug by composing *all* adapters' Wrappers around children (see `ARCHITECTURE.md` § Wrappers compose, not switch). The remaining oddity: chrome (SaveLoadBar, Toolbox, Inspector) currently sits inside every adapter's `Wrapper` — MUI's `ThemeProvider` provides MUI context to a region that contains no MUI components. Harmless but conceptually noisy.

  The Phase 6 split keeps the composition pattern but moves it deeper:
  - `<AdapterContextProvider>` wraps the entire editor — context only.
  - `<AdapterCanvasComposer>` wraps just the `<Frame>`, composes the Wrappers around it.

  Plugin authors get a cleaner mental model: "my `Wrapper` wraps the user's canvas, not the editor app." React tree shape stays stable inside the composer (same fold pattern as today). Phase 3's `hydrated` module-level flag can revert to `useRef` *if and only if* the composer's children never structurally change for any other reason — verify before changing.

  Migration risk: low. The composition pattern is preserved; only the position in the tree moves.

## 6. Risks worth flagging now

- **Class parsing is the rabbit hole.** Arbitrary values, modifiers, plugin classes, `!important` — define a strict subset the inspector owns, and treat anything outside it as opaque "custom" classes shown in a raw textarea.
- **Adapter divergence on composites.** Button/Input map cleanly; Dialog/Combobox/DataTable do not. Keep the primitive list small; push composites into the plugin SDK from the start.
- **Tailwind purge in runtime renderer.** Tailwind v4's JIT needs to see every class you might use. Either (a) ship the full theme stylesheet (larger CSS but simple), or (b) generate a per-document stylesheet at save time. Decide before Phase 2.
- **Craft.js's `<Element canvas>` recursion costs** at scale. Fine for hundreds of nodes, watch it at thousands. Virtualize the layers panel early.
