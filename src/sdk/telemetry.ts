// Public SDK — observability (Phase 15 § 13).
//
// The editor collects nothing by default. Install handlers and the
// editor's error boundaries + timed flows call into them:
//
// @example
//   import { TelemetryProvider } from '@crafted-design/editor/sdk'
//
//   <TelemetryProvider
//     onError={(err, info) => Sentry.captureException(err, { extra: info })}
//     onMetric={(m) => posthog.capture(m.name, m)}
//   >
//     <Editor />
//   </TelemetryProvider>
//
// Or imperatively (before mount): `setTelemetry({ onError, onMetric })`.
export {
  setTelemetry,
  getTelemetry,
} from '../editor/telemetry/telemetry'
export type {
  TelemetryHandlers,
  TelemetryErrorInfo,
  TelemetryMetric,
} from '../editor/telemetry/telemetry'
export { TelemetryProvider } from '../editor/telemetry/TelemetryProvider'
