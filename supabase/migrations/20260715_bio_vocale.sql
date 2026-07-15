-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 9.2 PHASE C — BIO PROFIL VOCALE (2026-07-15)
-- 1. Colonnes audio sur wozali_prestataires
-- 2. Policy storage : upload connecté uniquement, dans son propre
--    dossier bios/<user_id>/... (bucket wozali-vocaux déjà créé
--    par la migration 20260715_avis_vocaux.sql)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Colonnes audio ───
ALTER TABLE public.wozali_prestataires ADD COLUMN IF NOT EXISTS bio_audio_url text;
ALTER TABLE public.wozali_prestataires ADD COLUMN IF NOT EXISTS bio_audio_duree_sec integer;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wozali_prestataires_bio_audio_duree_max'
  ) THEN
    ALTER TABLE public.wozali_prestataires
      ADD CONSTRAINT wozali_prestataires_bio_audio_duree_max
      CHECK (bio_audio_duree_sec IS NULL OR (bio_audio_duree_sec BETWEEN 1 AND 60));
  END IF;
END $$;

-- ─── 2. Policy storage : upload self-scoped dans bios/<auth.uid()>/... ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_vocaux_insert_bios') THEN
    CREATE POLICY "wozali_vocaux_insert_bios" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'wozali-vocaux'
        AND (storage.foldername(name))[1] = 'bios'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
  -- Lecture publique déjà couverte par wozali_vocaux_select_all (migration avis vocaux)
END $$;
