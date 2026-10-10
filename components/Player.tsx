import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, MediaItem } from '../types';
import { getActiveProjectId, updateScreenHeartbeat, loadRemoteState, subscribeToProjectChanges } from '../services/storage';
import { supabase } from '../services/supabase';
import { Loader2, Monitor, Wifi, WifiOff, RotateCcw, Maximize2, RefreshCw, DownloadCloud } from 'lucide-react';

interface PlayerProps {
  screenId: string;
}

const SafeHTML = React.memo(({ html }: { html: string }) => {
  return (
    <div 
      className="w-full h-full flex items-center justify-center bg-white"
      dangerouslySetInnerHTML={useMemo(() => ({ __html: html }), [html])}
    />
  );
});

export const Player: React.FC<PlayerProps> = ({ screenId }) => {
  const [state, setState] = useState<AppState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [canInstall, setCanInstall] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<Record<string, string>>({});
  
  const lastSyncRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  const fetchData = async (syncId: string, retryCount = 0) => {
    try {
      const remoteState = await loadRemoteState(syncId);
      if (remoteState) {
        setState(remoteState);
        lastSyncRef.current = Date.now();
        const currentScreen = remoteState.screens.find(s => s.id === screenId);
        updateScreenHeartbeat(screenId, syncId);
      }
    } catch (err) {
      console.error("[Player] Erro ao buscar dados:", err);
      if (retryCount < 3) {
        setTimeout(() => fetchData(syncId, retryCount + 1), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSyncId = params.get('sync');
    const savedSyncId = getActiveProjectId();
    const targetSyncId = urlSyncId || savedSyncId;

    if (!targetSyncId) {
      setLoading(false);
      return;
    }

    fetchData(targetSyncId).then(() => setLoading(false));

    // Monitora se o PWA pode ser instalado
    const checkInstallPrompt = setInterval(() => {
      if ((window as any).deferredPrompt) {
        setCanInstall(true);
        clearInterval(checkInstallPrompt);
      }
    }, 1000);

    const setupSubscription = () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }

      const channel = subscribeToProjectChanges(targetSyncId, async (payload) => {
        if (payload.table === 'adcast_screens') {
          const isSelf = payload.new.id === screenId;
          const playlistChanged = payload.new.current_playlist_id !== payload.old?.current_playlist_id;
          const refreshTriggered = payload.new.refresh_key !== payload.old?.refresh_key;

          if (isSelf && (playlistChanged || refreshTriggered)) {
            fetchData(targetSyncId);
          }
          return;
        }
        fetchData(targetSyncId);
      });

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsOnline(false);
          setTimeout(setupSubscription, 10000);
        } else if (status === 'SUBSCRIBED') {
          setIsOnline(true);
        }
      });

      subscriptionRef.current = channel;
    };

    setupSubscription();

    const handleOnline = () => {
      setIsOnline(true);
      fetchData(targetSyncId);
      setupSubscription();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      updateScreenHeartbeat(screenId, targetSyncId);
      if (Date.now() - lastSyncRef.current > 600000) {
        fetchData(targetSyncId);
      }
    }, 120000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      clearInterval(interval);
      clearInterval(checkInstallPrompt);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [screenId]);

  const currentItems = useMemo(() => {
    const screen = state?.screens.find(s => s.id === screenId);
    if (!screen || !screen.currentPlaylistId) return [];
    
    const playlist = state?.playlists.find(p => p.id === screen.currentPlaylistId);
    if (!playlist) return [];

    return playlist.items
      .map(id => state?.library.find(item => item.id === id))
      .filter(Boolean) as MediaItem[];
  }, [state, screenId]);

  useEffect(() => {
    let active = true;
    
    const preloadItems = async () => {
      const currentUrlsSet = new Set(currentItems.map(item => item.url));
      
      // Cleanup of old blob URLs that are no longer in the playlist
      const newBlobUrls = { ...blobUrlsRef.current };
      let changed = false;
      
      for (const url in newBlobUrls) {
        if (!currentUrlsSet.has(url)) {
          URL.revokeObjectURL(newBlobUrls[url]);
          delete newBlobUrls[url];
          changed = true;
        }
      }

      // Preload new items
      for (const item of currentItems) {
        if (item.type !== 'image' && item.type !== 'video') continue;
        
        if (!newBlobUrls[item.url]) {
          try {
            const res = await fetch(item.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const localUrl = URL.createObjectURL(blob);
            newBlobUrls[item.url] = localUrl;
            changed = true;
          } catch (e) {
            console.error("[Player] Falha ao pré-carregar mídia:", item.url, e);
          }
        }
      }

      if (active && changed) {
        blobUrlsRef.current = newBlobUrls;
        setBlobUrls(newBlobUrls);
      }
    };

    if (currentItems.length > 0) {
      preloadItems();
    }

    return () => {
      active = false;
    };
  }, [currentItems]);

  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    if (currentItems.length > 0) {
      const activeItem = currentItems[currentIndex];
      if (!activeItem) {
        setCurrentIndex(0);
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);

      if (activeItem.type !== 'video') {
        const duration = (activeItem.duration || 10) * 1000;
        timerRef.current = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % currentItems.length);
        }, duration);
      }
    }
  }, [currentIndex, currentItems]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleInstallClick = async () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPrompt = null;
        setCanInstall(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-xl font-medium tracking-tight">Carregando Programação...</p>
      </div>
    );
  }

  const screen = state?.screens.find(s => s.id === screenId);

  if (!screen || currentItems.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-10 text-center relative">
        <Monitor size={100} className="mb-8 opacity-10" />
        <h2 className="text-3xl font-black text-white uppercase mb-2">Sem Programação</h2>
        <p className="text-slate-400 mb-6 max-w-md italic font-mono">ID: {screenId}</p>
        
        <div className="flex flex-col gap-4 items-center">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs ${isOnline ? 'bg-slate-950 border-slate-800 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Conectado à Nuvem' : 'Tentando Reconectar...'}
          </div>
          
          {canInstall && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl animate-bounce"
            >
              <DownloadCloud size={20} />
              INSTALAR NESTA TV
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeItem = currentItems[currentIndex];
  const handleMediaEnd = () => setCurrentIndex((prev) => (prev + 1) % currentItems.length);

  return (
    <div 
      ref={playerRef}
      className="h-screen w-screen bg-black overflow-hidden relative select-none cursor-none group"
      onMouseMove={() => {
        setShowControls(true);
        setTimeout(() => setShowControls(false), 3000);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {activeItem.type === 'image' ? (
          <img 
            src={blobUrls[activeItem.url] || activeItem.url} 
            alt={activeItem.name} 
            className="w-full h-full object-cover animate-in fade-in duration-700"
            key={activeItem.id} 
          />
        ) : activeItem.type === 'video' ? (
          <video 
            src={blobUrls[activeItem.url] || activeItem.url} 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleMediaEnd}
            key={activeItem.id}
          />
        ) : (
          <SafeHTML html={activeItem.url} key={activeItem.id} />
        )}
      </div>

      {!isOnline && (
        <div className="absolute bottom-6 right-6 z-[60] flex items-center gap-3 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-2xl animate-bounce">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Erro de Rede</span>
        </div>
      )}

      <div className={`absolute top-0 inset-x-0 p-6 flex justify-between items-start z-50 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-white text-[10px] font-black uppercase tracking-widest">{screen.name}</span>
        </div>
        
        <div className="flex gap-2">
          {canInstall && (
            <button 
              onClick={handleInstallClick} 
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full border border-white/10 shadow-lg transition-all flex items-center justify-center group/inst"
              title="Instalar App nesta TV"
            >
              <DownloadCloud size={18} className="group-hover/inst:scale-110 transition-transform" />
            </button>
          )}
          <button 
            onClick={toggleFullscreen} 
            className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            title="Tela Cheia"
          >
            <Maximize2 size={18} />
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            title="Recarregar Player"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full z-50">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
          style={{ 
            animation: activeItem.type !== 'video' 
              ? `player-progress ${(activeItem.duration || 10)}s linear forwards` 
              : 'none' 
          }}
          key={`progress-${activeItem.id}-${currentIndex}`}
        />
      </div>

      <style>{`
        @keyframes player-progress { from { width: 0%; } to { width: 100%; } }
        .w-full iframe { width: 100vw; height: 100vh; border: none; position: fixed; top: 0; left: 0; }
      `}</style>
    </div>
  );
};