
import React from 'react';
import { ViewType } from '../types';
import { 
  Monitor, 
  PlaySquare, 
  Library, 
  LayoutDashboard,
  Settings,
  ChevronRight,
  Tv,
  Cloud,
  LogOut
} from 'lucide-react';
import { setActiveProjectId } from '../services/storage';

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
  syncId?: string;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, children, syncId }) => {
  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'screens' as ViewType, label: 'Telas', icon: <Monitor size={20} /> },
    { id: 'playlists' as ViewType, label: 'Playlists', icon: <PlaySquare size={20} /> },
    { id: 'library' as ViewType, label: 'Biblioteca', icon: <Library size={20} /> },
  ];

  const handleLogout = () => {
    if (confirm('Deseja sair deste workspace?')) {
      setActiveProjectId(null);
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <aside className="w-64 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Tv size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">AdCast</h1>
        </div>

        <nav className="flex-1 px-3 mt-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                    currentView === item.id 
                      ? 'bg-indigo-600/10 text-indigo-400' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {currentView === item.id && <ChevronRight size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="bg-slate-900 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Cloud size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace Ativo</p>
              <p className="text-xs text-white font-mono truncate">{syncId || 'Não conectado'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-3 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 rounded-xl transition-all font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> Sair do Projeto
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950/50">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white capitalize">
            {currentView}
          </h2>
          <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live Cloud Sync
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
