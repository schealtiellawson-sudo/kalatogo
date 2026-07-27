-- ============================================================
-- WOZALI — Créatif & Digital (Module "Mes offres / packs")
-- (2026-07-27) Cluster métier créatif : photographe, vidéaste, graphiste,
--   monteur, motion designer, développeur, community manager, rédacteur,
--   modèle/influenceur…
--
--   Le pro affiche un PORTFOLIO PAR PROJET + des OFFRES EN PACKS à prix fixe
--   (ex : « Logo + charte : 25 000 F · 5 jours »). Bouton « Commander » par
--   pack → commande créée EN INTERNE (wozali_commandes + notification
--   wozali_notifications), JAMAIS via WhatsApp. Le pro gère ses packs depuis
--   son dashboard (section ds-packs).
--
-- CHOIX D'ARCHITECTURE (anti-doublon, documenté) :
--   • PORTFOLIO : on RÉUTILISE la table existante `wozali_realisations`
--     (affichée sur le profil par renderProfilChantiers). Le pro créatif met
--     ses projets dans « Mes réalisations ». → AUCUNE nouvelle table ni
--     colonne nécessaire pour le portfolio.
--   • PACKS : `wozali_realisations`/`wozali_prestations` ne collent pas au
--     modèle « prix fixe + délai en jours + commande interne » sans créer un
--     double affichage sur le profil (elles sont déjà rendues par
--     renderProfilChantiers / renderProfilPrestations). On crée donc UNE table
--     dédiée `wozali_packs` pour les offres en packs.
--   • COMMANDES : on RÉUTILISE la table existante `wozali_commandes`
--     (type = 'pack'), déjà créée en 20260727d_atelier.sql. Aucune structure
--     nouvelle ici.
--
-- Colonnes de wozali_packs calées EXACTEMENT sur l'insert front (savePack) :
--   user_id, prestataire_id, nom, prix, delai_jours, description, actif, ordre
--
-- Style identique aux migrations 20260727b_prestations.sql /
-- 20260727d_atelier.sql. Idempotent (CREATE TABLE IF NOT EXISTS, DROP POLICY
-- IF EXISTS avant CREATE POLICY).
-- ============================================================

-- ── Packs / offres à prix fixe (affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_packs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  prix           INTEGER,                     -- prix fixe du pack en FCFA
  delai_jours    INTEGER,                     -- délai de livraison annoncé en jours
  description    TEXT,
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_user_ordre ON public.wozali_packs(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_packs_actif      ON public.wozali_packs(actif);

-- ── RLS : lecture publique des packs actifs, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packs_public_read" ON public.wozali_packs;
DROP POLICY IF EXISTS "packs_self_insert" ON public.wozali_packs;
DROP POLICY IF EXISTS "packs_self_update" ON public.wozali_packs;
DROP POLICY IF EXISTS "packs_self_delete" ON public.wozali_packs;

CREATE POLICY "packs_public_read" ON public.wozali_packs FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "packs_self_insert" ON public.wozali_packs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "packs_self_update" ON public.wozali_packs FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "packs_self_delete" ON public.wozali_packs FOR DELETE
  USING (auth.uid() = user_id);

-- ── Commandes : AUCUNE nouvelle table. On réutilise public.wozali_commandes
--    (créée en 20260727d_atelier.sql) avec type = 'pack'. Rappel de sa forme
--    pour référence — NE PAS recréer ici :
--      client_user_id / prestataire_id / prestataire_user_id / type / item_id /
--      item_nom / prix_txt / note / statut / created_at
-- ============================================================
