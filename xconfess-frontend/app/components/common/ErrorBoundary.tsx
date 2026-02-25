'use client';

import React, { Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from '@/app/lib/utils/errorHandler';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

class ErrorBoundaryClass extends Component<Props & { router: any }, State> {
  state: State = { hasError: false, error: null, errorCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorCount = this.state.errorCount + 1;
    logError(error, 'ErrorBoundary', { componentStack: errorInfo.componentStack, errorCount });
    this.setState({ errorCount });
  }

  handleReset = () => {
    if (this.state.errorCount > 3) return; // Stop retries if exhausted
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isExhausted = this.state.errorCount > 3;
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
          <div className="bg-zinc-950 rounded-xl p-8 max-w-md w-full border border-red-900/50 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-black uppercase">Console Crash</h2>
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              {isExhausted ? "Multiple failures detected. Manual intervention required." : this.state.error?.message}
            </p>
            <div className="flex flex-col gap-3">
              {!isExhausted && (
                <button onClick={this.handleReset} className="w-full bg-white text-black py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> REBOOT CONSOLE
                </button>
              )}
              <button onClick={() => this.props.router.push('/')} className="w-full bg-zinc-900 text-zinc-400 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                <Home size={16} /> RETURN_HOME
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = (props: Props) => {
  const router = useRouter();
  return <ErrorBoundaryClass {...props} router={router} />;
};