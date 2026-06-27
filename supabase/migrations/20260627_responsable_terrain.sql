-- Migration : Rôle Responsable Réseau Terrain
-- À appliquer dans Supabase SQL Editor
-- 2026-06-27

-- Ajouter la colonne role à agents_terrain
-- Valeurs possibles : 'agent' (défaut) | 'responsable'
ALTER TABLE agents_terrain
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('agent', 'responsable'));

-- Pour promouvoir un agent au rôle de Responsable :
-- UPDATE agents_terrain SET role = 'responsable' WHERE user_id = '<uuid>';

-- Index pour accélérer la détection
CREATE INDEX IF NOT EXISTS idx_agents_terrain_role
  ON agents_terrain (user_id, role, actif);

-- RLS : le responsable peut voir TOUS les agents de son équipe (lecture seule)
-- Le responsable ne peut modifier que sa propre ligne
-- Les modifications admin restent via le panel admin uniquement
