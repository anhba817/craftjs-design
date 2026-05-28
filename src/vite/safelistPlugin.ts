import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import {
  extractArbitraryClassesFromCraftJson,
  formatAsSafelistCss,
} from '../style/safelist-extract'

// Phase 12 § 4.1 — OPTIONAL build-time safelist Vite plugin.
//
// The editor's zero-config default is runtime `<style>` injection (the
// arbitrary inline values become injected rules at render time), so NO host
// is forced into a build-config change. This plugin is a production-CSS
// trimming upgrade: it scans the host's *saved documents* for the arbitrary
// Tailwind classes their inline/responsiveInline values map to, and emits
// `@source inline(...)` directives into a generated CSS file the host
// imports. Tailwind's JIT then generates exactly those utilities at build
// time and the runtime injection becomes unnecessary for shipped pages.
//
// Reuses the Phase 8 extractor (src/style/safelist-extract.ts).

// Pull the craftJson tree string out of a saved document file's contents.
// Accepts either a full EditorDocument envelope (`{ craftJson: "…" }`) or a
// raw craft-tree JSON string. Returns '' for unparseable input.
export function craftJsonFromFileContents(text: string): string {
  try {
    const parsed = JSON.parse(text) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { craftJson?: unknown }).craftJson === 'string'
    ) {
      return (parsed as { craftJson: string }).craftJson
    }
  } catch {
    return ''
  }
  return text
}

// Pure: aggregate the arbitrary classes across documents and format them as
// `@source inline(...)` CSS. Deterministic (sorted, deduped).
export function generateDocumentSafelist(craftJsonDocs: string[]): string {
  const all = new Set<string>()
  for (const doc of craftJsonDocs) {
    for (const c of extractArbitraryClassesFromCraftJson(doc)) all.add(c)
  }
  return formatAsSafelistCss([...all].sort())
}

export interface DocumentSafelistOptions {
  // Saved document JSON file path(s) to scan. Each is an EditorDocument
  // envelope or a raw craft-tree JSON.
  documents: string | string[]
  // Where to write the generated `@source inline(...)` CSS. The host imports
  // this file from their stylesheet (e.g. `@import "./safelist.docs.css";`).
  outFile: string
}

export function craftedDocumentSafelist(
  options: DocumentSafelistOptions,
): Plugin {
  const docs = (
    Array.isArray(options.documents) ? options.documents : [options.documents]
  ).map((p) => resolve(p))
  const outFile = resolve(options.outFile)

  const rebuild = () => {
    const trees: string[] = []
    for (const p of docs) {
      if (!existsSync(p)) continue
      try {
        trees.push(craftJsonFromFileContents(readFileSync(p, 'utf8')))
      } catch {
        // Unreadable file — skip; a partial safelist is better than failing
        // the whole build over one document.
      }
    }
    writeFileSync(outFile, generateDocumentSafelist(trees), 'utf8')
  }

  return {
    name: 'crafted-document-safelist',
    buildStart() {
      rebuild()
    },
    configureServer(server) {
      rebuild()
      for (const p of docs) server.watcher.add(p)
      const onChange = (file: string) => {
        if (docs.includes(resolve(file))) rebuild()
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
  }
}
