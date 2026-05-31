-- ================================================================
-- Document reads tracking : agents terrain + ambassadeurs
-- 2026-05-31
-- ================================================================

-- ── 1. agent_document_reads ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_document_reads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_slug   TEXT        NOT NULL,
  first_read_at   TIMESTAMPTZ DEFAULT now(),
  last_read_at    TIMESTAMPTZ DEFAULT now(),
  read_count      INTEGER     DEFAULT 1,
  UNIQUE(agent_id, document_slug)
);

ALTER TABLE public.agent_document_reads ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté peut lire (l'agent lit les siennes, l'admin lit celles des autres)
DROP POLICY IF EXISTS "auth_read_agent_doc_reads" ON public.agent_document_reads;
CREATE POLICY "auth_read_agent_doc_reads"
  ON public.agent_document_reads FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ecriture : uniquement l'agent lui-meme
DROP POLICY IF EXISTS "self_insert_agent_doc_reads" ON public.agent_document_reads;
CREATE POLICY "self_insert_agent_doc_reads"
  ON public.agent_document_reads FOR INSERT
  WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "self_update_agent_doc_reads" ON public.agent_document_reads;
CREATE POLICY "self_update_agent_doc_reads"
  ON public.agent_document_reads FOR UPDATE
  USING (agent_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_agent_doc_reads_agent ON public.agent_document_reads(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_doc_reads_slug  ON public.agent_document_reads(document_slug);


-- ── 2. ambassadeur_document_reads ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ambassadeur_document_reads (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassadeur_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_slug    TEXT        NOT NULL,
  first_read_at    TIMESTAMPTZ DEFAULT now(),
  last_read_at     TIMESTAMPTZ DEFAULT now(),
  read_count       INTEGER     DEFAULT 1,
  UNIQUE(ambassadeur_id, document_slug)
);

ALTER TABLE public.ambassadeur_document_reads ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté
DROP POLICY IF EXISTS "auth_read_amb_doc_reads" ON public.ambassadeur_document_reads;
CREATE POLICY "auth_read_amb_doc_reads"
  ON public.ambassadeur_document_reads FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ecriture : uniquement l'ambassadeur lui-meme
DROP POLICY IF EXISTS "self_insert_amb_doc_reads" ON public.ambassadeur_document_reads;
CREATE POLICY "self_insert_amb_doc_reads"
  ON public.ambassadeur_document_reads FOR INSERT
  WITH CHECK (ambassadeur_id = auth.uid());

DROP POLICY IF EXISTS "self_update_amb_doc_reads" ON public.ambassadeur_document_reads;
CREATE POLICY "self_update_amb_doc_reads"
  ON public.ambassadeur_document_reads FOR UPDATE
  USING (ambassadeur_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_amb_doc_reads_amb  ON public.ambassadeur_document_reads(ambassadeur_id);
CREATE INDEX IF NOT EXISTS idx_amb_doc_reads_slug ON public.ambassadeur_document_reads(document_slug);
