/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * Requirements: 2.8
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

// ============================================
// Types
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================
// Error Boundary Component
// ============================================

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center"
          >
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              Bir Hata Oluştu
            </h1>

            {/* Error Message */}
            <p className="text-zinc-400 mb-6">
              Uygulama beklenmeyen bir hatayla karşılaştı. Lütfen sayfayı yenileyin veya tekrar deneyin.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
                  Hata Detayları
                </summary>
                <div className="mt-3 p-4 bg-zinc-950 rounded-lg overflow-auto max-h-48">
                  <p className="text-xs font-mono text-red-400 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-xs font-mono text-zinc-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
              >
                Tekrar Dene
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Sayfayı Yenile
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
