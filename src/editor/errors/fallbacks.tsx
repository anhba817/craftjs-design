import { AlertOctagon, AlertTriangle, RefreshCcw } from 'lucide-react'
import type { ErrorFallbackProps } from './ErrorBoundary'

// Three typed fallbacks for the error-boundary layers. Each one is a small,
// self-contained UI — no shared layout chrome so a failure in one layer's
// fallback can't cascade into another layer.

export function TopShellErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ed-surface p-8">
      <AlertOctagon size={48} className="text-ed-danger" />
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-ed-text-strong">
          The editor crashed
        </h1>
        <p className="mt-2 text-sm text-ed-text-muted">
          An unrecoverable error reached the top of the editor. Reloading
          usually clears the state; if it doesn't, the editor's localStorage
          may be corrupt — see the developer console for details.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded border border-ed-border bg-ed-surface-3 p-2 text-left font-mono text-[11px]">
          {error.message}
        </pre>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded bg-ed-accent px-3 py-1.5 text-sm font-medium text-ed-accent-fg hover:bg-ed-accent/90"
        >
          Reload page
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-ed-border-2 px-3 py-1.5 text-sm text-ed-text hover:bg-ed-surface-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export function CanvasErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-ed-surface-3/30 p-6">
      <AlertTriangle size={28} className="text-ed-danger" />
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-ed-text-strong">
          The canvas couldn't render
        </p>
        <p className="mt-1 text-xs text-ed-text-muted">
          A node threw during render. Other documents are unaffected; switch
          documents or click Retry to re-mount this one.
        </p>
        <pre className="mt-2 max-h-24 overflow-auto rounded border border-ed-border bg-ed-surface p-1.5 text-left font-mono text-[10px]">
          {error.message}
        </pre>
      </div>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-1.5 rounded border border-ed-border-2 bg-ed-surface px-2.5 py-1 text-xs text-ed-text hover:bg-ed-surface-2"
      >
        <RefreshCcw size={12} /> Retry
      </button>
    </div>
  )
}

export function PanelErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="space-y-1.5 rounded border border-ed-danger/40 bg-ed-danger/5 p-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ed-danger">
        <AlertTriangle size={12} />
        Panel failed
      </div>
      <p className="text-[11px] text-ed-text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-1 text-[11px] text-ed-accent hover:underline"
      >
        <RefreshCcw size={10} /> Retry
      </button>
    </div>
  )
}

export function ToolboxErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="m-3 space-y-1.5 rounded border border-ed-danger/40 bg-ed-danger/5 p-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ed-danger">
        <AlertTriangle size={12} />
        Toolbox failed
      </div>
      <p className="text-[11px] text-ed-text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-1 text-[11px] text-ed-accent hover:underline"
      >
        <RefreshCcw size={10} /> Retry
      </button>
    </div>
  )
}
