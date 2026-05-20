-- ════════════════════════════════════════════════════════════════
-- MIGRATION A — Vues wozali_* → wolo_* (Phase 1 du renommage)
-- À appliquer EN PREMIER dans Supabase SQL Editor
-- Les vraies tables ne bougent pas → zéro risque
-- Le nouveau code utilise wozali_*, les vues traduisent vers wolo_*
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
    'wolo_cours_offres', 'wolo_messages', 'wolo_message_templates',
    'wolo_match_demandes'
  ];
  tbl TEXT;
  new_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    new_name := regexp_replace(tbl, '^wolo_', 'wozali_');
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM public.%I', new_name, tbl);
      RAISE NOTICE 'Vue créée : % → %', tbl, new_name;
    ELSE
      RAISE NOTICE 'Table absente (ignorée) : %', tbl;
    END IF;
  END LOOP;
END $$;

-- Vue pour la vue compat Airtable si elle existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'wolo_prestataires_airtable_compat') THEN
    CREATE OR REPLACE VIEW public.wozali_prestataires_airtable_compat AS SELECT * FROM public.wolo_prestataires_airtable_compat;
  END IF;
END $$;

RAISE NOTICE '✅ Migration A terminée — vues wozali_* créées (tables wolo_* inchangées)';
