import { registerFontToken, type FontToken } from './fonts'

// Phase 12 § 4.15 — curated built-in fonts selectable without uploading.
// Two sources:
//   - SYSTEM_FONTS: OS font stacks. Zero network, instant, privacy-safe.
//   - GOOGLE_FONTS: popular web fonts loaded from Google's CDN via a single
//     combined <link>. Opt-in (the demo app + hosts call registerGoogleFonts).
//
// Both register plain font tokens (no @font-face url): the system stack /
// Google stylesheet provides the actual faces; the registry just emits the
// `.font-<id>` family rule and the Typography dropdown lists them.

export const SYSTEM_FONTS: FontToken[] = [
  { id: 'arial', name: 'Arial', family: 'Arial, Helvetica, sans-serif' },
  {
    id: 'helvetica',
    name: 'Helvetica',
    family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  {
    id: 'times',
    name: 'Times New Roman',
    family: '"Times New Roman", Times, serif',
  },
  {
    id: 'courier',
    name: 'Courier',
    family: '"Courier New", Courier, monospace',
  },
  { id: 'verdana', name: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS',
    family: '"Trebuchet MS", Tahoma, sans-serif',
  },
  { id: 'system-ui', name: 'System UI', family: 'system-ui, sans-serif' },
]

export interface GoogleFont extends FontToken {
  // The Google Fonts CSS2 `family=` spec, e.g. 'Inter:wght@300;400;500;700'.
  googleSpec: string
}

export const GOOGLE_FONTS: GoogleFont[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: '"Inter", sans-serif',
    googleSpec: 'Inter:wght@300;400;500;600;700',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: '"Roboto", sans-serif',
    googleSpec: 'Roboto:wght@300;400;500;700',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    family: '"Open Sans", sans-serif',
    googleSpec: 'Open+Sans:wght@300;400;600;700',
  },
  {
    id: 'lato',
    name: 'Lato',
    family: '"Lato", sans-serif',
    googleSpec: 'Lato:wght@300;400;700',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: '"Montserrat", sans-serif',
    googleSpec: 'Montserrat:wght@300;400;500;600;700',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: '"Poppins", sans-serif',
    googleSpec: 'Poppins:wght@300;400;500;600;700',
  },
  {
    id: 'raleway',
    name: 'Raleway',
    family: '"Raleway", sans-serif',
    googleSpec: 'Raleway:wght@300;400;500;600;700',
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: '"Nunito", sans-serif',
    googleSpec: 'Nunito:wght@300;400;600;700',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: '"Playfair Display", serif',
    googleSpec: 'Playfair+Display:wght@400;500;600;700',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: '"Merriweather", serif',
    googleSpec: 'Merriweather:wght@300;400;700',
  },
]

// The combined Google Fonts CSS2 URL loading every curated family in one
// request. Font files themselves download lazily on use; only this small
// stylesheet is fetched.
export function googleFontsHref(): string {
  const families = GOOGLE_FONTS.map((f) => `family=${f.googleSpec}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

let googleLinkInjected = false

export function ensureGoogleFontsLink(): void {
  if (googleLinkInjected || typeof document === 'undefined') return
  googleLinkInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = googleFontsHref()
  link.setAttribute('data-craftjs-google-fonts', '')
  document.head.appendChild(link)
}

// Register the OS font stacks. No network — safe to call unconditionally.
export function registerSystemFonts(): void {
  for (const f of SYSTEM_FONTS) registerFontToken(f)
}

// Register the curated Google fonts + inject the combined CDN stylesheet.
// Opt-in because it reaches Google's CDN.
export function registerGoogleFonts(): void {
  ensureGoogleFontsLink()
  for (const f of GOOGLE_FONTS) {
    registerFontToken({ id: f.id, name: f.name, family: f.family })
  }
}
