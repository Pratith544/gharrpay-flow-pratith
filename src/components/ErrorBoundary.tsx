import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info);
    // TODO: Send to Sentry in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'DM Mono, monospace',
            background: '#0A0A0A',
            color: '#F5F5F5',
            minHeight: '100vh',
          }}
        >
          <h2 style={{ color: '#E8FF00' }}>SOMETHING WENT WRONG</h2>
          <p style={{ color: '#666' }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              background: '#E8FF00',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              textTransform: 'uppercase',
            }}
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

