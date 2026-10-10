
import React, { useState, useEffect } from 'react';
import { ViewType, AppState } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ScreenManager } from './components/ScreenManager';
import { PlaylistManager } from './components/PlaylistManager';
import { MediaLibrary } from './components/MediaLibrary';
import { Player } from './components/Player';
import { Button } from './components/ui/Button';
import { 
  loadRemoteState, 
  loadScreensOnly,
  subscribeToProjectChanges, 
  getActiveProjectId, 
  setActiveProjectId, 
  createNewProject,
  saveStateToCloud 
} from './services/storage';
import { supabase } from './services/supabase';
import { Cloud, Loader2, Database, Plus, LogIn } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [playerScreenId, setPlayerScreenId] = useState<string | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputProjectId, setInputProjectId] = useState('');

  // Carrega o projeto ativo ou da URL
  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 7000);

    const init = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSyncId = urlParams.get('sync');
        const savedSyncId = getActiveProjectId();
        const targetId = urlSyncId || savedSyncId;

        if (targetId) {
          const remote = await loadRemoteState(targetId);
          if (remote && mounted) {
            setState(remote);
            setActiveProjectId(targetId);
          }
        }
      } catch (err) {
        console.error('Falha ao inicializar estado do projeto:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };
    init();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Escuta mudanças em tempo real do Supabase
  useEffect(() => {
    if (state?.syncId) {
      // Usamos um timer para evitar múltiplos reloads rápidos (debounce)
      let timeoutId: any;

      const sub = subscribeToProjectChanges(state.syncId, async (payload: any) => {
        // Se for uma mudança no status da tela (heartbeat), a gente pode ignorar 
        // ou fazer algo mais leve se estivermos apenas no dashboard
        if (payload.table === 'adcast_screens' && payload.eventType === 'UPDATE') {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(async () => {
             const screens = await loadScreensOnly(state.syncId!);
             if (screens.length > 0) {
               setState(prev => prev ? { ...prev, screens } : prev);
             }
          }, 5000); 
          return;
        }

        // Para mídias e playlists, o reload deve ser mais rápido
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          const remote = await loadRemoteState(state.syncId!);
          if (remote) setState(remote);
        }, 1000);
      });

      sub.subscribe();

      return () => { 
        if (sub) {
          supabase.removeChannel(sub);
        }
        clearTimeout(timeoutId);
      };
    }
  }, [state?.syncId]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#player/')) {
        const id = hash.replace('#player/', '');
        setPlayerScreenId(id);
        setCurrentView('player');
      } else {
        setPlayerScreenId(null);
        if (hash === '#screens') setCurrentView('screens');
        else if (hash === '#playlists') setCurrentView('playlists');
        else if (hash === '#library') setCurrentView('library');
        else setCurrentView('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateState = async (newState: AppState) => {
    const previousState = state;
    setState(newState);
    try {
      await saveStateToCloud(newState);
    } catch (err: any) {
      console.error('Falha ao sincronizar:', err);
      alert(`Erro ao salvar na nuvem: ${err.message || 'Verifique sua conexão ou permissões do banco.'}`);
      setState(previousState); // Rollback local se falhar na nuvem
    }
  };

  const handleCreateProject = async () => {
    setIsLoading(true);
    const newId = await createNewProject();
    if (newId) {
      const remote = await loadRemoteState(newId);
      setState(remote);
      setActiveProjectId(newId);
      // Limpa URL para evitar conflitos
      window.history.replaceState({}, '', window.location.pathname);
    }
    setIsLoading(false);
  };

  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputProjectId.trim()) return;
    setIsLoading(true);
    const remote = await loadRemoteState(inputProjectId.trim());
    if (remote) {
      setState(remote);
      setActiveProjectId(inputProjectId.trim());
    } else {
      alert('ID de projeto não encontrado ou erro de conexão.');
    }
    setIsLoading(false);
  };

  // Se estiver no modo player, ignora tela de login
  if (currentView === 'player' && playerScreenId) {
    return <Player screenId={playerScreenId} />;
  }

  // Tela de Boas-vindas / Seleção de Projeto
  if (!state && !isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/20">
              <Database size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">ADCAST CLOUD</h1>
            <p className="text-slate-400 font-medium">Sua infraestrutura de sinalização digital 100% na nuvem.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
            <form onSubmit={handleJoinProject} className="space-y-4 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entrar em Projeto Existente</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={inputProjectId}
                  onChange={e => setInputProjectId(e.target.value)}
                  placeholder="Insira o Token do Projeto..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Button type="submit" variant="primary" icon={<LogIn size={18} />}>Entrar</Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-600 bg-slate-900 px-2">ou</div>
            </div>

            <Button 
              className="w-full py-4 text-base" 
              variant="secondary" 
              icon={<Plus size={20} />}
              onClick={handleCreateProject}
            >
              Criar Novo Workspace
            </Button>
          </div>
          
          <p className="text-[10px] text-slate-600 font-mono italic">
            Conectado a Supabase: https://lrdqisnuifbvrjfkwbzv.supabase.co
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Estabelecendo conexão segura...</p>
      </div>
    );
  }

  const renderView = () => {
    if (!state) return null;
    switch (currentView) {
      case 'dashboard': return <Dashboard state={state} onUpdate={updateState} />;
      case 'screens': return <ScreenManager state={state} onUpdate={updateState} />;
      case 'playlists': return <PlaylistManager state={state} onUpdate={updateState} />;
      case 'library': return <MediaLibrary state={state} onUpdate={updateState} />;
      default: return <Dashboard state={state} onUpdate={updateState} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      syncId={state?.syncId}
      onViewChange={(v) => {
        window.location.hash = v;
        setCurrentView(v);
      }}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
