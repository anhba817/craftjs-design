import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { OklchPicker } from '@/editor/inspector/shared/OklchPicker'
import { useEditorStore } from '@/state/editorStore'
import {
  buildThemeCss,
  PREVIEW_THEME_ID,
  slugifyThemeId,
} from '@/themes/editor'
import {
  getTheme,
  registerTheme,
  unregisterTheme,
  upsertTheme,
} from '@/themes/registry'
import type { ThemeTokens } from '@/themes/tokens'

// Phase 12 § 4.10 — visual theme editor. Pick base colors per scheme →
// Group D's deriveTokens fills the rest → live preview on the canvas (via a
// transient PREVIEW_THEME_ID theme switched in while the dialog is open) →
// save as a real theme (Group D token API) → export the CSS block.

type Variant = 'light' | 'dark'

const COLOR_FIELDS: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryForeground', label: 'Primary text' },
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Foreground' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'destructive', label: 'Destructive' },
]

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="space-y-1 text-xs">
      <div className="text-gray-600">{label}</div>
      <div className="flex items-center gap-1.5">
        <OklchPicker value={value} onChange={(v) => onChange(v)} />
        <input
          type="text"
          value={value ?? ''}
          placeholder="auto (derived)"
          onChange={(e) => onChange(e.target.value || undefined)}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 font-mono text-[11px] text-gray-700"
        />
      </div>
    </div>
  )
}

function PreviewStrip({ variant }: { variant: Variant }) {
  // Sample components painted with the preview theme's tokens. The
  // PREVIEW_THEME_ID block is injected globally; this wrapper opts in via
  // data-theme (+ .dark for the dark variant).
  return (
    <div
      data-theme={PREVIEW_THEME_ID}
      className={cn(variant === 'dark' && 'dark')}
    >
      <div className="space-y-2 overflow-hidden rounded-lg border bg-background p-3 text-foreground">
        <div className="text-sm font-medium">Aa Heading</div>
        <p className="text-xs text-muted-foreground">
          Muted body copy over the background.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
            Primary
          </span>
          <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            Secondary
          </span>
          <span className="rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
            Accent
          </span>
          <span className="rounded bg-destructive px-2 py-1 text-xs text-white">
            Destructive
          </span>
        </div>
      </div>
    </div>
  )
}

export function ThemeEditorDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const setActiveTheme = useEditorStore((s) => s.setActiveTheme)
  const prevThemeRef = useRef('default')

  const [name, setName] = useState('My Theme')
  const [enableDark, setEnableDark] = useState(true)
  const [tab, setTab] = useState<Variant>('light')
  const [light, setLight] = useState<ThemeTokens>({
    primary: 'oklch(0.55 0.2 255)',
  })
  const [dark, setDark] = useState<ThemeTokens>({
    primary: 'oklch(0.7 0.16 255)',
  })
  const [radius, setRadius] = useState('')
  const [copied, setCopied] = useState(false)

  // On open: snapshot the active theme so we can restore it on cancel.
  // On close: drop the preview theme + restore (or, after save, restore to
  // the freshly-saved theme — save updates prevThemeRef).
  useEffect(() => {
    if (!open) return
    prevThemeRef.current = useEditorStore.getState().activeThemeId
    return () => {
      unregisterTheme(PREVIEW_THEME_ID)
      setActiveTheme(prevThemeRef.current)
    }
  }, [open, setActiveTheme])

  // Live preview: re-upsert the transient theme whenever the tokens change
  // and switch the canvas to it.
  useEffect(() => {
    if (!open) return
    const withRadius = (t: ThemeTokens): ThemeTokens =>
      radius ? { ...t, radius } : t
    upsertTheme({
      id: PREVIEW_THEME_ID,
      displayName: 'Preview',
      dataThemeValue: PREVIEW_THEME_ID,
      tokens: withRadius(light),
      darkTokens: enableDark ? withRadius(dark) : undefined,
    })
    setActiveTheme(PREVIEW_THEME_ID)
  }, [open, light, dark, enableDark, radius, setActiveTheme])

  const variant = tab
  const tokens = variant === 'light' ? light : dark
  const setTokens = variant === 'light' ? setLight : setDark
  const setField = (key: keyof ThemeTokens, value: string | undefined) =>
    setTokens((t) => ({ ...t, [key]: value }))

  const withRadius = (t: ThemeTokens): ThemeTokens =>
    radius ? { ...t, radius } : t
  const exportCss = () => {
    const id = slugifyThemeId(name) || 'custom-theme'
    return buildThemeCss(
      id,
      withRadius(light),
      enableDark ? withRadius(dark) : undefined,
    )
  }

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(exportCss())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (permissions / no gesture). Silent.
    }
  }

  const downloadCss = () => {
    const id = slugifyThemeId(name) || 'custom-theme'
    const blob = new Blob([exportCss()], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${id}.css`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const save = () => {
    const id = slugifyThemeId(name)
    if (!id) return
    unregisterTheme(PREVIEW_THEME_ID)
    if (getTheme(id)) unregisterTheme(id) // overwrite an existing custom theme
    registerTheme({
      id,
      displayName: name,
      dataThemeValue: id,
      tokens: withRadius(light),
      darkTokens: enableDark ? withRadius(dark) : undefined,
    })
    // Cleanup effect restores to prevThemeRef on close — point it at the
    // saved theme so we land there, then close.
    prevThemeRef.current = id
    setActiveTheme(id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Theme editor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-5">
          {/* Left: controls */}
          <div className="min-w-0 space-y-3">
            <label className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-gray-600">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
              />
            </label>

            <div className="flex items-center justify-between">
              <div className="flex rounded border border-gray-200 bg-gray-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTab('light')}
                  className={cn(
                    'rounded px-2 py-0.5 transition-colors',
                    tab === 'light'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTab('dark')}
                  disabled={!enableDark}
                  className={cn(
                    'rounded px-2 py-0.5 transition-colors disabled:opacity-40',
                    tab === 'dark'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  Dark
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={enableDark}
                  onChange={(e) => {
                    setEnableDark(e.target.checked)
                    if (!e.target.checked) setTab('light')
                  }}
                />
                Dark variant
              </label>
            </div>

            <div className="space-y-1.5">
              {COLOR_FIELDS.map((f) => (
                <ColorField
                  key={f.key}
                  label={f.label}
                  value={tokens[f.key]}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
              <label className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-gray-600">Radius</span>
                <input
                  type="text"
                  value={radius}
                  placeholder="0.625rem"
                  onChange={(e) => setRadius(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 font-mono text-[11px] text-gray-700"
                />
              </label>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="min-w-0 space-y-3">
            <div className="text-xs font-medium text-gray-600">
              Preview ({variant})
            </div>
            <PreviewStrip variant={variant} />
            <p className="text-[10px] text-gray-400">
              The canvas behind this dialog also previews the theme live.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={copyCss}
              className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
            >
              {copied ? 'Copied!' : 'Copy CSS'}
            </button>
            <button
              type="button"
              onClick={downloadCss}
              className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
            >
              Download .css
            </button>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!slugifyThemeId(name)}
              className="rounded bg-primary px-3 py-1 text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Save theme
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
