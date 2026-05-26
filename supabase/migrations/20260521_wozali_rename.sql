-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Renommage complet wolo_* → wozali_*
-- + wozali_photos_avis (remplace table Airtable "Photos Avis")
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'wolo_prestataires', 'wolo_threads', 'wolo_messages', 'wolo_awards',
    'wolo_push_subscriptions', 'wolo_whatsapp_templates', 'wolo_whatsapp_queue',
    'wolo_offres_emploi', 'wolo_candidatures', 'wolo_avis', 'wolo_rdv',
    'wolo_entretiens', 'wolo_signalements', 'wolo_errors_log',
    'wolo_wallets', 'wolo_transactions', 'wolo_credit', 'wolo_credit_mouvements',
    'wolo_health_metrics', 'wolo_abonnements', 'wolo_commentaires',
    'wolo_likes', 'wolo_posts', 'wolo_epingles', 'wolo_match_demandes',
    'wolo_rdv_mecano', 'wolo_reservations_table', 'wolo_reservation_chambre',
    'wolo_devis_chantier', 'wolo_commande_facon', 'wolo_commande_patisserie',
    'wolo_cours_offres', 'wolo_message_templates',
    'wolo_suivis', 'wolo_favoris_presta', 'wolo_posts_v2'
  ];
  tbl TEXT;
  new_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    new_name := regexp_replace(tbl, '^wolo_', 'wozali_');
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
    ) THEN
      EXECUTE format('DROP VIEW IF EXISTS public.%I', new_name);
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', tbl, new_name);
      EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM public.%I', tbl, new_name);
      RAISE NOTICE 'Renommé : % → % (vue backward-compat créée)', tbl, new_name;
    ELSE
      RAISE NOTICE 'Absent ou déjà renommé : %', tbl;
    END IF;
  END LOOP;
END $$;

-- Colonnes wozali_prestataires
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wozali_prestataires' AND column_name = 'score_wolo') THEN
    ALTER TABLE public.wozali_prestataires RENAME COLUMN score_wolo TO score_wozali;
    RAISE NOTICE 'Colonne score_wolo → score_wozali';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wozali_prestataires' AND column_name = 'tiktok_suivi_wolomarket') THEN
    ALTER TABLE public.wozali_prestataires RENAME COLUMN tiktok_suivi_wolomarket TO tiktok_suivi_wozali;
    RAISE NOTICE 'Colonne tiktok_suivi_wolomarket → tiktok_suivi_wozali';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- wozali_photos_avis (remplace Airtable "Photos Avis")
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wozali_photos_avis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id  UUID NOT NULL,
  slot            TEXT NOT NULL CHECK (slot IN ('profil', 'real1', 'real2', 'real3')),
  photo_url       TEXT,
  nb_likes        INT DEFAULT 0,
  likeurs         JSONB DEFAULT '[]'::jsonb,
  commentaires    JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prestataire_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_wozali_photos_prest ON wozali_photos_avis(prestataire_id);
ALTER TABLE wozali_photos_avis ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_photos_avis' AND policyname='photos_avis_select') THEN
    CREATE POLICY "photos_avis_select" ON wozali_photos_avis FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_photos_avis' AND policyname='photos_avis_insert') THEN
    CREATE POLICY "photos_avis_insert" ON wozali_photos_avis FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_photos_avis' AND policyname='photos_avis_update') THEN
    CREATE POLICY "photos_avis_update" ON wozali_photos_avis FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION wozali_photos_avis_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_wozali_photos_avis_updated ON wozali_photos_avis;
CREATE TRIGGER trg_wozali_photos_avis_updated
  BEFORE UPDATE ON wozali_photos_avis FOR EACH ROW EXECUTE FUNCTION wozali_photos_avis_updated();

DO $$ BEGIN
  RAISE NOTICE '✅ wolo_* → wozali_* terminé + wozali_photos_avis créée';
END $$;
