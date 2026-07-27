-- ============================================================
-- WOZALI — Restauration & Traiteur (Module "Ma carte")
-- (2026-07-27) Cluster métier restauration : cuisinier, traiteur,
--   pâtissier/boulanger, restaurateur, bar/maquis…
--   Le pro affiche sa carte / son menu regroupé par catégorie (Plats,
--   Boissons, Desserts…), chaque item = nom + prix (+ photo optionnelle
--   + badge « Plat du jour »), sur son profil public, avec un bouton
--   « Commander » par item. La commande se crée EN INTERNE
--   (wozali_commandes + notification wozali_notifications), JAMAIS via WhatsApp.
--   Le pro gère sa carte depuis son dashboard (section ds-menu).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_menu      ← saveMenuItem
--   wozali_commandes ← commanderPlat (type 'menu', table réutilisée, PAS recréée)
-- Style identique aux migrations 20260727_catalogue_items.sql /
-- 20260727b_prestations.sql / 20260727c_chantiers.sql /
-- 20260727d_atelier.sql / 20260727e_creatif.sql. Idempotent.
-- ============================================================

-- ── Carte / menu (items affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_menu (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  categorie      TEXT,                        -- ex : 'Plats', 'Boissons', 'Desserts'
  prix           INTEGER,
  photo_url      TEXT,
  plat_du_jour   BOOLEAN DEFAULT FALSE,
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_user_ordre ON public.wozali_menu(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_menu_actif      ON public.wozali_menu(actif);

-- ── RLS : lecture publique des items actifs, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_public_read" ON public.wozali_menu;
DROP POLICY IF EXISTS "menu_self_insert" ON public.wozali_menu;
DROP POLICY IF EXISTS "menu_self_update" ON public.wozali_menu;
DROP POLICY IF EXISTS "menu_self_delete" ON public.wozali_menu;

CREATE POLICY "menu_public_read" ON public.wozali_menu FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "menu_self_insert" ON public.wozali_menu FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menu_self_update" ON public.wozali_menu FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menu_self_delete" ON public.wozali_menu FOR DELETE
  USING (auth.uid() = user_id);

-- ── Commandes : réutilise public.wozali_commandes (créée par 20260727d_atelier.sql).
-- commanderPlat insère avec type = 'menu'. Aucune table commande recréée ici.
-- Le CHECK sur statut accepte déjà 'recue' (valeur par défaut utilisée à l'insert).
