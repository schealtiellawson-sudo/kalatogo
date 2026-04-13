-- ================================================================
-- Sprint 13 — WOLO Awards avec catégories (Coiffure + Couture)
-- À coller dans Supabase SQL Editor
-- ================================================================

-- ════════════════════════════════════════
-- 1) AJOUTER COLONNES À wolo_awards
-- ════════════════════════════════════════
ALTER TABLE wolo_awards
  ADD COLUMN IF NOT EXISTS categorie text DEFAULT 'coiffure'
    CHECK (categorie IN ('coiffure', 'couture')),
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS phase text DEFAULT 'qualifications'
    CHECK (phase IN ('qualifications', 'finale'));

-- Modifier le montant par défaut : 50 000 au lieu de 100 000
ALTER TABLE wolo_awards ALTER COLUMN montant_gagne SET DEFAULT 50000;

-- Supprimer l'ancienne contrainte UNIQUE(user_id, mois)
-- et la remplacer par UNIQUE(user_id, mois, categorie)
-- (1 candidature par membre par mois PAR CATÉGORIE)
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wolo_awards_user_id_mois_key'
  ) THEN
    ALTER TABLE wolo_awards DROP CONSTRAINT wolo_awards_user_id_mois_key;
  END IF;
END $$;

ALTER TABLE wolo_awards
  ADD CONSTRAINT wolo_awards_user_id_mois_categorie_key
  UNIQUE(user_id, mois, categorie);

-- Index par catégorie
CREATE INDEX IF NOT EXISTS idx_awards_categorie ON wolo_awards(mois, categorie);
CREATE INDEX IF NOT EXISTS idx_awards_phase ON wolo_awards(mois, phase);

-- ════════════════════════════════════════
-- 2) ANTI-ABUS : empêcher self-vote
-- ════════════════════════════════════════
-- Le votant ne peut pas être le candidat lui-même
CREATE OR REPLACE FUNCTION check_no_self_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM wolo_awards
    WHERE id = NEW.candidat_id AND user_id = NEW.votant_id
  ) THEN
    RAISE EXCEPTION 'Tu ne peux pas voter pour ta propre candidature.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_self_vote ON votes_awards;
CREATE TRIGGER trg_no_self_vote
  BEFORE INSERT ON votes_awards
  FOR EACH ROW EXECUTE FUNCTION check_no_self_vote();

-- ════════════════════════════════════════
-- 3) ANTI-ABUS : délai post-inscription (10 min)
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_vote_delay()
RETURNS TRIGGER AS $$
DECLARE
  account_age interval;
BEGIN
  SELECT (now() - created_at) INTO account_age
  FROM auth.users WHERE id = NEW.votant_id;

  IF account_age < interval '10 minutes' THEN
    RAISE EXCEPTION 'Ton compte est trop récent pour voter. Réessaie dans quelques minutes.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vote_delay ON votes_awards;
CREATE TRIGGER trg_vote_delay
  BEFORE INSERT ON votes_awards
  FOR EACH ROW EXECUTE FUNCTION check_vote_delay();

-- ════════════════════════════════════════
-- 4) FONCTION incrémenter nb_votes automatiquement
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_awards_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wolo_awards SET nb_votes = nb_votes + 1 WHERE id = NEW.candidat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_votes ON votes_awards;
CREATE TRIGGER trg_increment_votes
  AFTER INSERT ON votes_awards
  FOR EACH ROW EXECUTE FUNCTION increment_awards_votes();

-- ════════════════════════════════════════
-- 5) POLICY : insertion candidature par le propriétaire
-- ════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'awards_insert_own' AND tablename = 'wolo_awards'
  ) THEN
    CREATE POLICY "awards_insert_own" ON wolo_awards FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ════════════════════════════════════════
-- 6) Vue scoreboard pays par catégorie
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW awards_scoreboard AS
SELECT
  mois,
  categorie,
  pays,
  phase,
  SUM(nb_votes) as total_votes,
  COUNT(*) as nb_candidats
FROM wolo_awards
GROUP BY mois, categorie, pays, phase;
