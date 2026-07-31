import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="flex justify-center">
              <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button onClick={this.handleReset} className="w-full sm:w-auto gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Application
              </Button>
            </div>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="text-left mt-8 p-4 bg-muted rounded-md overflow-auto text-xs font-mono">
                <p className="text-destructive font-semibold mb-2">{this.state.error.message}</p>
                <pre>{this.state.error.stack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
