-- ============================================================
-- WOZALI Jobs — « Le travail te trouve » (marche 1)
-- Migration NON-CASSANTE : colonnes nullable, IF NOT EXISTS.
-- Onboarding vocal Sandy -> CV vivant + 2 scores + Ouvert au travail
-- + accessibilite (sait_lire) + cache voix Celine.
-- ============================================================

-- ---------- wolo_prestataires : profil emploi enrichi ----------
ALTER TABLE wozali_prestataires
  ADD COLUMN IF NOT EXISTS ouvert_au_travail   boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS emploi_prefs        jsonb,          -- { metiers_vises:[], rayon_km:int, types_contrat:[] }
  ADD COLUMN IF NOT EXISTS cluster_metier      text,           -- couture|electricite|vente|coiffure|maconnerie|mecanique|restauration|menage|transport|generic
  ADD COLUMN IF NOT EXISTS competences         text[],         -- IDs canoniques (taxonomie Tabiya/ESCO)
  ADD COLUMN IF NOT EXISTS competences_brut    text[],         -- spans valides par l'utilisateur (avant liaison)
  ADD COLUMN IF NOT EXISTS presentation_pro    text,           -- version reecrite par Sandy (ameliorerCv)
  ADD COLUMN IF NOT EXISTS niveau_etudes       text,           -- reponse libre (ex: "CAP couture", "appris sur le tas")
  ADD COLUMN IF NOT EXISTS a_diplome           boolean,        -- extrait par l'IA, confirme par l'utilisateur
  ADD COLUMN IF NOT EXISTS score_competence    integer,        -- 0-100, bati sur preuve de travail + situationnel
  ADD COLUMN IF NOT EXISTS score_fiabilite     numeric(3,1),   -- 0-5, ponctualite + missions menees + avis
  ADD COLUMN IF NOT EXISTS onboarding_transcript text,         -- transcript FR (l'audio brut est supprime apres extraction)
  ADD COLUMN IF NOT EXISTS metier_details      jsonb,          -- reponses aux questions specifiques metier
  ADD COLUMN IF NOT EXISTS sait_lire           boolean   DEFAULT true;  -- false => mode voix auto (jamais affiche comme "analphabete")

-- Index sur les colonnes qu'on vient d'ajouter (garanties presentes)
CREATE INDEX IF NOT EXISTS idx_prest_ouvert_cluster
  ON wozali_prestataires (ouvert_au_travail, cluster_metier)
  WHERE ouvert_au_travail = true;

-- ---------- wolo_offres_emploi : charge de lecture ----------
-- On tague l'OFFRE, jamais le travailleur. Le matching previent (sans bloquer)
-- un non-lecteur avant une offre "requise".
ALTER TABLE wozali_offres_emploi
  ADD COLUMN IF NOT EXISTS charge_lecture text DEFAULT 'minimale';  -- aucune | minimale | requise

-- ---------- Cache voix Sandy (Celine) ----------
-- Toute phrase dynamique de Sandy passe par Celine puis est cachee (R2/URL).
-- Cle = hash normalise du texte + voix. Evite de regenerer le meme audio.
CREATE TABLE IF NOT EXISTS wozali_sandy_audio_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash   text NOT NULL,                 -- sha256(norm(texte) + voice_id + lang)
  texte       text NOT NULL,
  lang        text NOT NULL DEFAULT 'fr',
  voice_id    text NOT NULL DEFAULT '57ccb351-84d7-54ba-afd4-26b566ca6023', -- Celine
  audio_url   text NOT NULL,                 -- URL R2 du mp3
  created_at  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sandy_audio_hash ON wozali_sandy_audio_cache (text_hash);

-- RLS : lecture publique du cache audio (ce sont des invites Sandy generiques,
-- pas des donnees perso), ecriture reservee au service role (backend).
ALTER TABLE wozali_sandy_audio_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_sandy_audio_cache' AND policyname='sandy_audio_public_read') THEN
    CREATE POLICY sandy_audio_public_read ON wozali_sandy_audio_cache FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================
-- Verification rapide (a lancer apres) :
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='wolo_prestataires' AND column_name IN
--     ('ouvert_au_travail','competences','score_competence','sait_lire');
--   SELECT COUNT(*) FROM wozali_sandy_audio_cache;
-- ============================================================
