import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { scaffold, toKebab, toPascal, toTitle } from './index'

// Phase 20 — CLI scaffolder unit tests. Pure casing + structural output
// (fast, no registry side effects). The compile gate that typechecks the
// generated code against the real SDK lives in `npm run check:cli`.

describe('name casing', () => {
  it('kebab/pascal/title from a spaced name', () => {
    expect(toKebab('My Design System')).toBe('my-design-system')
    expect(toPascal('My Design System')).toBe('MyDesignSystem')
    expect(toTitle('My Design System')).toBe('My Design System')
  })
  it('kebab/pascal from camelCase and mixed separators', () => {
    expect(toKebab('pricingTable')).toBe('pricing-table')
    expect(toPascal('pricing_table')).toBe('PricingTable')
    expect(toKebab('  Seo--Meta  ')).toBe('seo-meta')
  })
})

const TMP = mkdtempSync(join(tmpdir(), 'cli-scaffold-'))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

function allFiles(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? allFiles(p, base) : [p.slice(base.length + 1)]
  })
}

describe('scaffold()', () => {
  it('adapter → a named folder with index, Wrapper, two impls, test, README', () => {
    const { files, outDir } = scaffold('adapter', 'My Design System', {
      out: TMP,
      force: true,
    })
    expect(outDir.endsWith('my-design-system')).toBe(true)
    const rel = allFiles(join(TMP, 'my-design-system')).sort()
    expect(rel).toEqual(
      [
        'README.md',
        'Wrapper.tsx',
        'components/Box.tsx',
        'components/Button.tsx',
        'index.ts',
        'my-design-system.test.ts',
      ].sort(),
    )
    expect(files).toHaveLength(6)
    const index = readFileSync(join(TMP, 'my-design-system/index.ts'), 'utf8')
    expect(index).toContain("id: 'my-design-system'")
    expect(index).toContain('MyDesignSystemWrapper')
    expect(index).toContain("from '@crafted-design/editor/sdk'")
  })

  it('canonical → a single id-named module + test, importing the SDK', () => {
    scaffold('canonical', 'pricing-table', { out: TMP, force: true })
    const mod = readFileSync(join(TMP, 'pricing-table.ts'), 'utf8')
    expect(mod).toContain("id: 'pricing-table'")
    expect(mod).toContain('PricingTableProps')
    expect(mod).toContain("registerComponent")
    expect(readFileSync(join(TMP, 'pricing-table.test.ts'), 'utf8')).toContain(
      "getComponent('pricing-table')",
    )
  })

  it('panel → a PascalCase-named component module + test', () => {
    scaffold('panel', 'seo-meta', { out: TMP, force: true })
    const mod = readFileSync(join(TMP, 'SeoMetaPanel.tsx'), 'utf8')
    expect(mod).toContain("id: 'seo-meta'")
    expect(mod).toContain('function SeoMetaPanel')
    expect(mod).toContain('registerPanel')
  })

  it('leaves NO unsubstituted __token__ placeholders in any output', () => {
    scaffold('adapter', 'foo', { out: TMP, force: true })
    scaffold('canonical', 'bar', { out: TMP, force: true })
    scaffold('panel', 'baz', { out: TMP, force: true })
    for (const rel of allFiles(TMP)) {
      const text = readFileSync(join(TMP, rel), 'utf8')
      expect(text, `${rel} has an unsubstituted token`).not.toMatch(/__(id|Name|title)__/)
    }
  })

  it('refuses to overwrite without --force', () => {
    scaffold('canonical', 'dupe', { out: TMP, force: true })
    expect(() => scaffold('canonical', 'dupe', { out: TMP, force: false })).toThrow(
      /already exists/,
    )
  })

  it('rejects a name that has no usable characters', () => {
    expect(() => scaffold('canonical', '---', { out: TMP, force: true })).toThrow(/invalid name/)
  })
})
