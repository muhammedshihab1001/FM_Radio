import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** `page` replaces the whole app; `inline` stays inside the layout (lazy panels). */
  variant?: 'page' | 'inline';
  /** Called by "Try again" / "Close" in the inline variant. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const reload = () => window.location.reload();

/**
 * Catches render/lifecycle errors (and failed lazy-chunk loads) so one broken
 * component never blanks the page. React has no hook equivalent, hence a class.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary caught:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.variant === 'inline') {
      return (
        <div
          role="alert"
          className="card-enter mx-auto my-10 max-w-sm p-6 rounded-card surface-raised text-center space-y-4"
        >
          <p className="text-sm font-semibold text-primary">This part didn&apos;t load</p>
          <p className="text-xs text-tertiary">Check your connection, then try again.</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="min-h-[44px] px-4 rounded-button surface-raised text-xs font-medium text-secondary hover:text-primary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={reload}
              className="min-h-[44px] px-4 rounded-button bg-cyan text-on-accent text-xs font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return (
      <div role="alert" className="min-h-dvh bg-base flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-5">
          <div className="grid place-items-center w-16 h-16 rounded-full surface-raised mx-auto" aria-hidden>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="text-danger"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 7v6M12 16.5v.5" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-primary">Something went wrong</h1>
          <p className="text-sm text-tertiary leading-relaxed">
            Nebula Cast hit an unexpected error. Reloading usually fixes it — your saved stations are safe.
          </p>
          <button
            type="button"
            onClick={reload}
            className="min-h-[44px] px-6 rounded-button bg-cyan text-on-accent text-sm font-semibold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
