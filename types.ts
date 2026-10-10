
export type MediaType = 'image' | 'video' | 'html';

export interface MediaItem {
  id: string;
  name: string;
  url: string; // Para tipo 'html', este campo guardará o código fonte
  type: MediaType;
  duration: number; // seconds
  createdAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: string[]; // IDs of MediaItems
}

export interface Screen {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: number;
  currentPlaylistId: string | null;
}

export type ViewType = 'dashboard' | 'screens' | 'playlists' | 'library' | 'player';

export interface AppState {
  screens: Screen[];
  playlists: Playlist[];
  library: MediaItem[];
  syncId?: string; // Token para acesso remoto
  lastCloudSync?: number;
}
