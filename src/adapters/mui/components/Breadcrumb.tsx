import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import MuiLink from '@mui/material/Link'
import MuiTypography from '@mui/material/Typography'
import type { BreadcrumbProps } from '@/registry/components/breadcrumb'
import type { AdapterRenderProps } from '../../types'

// MUI Breadcrumbs ships a built-in separator + spacing. The last item or
// any item without an href renders as plain typography (signals the
// current page); others are links.
export function MaterialBreadcrumb({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { items } = props as BreadcrumbProps
  return (
    <MuiBreadcrumbs
      ref={rootRef as never}
      aria-label="breadcrumb"
      className={className}
      style={inlineStyle}
    >
      {items.map((it, i) =>
        it.href ? (
          <MuiLink key={i} underline="hover" color="inherit" href={it.href}>
            {it.label}
          </MuiLink>
        ) : (
          <MuiTypography key={i} color="text.primary" aria-current="page">
            {it.label}
          </MuiTypography>
        ),
      )}
    </MuiBreadcrumbs>
  )
}
