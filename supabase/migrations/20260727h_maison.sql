-- ============================================================
-- WOZALI — Maison & Aide à la personne (Module "Mes formules")
-- (2026-07-27) Cluster métier maison/aide à la personne : jardinier,
--   femme de ménage, gardien, agent de sécurité, repasseuse,
--   baby-sitter, aide-soignant…
--   Frein n°1 = la confiance (on fait entrer quelqu'un chez soi).
--   Le pro affiche sur son profil public un bloc « confiance »
--   (identité vérifiée si le flag profil est vrai + recommandation
--   quartier) puis une liste de FORMULES, dont des abonnements
--   récurrents (ex « Ménage 2×/semaine : 20 000 F/mois »), avec un
--   bouton « Réserver » par formule. La réservation se crée EN INTERNE
--   (wozali_commandes type 'service' + notification wozali_notifications),
--   JAMAIS via WhatsApp. Le pro gère ses formules depuis son dashboard
--   (section ds-formules).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_formules  ← saveFormule
--   wozali_commandes ← reserverFormule (type 'service', table réutilisée,
--                       PAS recréée)
-- Style identique aux migrations 20260727_catalogue_items.sql /
-- 20260727b_prestations.sql / 20260727c_chantiers.sql /
-- 20260727d_atelier.sql / 20260727e_creatif.sql / 20260727f_resto.sql /
-- 20260727g_transport.sql. Idempotent.
-- ============================================================

-- ── Formules (items affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_formules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,               -- ex : 'Ménage 2×/semaine'
  prix_txt       TEXT,                        -- libellé libre du tarif, ex : '20 000 F/mois'
  recurrent      BOOLEAN DEFAULT FALSE,       -- true = abonnement récurrent
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formules_user_ordre ON public.wozali_formules(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_formules_actif      ON public.wozali_formules(actif);

-- ── RLS : lecture publique des formules actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_formules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formules_public_read" ON public.wozali_formules;
DROP POLICY IF EXISTS "formules_self_insert" ON public.wozali_formules;
DROP POLICY IF EXISTS "formules_self_update" ON public.wozali_formules;
DROP POLICY IF EXISTS "formules_self_delete" ON public.wozali_formules;

CREATE POLICY "formules_public_read" ON public.wozali_formules FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "formules_self_insert" ON public.wozali_formules FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "formules_self_update" ON public.wozali_formules FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "formules_self_delete" ON public.wozali_formules FOR DELETE
  USING (auth.uid() = user_id);

-- ── Réservations : réutilise public.wozali_commandes (créée par 20260727d_atelier.sql).
-- reserverFormule insère avec type = 'service'. Aucune table réservation recréée ici.
-- Le CHECK sur statut accepte déjà 'recue' (valeur par défaut utilisée à l'insert).
