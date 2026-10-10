import React, { useState } from 'react';
import { AppState, Screen } from '../types';
import { Button } from './ui/Button';
import { 
  Plus, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  Trash2, 
  X, 
  Tv, 
  Check, 
  Link as LinkIcon,
  RefreshCw,
  Zap,
  DownloadCloud,
  QrCode,
  Smartphone,
  Info
} from 'lucide-react';
import { deleteScreenFromCloud, forceScreenUpdate } from '../services/storage';

interface ScreenManagerProps {
  state: AppState;
  onUpdate: (newState: AppState) => void;
}

export const ScreenManager: React.FC<ScreenManagerProps> = ({ state, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [installingScreen, setInstallingScreen] = useState<Screen | null>(null);

  const handleAddScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScreenName.trim()) return;

    const newScreen: Screen = {
      id: `scr-${Math.random().toString(36).substr(2, 9)}`,
      name: newScreenName,
      status: 'offline',
      lastSeen: Date.now(),
      currentPlaylistId: null,
    };

    const newState = {
      ...state,
      screens: [...state.screens, newScreen]
    };

    onUpdate(newState);
    setNewScreenName('');
    setShowAddForm(false);
  };

  const handleDeleteScreen = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta tela? O link do player deixará de funcionar.')) {
      try {
        await deleteScreenFromCloud(id);
        onUpdate({
          ...state,
          screens: state.screens.filter(s => s.id !== id)
        });
      } catch (err: any) {
        alert('Erro ao excluir tela: ' + (err?.message || 'Verifique as permissões no servidor.'));
      }
    }
  };

  const handleForceUpdate = async (screenId: string) => {
    setSyncingId(screenId);
    try {
      await forceScreenUpdate(screenId);
      setTimeout(() => setSyncingId(null), 1500);
    } catch (err) {
      console.error("Erro ao forçar sincronia:", err);
      setSyncingId(null);
      alert("Falha ao enviar sinal de atualização.");
    }
  };

  const togglePlaylist = (screenId: string, playlistId: string) => {
    const newState = {
      ...state,
      screens: state.screens.map(s => 
        s.id === screenId ? { ...s, currentPlaylistId: playlistId || null } : s
      )
    };
    onUpdate(newState);
  };

  const getPlayerUrl = (screenId: string) => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const syncParam = state.syncId ? `?sync=${state.syncId}` : '';
    return `${baseUrl}${syncParam}#player/${screenId}`;
  };

  const copyPlayerUrl = (screenId: string) => {
    navigator.clipboard.writeText(getPlayerUrl(screenId));
    alert('URL do Player copiada! Cole no navegador da sua Smart TV.');
  };

  const handleTriggerInstall = async () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPrompt = null;
        setInstallingScreen(null);
      }
    } else {
      alert("Para instalar: Clique nos 3 pontos do navegador da sua TV e selecione 'Instalar Aplicativo' ou 'Adicionar à tela inicial'.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white">Suas Telas</h3>
          <p className="text-slate-400">Gerencie seus dispositivos conectados e links de transmissão.</p>
        </div>
        <Button 
          icon={showAddForm ? <X size={18} /> : <Plus size={18} />} 
          variant={showAddForm ? 'secondary' : 'primary'}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancelar' : 'Registrar Nova Tela'}
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
          <form onSubmit={handleAddScreen} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Tv size={14} /> Nome da Nova Tela
              </label>
              <input 
                type="text" 
                autoFocus
                required
                value={newScreenName}
                onChange={e => setNewScreenName(e.target.value)}
                placeholder="Ex: Monitor Corredor B, TV Lounge..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <Button type="submit" className="w-full md:w-auto" icon={<Check size={18} />}>
              Salvar Dispositivo
            </Button>
          </form>
        </div>
      )}

      {/* MODAL DE INSTALAÇÃO PWA */}
      {installingScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-indigo-600/5">
              <div className="flex items-center gap-3 text-indigo-400">
                <DownloadCloud size={24} />
                <h4 className="font-bold text-lg">Instalador do Player</h4>
              </div>
              <button onClick={() => setInstallingScreen(null)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <p className="text-slate-300 text-sm">Escaneie o QR Code com a câmera do dispositivo ou TV para abrir o instalador específico desta tela.</p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl shadow-xl shadow-indigo-500/10">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPlayerUrl(installingScreen.id))}`} 
                    alt="QR Code do Player"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-tighter">
                    <Smartphone size={14} /> Passo 1
                  </div>
                  <p className="text-[11px] text-slate-400">Abra a URL no navegador da TV ou Celular.</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-tighter">
                    <Check size={14} /> Passo 2
                  </div>
                  <p className="text-[11px] text-slate-400">Selecione "Instalar Aplicativo" ou "Adicionar à Tela Inicial".</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full py-4 bg-indigo-600 text-white font-bold"
                  icon={<DownloadCloud size={20} />}
                  onClick={handleTriggerInstall}
                >
                  Baixar / Instalar Agora
                </Button>
                <div className="flex items-center gap-2 justify-center text-slate-500 text-[10px] font-bold uppercase">
                  <Info size={12} />
                  Compatível com Android TV, WebOS e Tizen
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {state.screens.map((screen) => (
          <div key={screen.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all duration-300 shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800/50 ${screen.status === 'online' ? 'text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-slate-600'}`}>
                  {screen.status === 'online' ? <Wifi size={24} /> : <WifiOff size={24} />}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setInstallingScreen(screen)}
                    className="p-2 hover:bg-indigo-500/10 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Baixar Instalador PWA"
                  >
                    <DownloadCloud size={18} />
                  </button>
                  <button 
                    onClick={() => copyPlayerUrl(screen.id)}
                    className="p-2 hover:bg-indigo-500/10 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Copiar URL do Player"
                  >
                    <LinkIcon size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteScreen(screen.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                    title="Excluir tela"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate" title={screen.name}>
                  {screen.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{screen.id}</span>
                  <span>•</span>
                  <span>{screen.status === 'online' ? 'Conectado' : 'Offline'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Playlist Ativa</label>
                  <select 
                    value={screen.currentPlaylistId || ''} 
                    onChange={(e) => togglePlaylist(screen.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <option value="">Nenhuma agendada</option>
                    {state.playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full bg-slate-950 border-slate-800" 
                    icon={<ExternalLink size={16} />}
                    onClick={() => window.open(getPlayerUrl(screen.id), '_blank')}
                  >
                    Testar Player
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400" 
                    icon={syncingId === screen.id ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                    onClick={() => handleForceUpdate(screen.id)}
                    disabled={syncingId === screen.id}
                  >
                    {syncingId === screen.id ? 'Sincronizando...' : 'Forçar Sincronia'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};