import { hexToHsl, hslToHex, type Hsl } from './color-conversions'

// HSL sliders. Hue slider's track is a continuous hue spectrum so designers
// can sight-read the hue position. Saturation + Lightness tracks render with
// gradients that reflect the *current* H (and S, for the L track) so the
// designer sees what the slider transitions through.
export function HslSliders({
  hex,
  onChange,
}: {
  hex: string
  onChange: (next: string) => void
}) {
  const hsl = hexToHsl(hex)

  const update = (partial: Partial<Hsl>) => {
    onChange(hslToHex({ ...hsl, ...partial }))
  }

  // Continuous hue spectrum — stops at every 60° hue boundary.
  const hueTrack =
    'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))'

  return (
    <div className="space-y-1.5">
      <Channel
        label="H"
        value={hsl.h}
        max={360}
        onChange={(v) => update({ h: v })}
        trackBackground={hueTrack}
      />
      <Channel
        label="S"
        value={hsl.s}
        max={100}
        suffix="%"
        onChange={(v) => update({ s: v })}
        trackBackground={`linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`}
      />
      <Channel
        label="L"
        value={hsl.l}
        max={100}
        suffix="%"
        onChange={(v) => update({ l: v })}
        trackBackground={`linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))`}
      />
    </div>
  )
}

function Channel({
  label,
  value,
  max,
  suffix,
  onChange,
  trackBackground,
}: {
  label: string
  value: number
  max: number
  suffix?: string
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
        {suffix}
      </span>
    </div>
  )
}
