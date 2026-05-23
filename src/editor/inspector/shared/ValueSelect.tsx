import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix Select disallows `value=""` on SelectItem (it conflicts with internal
// "no selection" semantics). We use this sentinel internally and translate at
// the boundary so callers can keep using empty string for "unset".
const NONE_SENTINEL = '__none__'

// Typed select for enum-shaped slice fields. Empty string = "unset" sentinel.
// Optional `renderOption` lets callers inject icons / swatches per item — e.g.,
// LayoutPanel showing direction arrows beside flex-row / flex-col.
export function ValueSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = '—',
  renderOption,
}: {
  value: T | ''
  options: readonly T[]
  onChange: (v: T | undefined) => void
  placeholder?: string
  renderOption?: (option: T) => ReactNode
}) {
  return (
    <Select
      value={value === '' ? NONE_SENTINEL : value}
      onValueChange={(v) =>
        onChange(v === NONE_SENTINEL ? undefined : (v as T))
      }
    >
      <SelectTrigger className="h-7 w-full text-sm" size="sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
