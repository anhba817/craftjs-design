import { useEditor } from '@craftjs/core'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/state/editorStore'
import {
  contrastGrade,
  contrastRatio,
  resolveCssColorToRgb,
  resolveEffectiveBackground,
  resolveElementTextColor,
} from './contrast'

// Phase 12 § 4.14 — live AA/AAA/fail badge for a text color over its
// effective background. `fg` is the explicitly-chosen color (hex, or
// `var(--token)` / `var(--brand)`); when it's null (color is inherited /
// unset) the node's own *computed* text color is used instead, so the badge
// is always meaningful. The background is read off the node's rendered DOM
// by walking ancestors. Recomputes when the chosen color, theme, or
// breakpoint changes (those swap the resolved token/var colors).
export function ContrastBadge({
  fg,
  nodeId,
}: {
  fg: string | null
  nodeId: string | undefined
}) {
  const { query } = useEditor()
  const activeThemeId = useEditorStore((s) => s.activeThemeId)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  const result = useMemo(() => {
    if (!nodeId) return null
    let dom: HTMLElement | undefined
    try {
      dom = query.node(nodeId).get().dom ?? undefined
    } catch {
      dom = undefined
    }
    if (!dom) return null
    // Explicit pick → resolve that exact color (no DOM-update timing race);
    // otherwise fall back to the element's inherited computed text color.
    const fgRgb = fg ? resolveCssColorToRgb(fg) : resolveElementTextColor(dom)
    if (!fgRgb) return null
    const bgRgb = resolveEffectiveBackground(dom)
    if (!bgRgb) return { ratio: null as number | null }
    const ratio = contrastRatio(fgRgb, bgRgb)
    return { ratio, grade: contrastGrade(ratio) }
    // activeThemeId/activeBreakpoint are deps so the badge re-resolves
    // token/var colors after a theme or breakpoint switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fg, nodeId, activeThemeId, activeBreakpoint, query])

  if (!result) return null

  if (result.ratio == null) {
    return (
      <div className="text-[10px] text-gray-400">contrast: unknown background</div>
    )
  }

  const grade = result.grade!
  const tone =
    grade === 'Fail'
      ? 'bg-red-100 text-red-700'
      : grade === 'AA Large'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700'

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
      <span className={cn('rounded px-1 py-0.5 font-medium', tone)}>{grade}</span>
      <span className="tabular-nums">{result.ratio.toFixed(2)}:1 contrast</span>
    </div>
  )
}
