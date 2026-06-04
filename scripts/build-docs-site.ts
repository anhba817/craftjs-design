/**
 * Builds the single-page documentation site at `docs-site/index.html` from the
 * existing markdown guides. The markdown files are the single source of truth;
 * this just converts + styles them into one navigable, self-contained page
 * (sticky grouped sidebar, hero, scroll-spy, syntax-highlighted code).
 *
 * Run: `npm run docs:site`. Open `docs-site/index.html` in a browser, or host
 * the `docs-site/` folder (GitHub Pages, etc.).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, relative } from 'node:path'
import { marked } from 'marked'

const ROOT = resolve(import.meta.dirname, '..')
const OUT_DIR = resolve(ROOT, 'docs-site')

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  name: string
  version: string
  description: string
  repository?: { url?: string }
  keywords?: string[]
  license?: string
}

interface Guide {
  file: string
  title: string
  slug: string
  group: string
}

// Curated, ordered guide set (user-facing docs; internal plans / RELEASE /
// PRODUCTION_READINESS are intentionally omitted).
const GUIDES: Guide[] = [
  { file: 'examples/minimal-host/README.md', title: 'Quick Start', slug: 'quick-start', group: 'Getting Started' },
  { file: 'docs/INTEGRATION_GUIDE.md', title: 'Integration Guide', slug: 'integration', group: 'Getting Started' },
  { file: 'docs/COOKBOOK.md', title: 'Cookbook', slug: 'cookbook', group: 'Guides' },
  { file: 'docs/SDK_GUIDE.md', title: 'SDK Reference', slug: 'sdk', group: 'Guides' },
  { file: 'docs/MCP_GUIDE.md', title: 'MCP Server (AI)', slug: 'mcp', group: 'Guides' },
  { file: 'docs/TUTORIAL_ADAPTER.md', title: 'Tutorial · Adapter', slug: 'tutorial-adapter', group: 'Guides' },
  { file: 'docs/TUTORIAL_CANONICAL.md', title: 'Tutorial · Canonical', slug: 'tutorial-canonical', group: 'Guides' },
  { file: 'docs/TUTORIAL_PANEL.md', title: 'Tutorial · Panel', slug: 'tutorial-panel', group: 'Guides' },
  { file: 'docs/ADAPTER_MATRIX.md', title: 'Adapter Matrix', slug: 'adapter-matrix', group: 'Reference' },
  { file: 'docs/ADAPTER_VERSIONING.md', title: 'Adapter Versioning', slug: 'adapter-versioning', group: 'Reference' },
  { file: 'docs/MIGRATION.md', title: 'Migration', slug: 'migration', group: 'Reference' },
  { file: 'docs/FAQ.md', title: 'FAQ', slug: 'faq', group: 'Reference' },
  { file: 'docs/ARCHITECTURE.md', title: 'Architecture', slug: 'architecture', group: 'Under the hood' },
  { file: 'docs/ACCESSIBILITY.md', title: 'Accessibility', slug: 'accessibility', group: 'Under the hood' },
  { file: 'docs/PERFORMANCE.md', title: 'Performance', slug: 'performance', group: 'Under the hood' },
  { file: 'docs/DEVELOPER_GUIDE.md', title: 'Contributing & Recipes', slug: 'developer-guide', group: 'Under the hood' },
]

// basename(lowercase) → slug, for rewriting cross-doc markdown links to in-page
// anchors. README.md is special-cased (minimal-host vs the api/ typedoc one).
const BASENAME_TO_SLUG = new Map<string, string>()
for (const g of GUIDES) {
  if (g.file.endsWith('minimal-host/README.md')) continue
  BASENAME_TO_SLUG.set(basename(g.file).toLowerCase(), g.slug)
}

const repoUrl = (pkg.repository?.url ?? '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '')

// GitHub Pages deploy target (docs.yml) — used for the canonical URL, Open
// Graph tags, and the sitemap. Falls back to empty (tags omitted) if the
// repository URL isn't a github.com one.
const gh = /github\.com\/([^/]+)\/([^/]+)/.exec(repoUrl)
const ghOwner = gh?.[1] ?? ''
const ghRepo = gh?.[2] ?? ''
const siteUrl = ghOwner ? `https://${ghOwner}.github.io/${ghRepo}/` : ''

// Maintainer avatar — favicon, social-card image, sidebar brand, author credit.
const AVATAR = 'https://avatars.githubusercontent.com/u/19990046'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// SEO: the page keeps exactly ONE <h1> (the hero). Every converted guide's
// headings are demoted one level (its `#` title → <h2>, `##` → <h3>, …) so
// the document outline is a proper hierarchy instead of fifteen competing h1s.
const demoteHeadings = (html: string) =>
  html.replace(
    /<(\/?)h([1-5])([\s>])/g,
    (_m, slash: string, lvl: string, tail: string) =>
      `<${slash}h${Number(lvl) + 1}${tail}`,
  )

// Rewrite markdown links: `…/X.md#frag` → `#slug` when X is a site guide
// (the sub-heading fragment collapses to the guide's section). A non-site .md
// link (CHANGELOG, the typedoc api/) is rewritten to its GitHub blob URL —
// resolved relative to the SOURCE doc — so nothing 404s in the standalone page.
function rewriteLinks(html: string, sourceFile: string): string {
  const srcDir = dirname(resolve(ROOT, sourceFile))
  return html.replace(
    /href="([^"]+?\.md)(#[^"]*)?"/g,
    (whole, path: string) => {
      if (/^https?:/i.test(path)) return whole
      if (/minimal-host\/README\.md$/i.test(path)) return 'href="#quick-start"'
      const slug = BASENAME_TO_SLUG.get(basename(path).toLowerCase())
      if (slug) return `href="#${slug}"`
      if (!repoUrl) return whole
      const repoRel = relative(ROOT, resolve(srcDir, path)).replace(/\\/g, '/')
      return `href="${repoUrl}/blob/main/${repoRel}"`
    },
  )
}

marked.setOptions({ gfm: true, breaks: false })

// kebab-case anchor fragment from heading text (HTML stripped). Prefixed per
// guide by the caller so identical headings across guides ("Install") stay
// unique across the single page.
const slugifyHeading = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:[a-z]+|#\d+);/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')

interface SubItem {
  id: string
  text: string
}

// Convert one guide: inject a stable `id` on every heading (so the sidebar
// sub-menu can deep-link), and pick the sub-menu entries — the shallowest
// heading level BELOW the guide title. Most guides title with `#` and
// section with `##`; FAQ skips `##` and uses `###`, so we can't hardcode a
// level — we take the minimum level among the non-title headings.
function processGuide(g: Guide): { html: string; subitems: SubItem[] } {
  const md = readFileSync(resolve(ROOT, g.file), 'utf8')
  let html = rewriteLinks(marked.parse(md) as string, g.file)
  const headings: { level: number; text: string; id: string }[] = []
  const seen = new Set<string>()
  html = html.replace(
    /<h([1-6])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g,
    (_m, lvl: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      const base = `${g.slug}--${slugifyHeading(text) || 'section'}`
      let id = base
      for (let n = 2; seen.has(id); n++) id = `${base}-${n}`
      seen.add(id)
      headings.push({ level: Number(lvl), text, id })
      return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`
    },
  )
  html = demoteHeadings(html)
  // Skip the first heading (the guide title); the sub-menu is the next level.
  const rest = headings.slice(1)
  const minLevel = rest.length ? Math.min(...rest.map((h) => h.level)) : Infinity
  const subitems = rest
    .filter((h) => h.level === minLevel)
    .map((h) => ({ id: h.id, text: h.text }))
  return { html, subitems }
}

const subBySlug = new Map<string, SubItem[]>()
const sections = GUIDES.map((g) => {
  const { html, subitems } = processGuide(g)
  subBySlug.set(g.slug, subitems)
  return `<section id="${g.slug}" class="doc">
  <div class="doc-eyebrow">${esc(g.group)}</div>
  ${html}
</section>`
}).join('\n')

// Sidebar grouped by `group`, preserving order.
const groups: { name: string; items: Guide[] }[] = []
for (const g of GUIDES) {
  let grp = groups.find((x) => x.name === g.group)
  if (!grp) groups.push((grp = { name: g.group, items: [] }))
  grp.items.push(g)
}
const nav = groups
  .map((grp) => {
    const items = grp.items
      .map((g) => {
        const subs = subBySlug.get(g.slug) ?? []
        const sub = subs.length
          ? `\n      <div class="nav-sub">${subs
              .map(
                (s) =>
                  `<a class="nav-sublink" href="#${s.id}" data-sub="${s.id}">${s.text}</a>`,
              )
              .join('')}</div>`
          : ''
        // Items with sub-sections get a chevron toggle that expands/collapses
        // WITHOUT navigating (the link still navigates). Items without subs
        // render just the link.
        const toggle = subs.length
          ? `<button class="nav-toggle" type="button" aria-label="Toggle ${esc(g.title)} sections" aria-expanded="false" data-toggle="${g.slug}">▸</button>`
          : ''
        return `<div class="nav-item" data-slug="${g.slug}">
      <div class="nav-row">
        <a class="nav-link" href="#${g.slug}" data-slug="${g.slug}">${esc(g.title)}</a>
        ${toggle}
      </div>${sub}
    </div>`
      })
      .join('\n    ')
    return `<div class="nav-group">
    <div class="nav-group-title">${esc(grp.name)}</div>
    ${items}
  </div>`
  })
  .join('\n  ')

const installCmd = `npm install ${pkg.name} react@19 react-dom@19 @craftjs/core@^0.2.12`

const html = `<!doctype html>
<!-- GENERATED by scripts/build-docs-site.ts — edit the markdown in docs/, then \`npm run docs:site\`. -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(pkg.name)} — Pluggable drag-and-drop website builder for React · Docs</title>
<meta name="description" content="${esc(pkg.description)} Quick start, integration guide, cookbook, SDK reference, tutorials and FAQ." />
${pkg.keywords?.length ? `<meta name="keywords" content="${esc(pkg.keywords.join(', '))}" />` : ''}
<meta name="robots" content="index, follow" />
<meta name="author" content="${esc(ghOwner || pkg.name)}" />
<meta name="theme-color" content="#faf6ef" />
${siteUrl ? `<link rel="canonical" href="${esc(siteUrl)}" />` : ''}
<link rel="icon" href="${AVATAR}" />
<link rel="apple-touch-icon" href="${AVATAR}" />
<!-- Open Graph / Twitter cards -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(pkg.name)}" />
<meta property="og:title" content="${esc(pkg.name)} — pluggable drag-and-drop website builder for React" />
<meta property="og:description" content="${esc(pkg.description)}" />
${siteUrl ? `<meta property="og:url" content="${esc(siteUrl)}" />` : ''}
<meta property="og:image" content="${AVATAR}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${esc(pkg.name)} — docs" />
<meta name="twitter:description" content="${esc(pkg.description)}" />
<meta name="twitter:image" content="${AVATAR}" />
<script type="application/ld+json">
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: pkg.name,
    description: pkg.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    softwareVersion: pkg.version,
    license: pkg.license,
    url: siteUrl || repoUrl,
    sameAs: repoUrl ? [repoUrl] : undefined,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: ghOwner
      ? {
          '@type': 'Person',
          name: ghOwner,
          url: `https://github.com/${ghOwner}`,
          image: AVATAR,
        }
      : undefined,
  },
  null,
  2,
)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<style>
:root{
  --paper:#faf6ef; --paper-2:#f3ecdf; --panel:#fffdf9;
  --ink:#211c15; --ink-soft:#5f564a; --ink-faint:#8a8073;
  --line:#e7ddca; --line-soft:#efe7d6;
  --accent:#bd4a2b; --accent-deep:#9c3a20; --accent-tint:#f6e2d6;
  --code-bg:#241f1a; --code-ink:#ece3d4;
  --maxw:46rem;
  --sans:"Hanken Grotesk",ui-sans-serif,system-ui,sans-serif;
  --serif:"Fraunces",Georgia,serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:1.5rem}
body{
  margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:16px;line-height:1.7;-webkit-font-smoothing:antialiased;
  /* faint craft-paper grain */
  background-image:radial-gradient(var(--line-soft) 0.5px,transparent 0.5px);
  background-size:22px 22px;
}
a{color:var(--accent);text-decoration:none}
a:hover{color:var(--accent-deep);text-decoration:underline;text-underline-offset:2px}

.layout{display:grid;grid-template-columns:17rem minmax(0,1fr);gap:0;max-width:78rem;margin:0 auto;min-height:100vh}

/* ---- sidebar ---- */
.sidebar{
  position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;
  border-right:1px solid var(--line);padding:1.6rem 1.25rem 3rem;
  background:linear-gradient(180deg,var(--paper) 0%,rgba(243,236,223,.45) 100%);
}
.brand{display:flex;flex-direction:column;gap:.15rem;margin-bottom:1.6rem;text-decoration:none}
.brand:hover{text-decoration:none}
.brand-row{display:flex;align-items:center;gap:.55rem}
.brand-avatar{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);flex:none}
.brand-mark{font-family:var(--serif);font-weight:600;font-size:1.5rem;letter-spacing:-.02em;color:var(--ink);line-height:1.05}
.brand-mark em{font-style:italic;color:var(--accent)}
.brand-scope{font-family:var(--mono);font-size:.7rem;color:var(--ink-faint);letter-spacing:.02em}

/* footer credit */
.site-footer{display:flex;align-items:center;gap:.6rem;padding:2.5rem 0 0;color:var(--ink-faint);font-size:.85rem}
.site-footer img{width:24px;height:24px;border-radius:50%;border:1px solid var(--line)}
.nav-group{margin-bottom:1.35rem}
.nav-group-title{
  font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.13em;
  color:var(--ink-faint);margin:0 0 .5rem .55rem;
}
.nav-row{display:flex;align-items:stretch;margin:.05rem 0}
.nav-link{
  flex:1;min-width:0;display:block;padding:.32rem .55rem;border-radius:7px;
  color:var(--ink-soft);font-size:.875rem;font-weight:500;
  border-left:2px solid transparent;transition:background .12s,color .12s;
}
.nav-link:hover{background:var(--paper-2);color:var(--ink);text-decoration:none}
.nav-link.active{background:var(--accent-tint);color:var(--accent-deep);border-left-color:var(--accent);font-weight:600}

/* Chevron toggle: expand/collapse a guide's sub-sections WITHOUT navigating. */
.nav-toggle{
  flex:none;width:1.6rem;border:none;background:none;cursor:pointer;border-radius:7px;
  color:var(--ink-faint);font-size:.7rem;line-height:1;transition:transform .18s,background .12s,color .12s;
}
.nav-toggle:hover{background:var(--paper-2);color:var(--ink)}
.nav-item.expanded > .nav-row > .nav-toggle{transform:rotate(90deg);color:var(--ink-soft)}

/* sub-menu: a guide's sections. Collapsed by default; toggled by the chevron
   (or revealed when its guide link is clicked). */
.nav-item{margin:.05rem 0}
.nav-sub{overflow:hidden;max-height:0;transition:max-height .26s ease;margin-left:.95rem;border-left:1px solid var(--line)}
.nav-item.expanded .nav-sub{max-height:60rem}
.nav-sublink{
  display:block;padding:.22rem .55rem .22rem .7rem;
  color:var(--ink-faint);font-size:.8rem;line-height:1.35;font-weight:500;
  border-left:2px solid transparent;margin-left:-1px;transition:background .12s,color .12s;
}
.nav-sublink:hover{background:var(--paper-2);color:var(--ink);text-decoration:none}
.nav-sublink.active{color:var(--accent-deep);border-left-color:var(--accent);font-weight:600}

/* ---- main ---- */
.main{padding:0 clamp(1.25rem,5vw,4.5rem) 7rem;min-width:0}
.wrap{max-width:var(--maxw);margin:0 auto}

/* hero */
.hero{padding:4.5rem 0 2.75rem;border-bottom:1px solid var(--line)}
.hero-kicker{font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:600}
.hero h1{font-family:var(--serif);font-weight:600;font-size:clamp(2.4rem,6vw,3.6rem);line-height:1.02;letter-spacing:-.025em;margin:.9rem 0 .4rem}
.hero h1 em{font-style:italic;color:var(--accent)}
.hero-tagline{font-size:1.18rem;color:var(--ink-soft);max-width:34rem;margin:0 0 1.8rem}
.install{display:flex;align-items:center;gap:.75rem;background:var(--code-bg);color:var(--code-ink);border-radius:11px;padding:.85rem 1rem;font-family:var(--mono);font-size:.82rem;box-shadow:0 14px 40px -22px rgba(33,28,21,.5);overflow:auto}
.install .prompt{color:var(--accent);user-select:none}
.install code{white-space:nowrap}
.install button{margin-left:auto;flex:none;background:rgba(255,255,255,.08);color:var(--code-ink);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:.3rem .6rem;font-family:var(--mono);font-size:.72rem;cursor:pointer;transition:background .12s}
.install button:hover{background:rgba(255,255,255,.16)}
.hero-links{display:flex;gap:1.25rem;margin-top:1.4rem;font-size:.9rem;font-weight:500}

/* doc sections */
.doc{padding:3.25rem 0;border-bottom:1px solid var(--line-soft)}
.doc:last-child{border-bottom:none}
.doc-eyebrow{font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:.5rem}

/* long-form typography — guide headings are demoted one level at build time
   (the hero owns the page's single h1), so a doc's title is the h2. */
.doc h2,.doc h3,.doc h4,.doc h5{font-family:var(--serif);font-weight:600;letter-spacing:-.018em;line-height:1.18;color:var(--ink);scroll-margin-top:1.5rem}
.doc h2{font-size:2.15rem;margin:.2rem 0 1rem}
.doc h3{font-size:1.5rem;margin:2.4rem 0 .9rem;padding-bottom:.35rem;border-bottom:1px solid var(--line)}
.doc h4{font-size:1.18rem;margin:1.9rem 0 .6rem}
.doc h5{font-size:1rem;margin:1.5rem 0 .5rem;font-family:var(--sans);font-weight:700}
.doc p{margin:.85rem 0}
.doc strong{font-weight:700;color:var(--ink)}
.doc em{font-style:italic}
.doc ul,.doc ol{margin:.85rem 0;padding-left:1.4rem}
.doc li{margin:.35rem 0}
.doc li::marker{color:var(--accent)}
.doc blockquote{margin:1.2rem 0;padding:.6rem 1.1rem;border-left:3px solid var(--accent);background:var(--accent-tint);border-radius:0 9px 9px 0;color:var(--ink-soft)}
.doc blockquote p{margin:.3rem 0}
.doc hr{border:none;border-top:1px solid var(--line);margin:2.25rem 0}
.doc a{font-weight:500}

/* inline + block code */
.doc :not(pre)>code{font-family:var(--mono);font-size:.84em;background:var(--paper-2);border:1px solid var(--line);border-radius:5px;padding:.1em .38em;color:var(--accent-deep)}
.doc pre{background:var(--code-bg);color:var(--code-ink);border-radius:12px;padding:1.05rem 1.2rem;overflow:auto;margin:1.2rem 0;font-size:.83rem;line-height:1.65;box-shadow:0 18px 44px -28px rgba(33,28,21,.55)}
.doc pre code{font-family:var(--mono);background:none;border:none;padding:0;color:inherit;font-size:inherit}

/* tables */
.doc table{width:100%;border-collapse:collapse;margin:1.3rem 0;font-size:.85rem;display:block;overflow-x:auto}
.doc th,.doc td{border:1px solid var(--line);padding:.5rem .7rem;text-align:left;vertical-align:top}
.doc thead th{background:var(--paper-2);font-weight:700;font-size:.74rem;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft)}
.doc tbody tr:nth-child(even){background:rgba(243,236,223,.4)}

/* highlight.js — warm dark palette (self-contained, no theme CDN) */
.hljs-comment,.hljs-quote{color:#8a7f6e;font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:#e0986b}
.hljs-string,.hljs-attr,.hljs-template-variable{color:#bcd09a}
.hljs-title,.hljs-title.function_,.hljs-section{color:#e9c46a}
.hljs-title.class_,.hljs-type{color:#e9c46a}
.hljs-number,.hljs-literal{color:#d98a7a}
.hljs-tag .hljs-name{color:#e0986b}
.hljs-attribute,.hljs-variable,.hljs-property{color:#ece3d4}
.hljs-meta{color:#8a7f6e}
.hljs-symbol,.hljs-bullet,.hljs-regexp{color:#bcd09a}

/* mobile */
.menu-btn{display:none}
.scrim{display:none}
@media (max-width:980px){
  .layout{grid-template-columns:1fr}
  .sidebar{position:fixed;top:0;left:0;z-index:40;width:17rem;height:100vh;transform:translateX(-102%);transition:transform .22s ease;box-shadow:0 0 60px -10px rgba(33,28,21,.4)}
  body.nav-open .sidebar{transform:none}
  body.nav-open .scrim{display:block;position:fixed;inset:0;background:rgba(33,28,21,.35);z-index:30}
  .menu-btn{display:inline-flex;align-items:center;gap:.5rem;position:fixed;top:1rem;left:1rem;z-index:50;background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:.5rem .8rem;font-family:var(--sans);font-weight:600;font-size:.85rem;color:var(--ink);cursor:pointer;box-shadow:0 8px 24px -14px rgba(33,28,21,.5)}
  .hero{padding-top:5rem}
}
</style>
</head>
<body>
<button class="menu-btn" id="menuBtn" aria-label="Toggle navigation">☰ Docs</button>
<div class="scrim" id="scrim"></div>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="#top">
      <span class="brand-row">
        <img class="brand-avatar" src="${AVATAR}" alt="" width="30" height="30" loading="lazy" />
        <span class="brand-mark">crafted<em>·</em>design</span>
      </span>
      <span class="brand-scope">${esc(pkg.name)}</span>
    </a>
    ${nav}
  </aside>
  <main class="main">
    <div class="wrap">
      <header class="hero" id="top">
        <div class="hero-kicker">v${esc(pkg.version)} · documentation</div>
        <h1>Pick your design&nbsp;system.<br/><em>Drop the editor in.</em></h1>
        <p class="hero-tagline">${esc(pkg.description)}</p>
        <div class="install">
          <span class="prompt">$</span><code id="installCmd">${esc(installCmd)}</code>
          <button id="copyBtn" aria-label="Copy install command">Copy</button>
        </div>
        <div class="hero-links">
          <a href="try/">Try it live →</a>
          <a href="gallery/">Component gallery →</a>
          <a href="#mcp">Build with AI (MCP) →</a>
          <a href="#quick-start">Quick start →</a>
          <a href="#sdk">SDK reference →</a>
          ${ghOwner ? `<a href="https://stackblitz.com/github/${esc(ghOwner)}/${esc(ghRepo)}/tree/main/examples/minimal-host" target="_blank" rel="noopener">Open in StackBlitz ↗</a>` : ''}
          ${repoUrl ? `<a href="${esc(repoUrl)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}
        </div>
      </header>
      ${sections}
      ${
        ghOwner
          ? `<footer class="site-footer">
        <img src="${AVATAR}" alt="${esc(ghOwner)}" width="24" height="24" loading="lazy" />
        <span>Built by <a href="https://github.com/${esc(ghOwner)}" rel="author">@${esc(ghOwner)}</a> · MIT · v${esc(pkg.version)}</span>
      </footer>`
          : ''
      }
    </div>
  </main>
</div>
<script>
  // syntax highlight
  if (window.hljs) document.querySelectorAll('pre code').forEach(function(b){ window.hljs.highlightElement(b) });

  // copy install command
  var copyBtn = document.getElementById('copyBtn');
  copyBtn && copyBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(document.getElementById('installCmd').textContent).then(function(){
      var t = copyBtn.textContent; copyBtn.textContent = 'Copied'; setTimeout(function(){ copyBtn.textContent = t }, 1400);
    });
  });

  // mobile drawer
  var body = document.body, menuBtn = document.getElementById('menuBtn'), scrim = document.getElementById('scrim');
  function closeNav(){ body.classList.remove('nav-open') }
  menuBtn && menuBtn.addEventListener('click', function(){ body.classList.toggle('nav-open') });
  scrim && scrim.addEventListener('click', closeNav);
  document.querySelectorAll('.nav-link, .nav-sublink').forEach(function(a){ a.addEventListener('click', closeNav) });

  // Expansion is USER-controlled: the chevron toggles a guide's sub-menu with
  // no navigation, so you can peek at a section's contents without jumping to
  // it. The scroll-spy below only sets the active highlight — it never opens
  // or closes a menu, so what you expand stays exactly as you left it.
  var items = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var byItem = {}; items.forEach(function(it){ byItem[it.dataset.slug] = it });
  function setExpanded(it, on){
    it.classList.toggle('expanded', on);
    var tog = it.querySelector('.nav-toggle');
    if (tog) tog.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  document.querySelectorAll('.nav-toggle').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation(); // toggle only — do NOT navigate
      var it = byItem[btn.dataset.toggle];
      if (it) setExpanded(it, !it.classList.contains('expanded'));
    });
  });

  // section scroll-spy: highlight the guide nearest the top (no expand/collapse)
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var bySlug = {}; links.forEach(function(a){ bySlug[a.dataset.slug] = a });
  var spy = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){
        links.forEach(function(a){ a.classList.remove('active') });
        var a = bySlug[e.target.id]; if (a) a.classList.add('active');
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });
  document.querySelectorAll('section.doc').forEach(function(s){ spy.observe(s) });

  // Navigating to a guide (clicking its label) reveals its sub-menu too, so
  // you land with the section's contents open. Other items are left as-is.
  links.forEach(function(a){ a.addEventListener('click', function(){
    var it = byItem[a.dataset.slug]; if (it) setExpanded(it, true);
  }) });

  // sub-heading scroll-spy: highlight the section nearest the top within a guide
  var subLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-sublink'));
  var bySub = {}; subLinks.forEach(function(a){ bySub[a.dataset.sub] = a });
  var subSpy = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){
        subLinks.forEach(function(a){ a.classList.remove('active') });
        var a = bySub[e.target.id]; if (a){ a.classList.add('active'); }
      }
    });
  }, { rootMargin: '-12% 0px -80% 0px', threshold: 0 });
  subLinks.forEach(function(a){ var el = document.getElementById(a.dataset.sub); if (el) subSpy.observe(el); });
</script>
</body>
</html>
`

mkdirSync(OUT_DIR, { recursive: true })
const outFile = resolve(OUT_DIR, 'index.html')
writeFileSync(outFile, html)

// SEO crawl files — deployed alongside index.html by docs.yml (the Pages
// workflow copies all of docs-site/ to the site root; TypeDoc lives at /api/).
if (siteUrl) {
  const today = new Date().toISOString().slice(0, 10)
  writeFileSync(
    resolve(OUT_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`,
  )
  writeFileSync(
    resolve(OUT_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${siteUrl}api/</loc><lastmod>${today}</lastmod></url>
</urlset>
`,
  )
}

const kb = (Buffer.byteLength(html) / 1024).toFixed(0)
console.log(
  `Built docs site → ${outFile}\n  ${GUIDES.length} guides, ${kb} KB` +
    (siteUrl ? ' (+ robots.txt, sitemap.xml)' : '') +
    `. Open it in a browser or host docs-site/.`,
)
