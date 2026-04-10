-- ============================================================
-- Sprint 8 — Tables manquantes Feed Social WOLO
-- Exécuté le 2026-04-10 sur Supabase SQL Editor
-- ============================================================

-- 1) Table wolo_match_demandes (mise en relation client/prestataire)
CREATE TABLE IF NOT EXISTS wolo_match_demandes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  metier_recherche text,
  ville text,
  budget_max integer,
  statut text NOT NULL DEFAULT 'ouvert',
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_match_client ON wolo_match_demandes(client_id);
CREATE INDEX IF NOT EXISTS idx_match_statut ON wolo_match_demandes(statut);
CREATE INDEX IF NOT EXISTS idx_match_metier ON wolo_match_demandes(metier_recherche);

-- RLS
ALTER TABLE wolo_match_demandes ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les demandes ouvertes
CREATE POLICY "match_public_read" ON wolo_match_demandes FOR SELECT USING (true);
-- Le client peut créer ses demandes
CREATE POLICY "match_client_insert" ON wolo_match_demandes FOR INSERT WITH CHECK (auth.uid() = client_id);
-- Le client peut mettre à jour ses demandes
CREATE POLICY "match_client_update" ON wolo_match_demandes FOR UPDATE USING (auth.uid() = client_id);
-- Les prestataires peuvent aussi mettre à jour le statut (répondre)
CREATE POLICY "match_presta_update" ON wolo_match_demandes FOR UPDATE USING (true);

-- 2) Ajouter la colonne photos (jsonb array) à wolo_posts pour le multi-photo
ALTER TABLE wolo_posts ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- 3) Colonnes profiles étendues (si manquantes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abonnement text DEFAULT 'Base';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metier text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ville text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quartier text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pays text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS score_wolo integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS derniere_activite timestamptz;
