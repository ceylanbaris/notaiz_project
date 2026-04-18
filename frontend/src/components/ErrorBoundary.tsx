import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="section-container flex items-center justify-center min-h-[70vh]">
          <div className="glass-card p-10 text-center max-w-md">
            <AlertTriangle size={32} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Beklenmeyen Bir Hata Oluştu</h2>
            <p className="text-sm text-slate-400 mb-6">
              {this.state.error.message || 'Bilinmeyen hata'}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              className="btn-secondary !text-sm"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
