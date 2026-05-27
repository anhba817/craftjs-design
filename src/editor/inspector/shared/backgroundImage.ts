// Phase 12 § 4.6 — background-image url() (de)serialization. Stored
// inline as `background-image: url("…")`; the picker edits the bare URL.

export function parseBgUrl(bgImage: string | undefined): string {
  if (!bgImage) return ''
  const m = /^url\((['"]?)([\s\S]*?)\1\)$/.exec(bgImage.trim())
  return m ? m[2] : ''
}

export function toBgUrl(url: string): string {
  return `url("${url}")`
}
