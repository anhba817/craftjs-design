import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react'

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
  // Called once per caught error. Used by the embedded-editor host to ship
  // failures to telemetry. Defaults to a console.error stub.
  onError?: (error: Error, info: ErrorInfo) => void
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
    const { onError } = this.props
    if (onError) {
      onError(error, info)
    } else {
      console.error('[ErrorBoundary]', error, info)
    }
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
