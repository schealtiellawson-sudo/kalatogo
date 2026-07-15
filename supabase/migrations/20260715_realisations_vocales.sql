-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 9.3 PHASE C — DESCRIPTION DE RÉALISATION VOCALE (2026-07-15)
-- 1. Colonne JSONB sur wozali_prestataires : {"1":{"url":...,"duree":...}, "2":{...}, "3":{...}}
--    une entrée par slot de photo de réalisation (1/2/3)
-- 2. Policy storage : upload connecté uniquement, dans son propre
--    dossier realisations/<user_id>/... (bucket wozali-vocaux déjà
--    créé par la migration 20260715_avis_vocaux.sql)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Colonne JSONB ───
ALTER TABLE public.wozali_prestataires ADD COLUMN IF NOT EXISTS realisations_audio jsonb DEFAULT '{}'::jsonb;

-- ─── 2. Policy storage : upload self-scoped dans realisations/<auth.uid()>/... ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_vocaux_insert_realisations') THEN
    CREATE POLICY "wozali_vocaux_insert_realisations" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'wozali-vocaux'
        AND (storage.foldername(name))[1] = 'realisations'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
  -- Lecture publique déjà couverte par wozali_vocaux_select_all (migration avis vocaux)
END $$;
