-- ============================================================
-- WOZALI — Savoir & Conseil (+ Immobilier) — Module "Mes séances / Mes biens"
-- (2026-07-27) Cluster métier savoir/conseil : prof particulier, formateur,
--   traducteur, comptable, juriste, expert Excel, secrétaire, commercial…
--   ET variante immobilier : agent/agence, démarcheur, courtier immobilier.
--
--   DEUX sous-blocs sur le profil public (renderProfilConseil) :
--     1) Séances & tarifs (conseil/cours) : liste nom + format (à domicile /
--        en ligne) + prix, bouton « Réserver ».
--     2) Annonces de biens (variante immobilier) : cartes bien (photo + prix +
--        type vente/location + quartier + surface/pièces), bouton « Visiter ».
--
--   Réservation de séance ET demande de visite = 100% INTERNE
--   (wozali_commandes + notification wozali_notifications), JAMAIS via WhatsApp.
--   Le pro gère ses séances (ds-seances) et ses biens (ds-biens) depuis son
--   dashboard.
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_seances  ← saveSeance
--   wozali_biens    ← saveBien
--   wozali_commandes ← reserverSeance (type 'seance') / visiterBien (type 'visite')
--                      (table réutilisée, PAS recréée — créée en 20260727d_atelier.sql)
-- Style identique aux migrations 20260727b_prestations.sql /
-- 20260727d_atelier.sql / 20260727e_creatif.sql / 20260727h_maison.sql.
-- Idempotent.
-- ============================================================

-- ── 1) Séances (cours/conseil, affichées sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_seances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,               -- ex : 'Cours de maths niveau lycée'
  format         TEXT,                        -- ex : 'domicile' / 'en_ligne'
  prix           INTEGER,                     -- prix en FCFA
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seances_user_ordre ON public.wozali_seances(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_seances_actif      ON public.wozali_seances(actif);

-- ── RLS : lecture publique des séances actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_seances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seances_public_read" ON public.wozali_seances;
DROP POLICY IF EXISTS "seances_self_insert" ON public.wozali_seances;
DROP POLICY IF EXISTS "seances_self_update" ON public.wozali_seances;
DROP POLICY IF EXISTS "seances_self_delete" ON public.wozali_seances;

CREATE POLICY "seances_public_read" ON public.wozali_seances FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "seances_self_insert" ON public.wozali_seances FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "seances_self_update" ON public.wozali_seances FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "seances_self_delete" ON public.wozali_seances FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2) Biens (annonces immobilières, affichées sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_biens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titre          TEXT NOT NULL,               -- ex : 'Appartement 2 chambres, Agla'
  transaction    TEXT,                        -- ex : 'vente' / 'location'
  type_bien      TEXT,                        -- ex : 'appartement' / 'terrain' / 'maison'
  prix           INTEGER,                     -- prix numérique en FCFA
  prix_txt       TEXT,                        -- libellé libre du prix, ex : '80 000 F/mois'
  quartier       TEXT,
  superficie_m2  INTEGER,
  pieces         INTEGER,
  photo_url      TEXT,
  description    TEXT,
  statut         TEXT DEFAULT 'actif'
                 CHECK (statut IN ('actif','vendu','loue','retire')),
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biens_user_ordre ON public.wozali_biens(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_biens_actif      ON public.wozali_biens(actif);

-- ── RLS : lecture publique des biens actifs, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_biens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biens_public_read" ON public.wozali_biens;
DROP POLICY IF EXISTS "biens_self_insert" ON public.wozali_biens;
DROP POLICY IF EXISTS "biens_self_update" ON public.wozali_biens;
DROP POLICY IF EXISTS "biens_self_delete" ON public.wozali_biens;

CREATE POLICY "biens_public_read" ON public.wozali_biens FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "biens_self_insert" ON public.wozali_biens FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "biens_self_update" ON public.wozali_biens FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "biens_self_delete" ON public.wozali_biens FOR DELETE
  USING (auth.uid() = user_id);

-- ── Réservations / visites : AUCUNE nouvelle table. On réutilise
--    public.wozali_commandes (créée en 20260727d_atelier.sql) avec
--    type = 'seance' (réservation de séance) ou type = 'visite' (demande de
--    visite de bien). Le CHECK sur statut accepte déjà 'recue' (défaut à l'insert).
--    Rappel de sa forme — NE PAS recréer ici :
--      client_user_id / prestataire_id / prestataire_user_id / type / item_id /
--      item_nom / prix_txt / note / statut / created_at
-- ============================================================
