-- ================================================================
-- Migration WOLO Market : table Prestataires Airtable → Supabase
-- Date : 2026-04-26
-- Raison : quota mensuel API Airtable (PUBLIC_API_BILLING_LIMIT_EXCEEDED)
-- bloquait les reads du profil utilisateur. Bascule vers Supabase pour
-- éliminer cette dépendance.
-- ================================================================

CREATE TABLE IF NOT EXISTS wolo_prestataires (
  -- Identité
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  airtable_record_id TEXT UNIQUE,           -- pour migration progressive et compat
  email TEXT UNIQUE NOT NULL,
  nom_complet TEXT,
  numero_telephone TEXT,
  whatsapp TEXT,

  -- Profil
  metier_principal TEXT,
  description_services TEXT,
  diplomes TEXT,
  annees_experience INT,
  langues_parlees TEXT[],

  -- Localisation
  quartier TEXT,
  ville TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Tarifs
  tarif_min_fcfa INT,
  tarif_max_fcfa INT,

  -- Réseaux
  lien_tiktok TEXT,
  lien_instagram TEXT,

  -- Photos
  photo_profil TEXT,
  photo_realisation_1 TEXT,
  photo_realisation_2 TEXT,
  photo_realisation_3 TEXT,
  albums JSONB DEFAULT '[]'::jsonb,

  -- Plan / parrainage
  abonnement TEXT DEFAULT 'Base' CHECK (abonnement IN ('Base', 'Pro')),
  code_paiement TEXT,
  plan_demande TEXT,
  code_parrainage TEXT UNIQUE,
  parrain_code TEXT,

  -- Disponibilité
  disponible_maintenant BOOLEAN DEFAULT FALSE,
  disponibilites_hebdo JSONB,

  -- Stats / score
  note_moyenne DOUBLE PRECISION DEFAULT 0,
  nb_avis_recus INT DEFAULT 0,
  nb_vues_profil INT DEFAULT 0,
  vues_7j INT DEFAULT 0,
  vues_30j INT DEFAULT 0,
  nb_transactions INT DEFAULT 0,
  score_wolo INT DEFAULT 0,

  -- IA / badges
  resume_profil_ia TEXT,
  badge_verifie BOOLEAN DEFAULT FALSE,
  recruteur_verifie BOOLEAN DEFAULT FALSE,
  notifications JSONB DEFAULT '[]'::jsonb,

  -- Démographie
  genre TEXT,
  age INT,
  date_naissance DATE,

  -- Tags libres pour évolutions futures
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prest_email          ON wolo_prestataires(email);
CREATE INDEX IF NOT EXISTS idx_prest_user_id        ON wolo_prestataires(user_id);
CREATE INDEX IF NOT EXISTS idx_prest_metier         ON wolo_prestataires(metier_principal);
CREATE INDEX IF NOT EXISTS idx_prest_quartier       ON wolo_prestataires(quartier);
CREATE INDEX IF NOT EXISTS idx_prest_ville          ON wolo_prestataires(ville);
CREATE INDEX IF NOT EXISTS idx_prest_abonnement     ON wolo_prestataires(abonnement);
CREATE INDEX IF NOT EXISTS idx_prest_dispo          ON wolo_prestataires(disponible_maintenant) WHERE disponible_maintenant = TRUE;
CREATE INDEX IF NOT EXISTS idx_prest_note           ON wolo_prestataires(note_moyenne DESC) WHERE note_moyenne > 0;
CREATE INDEX IF NOT EXISTS idx_prest_score          ON wolo_prestataires(score_wolo DESC);
CREATE INDEX IF NOT EXISTS idx_prest_airtable_id    ON wolo_prestataires(airtable_record_id) WHERE airtable_record_id IS NOT NULL;

-- updated_at auto
CREATE OR REPLACE FUNCTION wolo_prestataires_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wolo_prest_updated ON wolo_prestataires;
CREATE TRIGGER trg_wolo_prest_updated
  BEFORE UPDATE ON wolo_prestataires
  FOR EACH ROW EXECUTE FUNCTION wolo_prestataires_updated_at();

-- RLS
ALTER TABLE wolo_prestataires ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut voir tous les profils (recherche, profil public)
CREATE POLICY "prest_read_all"
  ON wolo_prestataires FOR SELECT
  USING (true);

-- Écriture : on ne peut update / insert que son propre record
CREATE POLICY "prest_insert_self"
  ON wolo_prestataires FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prest_update_self"
  ON wolo_prestataires FOR UPDATE
  USING (auth.uid() = user_id);

-- Pas de DELETE par les users (admin only via service_role)

-- ================================================================
-- VUE compatibilité format Airtable (pour migration progressive)
-- Permet aux anciennes fonctions JS qui attendent {id, fields:{...}}
-- de continuer à marcher pendant le refactoring.
-- ================================================================
CREATE OR REPLACE VIEW wolo_prestataires_airtable_compat AS
SELECT
  id,
  jsonb_build_object(
    'Email',                       email,
    'Nom complet',                 nom_complet,
    'Numéro de téléphone',         numero_telephone,
    'WhatsApp',                    whatsapp,
    'Métier principal',            metier_principal,
    'Description des services',    description_services,
    'Diplomes',                    diplomes,
    'Années d''expérience',        annees_experience,
    'Langues parlées',             langues_parlees,
    'Quartier',                    quartier,
    'Ville',                       ville,
    'Latitude',                    latitude,
    'Longitude',                   longitude,
    'Tarif minimum FCFA',          tarif_min_fcfa,
    'Tarif maximum FCFA',          tarif_max_fcfa,
    'Lien TikTok',                 lien_tiktok,
    'Lien Instagram',              lien_instagram,
    'Photo de profil',             photo_profil,
    'Photo Réalisation 1',         photo_realisation_1,
    'Photo Réalisation 2',         photo_realisation_2,
    'Photo Réalisation 3',         photo_realisation_3,
    'Albums',                      albums,
    'Abonnement',                  abonnement,
    'Code Paiement',               code_paiement,
    'Plan Demande',                plan_demande,
    'Code Parrainage',             code_parrainage,
    'Parrain Code',                parrain_code,
    'Disponible maintenant',       disponible_maintenant,
    'Disponibilités Hebdo',        disponibilites_hebdo,
    'Note moyenne',                note_moyenne,
    'Nombre d''avis reçus',        nb_avis_recus,
    'Nombre de vues profil',       nb_vues_profil,
    'Vues 7j',                     vues_7j,
    'Vues 30j',                    vues_30j,
    'Nombre de transactions',      nb_transactions,
    'Score WOLO',                  score_wolo,
    'Résumé Profil IA',            resume_profil_ia,
    'Badge vérifié',               badge_verifie,
    'Recruteur vérifié',           recruteur_verifie,
    'Notifications',               notifications,
    'Genre',                       genre,
    'Âge',                         age,
    'Date de naissance',           date_naissance,
    'User ID',                     user_id,
    'Tags',                        tags
  ) AS fields,
  created_at AS "createdTime"
FROM wolo_prestataires;
