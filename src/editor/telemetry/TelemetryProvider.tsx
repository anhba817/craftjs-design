import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { setTelemetry, type TelemetryHandlers } from './telemetry'

// Phase 15 § 13.1 — ergonomic wrapper that installs telemetry handlers on
// mount. The handlers live in a module singleton (see telemetry.ts) so the
// class-based error boundaries — including the top-shell one outside the
// editor tree — can read them. Render this anywhere above (or around)
// <Editor/>; the host's handlers receive editor errors + metrics.
//
//   <TelemetryProvider
//     onError={(err, info) => Sentry.captureException(err, { extra: info })}
//     onMetric={(m) => posthog.capture(m.name, m)}
//   >
//     <Editor />
//   </TelemetryProvider>
export function TelemetryProvider({
  onError,
  onMetric,
  children,
}: TelemetryHandlers & { children: ReactNode }) {
  useEffect(() => {
    setTelemetry({ onError, onMetric })
    return () => setTelemetry({})
  }, [onError, onMetric])
  return <>{children}</>
}
