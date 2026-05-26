-- ══════════════════════════════════════════════════════════════════════════
-- Migration : wozali_candidatures_pionniers
-- Date      : 2026-05-26
-- Objectif  : Table pour les candidatures des pionniers terrain WOZALI
--             Alimentée par /postuler.html (sans connexion)
--             Lue par ds-agents-terrain dans app3.js
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wozali_candidatures_pionniers (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom      TEXT        NOT NULL,
  nom         TEXT        NOT NULL,
  telephone   TEXT,
  whatsapp    TEXT,
  email       TEXT,
  age         INTEGER,
  genre       TEXT        CHECK (genre IN ('H', 'F')),
  ville       TEXT        CHECK (ville IN ('Lomé', 'Cotonou')),
  quartier    TEXT,
  disponibilite TEXT,
  photos      TEXT,       -- JSON array d'URLs ImgBB ou virgule-separé
  pourquoi    TEXT,
  source      TEXT        DEFAULT 'wozali.africa/postuler',
  statut      TEXT        DEFAULT 'En attente'
                          CHECK (statut IN ('En attente', 'Présélectionné', 'Validé', 'Refusé')),
  actif       BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les filtres admin (statut, ville, date)
CREATE INDEX IF NOT EXISTS idx_candp_statut
  ON wozali_candidatures_pionniers(statut);

CREATE INDEX IF NOT EXISTS idx_candp_ville
  ON wozali_candidatures_pionniers(ville);

CREATE INDEX IF NOT EXISTS idx_candp_genre
  ON wozali_candidatures_pionniers(genre);

CREATE INDEX IF NOT EXISTS idx_candp_created
  ON wozali_candidatures_pionniers(created_at DESC);

-- Row Level Security
ALTER TABLE wozali_candidatures_pionniers ENABLE ROW LEVEL SECURITY;

-- INSERT public : candidats depuis /postuler.html (sans compte)
CREATE POLICY "candp_public_insert"
  ON wozali_candidatures_pionniers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- SELECT / UPDATE : utilisateurs authentifiés (admin vérifié côté frontend)
CREATE POLICY "candp_auth_read"
  ON wozali_candidatures_pionniers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "candp_auth_update"
  ON wozali_candidatures_pionniers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role : accès total (cron, scripts admin)
CREATE POLICY "candp_service_all"
  ON wozali_candidatures_pionniers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
