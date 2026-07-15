-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 9 PHASE C — AVIS VOCAUX (2026-07-15)
-- 1. Colonnes audio sur wozali_avis
-- 2. Bucket dédié wozali-vocaux (3 Mo max, audio uniquement, lecture publique)
-- 3. Policies : upload anonyme autorisé UNIQUEMENT dans le dossier avis/
--    (un client qui laisse un avis n'est pas connecté ; l'anti-fraude reste
--    le numéro WhatsApp + index unique 1 avis/client/prestataire/mois)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Colonnes audio ───
ALTER TABLE public.wozali_avis ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.wozali_avis ADD COLUMN IF NOT EXISTS audio_duree_sec integer;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wozali_avis_audio_duree_max'
  ) THEN
    ALTER TABLE public.wozali_avis
      ADD CONSTRAINT wozali_avis_audio_duree_max
      CHECK (audio_duree_sec IS NULL OR (audio_duree_sec BETWEEN 1 AND 120));
  END IF;
END $$;

-- ─── 2. Bucket wozali-vocaux ───
-- Garde-fous au niveau du bucket : 3 Mo max par fichier, mimes audio uniquement.
-- (60 s d'opus ≈ 500 Ko, 3 Mo laisse de la marge pour l'AAC Safari)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wozali-vocaux', 'wozali-vocaux', true, 3145728,
  ARRAY['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac','audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 3145728,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 3. Policies storage ───
DO $$ BEGIN
  -- Upload : anonymes ET connectés, uniquement dans avis/...
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_vocaux_insert_avis') THEN
    CREATE POLICY "wozali_vocaux_insert_avis" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'wozali-vocaux' AND (storage.foldername(name))[1] = 'avis');
  END IF;
  -- Lecture publique
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_vocaux_select_all') THEN
    CREATE POLICY "wozali_vocaux_select_all" ON storage.objects
      FOR SELECT USING (bucket_id = 'wozali-vocaux');
  END IF;
  -- Pas de policy UPDATE ni DELETE : personne ne modifie/supprime un vocal
  -- depuis le client (seul le service role via l'API le peut, ex. avis-delete).
END $$;
