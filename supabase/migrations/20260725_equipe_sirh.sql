-- ============================================================
-- WOZALI — Espace Équipe SIRH : réconciliation + documents + messagerie interne
-- (2026-07-24) Analyse Fable. Table wozali_employes déjà en place (colonnes OK).
-- ============================================================

-- ── 0. RÉCONCILIATION RLS wozali_employes ──
-- Les 2 migrations (0523/0531) ont pu laisser 2 jeux de policies. On repart propre.
DROP POLICY IF EXISTS "employe_select_recruteur" ON public.wozali_employes;
DROP POLICY IF EXISTS "employe_insert_recruteur" ON public.wozali_employes;
DROP POLICY IF EXISTS "employe_update_recruteur" ON public.wozali_employes;
DROP POLICY IF EXISTS "recruteur_all_employes"   ON public.wozali_employes;
DROP POLICY IF EXISTS "employe_self_read"        ON public.wozali_employes;

CREATE POLICY "recruteur_all_employes" ON public.wozali_employes FOR ALL
  USING (auth.uid() = recruteur_user_id) WITH CHECK (auth.uid() = recruteur_user_id);
CREATE POLICY "employe_self_read" ON public.wozali_employes FOR SELECT
  USING (auth.uid() = employe_user_id);

-- Anti-doublon : une seule fiche active par candidature source
CREATE UNIQUE INDEX IF NOT EXISTS uniq_employe_candidature
  ON public.wozali_employes(candidature_id)
  WHERE candidature_id IS NOT NULL AND statut <> 'fin_contrat';

-- ── 1. DOCUMENTS JOINTS PAR EMPLOYÉ ──
CREATE TABLE IF NOT EXISTS public.wozali_employe_docs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id       UUID NOT NULL REFERENCES public.wozali_employes(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id),
  type_doc         TEXT NOT NULL DEFAULT 'autre'
                   CHECK (type_doc IN ('contrat','piece_identite','cv','diplome','fiche_paie','attestation','autre')),
  titre            TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  mime_type        TEXT,
  taille_octets    INTEGER,
  visible_employe  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edocs_employe ON public.wozali_employe_docs(employe_id);

ALTER TABLE public.wozali_employe_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edocs_recruteur_all" ON public.wozali_employe_docs;
DROP POLICY IF EXISTS "edocs_employe_read"  ON public.wozali_employe_docs;
CREATE POLICY "edocs_recruteur_all" ON public.wozali_employe_docs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.wozali_employes e WHERE e.id = employe_id AND e.recruteur_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wozali_employes e WHERE e.id = employe_id AND e.recruteur_user_id = auth.uid()));
CREATE POLICY "edocs_employe_read" ON public.wozali_employe_docs FOR SELECT
  USING (visible_employe = TRUE AND EXISTS
    (SELECT 1 FROM public.wozali_employes e WHERE e.id = employe_id AND e.employe_user_id = auth.uid()));

-- Bucket privé (lecture via signed URLs serveur uniquement)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wozali-docs-equipe','wozali-docs-equipe', false, 10485760,
        ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "edocs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "edocs_storage_delete" ON storage.objects;
CREATE POLICY "edocs_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wozali-docs-equipe' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "edocs_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wozali-docs-equipe' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── 2. MESSAGERIE INTERNE ÉQUIPE ──
CREATE TABLE IF NOT EXISTS public.wozali_equipe_threads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id           UUID NOT NULL UNIQUE REFERENCES public.wozali_employes(id) ON DELETE CASCADE,
  recruteur_user_id    UUID NOT NULL,
  employe_user_id      UUID NOT NULL,
  last_message_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_recruteur     INT NOT NULL DEFAULT 0,
  unread_employe       INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eqthreads_recruteur ON public.wozali_equipe_threads(recruteur_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqthreads_employe   ON public.wozali_equipe_threads(employe_user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.wozali_equipe_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      UUID NOT NULL REFERENCES public.wozali_equipe_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role    TEXT NOT NULL CHECK (sender_role IN ('recruteur','employe','annonce','systeme')),
  content        TEXT NOT NULL CHECK (char_length(content) <= 2000),
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eqmsg_thread ON public.wozali_equipe_messages(thread_id, created_at);

ALTER TABLE public.wozali_equipe_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wozali_equipe_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eqthreads_participants" ON public.wozali_equipe_threads;
DROP POLICY IF EXISTS "eqmsg_participants"     ON public.wozali_equipe_messages;
CREATE POLICY "eqthreads_participants" ON public.wozali_equipe_threads FOR SELECT
  USING (auth.uid() IN (recruteur_user_id, employe_user_id));
CREATE POLICY "eqmsg_participants" ON public.wozali_equipe_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.wozali_equipe_threads t
                 WHERE t.id = thread_id AND auth.uid() IN (t.recruteur_user_id, t.employe_user_id)));
