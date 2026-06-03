import { hexToRgb, rgbToHex, type Rgb } from './color-conversions'

// Three native <input type="range"> sliders for R/G/B channels, each 0..255.
// Edits fire on every drag tick so the canvas updates live; the parent
// controls debounce/throttle if the inspector needs it.
export function RgbSliders({
  hex,
  onChange,
}: {
  hex: string
  onChange: (next: string) => void
}) {
  const rgb = hexToRgb(hex)

  const update = (partial: Partial<Rgb>) => {
    onChange(rgbToHex({ ...rgb, ...partial }))
  }

  return (
    <div className="space-y-1.5">
      <Channel
        label="R"
        value={rgb.r}
        max={255}
        onChange={(v) => update({ r: v })}
        trackBackground={`linear-gradient(to right, rgb(0,${rgb.g},${rgb.b}), rgb(255,${rgb.g},${rgb.b}))`}
      />
      <Channel
        label="G"
        value={rgb.g}
        max={255}
        onChange={(v) => update({ g: v })}
        trackBackground={`linear-gradient(to right, rgb(${rgb.r},0,${rgb.b}), rgb(${rgb.r},255,${rgb.b}))`}
      />
      <Channel
        label="B"
        value={rgb.b}
        max={255}
        onChange={(v) => update({ b: v })}
        trackBackground={`linear-gradient(to right, rgb(${rgb.r},${rgb.g},0), rgb(${rgb.r},${rgb.g},255))`}
      />
    </div>
  )
}

function Channel({
  label,
  value,
  max,
  onChange,
  trackBackground,
}: {
  label: string
  value: number
  max: number
  onChange: (v: number) => void
  trackBackground: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 text-[10px] font-medium uppercase text-ed-text-muted">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded outline-none"
        style={{ background: trackBackground }}
      />
      <span className="w-9 text-right text-[11px] tabular-nums text-ed-text">
        {value}
      </span>
    </div>
  )
}
