-- ================================================================
-- WOZALI — Chat interne avec IA auto-reply + escalade fondateur
-- Date : 2026-05-20
-- Table : wolo_chat_messages
-- Les prestataires envoient des messages à WOZALI depuis leur dashboard.
-- L'IA répond automatiquement aux questions basiques.
-- Les cas complexes / rencontres (selon genre) escaladent au fondateur.
-- ================================================================

-- ── Types enum ──────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wolo_chat_statut') THEN
    CREATE TYPE wolo_chat_statut AS ENUM (
      'attente_ia',
      'repondu_ia',
      'escalade_fondateur',
      'repondu_fondateur',
      'ignore'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wolo_chat_escalade') THEN
    CREATE TYPE wolo_chat_escalade AS ENUM (
      'complexe',
      'rencontre_prioritaire',
      'rencontre_ignoree'
    );
  END IF;
END
$$;

-- ── Table principale ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wolo_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auteur du message
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contenu brut du prestataire
  message TEXT NOT NULL,

  -- Réponse générée par l'IA (null si escalade/ignoré)
  reponse_ia TEXT,

  -- Réponse saisie manuellement par le fondateur
  reponse_fondateur TEXT,

  -- Statut du traitement
  statut wolo_chat_statut NOT NULL DEFAULT 'attente_ia',

  -- Type d'escalade (null si répondu par l'IA)
  type_escalade wolo_chat_escalade,

  -- Genre copié depuis wolo_prestataires au moment de l'envoi
  -- Permet la règle d'escalade rencontre sans re-query à chaque fois
  -- Jamais exposé dans l'UI utilisateur
  genre_user TEXT,

  -- Gestion lecture fondateur
  lu_par_fondateur BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_user_id
  ON wolo_chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_statut
  ON wolo_chat_messages(statut);

CREATE INDEX IF NOT EXISTS idx_chat_created
  ON wolo_chat_messages(created_at DESC);

-- Index composite pour le panel admin (escalades non lues)
CREATE INDEX IF NOT EXISTS idx_chat_admin_pending
  ON wolo_chat_messages(statut, lu_par_fondateur, created_at DESC)
  WHERE statut IN ('escalade_fondateur', 'repondu_fondateur');

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE wolo_chat_messages ENABLE ROW LEVEL SECURITY;

-- Un prestataire voit uniquement ses propres messages
DROP POLICY IF EXISTS chat_select_self ON wolo_chat_messages;
CREATE POLICY chat_select_self ON wolo_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Un prestataire ne peut créer que ses propres messages
DROP POLICY IF EXISTS chat_insert_self ON wolo_chat_messages;
CREATE POLICY chat_insert_self ON wolo_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seul le service_role peut mettre à jour (IA + fondateur passent par service role)
-- (pas de UPDATE policy pour les users = lecture seule côté client)

-- ── Trigger updated_at ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION wolo_chat_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_touch ON wolo_chat_messages;
CREATE TRIGGER trg_chat_touch
  BEFORE UPDATE ON wolo_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION wolo_chat_touch();

-- ── Commentaires ────────────────────────────────────────────────

COMMENT ON TABLE wolo_chat_messages IS
  'Messages envoyés par les prestataires à WOZALI via le widget chat dashboard. Traités par IA en premier, escalade au fondateur si nécessaire.';

COMMENT ON COLUMN wolo_chat_messages.statut IS
  'attente_ia=en cours de traitement, repondu_ia=l''IA a répondu, escalade_fondateur=requiert intervention fondateur, repondu_fondateur=fondateur a répondu, ignore=message ignoré silencieusement (ex: demande de rencontre d''un homme)';

COMMENT ON COLUMN wolo_chat_messages.type_escalade IS
  'complexe=question hors périmètre IA, rencontre_prioritaire=demande de rencontre d''une femme (priorité fondateur), rencontre_ignoree=demande de rencontre d''un homme (ignorée silencieusement)';

COMMENT ON COLUMN wolo_chat_messages.genre_user IS
  'Copié depuis wolo_prestataires.genre au moment de l''envoi. Usage interne uniquement pour les règles d''escalade.';
