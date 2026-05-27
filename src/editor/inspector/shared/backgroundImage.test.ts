import { describe, expect, it } from 'vitest'
import { parseBgUrl, toBgUrl } from './backgroundImage'

describe('background-image url (de)serialization', () => {
  it('toBgUrl wraps in url("…")', () => {
    expect(toBgUrl('https://x/a.png')).toBe('url("https://x/a.png")')
  })

  it('parseBgUrl unwraps double-quoted', () => {
    expect(parseBgUrl('url("https://x/a.png")')).toBe('https://x/a.png')
  })

  it('parseBgUrl unwraps single-quoted + unquoted', () => {
    expect(parseBgUrl("url('https://x/a.png')")).toBe('https://x/a.png')
    expect(parseBgUrl('url(https://x/a.png)')).toBe('https://x/a.png')
  })

  it('parseBgUrl handles a data URL (no inner parens)', () => {
    const dataUrl = 'data:image/png;base64,AAAA'
    expect(parseBgUrl(toBgUrl(dataUrl))).toBe(dataUrl)
  })

  it('round-trips through toBgUrl → parseBgUrl', () => {
    const url = 'https://cdn.example/hero.jpg'
    expect(parseBgUrl(toBgUrl(url))).toBe(url)
  })

  it('parseBgUrl returns "" for empty / non-url input', () => {
    expect(parseBgUrl(undefined)).toBe('')
    expect(parseBgUrl('')).toBe('')
    expect(parseBgUrl('linear-gradient(...)')).toBe('')
  })
})
