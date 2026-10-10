
-- ==========================================
-- ADCAST CLOUD - CONFIGURAÇÃO E PERMISSÕES COMPLETAS V4
-- ==========================================

-- 1. Garantir que as tabelas existem com integridade e cascata
CREATE TABLE IF NOT EXISTS adcast_media (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adcast_playlists (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adcast_playlist_items (
  id BIGSERIAL PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES adcast_playlists(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES adcast_media(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adcast_screens (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current_playlist_id TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  refresh_key TEXT DEFAULT '1'
);

-- Adicionar coluna refresh_key se não existir
ALTER TABLE adcast_screens ADD COLUMN IF NOT EXISTS refresh_key TEXT DEFAULT '1';

-- 2. Garantir que as tabelas enviem dados completos para o Realtime (inclusive DELETE)
ALTER TABLE adcast_media REPLICA IDENTITY FULL;
ALTER TABLE adcast_playlists REPLICA IDENTITY FULL;
ALTER TABLE adcast_playlist_items REPLICA IDENTITY FULL;
ALTER TABLE adcast_screens REPLICA IDENTITY FULL;

-- 3. Habilitar Realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  adcast_media, 
  adcast_playlists, 
  adcast_playlist_items, 
  adcast_screens;

-- 4. Desativar RLS para evitar bloqueio silencioso de permissão
ALTER TABLE adcast_media DISABLE ROW LEVEL SECURITY;
ALTER TABLE adcast_playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE adcast_playlist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE adcast_screens DISABLE ROW LEVEL SECURITY;

-- 5. Conceder permissões COMPLETAS (SELECT, INSERT, UPDATE, DELETE)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

