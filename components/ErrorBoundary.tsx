import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in AdCast:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-rose-600/20 text-rose-500 rounded-2xl mb-4 border border-rose-500/30">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-2xl font-black mb-2">Ops! Algo deu errado</h1>
          <p className="text-slate-400 max-w-md text-sm mb-6">
            Ocorreu um erro inesperado ao carregar este módulo. Tente recarregar a página ou redefinir a conexão.
          </p>
          {this.state.error && (
            <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left text-xs text-rose-400 max-w-lg w-full overflow-x-auto mb-6 font-mono">
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <RefreshCw size={18} /> Recarregar Página
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.hash = '';
                window.location.reload();
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Limpar Cache Local
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
