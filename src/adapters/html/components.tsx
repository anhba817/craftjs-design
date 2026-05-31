import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { iconElement } from '../_shared/lucide-icons'
import { useIsEditing } from '../../editor/canvas/useIsEditing'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@/state/overlayRuntimeStore'
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
// semantic HTML + the editor's composed Tailwind classes, no UI library.
// The minimum-viable target for hosts that don't want a design system, and
// the dependency-free reference proving the adapter SDK end to end.
//
// Interactivity is best-effort: overlays render inline while editing and
// are gated by the overlay runtime store at runtime; triggers toggle the
// store on click; dynamic-canvas canonicals (tabs/stepper/carousel) show
// the active slot. (lucide-react is an icon set, not a UI framework, so
// Icon reuses the shared icon helper.)

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

// --- layout / structural (Pattern A: children) ---------------------------

export function HtmlBox({ children, rootRef, className, inlineStyle }: Render) {
  return <div ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</div>
}
export const HtmlStack = HtmlBox
export const HtmlGrid = HtmlBox
export const HtmlContainer = HtmlBox

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
  return (
    <hr
      ref={rootRef as never}
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      className={cn(className)}
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
  const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level) ? level : 'h2') as 'h2'
  return <Tag ref={rootRef as never} className={cn(className)} style={inlineStyle}>{content}</Tag>
}

export function HtmlCode({ props, rootRef, className, inlineStyle }: Render) {
  const { content } = props as { content: string }
  return (
    <pre ref={rootRef as never} className={cn('overflow-auto', className)} style={inlineStyle}>
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
      className={cn(className)}
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
  const { label, triggers } = props as { label: string; triggers?: string[] }
  const { onClick, hasTriggers } = useHtmlTriggers(triggers)
  return (
    <span
      ref={rootRef as never}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
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
        'inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm',
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
  const { label, disabled, triggers } = props as { label: string; disabled: boolean; triggers?: string[] }
  const { onClick } = useHtmlTriggers(triggers)
  return (
    <button
      ref={rootRef as never}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50',
        className,
      )}
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
      className={cn('rounded-md border px-2 py-1 text-sm', className)}
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
      className={cn('rounded-md border px-2 py-1 text-sm', className)}
      style={inlineStyle}
    />
  )
}

export function HtmlCheckbox({ props, rootRef, className, inlineStyle }: Render) {
  const { label, checked, disabled } = props as { label: string; checked: boolean; disabled: boolean }
  return (
    <label ref={rootRef as never} className={cn('inline-flex items-center gap-2 text-sm', className)} style={inlineStyle}>
      <input type="checkbox" checked={checked} disabled={disabled} readOnly onChange={NOOP} />
      {label}
    </label>
  )
}

export function HtmlSwitch({ props, rootRef, className, inlineStyle }: Render) {
  const { label, checked, disabled } = props as { label: string; checked: boolean; disabled: boolean }
  return (
    <label ref={rootRef as never} className={cn('inline-flex items-center gap-2 text-sm', className)} style={inlineStyle}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} readOnly onChange={NOOP} />
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
    <fieldset ref={rootRef as never} className={cn('space-y-1 text-sm', className)} style={inlineStyle}>
      {(options ?? []).map((o) => (
        <label key={o.value} className="flex items-center gap-2">
          <input type="radio" name={name} value={o.value} checked={o.value === selectedValue} disabled={disabled} readOnly onChange={NOOP} />
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
      className={cn('rounded-md border px-2 py-1 text-sm', className)}
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
      className={cn('rounded-md border px-2 py-1 text-sm', className)} style={inlineStyle} />
  )
}

export function HtmlTimePicker({ props, rootRef, className, inlineStyle }: Render) {
  const { value, min, max, disabled } = props as { value: string; min: string; max: string; disabled: boolean }
  const editing = useIsEditing()
  return (
    <input ref={rootRef as never} type="time" value={value} min={min || undefined} max={max || undefined}
      disabled={disabled} readOnly={editing} onChange={NOOP}
      className={cn('rounded-md border px-2 py-1 text-sm', className)} style={inlineStyle} />
  )
}

export function HtmlDateRangePicker({ props, rootRef, className, inlineStyle }: Render) {
  const { start, end, min, max, disabled } = props as { start: string; end: string; min: string; max: string; disabled: boolean }
  const editing = useIsEditing()
  const a = { min: min || undefined, max: max || undefined, disabled, readOnly: editing, onChange: NOOP }
  return (
    <div ref={rootRef} className={cn('inline-flex items-center gap-2', className)} style={inlineStyle}>
      <input type="date" value={start} {...a} className="rounded-md border px-2 py-1 text-sm" aria-label="Start date" />
      <span aria-hidden>–</span>
      <input type="date" value={end} {...a} className="rounded-md border px-2 py-1 text-sm" aria-label="End date" />
    </div>
  )
}

// --- feedback -------------------------------------------------------------

export function HtmlProgress({ props, rootRef, className, inlineStyle }: Render) {
  const { value } = props as { value: number }
  const clamped = Math.max(0, Math.min(100, value))
  return <progress ref={rootRef as never} value={clamped} max={100} className={cn(className)} style={inlineStyle} />
}

export function HtmlSpinner({ rootRef, className, inlineStyle }: Render) {
  return (
    <span ref={rootRef} role="status" aria-label="Loading" className={cn('inline-flex', className)} style={inlineStyle}>
      {iconElement('loader-2', 20)}
    </span>
  )
}

export function HtmlSkeleton({ props, rootRef, className, inlineStyle }: Render) {
  const { variant, width, height } = props as { variant: string; width: string; height: string }
  const radius = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-sm' : 'rounded-md'
  return <div ref={rootRef} aria-hidden className={cn('bg-muted', radius, className)} style={{ width, height, ...inlineStyle }} />
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
      className={cn(className)} style={inlineStyle} />
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
  return (
    <nav ref={rootRef} aria-label="Breadcrumb" className={cn(className)} style={inlineStyle}>
      <ol className="flex items-center gap-1.5 text-sm">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-muted-foreground">/</span>}
            <a href={it.href} onClick={(e) => e.preventDefault()}>{it.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function HtmlPagination({ props, rootRef, className, inlineStyle }: Render) {
  const { pageCount, currentPage } = props as { pageCount: number; currentPage: number }
  return (
    <nav ref={rootRef} aria-label="Pagination" className={cn('flex items-center gap-1', className)} style={inlineStyle}>
      {Array.from({ length: Math.max(0, pageCount) }, (_, i) => (
        <span
          key={i}
          aria-current={i + 1 === currentPage ? 'page' : undefined}
          className={cn(
            'inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-sm',
            i + 1 === currentPage && 'bg-primary text-primary-foreground',
          )}
        >
          {i + 1}
        </span>
      ))}
    </nav>
  )
}

export function HtmlNavMenu({ children, rootRef, className, inlineStyle }: Render) {
  return <nav ref={rootRef} className={cn(className)} style={inlineStyle}>{children}</nav>
}

export function HtmlNavItem({ props, children, rootRef, className, inlineStyle }: Render) {
  const { label, href, icon, triggers } = props as { label: string; href: string; icon: string; triggers?: string[] }
  const { onClick } = useHtmlTriggers(triggers)
  return (
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      <a href={href} className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); onClick?.() }}>
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
    <div ref={rootRef as never} className={cn('rounded-lg border', composedClasses.root)} style={composedInlineStyles.root}>
      <div className={cn(composedClasses.header)} style={composedInlineStyles.header}>{slotChildren.header}</div>
      <div className={cn(composedClasses.body)} style={composedInlineStyles.body}>{slotChildren.body}</div>
      <div className={cn(composedClasses.footer)} style={composedInlineStyles.footer}>{slotChildren.footer}</div>
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
    <div ref={rootRef as never} className={cn(composedClasses.root)} style={composedInlineStyles.root}>
      <div role="tablist" className={cn('flex gap-1 border-b', composedClasses.tabs)} style={composedInlineStyles.tabs}>
        {tabs.map((t, i) => (
          <button
            key={slotKeys[i]}
            role="tab"
            type="button"
            aria-selected={i === shown}
            onClick={editing ? undefined : () => setActive(i)}
            className={cn('px-3 py-1.5 text-sm', i === shown && 'border-b-2 border-primary font-medium')}
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
      <ol className="flex items-start gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-1 items-center gap-2">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-xs',
              i === cur && 'border-primary font-medium text-primary', i < cur && 'bg-primary text-primary-foreground')}>{i + 1}</span>
            <span className="font-medium">{s.label}</span>
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

export function HtmlModal({ props, children, rootRef, className, inlineStyle }: Render) {
  const { title, description, name, defaultOpen } = props as { title: string; description: string; name: string; defaultOpen: boolean }
  const { editing, open } = useOverlayVisible(name, defaultOpen)
  if (!editing && !open) return null
  return (
    <div ref={rootRef as never} role="dialog" aria-modal="true" className={cn('rounded-lg border bg-popover p-4 shadow-lg', className)} style={inlineStyle}>
      <div className="text-lg font-semibold">{title}</div>
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function HtmlDrawer({ props, children, rootRef, className, inlineStyle }: Render) {
  const { name, defaultOpen } = props as { name: string; defaultOpen: boolean }
  const { editing, open } = useOverlayVisible(name, defaultOpen)
  if (!editing && !open) return null
  return <div ref={rootRef as never} role="dialog" aria-label="Drawer" className={cn('border bg-card p-4', className)} style={inlineStyle}>{children}</div>
}

export function HtmlToast({ props, rootRef, className, inlineStyle }: Render) {
  const { title, description, name, defaultOpen } = props as { title: string; description: string; name: string; defaultOpen: boolean }
  const { editing, open } = useOverlayVisible(name, defaultOpen)
  if (!editing && !open) return null
  return (
    <div ref={rootRef as never} role="status" aria-live="polite" className={cn('rounded-md border bg-card p-3 shadow', className)} style={inlineStyle}>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
  )
}

export function HtmlAlert({ props, rootRef, className, inlineStyle }: Render) {
  const { title, description, name, defaultOpen } = props as { title: string; description: string; name: string; defaultOpen: boolean }
  const { editing, open } = useOverlayVisible(name, defaultOpen)
  if (!editing && !open) return null
  return (
    <div ref={rootRef as never} role="alert" className={cn('rounded-md border p-3', className)} style={inlineStyle}>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
    </div>
  )
}

export function HtmlTooltip({ props, rootRef, className, inlineStyle }: Render) {
  // Designer-only canonical: render its text content; the trigger shows it
  // via the title attribute at runtime (see Button/Icon triggers).
  const { content } = props as { content: string }
  const editing = useIsEditing()
  if (!editing) return null
  return <div ref={rootRef} className={cn('inline-block rounded border bg-card px-2 py-1 text-sm', className)} style={inlineStyle}>{content}</div>
}

export function HtmlPopover({ children, rootRef, className, inlineStyle }: Render) {
  const editing = useIsEditing()
  if (!editing) return null
  return <div ref={rootRef} className={cn('rounded-md border bg-popover p-3 text-sm shadow', className)} style={inlineStyle}>{children}</div>
}
