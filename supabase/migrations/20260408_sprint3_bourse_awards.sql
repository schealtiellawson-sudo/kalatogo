-- Sprint 3 — Bourse de Croissance + WOLO Awards + Score WOLO
-- À exécuter dans Supabase SQL Editor

-- 1) Table votes_awards
CREATE TABLE IF NOT EXISTS votes_awards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  votant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  candidat_id text NOT NULL,
  mois text NOT NULL,
  pays_candidat text,
  phase text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(votant_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_votes_candidat ON votes_awards(candidat_id, mois);
CREATE INDEX IF NOT EXISTS idx_votes_votant ON votes_awards(votant_id, mois);

-- 2) Colonnes profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pro_since timestamptz,
  ADD COLUMN IF NOT EXISTS derniere_activite timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS score_wolo integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pays text DEFAULT 'Togo',
  ADD COLUMN IF NOT EXISTS cherche_emploi boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nb_posts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_likes_recus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_commentaires_recus integer DEFAULT 0;

-- 3) Stub RPC incrémenter votes (logique réelle gérée côté Edge Function/Airtable)
CREATE OR REPLACE FUNCTION incrementer_votes(p_candidat_id text)
RETURNS void AS $$
BEGIN
  NULL;
END;
$$ LANGUAGE plpgsql;
