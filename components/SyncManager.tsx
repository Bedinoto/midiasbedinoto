
import React, { useState } from 'react';
import { AppState } from '../types';
import { Button } from './ui/Button';
import { Copy, Check, Database, ShieldCheck, Loader2, Server, Terminal } from 'lucide-react';
import { checkSupabaseHealth } from '../services/storage';

interface SyncManagerProps {
  state: AppState;
  onUpdate: (newState: AppState) => void;
}

export const SyncManager: React.FC<SyncManagerProps> = ({ state, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{connected: boolean, tables: Record<string, boolean>} | null>(null);
  const [checking, setChecking] = useState(false);

  const verifySetup = async () => {
    setChecking(true);
    const status = await checkSupabaseHealth();
    setHealthStatus(status);
    setChecking(false);
  };

  const copyToken = () => {
    if (!state.syncId) return;
    navigator.clipboard.writeText(state.syncId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <Server size={80} />
      </div>

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-tight">Infraestrutura do Workspace</h3>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
              Conexão Ativa com Supabase Cloud
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={verifySetup} disabled={checking}>
          {checking ? <Loader2 size={16} className="animate-spin" /> : 'Verificar Integridade'}
        </Button>
      </div>

      {healthStatus && (
        <div className={`mb-6 p-4 rounded-xl border ${healthStatus.connected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} animate-in slide-in-from-top-2 relative z-10`}>
          <div className="flex items-center gap-2 mb-3">
            {healthStatus.connected ? <ShieldCheck className="text-emerald-500" size={18} /> : <Terminal className="text-rose-500" size={18} />}
            <span className={`text-xs font-bold ${healthStatus.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {healthStatus.connected ? 'Estrutura de Dados Online' : 'Problemas de Sincronização'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(healthStatus.tables).map(([table, ok]) => (
              <div key={table} className="flex items-center justify-between p-2 bg-slate-950/40 rounded border border-slate-800/50">
                <span className="text-[9px] text-slate-400 font-mono truncate mr-2">{table}</span>
                <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 relative z-10">
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Único do Workspace (Token)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={state.syncId} 
              className="flex-1 bg-transparent border-none text-indigo-400 font-mono text-sm focus:ring-0 p-0"
            />
            <button onClick={copyToken} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-1 italic">Este token é necessário para conectar novos players de TV a este workspace.</p>
        </div>
      </div>
    </div>
  );
};
