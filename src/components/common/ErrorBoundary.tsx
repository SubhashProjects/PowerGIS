import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, message: error.message }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('PowerGIS UI boundary:', error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="flex min-h-full items-center justify-center p-6 bg-white"><div className="w-full max-w-lg border border-neutral-200 rounded-md p-5"><h1 className="font-bold text-base">PowerGIS could not render this view</h1><p className="mt-2 text-sm">The operation was stopped safely. Reload the page or return to the dashboard.</p><p className="mt-2 text-xs text-neutral-600">{this.state.message}</p><button className="mt-4 px-3 py-2 rounded-md bg-neutral-900 text-white text-xs font-bold" onClick={() => window.location.reload()}>Reload application</button></div></div>;
  }
}
