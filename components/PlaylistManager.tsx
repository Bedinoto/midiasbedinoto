
import React, { useState } from 'react';
import { AppState, Playlist, MediaItem } from '../types';
import { Button } from './ui/Button';
import { 
  Plus, 
  ListMusic, 
  Trash2, 
  Edit3, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Save, 
  GripVertical,
  ChevronRight
} from 'lucide-react';
import { deletePlaylistFromCloud } from '../services/storage';

interface PlaylistManagerProps {
  state: AppState;
  onUpdate: (newState: AppState) => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ state, onUpdate }) => {
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [tempPlaylistItems, setTempPlaylistItems] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta playlist?')) {
      try {
        await deletePlaylistFromCloud(id);
        const updatedPlaylists = state.playlists.filter(p => p.id !== id);
        const updatedScreens = state.screens.map(s => 
          s.currentPlaylistId === id ? { ...s, currentPlaylistId: null } : s
        );
        onUpdate({
          ...state,
          playlists: updatedPlaylists,
          screens: updatedScreens
        });
      } catch (err: any) {
        alert('Erro ao excluir playlist: ' + (err?.message || 'Verifique as permissões no servidor.'));
      }
    }
  };

  const startEditing = (playlist: Playlist) => {
    setEditingPlaylistId(playlist.id);
    setTempPlaylistItems([...playlist.items]);
  };

  const saveChanges = () => {
    if (!editingPlaylistId) return;
    
    const newState = {
      ...state,
      playlists: state.playlists.map(p => 
        p.id === editingPlaylistId ? { ...p, items: tempPlaylistItems } : p
      )
    };
    onUpdate(newState);
    setEditingPlaylistId(null);
  };

  const addItem = (mediaId: string) => {
    setTempPlaylistItems([...tempPlaylistItems, mediaId]);
  };

  const removeItem = (index: number) => {
    const newItems = [...tempPlaylistItems];
    newItems.splice(index, 1);
    setTempPlaylistItems(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tempPlaylistItems.length - 1) return;

    const newItems = [...tempPlaylistItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setTempPlaylistItems(newItems);
  };

  const currentPlaylist = state.playlists.find(p => p.id === editingPlaylistId);

  // Editor View
  if (editingPlaylistId && currentPlaylist) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setEditingPlaylistId(null)}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
            >
              <X size={24} />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-white">Editando: {currentPlaylist.name}</h3>
              <p className="text-slate-400">Arranje a ordem e conteúdo da sua transmissão.</p>
            </div>
          </div>
          <Button icon={<Save size={18} />} onClick={saveChanges}>Salvar Alterações</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-250px)]">
          {/* Disponível na Biblioteca */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-indigo-400" /> Biblioteca de Mídia
              </h4>
              <p className="text-xs text-slate-500">Clique para adicionar à playlist</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {state.library.map(media => (
                <div 
                  key={media.id}
                  className="group flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-indigo-500/50 cursor-pointer transition-all"
                  onClick={() => addItem(media.id)}
                >
                  <img src={media.url} className="w-12 h-12 rounded object-cover border border-slate-800" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{media.name}</p>
                    <p className="text-xs text-slate-500">{media.duration}s • {media.type === 'image' ? 'Imagem' : 'Vídeo'}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Sequência da Playlist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-indigo-600/10">
              <h4 className="font-bold text-indigo-400 flex items-center gap-2">
                <ListMusic size={18} /> Sequência do Loop
              </h4>
              <p className="text-xs text-slate-500">{tempPlaylistItems.length} itens no total</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tempPlaylistItems.map((mediaId, index) => {
                const media = state.library.find(m => m.id === mediaId);
                if (!media) return null;
                return (
                  <div 
                    key={`${mediaId}-${index}`}
                    className="flex items-center gap-3 p-3 bg-slate-950 border border-indigo-500/20 rounded-xl animate-in slide-in-from-right-4"
                  >
                    <span className="text-xs font-mono text-indigo-500 w-4 font-bold">{index + 1}</span>
                    <img src={media.url} className="w-10 h-10 rounded object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{media.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === tempPlaylistItems.length - 1}
                        className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-1.5 hover:bg-rose-500/20 text-rose-500 rounded ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {tempPlaylistItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 italic text-sm">
                  Playlist vazia. Adicione itens da biblioteca à esquerda.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
               <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Tempo Total de Loop</span>
               <span className="text-indigo-400 font-bold">
                 {tempPlaylistItems.reduce((acc, id) => acc + (state.library.find(m => m.id === id)?.duration || 0), 0)} segundos
               </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white">Playlists de Anúncios</h3>
          <p className="text-slate-400">Sequencie seus itens de mídia em transmissões em loop.</p>
        </div>
        <Button 
          icon={<Plus size={18} />}
          onClick={() => {
            const newId = `p-${Date.now()}`;
            const newPlaylist: Playlist = { id: newId, name: 'Nova Playlist', items: [] };
            onUpdate({ ...state, playlists: [...state.playlists, newPlaylist] });
            startEditing(newPlaylist);
          }}
        >
          Criar Playlist
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.playlists.map((playlist) => (
          <div key={playlist.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <ListMusic size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-white truncate">{playlist.name}</h4>
                      <button 
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"
                        onClick={() => {
                          const newName = prompt('Novo nome para a playlist:', playlist.name);
                          if (newName) {
                            onUpdate({
                              ...state,
                              playlists: state.playlists.map(p => p.id === playlist.id ? {...p, name: newName} : p)
                            });
                          }
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500">{playlist.items.length} itens de mídia no loop</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDelete(playlist.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Prévia da Sequência</p>
                <div className="space-y-1">
                  {playlist.items.slice(0, 4).map((mediaId, index) => {
                    const item = state.library.find(m => m.id === mediaId);
                    return (
                      <div key={`${playlist.id}-${mediaId}-${index}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 text-sm">
                        <div className="flex items-center gap-3 truncate">
                          <span className="text-slate-600 font-mono text-xs w-4">{index + 1}</span>
                          <span className="text-slate-300 truncate">{item?.name || 'Mídia desconhecida'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 shrink-0">
                          <Clock size={12} />
                          <span className="text-xs">{item?.duration || 0}s</span>
                        </div>
                      </div>
                    );
                  })}
                  {playlist.items.length > 4 && (
                    <div className="text-center py-1">
                      <span className="text-xs text-slate-600">... e mais {playlist.items.length - 4} itens</span>
                    </div>
                  )}
                  {playlist.items.length === 0 && (
                    <div className="text-center py-4 bg-slate-950/30 rounded-lg border border-dashed border-slate-800 text-slate-600 text-xs">
                      Playlist sem itens
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Duração total: {playlist.items.reduce((acc, id) => acc + (state.library.find(m => m.id === id)?.duration || 0), 0)}s
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-400 hover:text-indigo-300 group/btn"
                onClick={() => startEditing(playlist)}
              >
                Gerenciar Itens <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
        
        {state.playlists.length === 0 && (
          <div className="lg:col-span-2 py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
            <ListMusic size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-500">Nenhuma playlist criada ainda.</p>
            <Button variant="ghost" className="mt-2" icon={<Plus size={16} />}>Começar a criar</Button>
          </div>
        )}
      </div>
    </div>
  );
};
