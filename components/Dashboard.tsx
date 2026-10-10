import React, { useEffect, useState } from 'react';
import { AppState } from '../types';
import { 
  Monitor, 
  PlaySquare, 
  Library, 
  Activity,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Cloud,
  CloudOff,
  Zap
} from 'lucide-react';
import { Button } from './ui/Button';
import { MediaAssistant } from './MediaAssistant';
import { SyncManager } from './SyncManager';
import { getLiveScreensStatus } from '../services/storage';

interface DashboardProps {
  state: AppState;
  onUpdate: (newState: AppState) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdate }) => {
  const [liveStatus, setLiveStatus] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [cloudActive, setCloudActive] = useState(!!state.syncId);

  const refreshLiveStatus = async () => {
    if (!state.syncId) return;
    setRefreshing(true);
    const statuses = await getLiveScreensStatus(state.syncId);
    const statusMap: Record<string, number> = {};
    statuses.forEach((s: any) => {
      statusMap[s.screen_id] = new Date(s.last_seen).getTime();
    });
    setLiveStatus(statusMap);
    setRefreshing(false);
    setCloudActive(true);
  };

  useEffect(() => {
    if (state.syncId) {
      refreshLiveStatus();
      const interval = setInterval(refreshLiveStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [state.syncId]);

  const isOnline = (screenId: string) => {
    const lastSeen = liveStatus[screenId];
    if (!lastSeen) return false;
    // Online se o sinal foi recebido nos últimos 60 segundos
    return (Date.now() - lastSeen) < 60000;
  };

  const stats = [
    { label: 'Telas Ativas', value: state.screens.filter(s => isOnline(s.id)).length, total: state.screens.length, icon: <Monitor className="text-emerald-400" />, bg: 'bg-emerald-400/10' },
    { label: 'Playlists', value: state.playlists.length, icon: <PlaySquare className="text-indigo-400" />, bg: 'bg-indigo-400/10' },
    { label: 'Mídias', value: state.library.length, icon: <Library className="text-amber-400" />, bg: 'bg-amber-400/10' },
    { label: 'Cloud Status', value: state.syncId ? 'Online' : 'Desativado', icon: state.syncId ? <Cloud className="text-blue-400" /> : <CloudOff className="text-slate-500" />, bg: state.syncId ? 'bg-blue-400/10' : 'bg-slate-800/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 shadow-lg hover:border-slate-700 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className={`p-3 ${stat.bg} rounded-xl`}>
                {stat.icon}
              </div>
              <ArrowUpRight size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h4>
                {stat.total !== undefined && <span className="text-slate-500 text-sm font-medium">/ {stat.total}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SyncManager state={state} onUpdate={onUpdate} />
          
          <MediaAssistant />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Activity size={18} className="text-emerald-500" />
                </div>
                <h3 className="font-bold text-white">Monitoramento de Telas</h3>
                {refreshing && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
              </div>
              <Button variant="ghost" size="sm" onClick={refreshLiveStatus} disabled={!state.syncId}>
                {state.syncId ? 'Sincronizar Agora' : 'Nuvem Desativada'}
              </Button>
            </div>
            
            <div className="divide-y divide-slate-800/50">
              {state.screens.map(screen => {
                const online = isOnline(screen.id);
                return (
                  <div key={screen.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-3.5 h-3.5 rounded-full ${online ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                        {online && <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping opacity-25" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-100">{screen.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">ID: {screen.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded border inline-block mb-1 ${online ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-500 border-slate-700 bg-slate-800'}`}>
                        {online ? 'TRANSMITINDO' : 'OFFLINE'}
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {liveStatus[screen.id] ? `Visto às ${new Date(liveStatus[screen.id]).toLocaleTimeString()}` : 'Aguardando primeiro sinal...'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {state.screens.length === 0 && (
                <div className="p-16 text-center">
                  <Monitor size={40} className="mx-auto text-slate-800 mb-4" />
                  <p className="text-slate-500 italic text-sm">Nenhuma tela cadastrada para monitoramento.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Library size={120} />
            </div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="font-bold text-white">Últimas Mídias</h3>
              <Button variant="ghost" size="sm" icon={<Plus size={16} />}>Adicionar</Button>
            </div>
            <div className="space-y-4 relative z-10">
              {state.library.slice(0, 5).map(item => (
                <div key={item.id} className="flex gap-4 group/item cursor-pointer p-2 hover:bg-slate-800/50 rounded-xl transition-all border border-transparent hover:border-slate-700">
                  <div className="relative shrink-0 overflow-hidden rounded-lg">
                    <img 
                      src={item.url} 
                      className="w-16 h-12 object-cover border border-slate-800 group-hover/item:scale-110 transition-transform duration-500" 
                      alt={item.name}
                    />
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate group-hover/item:text-indigo-400 transition-colors">{item.name}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{item.duration}s • {item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <Zap size={100} />
            </div>
            <h4 className="font-black text-xl mb-3 relative z-10 italic uppercase tracking-tighter">Performance Máxima</h4>
            <p className="text-indigo-100 text-sm mb-6 relative z-10 leading-relaxed font-medium">Sua rede está configurada com Supabase Realtime para atualizações em milissegundos.</p>
            <div className="flex items-center gap-2 relative z-10 p-2 bg-indigo-900/30 rounded-lg border border-white/10">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Nodes sincronizados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
