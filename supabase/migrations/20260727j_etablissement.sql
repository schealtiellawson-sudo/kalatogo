-- ============================================================
-- WOZALI — Établissements & Événementiel (Module « Mon établissement »)
-- (2026-07-27) Dernier cluster métier : hôtel, clinique, cybercafé,
--   pressing, institut/salon, boîte de nuit, DJ, organisateur
--   d'événements…
--   Sur son profil public, le pro affiche une FICHE ÉTABLISSEMENT :
--     · ses horaires (texte libre, ex « Lun-Sam 8h-20h · Dim fermé »)
--     · ses équipements (chips : Wi-Fi, Climatisation, Parking, CB
--       acceptée…), stockés en liste séparée par virgules
--   puis un bouton « Réserver une place / un événement » →
--   réservation EN INTERNE (wozali_commandes type 'reservation' +
--   notification wozali_notifications via pushNotif), JAMAIS via WhatsApp.
--
--   Contrairement aux autres clusters (listes d'items), la fiche
--   établissement est un SINGLETON : UNE seule ligne par pro (contrainte
--   UNIQUE sur user_id). Le pro l'édite depuis son dashboard
--   (section ds-etablissement) via un upsert manuel (update si présent,
--   sinon insert).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_etablissement ← saveEtablissement
--   wozali_commandes     ← reserverEtablissement (type 'reservation',
--                           table réutilisée, PAS recréée)
-- Style identique aux migrations 20260727g_transport.sql /
-- 20260727h_maison.sql / 20260727i_conseil.sql. Idempotent.
-- ============================================================

-- ── Fiche établissement (une seule ligne par pro) ──
CREATE TABLE IF NOT EXISTS public.wozali_etablissement (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id      UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  horaires            TEXT,                        -- texte libre, ex : 'Lun-Sam 8h-20h · Dim fermé'
  equipements         TEXT,                        -- liste séparée par virgules, ex : 'Wi-Fi,Climatisation,Parking'
  reservation_ouverte BOOLEAN DEFAULT TRUE,        -- true = bouton « Réserver » affiché
  actif               BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etablissement_user ON public.wozali_etablissement(user_id);

-- ── RLS : lecture publique des fiches actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_etablissement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etablissement_public_read" ON public.wozali_etablissement;
DROP POLICY IF EXISTS "etablissement_self_insert" ON public.wozali_etablissement;
DROP POLICY IF EXISTS "etablissement_self_update" ON public.wozali_etablissement;
DROP POLICY IF EXISTS "etablissement_self_delete" ON public.wozali_etablissement;

CREATE POLICY "etablissement_public_read" ON public.wozali_etablissement FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "etablissement_self_insert" ON public.wozali_etablissement FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "etablissement_self_update" ON public.wozali_etablissement FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "etablissement_self_delete" ON public.wozali_etablissement FOR DELETE
  USING (auth.uid() = user_id);

-- ── Réservations : réutilise public.wozali_commandes (créée par 20260727d_atelier.sql).
-- reserverEtablissement insère avec type = 'reservation'. Aucune table réservation recréée ici.
-- Le CHECK sur statut accepte déjà 'recue' (valeur par défaut utilisée à l'insert).
