-- ============================================================
-- WOZALI — Atelier & Sur-mesure (Module "Mes modèles")
-- (2026-07-27) Cluster métier confection sur-mesure : couturier, brodeur,
--   cordonnier, teinturier…
--   Le pro affiche un book de modèles (photo + nom + prix façon + délai de
--   confection + « tissu non compris ») sur son profil public, avec un bouton
--   « Je veux ce modèle » par modèle. La commande se crée EN INTERNE
--   (wozali_commandes + notification wozali_notifications), JAMAIS via WhatsApp.
--   Le pro gère ses modèles depuis son dashboard (section ds-modeles).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_modeles   ← saveModele
--   wozali_commandes ← commanderModele
-- Style identique aux migrations 20260727_catalogue_items.sql /
-- 20260727b_prestations.sql / 20260727c_chantiers.sql. Idempotent.
-- ============================================================

-- ── 1) Modèles (book de modèles, affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_modeles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  prix_facon     INTEGER,                     -- prix de la façon (tissu non compris par défaut)
  tissu_inclus   BOOLEAN DEFAULT FALSE,
  delai_jours    INTEGER,                     -- délai de confection annoncé en jours
  photo_url      TEXT,
  description    TEXT,
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modeles_user_ordre ON public.wozali_modeles(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_modeles_actif      ON public.wozali_modeles(actif);

-- ── RLS : lecture publique des modèles actifs, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_modeles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modeles_public_read" ON public.wozali_modeles;
DROP POLICY IF EXISTS "modeles_self_insert" ON public.wozali_modeles;
DROP POLICY IF EXISTS "modeles_self_update" ON public.wozali_modeles;
DROP POLICY IF EXISTS "modeles_self_delete" ON public.wozali_modeles;

CREATE POLICY "modeles_public_read" ON public.wozali_modeles FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "modeles_self_insert" ON public.wozali_modeles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "modeles_self_update" ON public.wozali_modeles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "modeles_self_delete" ON public.wozali_modeles FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2) Commandes (client → pro, 100% interne) ──
-- Table générique de commande de modèle/produit, réutilisable par d'autres
-- clusters commande plus tard (type = 'modele', 'produit', …).
CREATE TABLE IF NOT EXISTS public.wozali_commandes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prestataire_id      UUID,                   -- wozali_prestataires.id
  prestataire_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type                TEXT,                   -- ex : 'modele', 'produit'
  item_id             UUID,                   -- id du modèle / produit commandé
  item_nom            TEXT,
  prix_txt            TEXT,                   -- prix affiché au moment de la commande (texte libre)
  note                TEXT,
  statut              TEXT DEFAULT 'recue'
                      CHECK (statut IN ('recue','en_cours','prete','livree','annulee')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commandes_prestataire ON public.wozali_commandes(prestataire_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commandes_client      ON public.wozali_commandes(client_user_id, created_at DESC);

-- ── RLS : le client gère les siennes, le pro voit/gère celles qui le concernent ──
ALTER TABLE public.wozali_commandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commandes_client_read"   ON public.wozali_commandes;
DROP POLICY IF EXISTS "commandes_client_insert" ON public.wozali_commandes;
DROP POLICY IF EXISTS "commandes_pro_read"      ON public.wozali_commandes;
DROP POLICY IF EXISTS "commandes_pro_update"    ON public.wozali_commandes;

-- Le client insère et lit ses propres commandes.
CREATE POLICY "commandes_client_read" ON public.wozali_commandes FOR SELECT
  USING (auth.uid() = client_user_id);
CREATE POLICY "commandes_client_insert" ON public.wozali_commandes FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

-- Le pro lit et met à jour (statut) les commandes qui le concernent.
CREATE POLICY "commandes_pro_read" ON public.wozali_commandes FOR SELECT
  USING (auth.uid() = prestataire_user_id);
CREATE POLICY "commandes_pro_update" ON public.wozali_commandes FOR UPDATE
  USING (auth.uid() = prestataire_user_id) WITH CHECK (auth.uid() = prestataire_user_id);
