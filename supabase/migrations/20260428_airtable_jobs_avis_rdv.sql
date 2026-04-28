-- ================================================================
-- Migration Airtable → Supabase — Phase 1
-- Date : 2026-04-28
-- Tables migrées : Offres d'Emploi, Candidatures, Avis, Rendez-vous
-- Raison : quota mensuel API Airtable épuisé (PUBLIC_API_BILLING_LIMIT_EXCEEDED)
-- ================================================================

-- ════════════════════════════════════════════
-- 1) WOLO_OFFRES_EMPLOI
-- Mapping depuis Airtable "Offres d'Emploi"
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wolo_offres_emploi (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id       TEXT UNIQUE,                          -- pour migration progressive
  -- Recruteur
  recruteur_user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recruteur_prestataire_id UUID REFERENCES wolo_prestataires(id) ON DELETE SET NULL,
  recruteur_nom            TEXT,
  recruteur_whatsapp       TEXT,
  recruteur_verifie        BOOLEAN DEFAULT FALSE,
  -- Offre
  titre                    TEXT NOT NULL,
  metier                   TEXT,
  description              TEXT,
  type_contrat             TEXT,
  experience_requise       TEXT,
  -- Localisation
  ville                    TEXT,
  quartier                 TEXT,
  pays                     TEXT CHECK (pays IS NULL OR pays IN ('TG','BJ')),
  teletravail              BOOLEAN DEFAULT FALSE,
  -- Salaire
  salaire_min_fcfa         INT,
  salaire_max_fcfa         INT,
  -- Photos (jusqu'à 3)
  photo_1                  TEXT,
  photo_2                  TEXT,
  photo_3                  TEXT,
  -- Statut
  active                   BOOLEAN DEFAULT TRUE,
  urgente                  BOOLEAN DEFAULT FALSE,
  date_expiration          DATE,
  -- Stats
  nb_vues                  INT DEFAULT 0,
  nb_candidatures          INT DEFAULT 0,
  -- Dates
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offres_recruteur ON wolo_offres_emploi(recruteur_user_id);
CREATE INDEX IF NOT EXISTS idx_offres_recruteur_pres ON wolo_offres_emploi(recruteur_prestataire_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON wolo_offres_emploi(active, created_at DESC) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_offres_metier ON wolo_offres_emploi(metier, ville);
CREATE INDEX IF NOT EXISTS idx_offres_quartier ON wolo_offres_emploi(quartier);
CREATE INDEX IF NOT EXISTS idx_offres_urgente ON wolo_offres_emploi(urgente) WHERE urgente = TRUE;

-- updated_at auto
CREATE OR REPLACE FUNCTION wolo_offres_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offres_updated ON wolo_offres_emploi;
CREATE TRIGGER trg_offres_updated
  BEFORE UPDATE ON wolo_offres_emploi
  FOR EACH ROW EXECUTE FUNCTION wolo_offres_updated_at();

-- ════════════════════════════════════════════
-- 2) WOLO_CANDIDATURES
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wolo_candidatures (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id       TEXT UNIQUE,
  -- Offre liée
  offre_id                 UUID REFERENCES wolo_offres_emploi(id) ON DELETE CASCADE,
  offre_airtable_id        TEXT,                                 -- compat Sprint H/I
  offre_titre              TEXT,
  -- Candidat
  candidat_user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  candidat_prestataire_id  UUID REFERENCES wolo_prestataires(id) ON DELETE SET NULL,
  candidat_nom             TEXT,
  candidat_metier          TEXT,
  candidat_whatsapp        TEXT,
  candidat_photo           TEXT,
  candidat_quartier        TEXT,
  candidat_score_wolo      INT DEFAULT 0,
  -- Recruteur (dénormalisé pour requêtes rapides)
  recruteur_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recruteur_prestataire_id UUID REFERENCES wolo_prestataires(id) ON DELETE SET NULL,
  recruteur_nom            TEXT,
  -- Contenu
  message                  TEXT,
  statut                   TEXT NOT NULL DEFAULT 'En attente'
                           CHECK (statut IN ('En attente','Vue','Retenue','Refusée')),
  date_candidature         TIMESTAMPTZ DEFAULT NOW(),
  -- Score IA (cache)
  score_ia                 INT,
  score_ia_justification   TEXT,
  -- Dates
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cand_offre ON wolo_candidatures(offre_id, date_candidature DESC);
CREATE INDEX IF NOT EXISTS idx_cand_candidat ON wolo_candidatures(candidat_user_id, date_candidature DESC);
CREATE INDEX IF NOT EXISTS idx_cand_recruteur ON wolo_candidatures(recruteur_user_id, date_candidature DESC);
CREATE INDEX IF NOT EXISTS idx_cand_statut ON wolo_candidatures(statut, date_candidature DESC);
CREATE INDEX IF NOT EXISTS idx_cand_at_id ON wolo_candidatures(airtable_record_id) WHERE airtable_record_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_cand_updated ON wolo_candidatures;
CREATE TRIGGER trg_cand_updated
  BEFORE UPDATE ON wolo_candidatures
  FOR EACH ROW EXECUTE FUNCTION wolo_offres_updated_at();

-- Auto-incrémente nb_candidatures sur l'offre
CREATE OR REPLACE FUNCTION wolo_inc_offre_nb_candidatures()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offre_id IS NOT NULL THEN
    UPDATE wolo_offres_emploi SET nb_candidatures = nb_candidatures + 1 WHERE id = NEW.offre_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cand_inc_offre ON wolo_candidatures;
CREATE TRIGGER trg_cand_inc_offre
  AFTER INSERT ON wolo_candidatures
  FOR EACH ROW EXECUTE FUNCTION wolo_inc_offre_nb_candidatures();

-- ════════════════════════════════════════════
-- 3) WOLO_AVIS (clients laissent un avis sur un prestataire)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wolo_avis (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id       TEXT UNIQUE,
  -- Prestataire évalué
  prestataire_id           UUID REFERENCES wolo_prestataires(id) ON DELETE CASCADE,
  prestataire_user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prestataire_airtable_id  TEXT,
  -- Auteur
  auteur_user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auteur_nom               TEXT,
  auteur_whatsapp          TEXT,
  auteur_photo             TEXT,
  -- Contenu
  note_globale             SMALLINT NOT NULL CHECK (note_globale BETWEEN 1 AND 5),
  note_qualite             SMALLINT CHECK (note_qualite IS NULL OR note_qualite BETWEEN 1 AND 5),
  note_ponctualite         SMALLINT CHECK (note_ponctualite IS NULL OR note_ponctualite BETWEEN 1 AND 5),
  note_communication       SMALLINT CHECK (note_communication IS NULL OR note_communication BETWEEN 1 AND 5),
  commentaire              TEXT,
  -- Modération
  validated                BOOLEAN DEFAULT TRUE,
  flagged                  BOOLEAN DEFAULT FALSE,
  -- Dates
  date_avis                DATE DEFAULT CURRENT_DATE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avis_prest ON wolo_avis(prestataire_id, date_avis DESC) WHERE validated = TRUE;
CREATE INDEX IF NOT EXISTS idx_avis_prest_user ON wolo_avis(prestataire_user_id, date_avis DESC) WHERE validated = TRUE;
CREATE INDEX IF NOT EXISTS idx_avis_auteur ON wolo_avis(auteur_user_id);

DROP TRIGGER IF EXISTS trg_avis_updated ON wolo_avis;
CREATE TRIGGER trg_avis_updated
  BEFORE UPDATE ON wolo_avis
  FOR EACH ROW EXECUTE FUNCTION wolo_offres_updated_at();

-- Recalcul auto note_moyenne et nb_avis_recus sur wolo_prestataires
CREATE OR REPLACE FUNCTION wolo_avis_recalc_prestataire()
RETURNS TRIGGER AS $$
DECLARE
  v_prest_id UUID;
  v_count INT;
  v_avg NUMERIC;
BEGIN
  v_prest_id := COALESCE(NEW.prestataire_id, OLD.prestataire_id);
  IF v_prest_id IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*), AVG(note_globale)::NUMERIC(3,2)
    INTO v_count, v_avg
  FROM wolo_avis
  WHERE prestataire_id = v_prest_id AND validated = TRUE;
  UPDATE wolo_prestataires SET
    nb_avis_recus = COALESCE(v_count, 0),
    note_moyenne = COALESCE(v_avg, 0)
  WHERE id = v_prest_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_avis_recalc ON wolo_avis;
CREATE TRIGGER trg_avis_recalc
  AFTER INSERT OR UPDATE OR DELETE ON wolo_avis
  FOR EACH ROW EXECUTE FUNCTION wolo_avis_recalc_prestataire();

-- ════════════════════════════════════════════
-- 4) WOLO_RDV (rendez-vous client/prestataire)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wolo_rdv (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id       TEXT UNIQUE,
  -- Prestataire
  prestataire_id           UUID REFERENCES wolo_prestataires(id) ON DELETE CASCADE,
  prestataire_user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Client
  client_user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom               TEXT NOT NULL,
  client_email             TEXT,
  client_telephone         TEXT,
  -- Détails RDV
  date_rdv                 DATE NOT NULL,
  heure_rdv                TIME,
  service                  TEXT,                                  -- ex: "Coupe + tresses"
  duree_minutes            INT,
  message                  TEXT,
  lieu                     TEXT,                                  -- 'salon' / 'domicile' / 'visio'
  -- Statut
  statut                   TEXT NOT NULL DEFAULT 'Demandé'
                           CHECK (statut IN ('Demandé','Confirmé','Refusé','Annulé','Terminé','No-show')),
  -- Dates
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rdv_prest_date ON wolo_rdv(prestataire_id, date_rdv);
CREATE INDEX IF NOT EXISTS idx_rdv_prest_user ON wolo_rdv(prestataire_user_id, date_rdv);
CREATE INDEX IF NOT EXISTS idx_rdv_client ON wolo_rdv(client_user_id, date_rdv) WHERE client_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rdv_statut ON wolo_rdv(statut, date_rdv);

DROP TRIGGER IF EXISTS trg_rdv_updated ON wolo_rdv;
CREATE TRIGGER trg_rdv_updated
  BEFORE UPDATE ON wolo_rdv
  FOR EACH ROW EXECUTE FUNCTION wolo_offres_updated_at();

-- ════════════════════════════════════════════
-- 5) RLS
-- ════════════════════════════════════════════
ALTER TABLE wolo_offres_emploi ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_candidatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_rdv ENABLE ROW LEVEL SECURITY;

-- OFFRES : lecture publique (annonces publiées), écriture par le recruteur uniquement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='offres_read_active' AND tablename='wolo_offres_emploi') THEN
    CREATE POLICY "offres_read_active" ON wolo_offres_emploi FOR SELECT USING (active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='offres_read_own' AND tablename='wolo_offres_emploi') THEN
    CREATE POLICY "offres_read_own" ON wolo_offres_emploi FOR SELECT USING (auth.uid() = recruteur_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='offres_insert_own' AND tablename='wolo_offres_emploi') THEN
    CREATE POLICY "offres_insert_own" ON wolo_offres_emploi FOR INSERT WITH CHECK (auth.uid() = recruteur_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='offres_update_own' AND tablename='wolo_offres_emploi') THEN
    CREATE POLICY "offres_update_own" ON wolo_offres_emploi FOR UPDATE USING (auth.uid() = recruteur_user_id);
  END IF;
END $$;

-- CANDIDATURES : visibles uniquement par candidat ou recruteur
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cand_read_participants' AND tablename='wolo_candidatures') THEN
    CREATE POLICY "cand_read_participants" ON wolo_candidatures FOR SELECT
      USING (auth.uid() = candidat_user_id OR auth.uid() = recruteur_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cand_insert_self' AND tablename='wolo_candidatures') THEN
    CREATE POLICY "cand_insert_self" ON wolo_candidatures FOR INSERT WITH CHECK (auth.uid() = candidat_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cand_update_recruteur' AND tablename='wolo_candidatures') THEN
    CREATE POLICY "cand_update_recruteur" ON wolo_candidatures FOR UPDATE USING (auth.uid() = recruteur_user_id);
  END IF;
END $$;

-- AVIS : lecture publique des validés, écriture libre (mod côté serveur)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='avis_read_validated' AND tablename='wolo_avis') THEN
    CREATE POLICY "avis_read_validated" ON wolo_avis FOR SELECT USING (validated = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='avis_insert_any' AND tablename='wolo_avis') THEN
    CREATE POLICY "avis_insert_any" ON wolo_avis FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;

-- RDV : visibles par client OU prestataire
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rdv_read_participants' AND tablename='wolo_rdv') THEN
    CREATE POLICY "rdv_read_participants" ON wolo_rdv FOR SELECT
      USING (auth.uid() = prestataire_user_id OR auth.uid() = client_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rdv_insert_any' AND tablename='wolo_rdv') THEN
    CREATE POLICY "rdv_insert_any" ON wolo_rdv FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rdv_update_prestataire' AND tablename='wolo_rdv') THEN
    CREATE POLICY "rdv_update_prestataire" ON wolo_rdv FOR UPDATE USING (auth.uid() = prestataire_user_id);
  END IF;
END $$;

-- ════════════════════════════════════════════
-- VUES de compatibilité Airtable {id, fields, createdTime}
-- Permet aux fonctions JS existantes de continuer à marcher
-- ════════════════════════════════════════════
CREATE OR REPLACE VIEW wolo_offres_airtable_compat AS
SELECT
  id,
  jsonb_build_object(
    'Titre',                  titre,
    'Métier',                 metier,
    'Description',            description,
    'Type de contrat',        type_contrat,
    'Expérience requise',     experience_requise,
    'Quartier',               quartier,
    'Ville',                  ville,
    'Pays',                   pays,
    'Télétravail',            teletravail,
    'Salaire min FCFA',       salaire_min_fcfa,
    'Salaire max FCFA',       salaire_max_fcfa,
    'Photo 1',                photo_1,
    'Photo 2',                photo_2,
    'Photo 3',                photo_3,
    'Active',                 active,
    'Urgente',                urgente,
    'Date expiration',        date_expiration,
    'Vues',                   nb_vues,
    'Nb candidatures',        nb_candidatures,
    'Recruteur ID',           recruteur_prestataire_id,
    'Recruteur Nom',          recruteur_nom,
    'Recruteur WhatsApp',     recruteur_whatsapp,
    'Recruteur User ID',      recruteur_user_id,
    'Recruteur vérifié',      recruteur_verifie
  ) AS fields,
  created_at AS "createdTime"
FROM wolo_offres_emploi;

CREATE OR REPLACE VIEW wolo_candidatures_airtable_compat AS
SELECT
  id,
  jsonb_build_object(
    'Offre ID',               offre_airtable_id,
    'Offre Titre',            offre_titre,
    'Candidat ID',            candidat_prestataire_id,
    'Candidat Nom',           candidat_nom,
    'Candidat Métier',        candidat_metier,
    'Candidat WhatsApp',      candidat_whatsapp,
    'Candidat Photo',         candidat_photo,
    'Candidat Quartier',      candidat_quartier,
    'Candidat Score WOLO',    candidat_score_wolo,
    'Candidat User ID',       candidat_user_id,
    'Recruteur ID',           recruteur_prestataire_id,
    'Recruteur Nom',          recruteur_nom,
    'Recruteur User ID',      recruteur_user_id,
    'Message',                message,
    'Statut',                 statut,
    'Date candidature',       date_candidature,
    'Score IA',               score_ia
  ) AS fields,
  created_at AS "createdTime"
FROM wolo_candidatures;
