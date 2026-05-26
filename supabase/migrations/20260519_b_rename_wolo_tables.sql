-- ════════════════════════════════════════════════════════════════
-- MIGRATION B — Renommage réel wolo_* → wozali_* + backward-compat views
-- À appliquer 2-3 jours APRÈS migration A, une fois que le code wozali_* fonctionne
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
    'wolo_cours_offres', 'wolo_message_templates'
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
      -- Supprimer la vue temporaire wozali_* (créée en migration A)
      EXECUTE format('DROP VIEW IF EXISTS public.%I', new_name);
      -- Renommer la vraie table
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', tbl, new_name);
      -- Créer une vue backward-compat avec l'ancien nom wolo_*
      EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM public.%I', tbl, new_name);
      RAISE NOTICE 'Renommé : % → % (vue backward-compat créée)', tbl, new_name;
    ELSE
      RAISE NOTICE 'Table absente ou déjà renommée : %', tbl;
    END IF;
  END LOOP;
END $$;

-- Renommer colonnes notables (sur la table déjà renommée wozali_prestataires)
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

RAISE NOTICE '✅ Migration B terminée — tables renommées en wozali_*, views backward-compat wolo_* créées';
