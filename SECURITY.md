# Security

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories
(the repo's **Security → Report a vulnerability** tab) rather than a public
issue. We aim to acknowledge within a few days. Until `1.0.0` the project
is a preview; fixes ship under the `next` dist-tag.

## Threat model

`@crafted-design/editor` is a **client-side** editor. It collects nothing
and ships no analytics. Documents are JSON, rendered live by the chosen
adapter. The security-relevant surfaces are the few places user-supplied
strings reach CSS or URLs.

### Validated injection surfaces (Phase 15 § 11.2)

The editor injects runtime `<style>` blocks (fonts, themes, and the
responsive / pseudo-state inline rules). Raw stylesheet text is a
CSS-injection vector if user input flows in unescaped, so the inputs are
validated at their registration / composition boundary:

- **Font tokens** (`registerFontToken`): `url` must be an http(s)/data URL
  with no quotes, parens, angle brackets, whitespace, or control
  characters (so it can't break out of `url("…")`); `family` must not
  contain `{ } ; < >` or control characters. Invalid values throw.
  (`isSafeFontUrl` / `isSafeFontFamily`, `src/registry/fonts.ts`.)
- **Responsive / state inline styles**: each generated declaration is
  dropped unless its property matches `^[a-zA-Z][a-zA-Z-]*$` and its value
  contains none of `{ } < >` or control characters — so a value like
  `red } body { … }` can't escape its rule. (Semicolons stay allowed: the
  escape boundary is `}`/`<`, and `;` appears legitimately in `data:`
  URIs. `isSafeDeclaration`, `src/style/responsive-inline.ts`.)
- **Gradients** (`gradientToCss`): safe by construction — stop colors are
  normalized hex (`#rrggbb`), positions/angles are clamped integers; no
  user string is interpolated.
- **Base inline styles** go through React's `style={}` prop (set via the
  CSSOM), which is not a stylesheet-injection vector.

React escapes rendered text content, so the DOM/HTML XSS surface is the
standard React one.

### Content-Security-Policy (Phase 15 § 11.1)

The editor requires **`style-src 'self' 'unsafe-inline'`** (and, for hosts
that split it, `style-src-attr 'unsafe-inline'`). This is unavoidable: the
editor sets element `style=""` attributes for base/transform styling
(inline style attributes cannot be nonced or hashed practically at this
scale) and injects `<style>` blocks for fonts/themes/responsive rules.

Because inline `style=` attributes already force `'unsafe-inline'` in
`style-src`, a nonce on the injected `<style>` blocks would **not** unlock
a strict (no-`unsafe-inline`) policy — so a nonce option is intentionally
not shipped. `script-src` has no such requirement: the editor adds no
inline scripts, so a strict `script-src 'self'` (or nonce-based) policy
works fine.

Recommended directives for a host embedding the editor:

```
default-src 'self';
script-src  'self';
style-src   'self' 'unsafe-inline';
img-src     'self' data: https:;
font-src    'self' https: data:;
connect-src 'self';
```

(Widen `img-src` / `font-src` to the origins your documents actually load
assets from.)

### Dependencies + licensing (Phase 15 § 11.3, 11.4)

- `npm run check:licenses` fails the build if any runtime dependency
  carries a non-permissive license (the package ships under MIT). Run in
  CI.
- `npm audit --omit=dev` runs in CI (advisory). Dependabot / Snyk on the
  public repo is a host action.
