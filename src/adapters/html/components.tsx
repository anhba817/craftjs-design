import { useEffect, useState, type ComponentType, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@design/sdk'
import { iconElement } from '../_shared/lucide-icons'
import { useIsEditing } from '@design/sdk'
import { useOverlayStageTarget } from '@design/sdk'
import { OverlayCard } from '@design/sdk'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { containerMaxWidth, type ContainerProps } from '@/registry/components/container'
import { slideSlotKeys, type CarouselProps } from '@/registry/components/carousel'
import {
  tabSlotKeys,
  uniqueTabValues,
  type TabsProps,
} from '@/registry/components/tabs'
import { stepperSlotKey, type StepperProps } from '@/registry/components/stepper'
import {
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  type TableProps,
} from '@/registry/components/table'
import type { AdapterRenderProps } from '../types'

// Phase 16 § 7.2 — the plain-HTML adapter: every canonical rendered with
// semantic HTML + the editor's design tokens, no UI library.
//
// Why the baseline classes below: most canonicals ship empty default
// `style.classes` because in the shadcn / MUI adapters the *library
// component* supplies the look (cva variants, MUI styles). The plain-HTML
// impls have no such component, so each carries a sensible built-in look
// built from the same Tailwind design tokens the theme defines
// (`bg-primary`, `border-input`, `ring-ring`, `bg-card`, …). The token
// classes go FIRST in `cn(...)`; the author's composed `className` goes
// LAST, so tailwind-merge lets editor overrides win. A freshly-dropped
// component looks right; styling it in the inspector still works.
//
// Interactivity is best-effort: overlays render inline while editing and
// are gated by the overlay runtime store at runtime; triggers toggle the
// store on click; dynamic-canvas canonicals (tabs/stepper/carousel) show
// the active slot. (lucide-react is an icon set, not a UI framework, so
// icon-bearing impls use it directly.)

// --- shared helpers -------------------------------------------------------

// Trigger components (Button/Icon/Avatar/Badge/Image/Link/NavItem/Card)
// toggle their overlay-store entries on click at runtime; inert in editor.
function useHtmlTriggers(triggers: string[] | undefined): {
  onClick: (() => void) | undefined
  hasTriggers: boolean
} {
  const editing = useIsEditing()
  const toggle = useOverlayRuntime((s) => s.toggle)
  const list = triggers ?? []
  return {
    hasTriggers: list.length > 0,
    onClick: editing || list.length === 0 ? undefined : () => list.forEach(toggle),
  }
}

// Common root props for a tag rendering composed root class + inline style.
type Render = AdapterRenderProps

// Shared token recipes (mirror the shadcn primitives' look).
const FIELD_BASE =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const BUTTON_BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none h-8 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

const BUTTON_INTENT: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
}

const BADGE_BASE =
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const BADGE_INTENT: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border-border text-foreground',
}

// --- layout / structural (Pattern A: children) ---------------------------

export function HtmlBox({ children, rootRef, className, inlineStyle }: Render) {
  return <div ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</div>
}

// Stack/Grid/Container derive their layout from first-class props (not from
// default classes), exactly like the shadcn impls — composed here so a
// dropped Stack actually flexes and a Grid actually grids.
export function HtmlStack({ props, children, rootRef, className, inlineStyle }: Render) {
  const { direction, gap } = props as { direction: 'vertical' | 'horizontal'; gap: string }
  return (
    <div ref={rootRef} className={cn('flex', direction === 'vertical' ? 'flex-col' : 'flex-row', `gap-${gap}`, className)} style={inlineStyle}>
      {children}
    </div>
  )
}

export function HtmlGrid({ props, children, rootRef, className, inlineStyle }: Render) {
  const { cols, gap } = props as { cols: number; gap: string }
  return (
    <div
      ref={rootRef}
      className={cn('grid', `gap-${gap}`, className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...inlineStyle }}
    >
      {children}
    </div>
  )
}

export function HtmlContainer({ props, children, rootRef, className, inlineStyle }: Render) {
  const { maxWidth } = props as ContainerProps
  return (
    <div ref={rootRef} className={cn(className)} style={{ marginInline: 'auto', maxWidth: containerMaxWidth(maxWidth), ...inlineStyle }}>
      {children}
    </div>
  )
}

export function HtmlSection({ props, children, rootRef, className, inlineStyle }: Render) {
  const { ariaLabel } = props as { ariaLabel?: string }
  return (
    <section ref={rootRef} aria-label={ariaLabel || undefined} className={cn(className)} style={inlineStyle}>
      {children}
    </section>
  )
}

export function HtmlSpacer({ props, rootRef, className, inlineStyle }: Render) {
  const { size, axis } = props as { size: string; axis: string }
  const dim = ({ sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' } as Record<string, string>)[size] ?? '1rem'
  const style: CSSProperties = axis === 'horizontal' ? { width: dim } : { height: dim }
  return <div ref={rootRef} aria-hidden className={cn(className)} style={{ ...style, ...inlineStyle }} />
}

export function HtmlDivider({ props, rootRef, className, inlineStyle }: Render) {
  const { orientation } = props as { orientation: string }
  const vertical = orientation === 'vertical'
  return (
    <hr
      ref={rootRef as never}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={cn('border-border', vertical ? 'h-full border-l border-t-0' : 'w-full border-t', className)}
      style={inlineStyle}
    />
  )
}

// --- content / leaf -------------------------------------------------------

export function HtmlText({ props, rootRef, className, inlineStyle }: Render) {
  const { content } = props as { content: string }
  return <p ref={rootRef as never} className={cn(className)} style={inlineStyle}>{content}</p>
}

export function HtmlHeading({ props, rootRef, className, inlineStyle }: Render) {
  const { level, content } = props as { level: string; content: string }
  // Canonical `level` is '1'..'6' (not 'h1'); build the tag from it.
  const n = ['1', '2', '3', '4', '5', '6'].includes(level) ? level : '2'
  const Tag = `h${n}` as 'h2'
  return <Tag ref={rootRef as never} className={cn(className)} style={inlineStyle}>{content}</Tag>
}

export function HtmlCode({ props, rootRef, className, inlineStyle }: Render) {
  const { content } = props as { content: string }
  return (
    <pre ref={rootRef as never} className={cn('overflow-auto rounded-md bg-muted p-3 font-mono text-sm', className)} style={inlineStyle}>
      <code>{content}</code>
    </pre>
  )
}

export function HtmlLink({ props, rootRef, className, inlineStyle }: Render) {
  const { href, label, target, triggers } = props as { href: string; label: string; target: string; triggers?: string[] }
  const { onClick } = useHtmlTriggers(triggers)
  return (
    <a
      ref={rootRef as never}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn('text-primary underline-offset-4 hover:underline', className)}
      style={inlineStyle}
      onClick={(e) => {
        e.preventDefault()
        onClick?.()
      }}
    >
      {label}
    </a>
  )
}

export function HtmlImage({ props, rootRef, className, inlineStyle }: Render) {
  const { src, alt, triggers } = props as { src: string; alt: string; triggers?: string[] }
  const { onClick, hasTriggers } = useHtmlTriggers(triggers)
  return (
    <img
      ref={rootRef as never}
      src={src}
      alt={alt}
      onClick={onClick}
      className={cn('object-cover', hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    />
  )
}

export function HtmlIcon({ props, rootRef, className, inlineStyle }: Render) {
  const { name, size, triggers } = props as { name: string; size: string; triggers?: string[] }
  const px = ({ sm: 16, base: 20, lg: 24, xl: 32 } as Record<string, number>)[size] ?? 20
  const { onClick, hasTriggers } = useHtmlTriggers(triggers)
  return (
    <span
      ref={rootRef}
      onClick={onClick}
      className={cn('inline-flex', hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    >
      {iconElement(name, px)}
    </span>
  )
}

export function HtmlBadge({ props, rootRef, className, inlineStyle }: Render) {
  const { label, intent, triggers } = props as { label: string; intent: string; triggers?: string[] }
  const { onClick, hasTriggers } = useHtmlTriggers(triggers)
  return (
    <span
      ref={rootRef as never}
      onClick={onClick}
      className={cn(
        BADGE_BASE,
        BADGE_INTENT[intent] ?? BADGE_INTENT.primary,
        hasTriggers && 'cursor-pointer',
        className,
      )}
      style={inlineStyle}
    >
      {label}
    </span>
  )
}

export function HtmlAvatar({ props, rootRef, className, inlineStyle }: Render) {
  const { src, alt, fallback, triggers } = props as { src: string; alt: string; fallback: string; triggers?: string[] }
  const { onClick, hasTriggers } = useHtmlTriggers(triggers)
  return (
    <span
      ref={rootRef}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground',
        hasTriggers && 'cursor-pointer',
        className,
      )}
      style={inlineStyle}
    >
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : fallback}
    </span>
  )
}

export function HtmlButton({ props, rootRef, className, inlineStyle }: Render) {
  const { label, intent, disabled, triggers } = props as { label: string; intent: string; disabled: boolean; triggers?: string[] }
  const { onClick } = useHtmlTriggers(triggers)
  return (
    <button
      ref={rootRef as never}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(BUTTON_BASE, BUTTON_INTENT[intent] ?? BUTTON_INTENT.primary, className)}
      style={inlineStyle}
    >
      {label}
    </button>
  )
}

// --- form inputs (static preview: readOnly / no live state) ---------------

const NOOP = () => {}

export function HtmlInput({ props, rootRef, className, inlineStyle }: Render) {
  const { type, placeholder, value, disabled } = props as { type: string; placeholder: string; value: string; disabled: boolean }
  return (
    <input
      ref={rootRef as never}
      type={type}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      readOnly
      onChange={NOOP}
      className={cn(FIELD_BASE, className)}
      style={inlineStyle}
    />
  )
}

export function HtmlTextarea({ props, rootRef, className, inlineStyle }: Render) {
  const { placeholder, value, rows, disabled } = props as { placeholder: string; value: string; rows: number; disabled: boolean }
  return (
    <textarea
      ref={rootRef as never}
      placeholder={placeholder}
      value={value}
      rows={rows}
      disabled={disabled}
      readOnly
      onChange={NOOP}
      className={cn(FIELD_BASE, 'min-h-16 py-2', className)}
      style={inlineStyle}
    />
  )
}

export function HtmlCheckbox({ props, rootRef, className, inlineStyle }: Render) {
  const { label, checked, disabled } = props as { label: string; checked: boolean; disabled: boolean }
  return (
    <label ref={rootRef as never} className={cn('inline-flex items-center gap-2 text-sm', disabled && 'opacity-50', className)} style={inlineStyle}>
      <input type="checkbox" checked={checked} disabled={disabled} readOnly onChange={NOOP} className="size-4 accent-primary" />
      {label}
    </label>
  )
}

export function HtmlSwitch({ props, rootRef, className, inlineStyle }: Render) {
  const { label, checked, disabled } = props as { label: string; checked: boolean; disabled: boolean }
  return (
    <label ref={rootRef as never} className={cn('inline-flex items-center gap-2 text-sm', disabled && 'opacity-50', className)} style={inlineStyle}>
      <span
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent p-[2px] transition-colors',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span className={cn('block size-3.5 rounded-full bg-background shadow-sm transition-transform', checked && 'translate-x-[14px]')} />
      </span>
      {label}
    </label>
  )
}

export function HtmlRadio({ props, rootRef, className, inlineStyle }: Render) {
  const { name, options, selectedValue, disabled } = props as {
    name: string
    options: { value: string; label: string }[]
    selectedValue: string
    disabled: boolean
  }
  return (
    <fieldset ref={rootRef as never} className={cn('space-y-1 text-sm', disabled && 'opacity-50', className)} style={inlineStyle}>
      {(options ?? []).map((o) => (
        <label key={o.value} className="flex items-center gap-2">
          <input type="radio" name={name} value={o.value} checked={o.value === selectedValue} disabled={disabled} readOnly onChange={NOOP} className="size-4 accent-primary" />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export function HtmlSelect({ props, rootRef, className, inlineStyle }: Render) {
  const { options, defaultValue, disabled } = props as {
    options: { value: string; label: string }[]
    defaultValue: string
    disabled: boolean
  }
  return (
    <select
      ref={rootRef as never}
      defaultValue={defaultValue}
      disabled={disabled}
      className={cn(FIELD_BASE, 'w-fit', className)}
      style={inlineStyle}
    >
      {(options ?? []).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function HtmlDatePicker({ props, rootRef, className, inlineStyle }: Render) {
  const { value, min, max, disabled } = props as { value: string; min: string; max: string; disabled: boolean }
  const editing = useIsEditing()
  return (
    <input ref={rootRef as never} type="date" value={value} min={min || undefined} max={max || undefined}
      disabled={disabled} readOnly={editing} onChange={NOOP}
      className={cn(FIELD_BASE, 'w-fit', className)} style={inlineStyle} />
  )
}

export function HtmlTimePicker({ props, rootRef, className, inlineStyle }: Render) {
  const { value, min, max, disabled } = props as { value: string; min: string; max: string; disabled: boolean }
  const editing = useIsEditing()
  return (
    <input ref={rootRef as never} type="time" value={value} min={min || undefined} max={max || undefined}
      disabled={disabled} readOnly={editing} onChange={NOOP}
      className={cn(FIELD_BASE, 'w-fit', className)} style={inlineStyle} />
  )
}

export function HtmlDateRangePicker({ props, rootRef, className, inlineStyle }: Render) {
  const { start, end, min, max, disabled } = props as { start: string; end: string; min: string; max: string; disabled: boolean }
  const editing = useIsEditing()
  const a = { min: min || undefined, max: max || undefined, disabled, readOnly: editing, onChange: NOOP }
  return (
    <div ref={rootRef} className={cn('inline-flex items-center gap-2', className)} style={inlineStyle}>
      <input type="date" value={start} {...a} className={cn(FIELD_BASE, 'w-fit')} aria-label="Start date" />
      <span aria-hidden className="text-muted-foreground">–</span>
      <input type="date" value={end} {...a} className={cn(FIELD_BASE, 'w-fit')} aria-label="End date" />
    </div>
  )
}

// --- feedback -------------------------------------------------------------

const PROGRESS_SQUARE = 40
const PROGRESS_STROKE = 4
const PROGRESS_RADIUS = (PROGRESS_SQUARE - PROGRESS_STROKE) / 2
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS

export function HtmlProgress({ props, rootRef, className, inlineStyle }: Render) {
  const { value, variant } = props as { value: number; variant: string }
  const clamped = Math.max(0, Math.min(100, value))
  const a11y = { role: 'progressbar', 'aria-valuenow': clamped, 'aria-valuemin': 0, 'aria-valuemax': 100 } as const

  if (variant === 'circular') {
    const dash = (clamped / 100) * PROGRESS_CIRCUMFERENCE
    return (
      <div ref={rootRef} {...a11y} className={cn('inline-flex', className)} style={inlineStyle}>
        <svg width={PROGRESS_SQUARE} height={PROGRESS_SQUARE} viewBox={`0 0 ${PROGRESS_SQUARE} ${PROGRESS_SQUARE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={PROGRESS_SQUARE / 2} cy={PROGRESS_SQUARE / 2} r={PROGRESS_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={PROGRESS_STROKE} />
          <circle cx={PROGRESS_SQUARE / 2} cy={PROGRESS_SQUARE / 2} r={PROGRESS_RADIUS} fill="none" stroke="currentColor" strokeWidth={PROGRESS_STROKE} strokeLinecap="round" strokeDasharray={`${dash} ${PROGRESS_CIRCUMFERENCE - dash}`} className="text-primary" />
        </svg>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      {...a11y}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      style={inlineStyle}
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function HtmlSpinner({ rootRef, className, inlineStyle }: Render) {
  // The shared icon helper has no "loader" glyph, so render a pure-CSS ring;
  // its color follows the canonical's default `text-primary` (via className).
  return (
    <span
      ref={rootRef}
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={inlineStyle}
    />
  )
}

export function HtmlSkeleton({ props, rootRef, className, inlineStyle }: Render) {
  const { variant, width, height } = props as { variant: string; width: string; height: string }
  const radius = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-sm' : 'rounded-md'
  return <div ref={rootRef} aria-hidden className={cn('animate-pulse bg-muted', radius, className)} style={{ width, height, ...inlineStyle }} />
}

// --- media ----------------------------------------------------------------

export function HtmlVideo({ props, rootRef, className, inlineStyle }: Render) {
  const { src, poster, controls, autoplay, loop, muted } = props as {
    src: string; poster: string; controls: boolean; autoplay: boolean; loop: boolean; muted: boolean
  }
  const editing = useIsEditing()
  return (
    <video ref={rootRef as never} src={src} poster={poster || undefined} controls={controls}
      autoPlay={!editing && autoplay} loop={loop} muted={muted || (!editing && autoplay)}
      className={cn('rounded-md', className)} style={inlineStyle} />
  )
}

export function HtmlAudio({ props, rootRef, className, inlineStyle }: Render) {
  const { src, controls, autoplay, loop } = props as { src: string; controls: boolean; autoplay: boolean; loop: boolean }
  const editing = useIsEditing()
  return <audio ref={rootRef as never} src={src} controls={controls} autoPlay={!editing && autoplay} loop={loop} className={cn(className)} style={inlineStyle} />
}

// --- navigation -----------------------------------------------------------

export function HtmlBreadcrumb({ props, rootRef, className, inlineStyle }: Render) {
  const { items } = props as { items: { label: string; href: string }[] }
  const list = items ?? []
  return (
    <nav ref={rootRef} aria-label="Breadcrumb" className={cn(className)} style={inlineStyle}>
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {list.map((it, i) => {
          const last = i === list.length - 1
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-muted-foreground/60">/</span>}
              <a
                href={it.href}
                aria-current={last ? 'page' : undefined}
                className={last ? 'font-normal text-foreground' : 'hover:text-foreground'}
                onClick={(e) => e.preventDefault()}
              >
                {it.label}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Pages > 7 collapse the middle into an ellipsis (mirrors the shadcn impl).
function visiblePages(pageCount: number, current: number): Array<number | '…'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(pageCount - 1, current + 1)
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < pageCount - 1) out.push('…')
  out.push(pageCount)
  return out
}

const PAGE_BTN = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-input bg-background px-2 text-sm hover:bg-accent'
const PAGE_ACTIVE = 'border-primary bg-primary text-primary-foreground'

export function HtmlPagination({ props, rootRef, className, inlineStyle }: Render) {
  const { pageCount, currentPage } = props as { pageCount: number; currentPage: number }
  const pages = visiblePages(Math.max(0, pageCount), currentPage)
  return (
    <nav ref={rootRef} aria-label="Pagination" className={cn('flex items-center gap-1', className)} style={inlineStyle}>
      <button type="button" className={cn(PAGE_BTN)} aria-label="Previous">‹</button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <button key={p} type="button" aria-current={p === currentPage ? 'page' : undefined} className={cn(PAGE_BTN, p === currentPage && PAGE_ACTIVE)}>
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(PAGE_BTN)} aria-label="Next">›</button>
    </nav>
  )
}

export function HtmlNavMenu({ children, rootRef, className, inlineStyle }: Render) {
  return <nav ref={rootRef} className={cn('flex items-center gap-1', className)} style={inlineStyle}>{children}</nav>
}

export function HtmlNavItem({ props, children, rootRef, className, inlineStyle }: Render) {
  const { label, href, icon, triggers } = props as { label: string; href: string; icon: string; triggers?: string[] }
  const { onClick } = useHtmlTriggers(triggers)
  return (
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      <a
        href={href}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
        onClick={(e) => { e.preventDefault(); onClick?.() }}
      >
        {icon ? iconElement(icon, 16) : null}
        <span>{label}</span>
      </a>
      {children}
    </div>
  )
}

// --- Pattern B: slotted ---------------------------------------------------

export function HtmlCard({ rootRef, composedClasses = {}, composedInlineStyles = {}, slotChildren = {} }: Render) {
  return (
    <div
      ref={rootRef as never}
      className={cn('flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10', composedClasses.root)}
      style={composedInlineStyles.root}
    >
      <div className={cn('grid auto-rows-min items-start gap-1 px-4', composedClasses.header)} style={composedInlineStyles.header}>{slotChildren.header}</div>
      <div className={cn('px-4', composedClasses.body)} style={composedInlineStyles.body}>{slotChildren.body}</div>
      <div className={cn('flex items-center border-t bg-muted/50 px-4 pt-4', composedClasses.footer)} style={composedInlineStyles.footer}>{slotChildren.footer}</div>
    </div>
  )
}

export function HtmlDataList({ children, rootRef, className, inlineStyle }: Render) {
  return <dl ref={rootRef as never} className={cn('space-y-2', className)} style={inlineStyle}>{children}</dl>
}

export function HtmlDataListItem({ props, rootRef, className, inlineStyle }: Render) {
  const { term, description } = props as { term: string; description: string }
  return (
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      <dt className="text-xs font-medium text-muted-foreground">{term}</dt>
      <dd className="text-sm">{description}</dd>
    </div>
  )
}

export function HtmlTableCell({ children, rootRef, className, inlineStyle }: Render) {
  return <div ref={rootRef} className={cn('h-full w-full', className)} style={inlineStyle}>{children}</div>
}

export function HtmlTable({ props, rootRef, className, composedClasses = {}, composedInlineStyles = {}, slotChildren = {} }: Render) {
  const tp = props as TableProps
  const { rows, cols } = tp
  const merges = tp.merges ?? []
  return (
    <table ref={rootRef as never} className={cn('w-full border-collapse text-sm', composedClasses.root, className)} style={composedInlineStyles.root}>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }, (_, c) => {
              if (isCellCovered(r, c, merges, rows, cols)) return null
              const merge = containingMerge(r, c, merges, rows, cols)
              const slot = tableCellSlotKey(r, c)
              return (
                <td key={slot} colSpan={merge?.colSpan} rowSpan={merge?.rowSpan} className="border align-top p-0">
                  {slotChildren[slot]}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HtmlTabs({ props, rootRef, composedClasses = {}, composedInlineStyles = {}, slotChildren = {} }: Render) {
  const { tabs, defaultValue } = props as TabsProps
  const slotKeys = tabSlotKeys(tabs)
  const values = uniqueTabValues(tabs)
  const initial = Math.max(0, tabs.findIndex((t) => t.value === defaultValue))
  const [active, setActive] = useState(initial < 0 ? 0 : initial)
  const editing = useIsEditing()
  const shown = editing ? (initial < 0 ? 0 : initial) : active
  return (
    <div ref={rootRef as never} className={cn('flex flex-col gap-2', composedClasses.root)} style={composedInlineStyles.root}>
      <div role="tablist" className={cn('inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground', composedClasses.tabs)} style={composedInlineStyles.tabs}>
        {tabs.map((t, i) => (
          <button
            key={slotKeys[i]}
            role="tab"
            type="button"
            aria-selected={i === shown}
            onClick={editing ? undefined : () => setActive(i)}
            className={cn(
              'inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors',
              i === shown ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className={cn(composedClasses.content)} style={composedInlineStyles.content}>
        {slotChildren[slotKeys[shown]] ?? null}
        {/* keep value mapping referenced */}
        <span hidden>{values[shown]}</span>
      </div>
    </div>
  )
}

export function HtmlStepper({ props, rootRef, className, composedClasses = {}, composedInlineStyles = {}, slotChildren = {} }: Render) {
  const { steps, currentStep } = props as StepperProps
  const cur = Math.max(0, Math.min(currentStep, steps.length - 1))
  return (
    <div ref={rootRef as never} className={cn(composedClasses.root, className)} style={composedInlineStyles.root}>
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-1 items-center gap-2">
            <span className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
              i === cur && 'border-primary font-medium text-primary',
              i < cur && 'border-primary bg-primary text-primary-foreground',
            )}>{i + 1}</span>
            <span className={cn('font-medium', i > cur && 'text-muted-foreground')}>{s.label}</span>
            {i < steps.length - 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>
      <div>{slotChildren[stepperSlotKey(cur)]}</div>
    </div>
  )
}

export function HtmlCarousel({ props, rootRef, composedClasses = {}, composedInlineStyles = {}, slotChildren = {} }: Render) {
  const { slides, currentSlide, showDots } = props as CarouselProps
  const editing = useIsEditing()
  const keys = slideSlotKeys(slides ?? [])
  const total = keys.length
  const authored = Math.max(0, Math.min(total - 1, currentSlide))
  const [idx, setIdx] = useState(authored)
  const active = editing ? authored : Math.min(idx, total - 1)
  if (total === 0) return <div ref={rootRef as never} className={cn(composedClasses.root)} style={composedInlineStyles.root} />
  return (
    <div ref={rootRef as never} className={cn(composedClasses.root)} style={composedInlineStyles.root} aria-roledescription="carousel">
      <div className={cn(composedClasses.slide)} style={composedInlineStyles.slide}>{slotChildren[keys[active]]}</div>
      {showDots && (
        <div className={cn(composedClasses.controls)} style={composedInlineStyles.controls}>
          {keys.map((k, i) => (
            <button key={k} type="button" aria-label={`Go to slide ${i + 1}`}
              onClick={editing ? undefined : () => setIdx(i)}
              className={cn('h-2 w-2 rounded-full', i === active ? 'bg-primary' : 'bg-foreground/30')} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- overlays (editor: inline; runtime: gated by the overlay store) -------

function useOverlayVisible(name: string, defaultOpen: boolean): { editing: boolean; open: boolean } {
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  return { editing, open: readOverlayOpen(state, name, defaultOpen) }
}

// Close button shared by the portaled overlays.
function CloseX({ onClose }: { onClose: (() => void) | undefined }) {
  return (
    <button type="button" aria-label="Close" onClick={onClose} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent">
      <X size={14} aria-hidden />
    </button>
  )
}

const MODAL_SIZE: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  full: 'sm:max-w-[calc(100vw-2rem)]',
}

// Modal — editor portals a preview into the right-side OverlayStage (so the
// canvas layout isn't disturbed); runtime portals to <body> with a backdrop.
export function HtmlModal({ props, children, rootRef, className, inlineStyle }: Render) {
  const { title, description, size, name, defaultOpen } = props as { title: string; description: string; size: string; name: string; defaultOpen: boolean }
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()

  const dialogClass = cn('relative w-full rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg', MODAL_SIZE[size], className)
  const inner = (
    <>
      <CloseX onClose={editing ? undefined : () => setOpen(name, false)} />
      <div className="space-y-1 pr-6">
        <div className="text-lg font-semibold">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </>
  )

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Modal" name={name}>
        <div ref={rootRef as never} role="dialog" aria-modal="true" className={dialogClass} style={inlineStyle}>{inner}</div>
      </OverlayCard>,
      stageTarget,
    )
  }
  if (!isOpen) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(name, false)}>
      <div ref={rootRef as never} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={dialogClass} style={inlineStyle}>{inner}</div>
    </div>,
    document.body,
  )
}

const DRAWER_SIZE: Record<string, string> = { sm: '16rem', md: '24rem', lg: '32rem' }
const DRAWER_BORDER: Record<string, string> = { left: 'border-r', right: 'border-l', top: 'border-b', bottom: 'border-t' }
const DRAWER_POSITION: Record<string, string> = { left: 'inset-y-0 left-0', right: 'inset-y-0 right-0', top: 'inset-x-0 top-0', bottom: 'inset-x-0 bottom-0' }

export function HtmlDrawer({ props, children, rootRef, className, inlineStyle }: Render) {
  const { side, size, name, defaultOpen } = props as { side: string; size: string; name: string; defaultOpen: boolean }
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()
  const dim = DRAWER_SIZE[size] ?? '24rem'
  const horizontal = side === 'left' || side === 'right'

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label={`Drawer · ${side}`} name={name}>
        <div
          ref={rootRef as never}
          role="dialog"
          aria-label="Drawer"
          className={cn('relative bg-card text-card-foreground', DRAWER_BORDER[side], className)}
          style={{ ...inlineStyle, ...(horizontal ? { width: '100%', maxWidth: dim, minHeight: '12rem' } : { height: dim, width: '100%' }) }}
        >
          <CloseX onClose={undefined} />
          {children}
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }
  if (!isOpen) return null
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(name, false)}>
      <div
        ref={rootRef as never}
        role="dialog"
        aria-label="Drawer"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn('absolute bg-card text-card-foreground shadow-xl', DRAWER_POSITION[side], DRAWER_BORDER[side], className)}
        style={{ ...inlineStyle, ...(horizontal ? { width: dim, height: '100%' } : { height: dim, width: '100%' }) }}
      >
        <CloseX onClose={() => setOpen(name, false)} />
        {children}
      </div>
    </div>,
    document.body,
  )
}

const TOAST_ICON: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  error: CircleAlert,
}

export function HtmlToast({ props, rootRef, className, inlineStyle }: Render) {
  const { title, description, intent, name, defaultOpen } = props as { title: string; description: string; intent: string; name: string; defaultOpen: boolean }
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()
  const Icon = TOAST_ICON[intent] ?? Info

  const body = (
    <>
      <Icon size={18} className="mt-0.5 size-[18px] shrink-0" />
      <div className="space-y-0.5 pr-5">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <button type="button" aria-label="Dismiss" onClick={editing ? undefined : () => setOpen(name, false)} className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:bg-accent">
        <X size={12} aria-hidden />
      </button>
    </>
  )

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Toast" name={name}>
        <div ref={rootRef as never} role="status" aria-live="polite" className={cn('relative flex gap-2', className)} style={inlineStyle}>{body}</div>
      </OverlayCard>,
      stageTarget,
    )
  }
  if (!isOpen) return null
  return createPortal(
    <div ref={rootRef as never} role="status" aria-live="polite" className={cn('fixed bottom-4 right-4 z-50 flex max-w-sm gap-2 rounded-md border bg-card p-3 shadow-lg', className)} style={inlineStyle}>{body}</div>,
    document.body,
  )
}

const ALERT_ICON: Record<string, ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
  success: CircleCheck,
}

export function HtmlAlert({ props, rootRef, className, inlineStyle }: Render) {
  const { intent, title, description, name, defaultOpen } = props as { intent: string; title: string; description: string; name: string; defaultOpen: boolean }
  const { editing, open } = useOverlayVisible(name, defaultOpen)
  if (!editing && !open) return null
  const Icon = ALERT_ICON[intent] ?? Info
  return (
    <div
      ref={rootRef as never}
      role="alert"
      className={cn(
        'relative grid w-full grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-lg border px-3 py-2.5 text-left text-sm',
        intent === 'error' ? 'bg-card text-destructive' : 'bg-card text-card-foreground',
        className,
      )}
      style={inlineStyle}
    >
      <Icon className="size-4 translate-y-0.5" />
      <div className="col-start-2 font-medium">{title}</div>
      {description && <div className="col-start-2 text-sm text-muted-foreground">{description}</div>}
    </div>
  )
}

// Tooltip / Popover — designer-only. Like the shadcn impls, they render a
// labeled preview in the right-side OverlayStage (not the main canvas) and
// register their content into the overlay runtime store under `name` so a
// trigger can consume it; at runtime the node itself renders nothing.
export function HtmlTooltip({ props, rootRef, className, inlineStyle }: Render) {
  const { content, name } = props as { content: string; name: string }
  const editing = useIsEditing()
  const register = useOverlayRuntime((s) => s.register)
  const unregister = useOverlayRuntime((s) => s.unregister)
  const stageTarget = useOverlayStageTarget()
  useEffect(() => {
    register(name, { kind: 'tooltip', text: content })
    return () => unregister(name)
  }, [name, content, register, unregister])
  if (!editing || !stageTarget) return null
  return createPortal(
    <OverlayCard label="Tooltip" name={name}>
      <div ref={rootRef} className={cn('inline-block', className)} style={inlineStyle}>{content}</div>
    </OverlayCard>,
    stageTarget,
  )
}

export function HtmlPopover({ props, children, rootRef, className, inlineStyle }: Render) {
  const { name } = props as { name: string }
  const editing = useIsEditing()
  const register = useOverlayRuntime((s) => s.register)
  const unregister = useOverlayRuntime((s) => s.unregister)
  const stageTarget = useOverlayStageTarget()
  useEffect(() => {
    register(name, { kind: 'popover', content: children })
    return () => unregister(name)
  }, [name, children, register, unregister])
  if (!editing || !stageTarget) return null
  return createPortal(
    <OverlayCard label="Popover" name={name}>
      <div ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</div>
    </OverlayCard>,
    stageTarget,
  )
}
