-- WOZALI — Espace Témoignage Emploi (dénonciations anonymes abus emploi)
-- Migration : 2026-06-28

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Colonne statut_compte sur wolo_prestataires
--    Valeurs : actif (défaut) | desactive | suspendu_abus
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE wolo_prestataires
  ADD COLUMN IF NOT EXISTS statut_compte TEXT
  DEFAULT 'actif'
  CHECK (statut_compte IN ('actif','desactive','suspendu_abus'));

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table principale temoignages_abus
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS temoignages_abus (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identité interne (jamais affichée publiquement, visible admin uniquement)
  user_id               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  nom                   TEXT,
  prenom                TEXT,
  email                 TEXT,

  -- Contenu anonyme
  ville                 TEXT,
  pays                  TEXT        DEFAULT 'TG' CHECK (pays IN ('TG','BJ')),
  secteur               TEXT        CHECK (secteur IN (
    'emploi_formel','emploi_informel','artisan','commerce','services','autre'
  )),
  type_incident         TEXT        CHECK (type_incident IN (
    'avance_deshonnete','abus_autorite','conditions_abusives',
    'discrimination','paiement_refuse','autre'
  )),
  recit                 TEXT        NOT NULL,

  -- Code confidentiel unique (preuve sans identification — affiché après soumission)
  code_confidentialite  TEXT        UNIQUE
    DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),

  -- Modération admin
  statut                TEXT        DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','publie','refuse')),
  moderateur_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  moderateur_at         TIMESTAMPTZ,
  note_moderateur       TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Table réactions "Je te crois"
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions_temoignages_abus (
  id              UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  temoignage_id   UUID  NOT NULL REFERENCES temoignages_abus(id) ON DELETE CASCADE,
  user_id         UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT  DEFAULT 'je_te_crois' CHECK (type = 'je_te_crois'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(temoignage_id, user_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_temo_abus_statut   ON temoignages_abus(statut);
CREATE INDEX IF NOT EXISTS idx_temo_abus_pays     ON temoignages_abus(pays);
CREATE INDEX IF NOT EXISTS idx_temo_abus_user     ON temoignages_abus(user_id);
CREATE INDEX IF NOT EXISTS idx_temo_abus_created  ON temoignages_abus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_react_temo_temo    ON reactions_temoignages_abus(temoignage_id);
CREATE INDEX IF NOT EXISTS idx_react_temo_user    ON reactions_temoignages_abus(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Trigger updated_at
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_temoignages_abus_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS temoignages_abus_updated_at ON temoignages_abus;
CREATE TRIGGER temoignages_abus_updated_at
  BEFORE UPDATE ON temoignages_abus
  FOR EACH ROW EXECUTE FUNCTION update_temoignages_abus_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE temoignages_abus ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions_temoignages_abus ENABLE ROW LEVEL SECURITY;

-- temoignages_abus : SELECT publié (champs sensibles exclus par le frontend)
DROP POLICY IF EXISTS "temo_abus_select_published" ON temoignages_abus;
CREATE POLICY "temo_abus_select_published"
  ON temoignages_abus FOR SELECT
  USING (statut = 'publie');

-- temoignages_abus : INSERT authentifié uniquement
DROP POLICY IF EXISTS "temo_abus_insert_auth" ON temoignages_abus;
CREATE POLICY "temo_abus_insert_auth"
  ON temoignages_abus FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- temoignages_abus : UPDATE (admin via frontend — service role bypass RLS)
DROP POLICY IF EXISTS "temo_abus_update_auth" ON temoignages_abus;
CREATE POLICY "temo_abus_update_auth"
  ON temoignages_abus FOR UPDATE
  TO authenticated
  USING (true);

-- temoignages_abus : SELECT complet pour admin (toutes les colonnes)
-- Admin = service role qui bypass RLS — aucune policy supplémentaire nécessaire

-- reactions : SELECT public
DROP POLICY IF EXISTS "react_temo_select" ON reactions_temoignages_abus;
CREATE POLICY "react_temo_select"
  ON reactions_temoignages_abus FOR SELECT
  USING (true);

-- reactions : INSERT propre seulement
DROP POLICY IF EXISTS "react_temo_insert" ON reactions_temoignages_abus;
CREATE POLICY "react_temo_insert"
  ON reactions_temoignages_abus FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- reactions : DELETE propre seulement (annuler son Je te crois)
DROP POLICY IF EXISTS "react_temo_delete" ON reactions_temoignages_abus;
CREATE POLICY "react_temo_delete"
  ON reactions_temoignages_abus FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
