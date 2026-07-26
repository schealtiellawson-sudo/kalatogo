-- ============================================================
-- WOZALI — Demandes de retrait des gains (parrainage / commissions)
-- (2026-07-26) Table support de confirmWithdrawal() (app.js).
-- Colonnes calées EXACTEMENT sur l'insert front :
--   user_id, prestataire_id, montant_fcfa, methode, telephone, statut
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wozali_retraits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  montant_fcfa   INTEGER NOT NULL CHECK (montant_fcfa > 0),
  methode        TEXT NOT NULL DEFAULT 'TMoney',   -- TMoney / Flooz / Wave / MTN / Moov… (non contraint : valeurs radio front)
  telephone      TEXT NOT NULL,
  statut         TEXT NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','en_cours','paye','rejete')),
  note_admin     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retraits_user   ON public.wozali_retraits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retraits_statut ON public.wozali_retraits(statut, created_at DESC);

-- ── RLS : chacun crée et lit ses propres demandes ──
ALTER TABLE public.wozali_retraits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "retraits_self_insert" ON public.wozali_retraits;
DROP POLICY IF EXISTS "retraits_self_read"   ON public.wozali_retraits;
CREATE POLICY "retraits_self_insert" ON public.wozali_retraits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "retraits_self_read" ON public.wozali_retraits FOR SELECT
  USING (auth.uid() = user_id);
-- (La gestion admin des retraits se fait via la service_role key côté serveur, qui bypass RLS.)
