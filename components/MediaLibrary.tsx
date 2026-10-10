
import React, { useState, useRef } from 'react';
import { AppState, MediaItem, MediaType } from '../types';
import { Button } from './ui/Button';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Film, 
  Clock, 
  Link as LinkIcon, 
  X, 
  Code2, 
  Loader2, 
  Upload, 
  FileCheck,
  Globe
} from 'lucide-react';
import { deleteMediaFromCloud, uploadFile } from '../services/storage';

interface MediaLibraryProps {
  state: AppState;
  onUpdate: (newState: AppState) => Promise<void>;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ state, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMedia, setNewMedia] = useState({
    name: '',
    url: '',
    type: 'image' as MediaType,
    duration: 10
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVideo = file.type.startsWith('video/');
      setNewMedia(prev => ({
        ...prev,
        name: prev.name || file.name.split('.')[0],
        type: isVideo ? 'video' : 'image'
      }));
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMode === 'file' && !selectedFile) {
      alert('Por favor, selecione um arquivo.');
      return;
    }
    if (uploadMode === 'link' && !newMedia.url) {
      alert('Por favor, insira a URL.');
      return;
    }

    setIsSaving(true);
    try {
      let finalUrl = newMedia.url;

      if (uploadMode === 'file' && selectedFile && state.syncId) {
        finalUrl = await uploadFile(selectedFile, state.syncId);
      }

      const newItem: MediaItem = {
        id: `m-${Date.now()}`,
        name: newMedia.name || (selectedFile ? selectedFile.name : 'Nova Mídia'),
        url: finalUrl,
        type: newMedia.type,
        duration: newMedia.duration,
        createdAt: Date.now()
      };

      await onUpdate({
        ...state,
        library: [newItem, ...state.library]
      });

      setNewMedia({ name: '', url: '', type: 'image', duration: 10 });
      setSelectedFile(null);
      setShowAddForm(false);
    } catch (err: any) {
      alert('Erro ao salvar mídia: ' + (err.message || 'Verifique se o bucket "media" foi criado no Supabase.'));
    } finally {
      setIsSaving(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteMedia = async (item: MediaItem) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"? Ela será removida da biblioteca e de todas as playlists.`)) {
      return;
    }

    setDeletingId(item.id);
    try {
      // 1. Exclui do banco de dados e do bucket Supabase Storage
      await deleteMediaFromCloud(item.id, item.url);

      // 2. Remove da biblioteca local e de todas as playlists
      const updatedLibrary = state.library.filter(m => m.id !== item.id);
      const updatedPlaylists = state.playlists.map(p => ({
        ...p,
        items: p.items.filter(id => id !== item.id)
      }));

      // 3. Atualiza estado da aplicação imediatamente e sincroniza
      await onUpdate({
        ...state,
        library: updatedLibrary,
        playlists: updatedPlaylists
      });
    } catch (err: any) {
      console.error('Erro ao excluir mídia:', err);
      const msg = err?.message || JSON.stringify(err);
      alert(`Erro ao excluir mídia: ${msg}\n\nSe o erro for de permissão (permission denied), certifique-se de executar o script SQL de permissões no Supabase.`);
    } finally {
      setDeletingId(null);
    }
  };

  const getHostnameSafely = (url: string, type: MediaType) => {
    if (type === 'html') return 'Widget/Snippet';
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('supabase.co')) return 'Hospedagem AdCast';
      return hostname;
    } catch (e) {
      return 'URL Customizada';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white">Biblioteca de Mídia</h3>
          <p className="text-slate-400">Gerencie seus arquivos ou utilize links externos para transmissão.</p>
        </div>
        <Button 
          icon={showAddForm ? <X size={18} /> : <Plus size={18} />} 
          variant={showAddForm ? 'secondary' : 'primary'}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancelar' : 'Adicionar Conteúdo'}
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex gap-4 mb-6 p-1 bg-slate-950 rounded-xl w-fit">
            <button 
              onClick={() => setUploadMode('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'file' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Upload size={14} /> Upload de Arquivo
            </button>
            <button 
              onClick={() => setUploadMode('link')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'link' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} /> Link Externo / HTML
            </button>
          </div>

          <form onSubmit={handleAddMedia} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Título da Mídia</label>
                <input 
                  type="text" 
                  required
                  disabled={isSaving}
                  value={newMedia.name}
                  onChange={e => setNewMedia({...newMedia, name: e.target.value})}
                  placeholder="Ex: Oferta da Semana"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Duração (segundos)</label>
                <input 
                  type="number" 
                  min="1"
                  disabled={isSaving}
                  value={newMedia.duration}
                  onChange={e => setNewMedia({...newMedia, duration: parseInt(e.target.value) || 10})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {uploadMode === 'file' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <>
                    <FileCheck className="text-emerald-500" size={40} />
                    <div className="text-center">
                      <p className="text-emerald-400 font-bold">{selectedFile.name}</p>
                      <p className="text-slate-500 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-400 transition-colors">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-300 font-medium">Arraste ou clique para selecionar</p>
                      <p className="text-slate-500 text-xs">Suporta Imagens (PNG, JPG) e Vídeos (MP4)</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Tipo de Conteúdo</label>
                  <select 
                    value={newMedia.type}
                    disabled={isSaving}
                    onChange={e => setNewMedia({...newMedia, type: e.target.value as MediaType})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="image">Imagem (URL)</option>
                    <option value="video">Vídeo (URL)</option>
                    <option value="html">Widget HTML</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    {newMedia.type === 'html' ? 'Código HTML' : 'Endereço da Mídia (URL)'}
                  </label>
                  {newMedia.type === 'html' ? (
                    <textarea 
                      required
                      rows={4}
                      disabled={isSaving}
                      value={newMedia.url}
                      onChange={e => setNewMedia({...newMedia, url: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-indigo-300 font-mono outline-none"
                      placeholder="<iframe ...></iframe>"
                    />
                  ) : (
                    <div className="relative">
                      <LinkIcon size={14} className="absolute left-3 top-3 text-slate-500" />
                      <input 
                        type="url" 
                        required
                        disabled={isSaving}
                        value={newMedia.url}
                        onChange={e => setNewMedia({...newMedia, url: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="px-10" icon={isSaving && <Loader2 className="animate-spin" size={16} />}>
                {isSaving ? 'Enviando para Nuvem...' : 'Salvar Mídia'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {state.library.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all shadow-lg">
            <div className="aspect-video relative overflow-hidden bg-slate-950 flex items-center justify-center">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : item.type === 'video' ? (
                <div className="w-full h-full relative group/vid">
                   <video src={item.url} className="w-full h-full object-cover opacity-50 group-hover/vid:opacity-100 transition-opacity" muted />
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <Film size={40} className="text-slate-700 opacity-50 group-hover/vid:opacity-0" />
                   </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-indigo-500/50">
                  <Code2 size={40} />
                  <span className="text-[10px] font-mono mt-2 uppercase tracking-widest">HTML Snippet</span>
                </div>
              )}
              
              <div className="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0 z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMedia(item);
                  }}
                  disabled={deletingId === item.id}
                  title="Excluir mídia"
                  className="p-2 bg-rose-600/90 hover:bg-rose-700 active:scale-95 text-white rounded-lg transition-all shadow-xl disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {deletingId === item.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
              
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-1 bg-black/80 backdrop-blur-md rounded text-[10px] font-black uppercase text-white border border-white/10 flex items-center gap-1 shadow-lg">
                  {item.type === 'image' ? <ImageIcon size={10} /> : item.type === 'video' ? <Film size={10} /> : <Code2 size={10} />}
                  {item.type === 'image' ? 'Imagem' : item.type === 'video' ? 'Vídeo' : 'HTML'}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/50">
              <h4 className="font-bold text-white truncate mb-1" title={item.name}>{item.name}</h4>
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-indigo-500" />
                  <span>{item.duration}s</span>
                </div>
                <span className="truncate max-w-[120px] opacity-60">
                  {getHostnameSafely(item.url, item.type)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {state.library.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 bg-slate-900/20">
            <div className="p-6 bg-slate-900 rounded-full mb-4">
              <Upload size={48} className="opacity-20" />
            </div>
            <p className="font-medium">Nenhum conteúdo na biblioteca.</p>
            <p className="text-xs">Faça upload de vídeos ou imagens para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
