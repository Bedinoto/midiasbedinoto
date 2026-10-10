
import { MediaItem, Playlist, Screen } from './types';

export const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'm1',
    name: 'Promoção de Verão 2024',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    duration: 10,
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'm2',
    name: 'Teaser Nova Coleção',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    duration: 15,
    createdAt: Date.now() - 500000,
  },
  {
    id: 'm3',
    name: 'Promo Café Gourmet',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1920&q=80',
    type: 'image',
    duration: 8,
    createdAt: Date.now() - 200000,
  },
  {
    id: 'm4',
    name: 'Vídeo Demonstrativo Natureza',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type: 'video',
    duration: 15,
    createdAt: Date.now() - 100000,
  }
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'p1',
    name: 'Loop Matinal',
    items: ['m1', 'm3', 'm4'],
  },
  {
    id: 'p2',
    name: 'Especial de Fim de Semana',
    items: ['m2', 'm1', 'm4'],
  }
];

export const INITIAL_SCREENS: Screen[] = [
  {
    id: 'scr-main-lobby',
    name: 'TV Recepção Principal',
    status: 'online',
    lastSeen: Date.now(),
    currentPlaylistId: 'p1',
  },
  {
    id: 'scr-food-court',
    name: 'Praça de Alimentação A',
    status: 'offline',
    lastSeen: Date.now() - 3600000,
    currentPlaylistId: 'p2',
  }
];
