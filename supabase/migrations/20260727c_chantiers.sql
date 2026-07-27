-- ============================================================
-- WOZALI — Chantiers & Interventions (Module "Mes réalisations")
-- (2026-07-27) Cluster métier bâtiment/intervention : maçon, plombier,
--   électricien, peintre, mécanicien, réparateurs…
--   Le pro affiche ses chantiers réalisés (photo + type + lieu + coût/durée
--   indicatifs) sur son profil public, et propose « Demander un devis ».
--   La demande de devis se crée EN INTERNE (wozali_devis + notification
--   wozali_notifications), JAMAIS via WhatsApp. Le pro la gère plus tard
--   depuis son dashboard (incrément ultérieur).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_realisations ← saveRealisation
--   wozali_devis        ← ouvrirDemandeDevis / envoyerDemandeDevis
-- Style identique aux migrations 20260727_catalogue_items.sql /
-- 20260727b_prestations.sql. Idempotent.
-- ============================================================

-- ── 1) Réalisations (chantiers réalisés, affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_realisations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titre          TEXT NOT NULL,
  type           TEXT,                        -- ex : "Réfection toiture", "Installation électrique"
  quartier       TEXT,
  cout_txt       TEXT,                        -- coût indicatif en texte libre ("à partir de 150 000 F")
  duree_txt      TEXT,                        -- durée indicative en texte libre ("3 jours")
  photo_url      TEXT,
  photos         JSONB,                       -- galerie optionnelle : ["url1","url2",…]
  description    TEXT,
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realisations_user_ordre ON public.wozali_realisations(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_realisations_actif      ON public.wozali_realisations(actif);

-- ── RLS : lecture publique des réalisations actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_realisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realisations_public_read" ON public.wozali_realisations;
DROP POLICY IF EXISTS "realisations_self_insert" ON public.wozali_realisations;
DROP POLICY IF EXISTS "realisations_self_update" ON public.wozali_realisations;
DROP POLICY IF EXISTS "realisations_self_delete" ON public.wozali_realisations;

CREATE POLICY "realisations_public_read" ON public.wozali_realisations FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "realisations_self_insert" ON public.wozali_realisations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "realisations_self_update" ON public.wozali_realisations FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "realisations_self_delete" ON public.wozali_realisations FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2) Demandes de devis (client → pro, 100% interne) ──
CREATE TABLE IF NOT EXISTS public.wozali_devis (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prestataire_id      UUID,                   -- wozali_prestataires.id
  prestataire_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  quartier            TEXT,
  photo_url           TEXT,
  statut              TEXT DEFAULT 'demande'
                      CHECK (statut IN ('demande','repondu','accepte','refuse','clos')),
  montant_txt         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_prestataire ON public.wozali_devis(prestataire_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_client      ON public.wozali_devis(client_user_id, created_at DESC);

-- ── RLS : le client gère les siens, le pro voit/gère ceux qui le concernent ──
ALTER TABLE public.wozali_devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_client_read"   ON public.wozali_devis;
DROP POLICY IF EXISTS "devis_client_insert" ON public.wozali_devis;
DROP POLICY IF EXISTS "devis_pro_read"      ON public.wozali_devis;
DROP POLICY IF EXISTS "devis_pro_update"    ON public.wozali_devis;

-- Le client insère et lit ses propres demandes.
CREATE POLICY "devis_client_read" ON public.wozali_devis FOR SELECT
  USING (auth.uid() = client_user_id);
CREATE POLICY "devis_client_insert" ON public.wozali_devis FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

-- Le pro lit et met à jour (statut / montant) les demandes qui le concernent.
CREATE POLICY "devis_pro_read" ON public.wozali_devis FOR SELECT
  USING (auth.uid() = prestataire_user_id);
CREATE POLICY "devis_pro_update" ON public.wozali_devis FOR UPDATE
  USING (auth.uid() = prestataire_user_id) WITH CHECK (auth.uid() = prestataire_user_id);
