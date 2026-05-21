-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Élimination totale Airtable
-- Tables: wolo_suivis · wolo_favoris_presta · wolo_posts_v2
-- + RLS avis delete + avis delete endpoint
-- À appliquer dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. wolo_suivis  (remplace table Airtable "Abonnements")
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wolo_suivis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suiveur_user_id       UUID NOT NULL,                    -- auth.users.id
  suivi_prestataire_id  UUID NOT NULL REFERENCES wolo_prestataires(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(suiveur_user_id, suivi_prestataire_id)
);
CREATE INDEX IF NOT EXISTS idx_suivis_suiveur ON wolo_suivis(suiveur_user_id);
CREATE INDEX IF NOT EXISTS idx_suivis_suivi   ON wolo_suivis(suivi_prestataire_id);

ALTER TABLE wolo_suivis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_suivis' AND policyname='suivis_select_all') THEN
    CREATE POLICY "suivis_select_all"   ON wolo_suivis FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_suivis' AND policyname='suivis_insert_self') THEN
    CREATE POLICY "suivis_insert_self"  ON wolo_suivis FOR INSERT WITH CHECK (auth.uid() = suiveur_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_suivis' AND policyname='suivis_delete_self') THEN
    CREATE POLICY "suivis_delete_self"  ON wolo_suivis FOR DELETE USING (auth.uid() = suiveur_user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. wolo_favoris_presta  (remplace table Airtable "Favoris")
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wolo_favoris_presta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,                          -- auth.users.id
  prestataire_id  UUID NOT NULL REFERENCES wolo_prestataires(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prestataire_id)
);
CREATE INDEX IF NOT EXISTS idx_favoris_presta_user ON wolo_favoris_presta(user_id);

ALTER TABLE wolo_favoris_presta ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_favoris_presta' AND policyname='favoris_select_self') THEN
    CREATE POLICY "favoris_select_self"  ON wolo_favoris_presta FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_favoris_presta' AND policyname='favoris_insert_self') THEN
    CREATE POLICY "favoris_insert_self"  ON wolo_favoris_presta FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_favoris_presta' AND policyname='favoris_delete_self') THEN
    CREATE POLICY "favoris_delete_self"  ON wolo_favoris_presta FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. wolo_posts_v2  (remplace table Airtable "Posts")
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wolo_posts_v2 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id  UUID NOT NULL REFERENCES wolo_prestataires(id) ON DELETE CASCADE,
  auteur_user_id  UUID,                                   -- auth.users.id
  auteur_nom      TEXT,
  auteur_photo    TEXT,
  contenu         TEXT,
  image_url       TEXT,
  media_type      TEXT DEFAULT 'text',                    -- 'text' | 'photo' | 'video'
  nb_likes        INT DEFAULT 0,
  commentaires    JSONB DEFAULT '[]'::jsonb,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_v2_prest  ON wolo_posts_v2(prestataire_id, created_at DESC) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_posts_v2_auteur ON wolo_posts_v2(auteur_user_id);

ALTER TABLE wolo_posts_v2 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_posts_v2' AND policyname='posts_v2_select_all') THEN
    CREATE POLICY "posts_v2_select_all"     ON wolo_posts_v2 FOR SELECT USING (actif = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_posts_v2' AND policyname='posts_v2_insert_auth') THEN
    CREATE POLICY "posts_v2_insert_auth"    ON wolo_posts_v2 FOR INSERT WITH CHECK (auth.uid() = auteur_user_id);
  END IF;
  -- Permissif pour les likes/commentaires (tout utilisateur authentifié peut updater)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_posts_v2' AND policyname='posts_v2_update_any') THEN
    CREATE POLICY "posts_v2_update_any"     ON wolo_posts_v2 FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  -- Seul l'auteur peut supprimer
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_posts_v2' AND policyname='posts_v2_delete_self') THEN
    CREATE POLICY "posts_v2_delete_self"    ON wolo_posts_v2 FOR DELETE USING (auth.uid() = auteur_user_id);
  END IF;
END $$;

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION wolo_posts_v2_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_v2_updated ON wolo_posts_v2;
CREATE TRIGGER trg_posts_v2_updated
  BEFORE UPDATE ON wolo_posts_v2
  FOR EACH ROW EXECUTE FUNCTION wolo_posts_v2_updated();

-- ─────────────────────────────────────────────
-- 4. RLS wolo_avis — DELETE par le prestataire évalué
-- ─────────────────────────────────────────────
ALTER TABLE wolo_avis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Supprimer ancienne politique DELETE si existante pour la recréer proprement
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wolo_avis' AND policyname='avis_delete_by_subject') THEN
    DROP POLICY "avis_delete_by_subject" ON wolo_avis;
  END IF;
  -- Le prestataire évalué peut supprimer un avis qui le concerne
  -- Vérifie que l'utilisateur courant est le prestataire dont l'UUID est dans wolo_prestataires.user_id
  CREATE POLICY "avis_delete_by_subject" ON wolo_avis FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM wolo_prestataires p
        WHERE p.id = wolo_avis.prestataire_id
          AND p.user_id = auth.uid()
      )
      OR auth.uid() = auteur_user_id  -- L'auteur peut aussi supprimer son propre avis
    );
END $$;

-- ─────────────────────────────────────────────
-- 5. Vue wozali_* pour les nouvelles tables (compatibilité future)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.wozali_suivis          AS SELECT * FROM public.wolo_suivis;
CREATE OR REPLACE VIEW public.wozali_favoris_presta  AS SELECT * FROM public.wolo_favoris_presta;
CREATE OR REPLACE VIEW public.wozali_posts_v2        AS SELECT * FROM public.wolo_posts_v2;

DO $$ BEGIN
  RAISE NOTICE '✅ Migration no_airtable terminée — wolo_suivis · wolo_favoris_presta · wolo_posts_v2 créées';
END $$;
