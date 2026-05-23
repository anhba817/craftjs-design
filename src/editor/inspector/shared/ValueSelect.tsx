// Generic typed select for enum-shaped slice fields. Used by Layout (display,
// flex-dir, etc.), Spacing (values), Size (values), Appearance (radius),
// Effects (shadow, opacity, blur). Empty string is the "unset" sentinel —
// converted to `undefined` so the caller can pass it as a patch field that
// removes the utility.
export function ValueSelect<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T | ''
  options: readonly T[]
  onChange: (v: T | undefined) => void
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value === '' ? undefined : (e.target.value as T))
      }
      className={
        className ??
        'w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700'
      }
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
