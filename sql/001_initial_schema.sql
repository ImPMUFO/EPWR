-- Players table
CREATE TABLE IF NOT EXISTS players (
  telegram_id BIGINT PRIMARY KEY,
  telegram_username TEXT,
  first_name TEXT NOT NULL,
  language_code TEXT DEFAULT 'fa',
  commander_name TEXT NOT NULL,
  realm_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  gold BIGINT NOT NULL DEFAULT 1000,
  gems BIGINT NOT NULL DEFAULT 50,
  food BIGINT NOT NULL DEFAULT 500,
  wood BIGINT NOT NULL DEFAULT 500,
  stone BIGINT NOT NULL DEFAULT 500,
  iron BIGINT NOT NULL DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realms table
CREATE TABLE IF NOT EXISTS realms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_telegram_id BIGINT NOT NULL UNIQUE REFERENCES players(telegram_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  map_x INTEGER NOT NULL,
  map_y INTEGER NOT NULL,
  territory_level INTEGER NOT NULL DEFAULT 1,
  wall_level INTEGER NOT NULL DEFAULT 0,
  population INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(map_x, map_y)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();