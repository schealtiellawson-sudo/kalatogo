-- ================================================================
-- Sprint 7 — Système de récompenses mensuelles
-- Bourse de Croissance (300k) + WOLO Awards (100k)
-- À coller dans Supabase SQL Editor
-- ================================================================

-- ════════════════════════════════════════
-- 1) COLONNES PROFILES (ajouts)
-- ════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vues_mois integer DEFAULT 0;

-- ════════════════════════════════════════
-- 2) TABLE bourse_croissance
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bourse_croissance (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mois                  text NOT NULL,  -- format 'YYYY-MM'
  eligible              boolean DEFAULT false,
  score_wolo            integer,
  nb_avis               integer,
  note_moyenne          numeric,
  pro_mois_consecutifs  integer,
  gagnant               boolean DEFAULT false,
  montant_gagne         integer DEFAULT 300000,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(user_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_bourse_mois ON bourse_croissance(mois);
CREATE INDEX IF NOT EXISTS idx_bourse_eligible ON bourse_croissance(mois, eligible);
CREATE INDEX IF NOT EXISTS idx_bourse_gagnant ON bourse_croissance(mois, gagnant);

-- ════════════════════════════════════════
-- 3) TABLE wolo_awards
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wolo_awards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mois              text NOT NULL,  -- format 'YYYY-MM'
  pays              text CHECK (pays IN ('BJ', 'TG')),
  video_url         text,
  video_validee     boolean DEFAULT false,
  nb_votes          integer DEFAULT 0,
  gagnant           boolean DEFAULT false,
  vice_champion     boolean DEFAULT false,
  montant_gagne     integer DEFAULT 100000,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_awards_mois ON wolo_awards(mois);
CREATE INDEX IF NOT EXISTS idx_awards_pays ON wolo_awards(mois, pays);
CREATE INDEX IF NOT EXISTS idx_awards_gagnant ON wolo_awards(mois, gagnant);

-- ════════════════════════════════════════
-- 4) TABLE votes_awards (upgrade Sprint 3 → Sprint 7)
-- ════════════════════════════════════════
-- Sprint 3 avait créé votes_awards avec candidat_id TEXT
-- On la recrée proprement avec FK vers wolo_awards

-- Supprimer l'ancienne version si vide
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'votes_awards' AND table_schema = 'public') THEN
    -- Si la table a des données, on la renomme en backup
    IF (SELECT count(*) FROM votes_awards) > 0 THEN
      ALTER TABLE votes_awards RENAME TO votes_awards_legacy;
    ELSE
      DROP TABLE votes_awards;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS votes_awards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  votant_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  candidat_id   uuid REFERENCES wolo_awards(id) ON DELETE CASCADE,
  mois          text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(votant_id, mois)   -- Un votant = un seul vote par mois
);

CREATE INDEX IF NOT EXISTS idx_votes_candidat_v2 ON votes_awards(candidat_id, mois);
CREATE INDEX IF NOT EXISTS idx_votes_votant_v2 ON votes_awards(votant_id, mois);

-- ════════════════════════════════════════
-- 5) TABLE gains_recompenses (historique)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gains_recompenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type        text CHECK (type IN ('bourse_croissance', 'wolo_awards')),
  montant     integer NOT NULL,
  mois        text NOT NULL,
  statut      text DEFAULT 'versé',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gains_user ON gains_recompenses(user_id);
CREATE INDEX IF NOT EXISTS idx_gains_mois ON gains_recompenses(mois, type);

-- ════════════════════════════════════════
-- 6) RLS (Row Level Security)
-- ════════════════════════════════════════
ALTER TABLE bourse_croissance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gains_recompenses ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les résultats sont publics)
CREATE POLICY "bourse_read_all" ON bourse_croissance FOR SELECT USING (true);
CREATE POLICY "awards_read_all" ON wolo_awards FOR SELECT USING (true);
CREATE POLICY "votes_read_all" ON votes_awards FOR SELECT USING (true);
CREATE POLICY "gains_read_all" ON gains_recompenses FOR SELECT USING (true);

-- Insertion par le propriétaire (votes)
CREATE POLICY "votes_insert_own" ON votes_awards FOR INSERT
  WITH CHECK (auth.uid() = votant_id);

-- Insertion/modification par service role uniquement pour les tables admin
-- (les crons utilisent service_role donc pas besoin de policy INSERT/UPDATE supplémentaire)

-- ════════════════════════════════════════
-- 7) FONCTION reset_vues_mois (1er du mois)
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION reset_vues_mois()
RETURNS void AS $$
BEGIN
  UPDATE profiles SET vues_mois = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════
-- 8) FONCTION incrémenter vues
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_vues_mois(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET vues_mois = COALESCE(vues_mois, 0) + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
