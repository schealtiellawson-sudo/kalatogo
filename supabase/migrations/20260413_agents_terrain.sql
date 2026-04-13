-- ================================================================
-- Agents Terrain — table pour le suivi des agents de terrain
-- Battle H vs F + scoreboard + commissions
-- ================================================================

CREATE TABLE IF NOT EXISTS agents_terrain (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  airtable_id TEXT,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  ville TEXT NOT NULL CHECK (ville IN ('Lomé', 'Cotonou')),
  genre TEXT NOT NULL CHECK (genre IN ('H', 'F')),
  code_parrainage TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_agents_terrain_actif ON agents_terrain(actif);
CREATE INDEX IF NOT EXISTS idx_agents_terrain_ville ON agents_terrain(ville);
CREATE INDEX IF NOT EXISTS idx_agents_terrain_genre ON agents_terrain(genre);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_terrain_telephone ON agents_terrain(telephone) WHERE telephone IS NOT NULL;

-- RLS : seul le service role peut accéder (admin backend)
ALTER TABLE agents_terrain ENABLE ROW LEVEL SECURITY;

-- Pas de policy côté client — accès uniquement via service_role (API backend)
