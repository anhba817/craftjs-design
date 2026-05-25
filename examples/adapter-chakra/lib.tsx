// Minimal "chakra-like" primitive library. Replace with `@chakra-ui/react` for
// real Chakra integration — the surfaces this exports are intentionally a
// subset of Chakra's API names so the swap is mechanical.
//
// This file exists so the example compiles and runs without installing the
// real Chakra packages (which would add ~30MB of node_modules for what is
// fundamentally a documentation artifact). The visual style is deliberately
// distinct from shadcn/MUI (teal accent, rounded surfaces) so the adapter
// swap in the editor is visually obvious.

import type { CSSProperties, JSX, ReactNode, Ref } from 'react'

const accent = '#319795'
const bg = '#f7fafc'

interface CommonProps {
  ref?: Ref<HTMLDivElement>
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function ChakraBox({ ref, className, style, children }: CommonProps) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        borderRadius: 12,
        padding: 16,
        background: bg,
        color: '#1a202c',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface ChakraButtonProps extends CommonProps {
  variant?: 'solid' | 'outline' | 'ghost'
  onClick?: () => void
  disabled?: boolean
}

export function ChakraButton({
  ref,
  className,
  style,
  children,
  variant = 'solid',
  onClick,
  disabled,
}: ChakraButtonProps) {
  const base: CSSProperties = {
    borderRadius: 999,
    padding: '8px 20px',
    fontWeight: 600,
    fontSize: 14,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
  const variants: Record<string, CSSProperties> = {
    solid: { background: accent, color: '#fff' },
    outline: { background: 'transparent', color: accent, border: `2px solid ${accent}` },
    ghost: { background: 'transparent', color: accent },
  }
  return (
    <button
      ref={ref as never}
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

interface ChakraHeadingProps extends CommonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  // React 19 removed the global JSX namespace; import it as a type from React.
  as?: keyof JSX.IntrinsicElements
}

const HEADING_SIZE: Record<string, number> = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 36,
  '3xl': 48,
}

export function ChakraHeading({
  ref,
  className,
  style,
  children,
  size = 'lg',
  as = 'h2',
}: ChakraHeadingProps) {
  const Tag = as as 'h2'
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        fontSize: HEADING_SIZE[size],
        fontWeight: 700,
        color: '#234e52',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

interface ChakraStackProps extends CommonProps {
  direction?: 'row' | 'column'
  gap?: number
}

export function ChakraStack({
  ref,
  className,
  style,
  children,
  direction = 'column',
  gap = 8,
}: ChakraStackProps) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function ChakraCardRoot({ ref, className, style, children }: CommonProps) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function ChakraCardHeader({ className, style, children }: CommonProps) {
  return (
    <div
      className={className}
      style={{
        padding: '16px 20px',
        borderBottom: `1px solid #e2e8f0`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function ChakraCardBody({ className, style, children }: CommonProps) {
  return (
    <div className={className} style={{ padding: '16px 20px', ...style }}>
      {children}
    </div>
  )
}

export function ChakraCardFooter({ className, style, children }: CommonProps) {
  return (
    <div
      className={className}
      style={{
        padding: '12px 20px',
        background: bg,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
