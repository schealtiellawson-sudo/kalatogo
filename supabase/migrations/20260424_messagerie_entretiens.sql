-- ================================================================
-- Sprint I — Messagerie in-app + Entretiens
-- Tables Supabase (évite rate limit Airtable 5 req/s pour polling messages)
-- Date : 2026-04-24
-- ================================================================

-- Fils de conversation (1 thread par couple candidature+recruteur)
CREATE TABLE IF NOT EXISTS wolo_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_airtable_id TEXT NOT NULL,
  offre_airtable_id TEXT,
  candidat_user_id UUID NOT NULL,
  recruteur_user_id UUID NOT NULL,
  candidat_nom TEXT,
  recruteur_nom TEXT,
  offre_titre TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_candidat INT DEFAULT 0,
  unread_recruteur INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidature_airtable_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_candidat ON wolo_threads(candidat_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_recruteur ON wolo_threads(recruteur_user_id, last_message_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS wolo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES wolo_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role TEXT CHECK (sender_role IN ('candidat', 'recruteur', 'systeme')),
  content TEXT NOT NULL,
  template TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON wolo_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON wolo_messages(thread_id) WHERE read_at IS NULL;

-- Entretiens
CREATE TABLE IF NOT EXISTS wolo_entretiens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_airtable_id TEXT NOT NULL,
  thread_id UUID REFERENCES wolo_threads(id) ON DELETE SET NULL,
  candidat_user_id UUID NOT NULL,
  recruteur_user_id UUID NOT NULL,
  offre_titre TEXT,
  type TEXT CHECK (type IN ('presentiel', 'visio', 'telephone')),
  date_heure TIMESTAMPTZ NOT NULL,
  lieu TEXT,
  lien_visio TEXT,
  telephone TEXT,
  rencontre BOOLEAN DEFAULT FALSE,
  note_recruteur TEXT,
  resultat TEXT CHECK (resultat IN ('pending', 'concluant', 'non_concluant', 'annule')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entretiens_candidat ON wolo_entretiens(candidat_user_id, date_heure);
CREATE INDEX IF NOT EXISTS idx_entretiens_recruteur ON wolo_entretiens(recruteur_user_id, date_heure);
CREATE INDEX IF NOT EXISTS idx_entretiens_date ON wolo_entretiens(date_heure) WHERE resultat = 'pending';

-- Templates messages (éditable par recruteur)
CREATE TABLE IF NOT EXISTS wolo_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT CHECK (type IN ('refus', 'convocation', 'demande_docs', 'custom')),
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON wolo_message_templates(user_id, type);

-- Signalements fraude (Sprint Polish anti-ghosting + Médiateur)
CREATE TABLE IF NOT EXISTS wolo_signalements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL,
  target_user_id UUID,
  target_offre_airtable_id TEXT,
  target_candidature_airtable_id TEXT,
  motif TEXT CHECK (motif IN ('arnaque', 'ghosting', 'fake_offre', 'harcelement', 'autre')) NOT NULL,
  description TEXT,
  statut TEXT CHECK (statut IN ('nouveau', 'en_cours', 'resolu', 'rejete')) DEFAULT 'nouveau',
  mediation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signalements_statut ON wolo_signalements(statut, created_at DESC);

-- Triggers : mettre à jour last_message_at + preview + compteurs non-lus
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wolo_threads
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 80),
    unread_candidat = CASE WHEN NEW.sender_role = 'recruteur' THEN unread_candidat + 1 ELSE unread_candidat END,
    unread_recruteur = CASE WHEN NEW.sender_role = 'candidat' THEN unread_recruteur + 1 ELSE unread_recruteur END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_thread_on_message ON wolo_messages;
CREATE TRIGGER trg_update_thread_on_message
  AFTER INSERT ON wolo_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();

-- RLS
ALTER TABLE wolo_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_entretiens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_signalements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thread_read_participants"
  ON wolo_threads FOR SELECT
  USING (auth.uid() = candidat_user_id OR auth.uid() = recruteur_user_id);

CREATE POLICY "message_read_thread_participants"
  ON wolo_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wolo_threads t
      WHERE t.id = wolo_messages.thread_id
      AND (t.candidat_user_id = auth.uid() OR t.recruteur_user_id = auth.uid())
    )
  );

CREATE POLICY "message_insert_own"
  ON wolo_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "entretien_read_participants"
  ON wolo_entretiens FOR SELECT
  USING (auth.uid() = candidat_user_id OR auth.uid() = recruteur_user_id);

CREATE POLICY "entretien_update_recruteur"
  ON wolo_entretiens FOR UPDATE
  USING (auth.uid() = recruteur_user_id);

CREATE POLICY "templates_own"
  ON wolo_message_templates FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "signalement_insert_auth"
  ON wolo_signalements FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "signalement_read_own"
  ON wolo_signalements FOR SELECT
  USING (auth.uid() = reporter_user_id);
