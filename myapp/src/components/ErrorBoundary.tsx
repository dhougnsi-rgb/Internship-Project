import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; message: string }

/**
 * Catches unhandled render errors and shows a friendly recovery UI
 * instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erreur inattendue.',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 16,
            color: '#1f2937',
            fontFamily: 'inherit',
          }}
        >
          <h2 style={{ margin: 0 }}>Quelque chose s'est mal passé.</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{
              padding: '10px 20px',
              background: '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
