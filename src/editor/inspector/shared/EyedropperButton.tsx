import { Pipette } from 'lucide-react'

// HTML EyeDropper API — Chrome / Edge / Opera only at time of writing.
// Firefox + Safari return undefined for `window.EyeDropper` so the button
// hides itself entirely (no broken-feature UI).
//
// We check `'EyeDropper' in window` lazily rather than at module load so
// future polyfills (or browser updates) light up the feature without a
// page reload.

interface EyeDropperResult {
  sRGBHex: string
}

interface EyeDropperApi {
  open(): Promise<EyeDropperResult>
}

interface EyeDropperConstructor {
  new (): EyeDropperApi
}

function getEyeDropper(): EyeDropperConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { EyeDropper?: EyeDropperConstructor }
  return w.EyeDropper ?? null
}

export function EyedropperButton({
  onPick,
}: {
  onPick: (hex: string) => void
}) {
  const Ctor = getEyeDropper()
  if (!Ctor) return null

  const handleClick = async () => {
    try {
      const result = await new Ctor().open()
      onPick(result.sRGBHex)
    } catch {
      // User cancelled the eyedropper (Esc, blur). Silent — no error UI needed.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Pick color from screen"
      title="Pick color from screen"
      className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
    >
      <Pipette size={13} />
    </button>
  )
}
