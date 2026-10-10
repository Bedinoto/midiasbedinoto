
import { AppState, MediaItem, Playlist, Screen } from '../types';
import { INITIAL_MEDIA, INITIAL_PLAYLISTS, INITIAL_SCREENS } from '../constants';
import { supabase } from './supabase';

const STORAGE_PROJECT_KEY = 'adcast_project_id';

export const getActiveProjectId = (): string | null => {
  return localStorage.getItem(STORAGE_PROJECT_KEY);
};

export const setActiveProjectId = (id: string | null) => {
  if (id) localStorage.setItem(STORAGE_PROJECT_KEY, id);
  else localStorage.removeItem(STORAGE_PROJECT_KEY);
};

export const uploadFile = async (file: File, projectId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, file, {
      cacheControl: '31536000',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const loadRemoteState = async (projectId: string): Promise<AppState | null> => {
  try {
    const [mediaRes, playlistRes, screensRes] = await Promise.all([
      supabase.from('adcast_media').select('*').eq('project_id', projectId),
      supabase.from('adcast_playlists').select('*').eq('project_id', projectId),
      supabase.from('adcast_screens').select('*').eq('project_id', projectId)
    ]);

    if (mediaRes.error) throw mediaRes.error;
    if (playlistRes.error) throw playlistRes.error;
    if (screensRes.error) throw screensRes.error;

    const playlistIds = playlistRes.data.map(p => p.id);
    const playlistItemsRes = playlistIds.length > 0 
      ? await supabase.from('adcast_playlist_items').select('*').in('playlist_id', playlistIds)
      : { data: [], error: null };

    if (playlistItemsRes.error) throw playlistItemsRes.error;

    const playlists: Playlist[] = playlistRes.data.map(p => {
      const items = playlistItemsRes.data
        ?.filter(pi => pi.playlist_id === p.id)
        .sort((a, b) => a.position - b.position)
        .map(pi => pi.media_id) || [];
      
      return { id: p.id, name: p.name, items };
    });

    return {
      syncId: projectId,
      library: mediaRes.data.map(m => ({
        id: m.id,
        name: m.name,
        url: m.url,
        type: m.type as any,
        duration: m.duration,
        createdAt: new Date(m.created_at).getTime()
      })),
      playlists: playlists,
      screens: screensRes.data.map(s => ({
        id: s.id,
        name: s.name,
        currentPlaylistId: s.current_playlist_id,
        status: (Date.now() - new Date(s.last_seen).getTime() < 180000) ? 'online' : 'offline',
        lastSeen: new Date(s.last_seen).getTime()
      }))
    };
  } catch (e) {
    console.error('❌ Erro ao carregar estado remoto:', e);
    return null;
  }
};

export const saveStateToCloud = async (state: AppState) => {
  if (!state.syncId) return;
  try {
    const projectId = state.syncId;
    
    if (state.library.length > 0) {
      const mediaToUpsert = state.library.map(m => ({
        id: m.id,
        project_id: projectId,
        name: m.name,
        url: m.url,
        type: m.type,
        duration: m.duration
      }));
      await supabase.from('adcast_media').upsert(mediaToUpsert);
    }

    if (state.playlists.length > 0) {
      await supabase.from('adcast_playlists').upsert(
        state.playlists.map(p => ({ id: p.id, project_id: projectId, name: p.name }))
      );

      for (const playlist of state.playlists) {
        await supabase.from('adcast_playlist_items').delete().eq('playlist_id', playlist.id);
        if (playlist.items.length > 0) {
          const itemsToInsert = playlist.items.map((mediaId, index) => ({
            playlist_id: playlist.id,
            media_id: mediaId,
            position: index
          }));
          await supabase.from('adcast_playlist_items').insert(itemsToInsert);
        }
      }
    }

    if (state.screens.length > 0) {
      await supabase.from('adcast_screens').upsert(
        state.screens.map(s => ({
          id: s.id,
          project_id: projectId,
          name: s.name,
          current_playlist_id: s.currentPlaylistId,
          status: s.status,
          // Fix: Use lastSeen property from Screen interface instead of snake_case last_seen to fix property existence error
          last_seen: new Date(s.lastSeen).toISOString()
        }))
      );
    }
  } catch (e) {
    console.error('❌ Erro na Sincronização Cloud:', e);
    throw e;
  }
};

export const deleteMediaFromCloud = async (mediaId: string, mediaUrl?: string) => {
  // 1. Remove referências em playlists no banco de dados
  const { error: itemsError } = await supabase
    .from('adcast_playlist_items')
    .delete()
    .eq('media_id', mediaId);

  if (itemsError) {
    console.warn('Aviso ao remover itens vinculados em adcast_playlist_items:', itemsError.message);
  }

  // 2. Remove registro da tabela adcast_media
  const { error } = await supabase
    .from('adcast_media')
    .delete()
    .eq('id', mediaId);

  if (error) {
    console.error('Erro ao deletar de adcast_media:', error);
    throw error;
  }

  // 3. Se for arquivo armazenado no Supabase Storage (bucket media), remove o arquivo físico
  if (mediaUrl) {
    try {
      const match = mediaUrl.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1]);
        await supabase.storage.from('media').remove([filePath]);
      }
    } catch (storageErr) {
      console.warn('Aviso: arquivo não pôde ser removido do storage (pode já ter sido removido):', storageErr);
    }
  }
};

export const deletePlaylistFromCloud = async (playlistId: string) => {
  await supabase.from('adcast_playlist_items').delete().eq('playlist_id', playlistId);
  const { error } = await supabase.from('adcast_playlists').delete().eq('id', playlistId);
  if (error) throw error;
};

export const deleteScreenFromCloud = async (screenId: string) => {
  const { error } = await supabase.from('adcast_screens').delete().eq('id', screenId);
  if (error) throw error;
};

export const createNewProject = async (): Promise<string | null> => {
  const projectId = `prj-${Math.random().toString(36).substr(2, 9)}`;
  try {
    await supabase.from('adcast_media').insert(
      INITIAL_MEDIA.map(m => ({ ...m, project_id: projectId, created_at: new Date().toISOString() }))
    );
    await supabase.from('adcast_playlists').insert(
      INITIAL_PLAYLISTS.map(p => ({ id: p.id, name: p.name, project_id: projectId }))
    );
    for (const p of INITIAL_PLAYLISTS) {
      await supabase.from('adcast_playlist_items').insert(
        p.items.map((mid, idx) => ({ playlist_id: p.id, media_id: mid, position: idx }))
      );
    }
    return projectId;
  } catch (e) {
    console.error('Erro ao criar projeto:', e);
    return null;
  }
};

export const updateScreenHeartbeat = async (screenId: string, syncId?: string) => {
  if (!syncId) return;
  try {
    // Usamos uma atualização mínima para reduzir o payload de egress
    await supabase
      .from('adcast_screens')
      .update({ 
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', screenId);
  } catch (e) {
    // Falha silenciosa para não interromper o player
  }
};

export const loadScreensOnly = async (projectId: string): Promise<Screen[]> => {
  const { data, error } = await supabase
    .from('adcast_screens')
    .select('*')
    .eq('project_id', projectId);
    
  if (error) return [];
  
  return data.map(s => ({
    id: s.id,
    name: s.name,
    currentPlaylistId: s.current_playlist_id,
    status: (Date.now() - new Date(s.last_seen).getTime() < 180000) ? 'online' : 'offline',
    lastSeen: new Date(s.last_seen).getTime()
  }));
};

export const forceScreenUpdate = async (screenId: string) => {
  const newKey = Math.random().toString(36).substring(7);
  const { error } = await supabase
    .from('adcast_screens')
    .update({ refresh_key: newKey })
    .eq('id', screenId);
  
  if (error) throw error;
};

export const subscribeToProjectChanges = (syncId: string, callback: (payload: any) => void) => {
  const channelName = `realtime_project_${syncId}_${Math.random().toString(36).substring(7)}`;
  
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'adcast_media' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'adcast_playlists' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'adcast_playlist_items' }, callback)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'adcast_screens' }, callback);
};

export const getLiveScreensStatus = async (syncId: string) => {
  try {
    const { data, error } = await supabase
      .from('adcast_screens')
      .select('id, last_seen')
      .eq('project_id', syncId);
    if (error) throw error;
    return data?.map(s => ({ screen_id: s.id, last_seen: s.last_seen })) || [];
  } catch (e) {
    return [];
  }
};

export const checkSupabaseHealth = async () => {
  try {
    const results = await Promise.all([
      supabase.from('adcast_media').select('count', { count: 'exact', head: true }),
      supabase.from('adcast_playlists').select('count', { count: 'exact', head: true }),
      supabase.from('adcast_playlist_items').select('count', { count: 'exact', head: true }),
      supabase.from('adcast_screens').select('count', { count: 'exact', head: true })
    ]);
    const tables = {
      'Mídias': !results[0].error,
      'Playlists': !results[1].error,
      'Itens': !results[2].error,
      'Telas': !results[3].error
    };
    return { connected: Object.values(tables).every(s => s === true), tables };
  } catch (e) {
    return { connected: false, tables: {} };
  }
};
