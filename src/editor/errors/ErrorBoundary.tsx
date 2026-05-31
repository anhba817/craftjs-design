import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../telemetry/telemetry'

// React's componentDidCatch boundary still requires a class component as of
// React 18 / 19 — there's no hooks equivalent. We export a single base class
// and parameterize the fallback so each layer (canvas, panel, toolbox, shell)
// can supply its own recovery UI.
//
// `key` prop on the boundary forces a remount when the parent wants to clear
// transient state; otherwise the user clicks the fallback's `reset()` button
// which clears the captured error and re-renders children.

export interface ErrorFallbackProps {
  error: Error
  // Clears the captured error and re-mounts children. The wrapped subtree
  // might throw again immediately if the underlying bug is still present —
  // designers see another fallback, which is fine. "Retry" gives a path out
  // of transient failures (race conditions, network blips, etc.).
  reset: () => void
}

interface ErrorBoundaryProps {
  fallback: ComponentType<ErrorFallbackProps>
  // Called once per caught error. An explicit prop takes precedence; when
  // absent, the error is routed to the host's TelemetryProvider handler
  // (Phase 15 § 13.1) if installed, else logged. `boundary` labels which
  // layer caught it in the telemetry payload.
  onError?: (error: Error, info: ErrorInfo) => void
  boundary?: string
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { onError, boundary } = this.props
    if (onError) {
      onError(error, info)
      return
    }
    // No explicit handler — route to host telemetry if installed.
    reportError(error, {
      componentStack: info.componentStack ?? undefined,
      boundary,
    })
    // Always log too, so a missing telemetry handler isn't silent.
    console.error(`[ErrorBoundary${boundary ? `:${boundary}` : ''}]`, error, info)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      const Fallback = this.props.fallback
      return <Fallback error={error} reset={this.handleReset} />
    }
    return this.props.children
  }
}
