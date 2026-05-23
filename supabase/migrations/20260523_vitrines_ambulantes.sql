-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Vitrines Ambulantes WOZALI
-- Commerçants ambulants : "Je vends ici"
-- Photo + produit + prix + GPS + WhatsApp en 2 min
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_vitrines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prestataire_id    TEXT,                           -- Airtable record ID (compat)
  ce_que_je_vends   TEXT NOT NULL,                  -- "Beignets, zouzouke, jus"
  prix_indicatif    TEXT,                           -- "50F–200F"
  photo_url         TEXT,                           -- ImgBB URL
  gps_lat           DOUBLE PRECISION,
  gps_lon           DOUBLE PRECISION,
  ville             TEXT,                           -- Lomé / Cotonou
  quartier          TEXT,
  whatsapp          TEXT,
  actif             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour trouver les vitrines actives près d'un quartier
CREATE INDEX IF NOT EXISTS idx_vitrines_actif     ON public.wozali_vitrines(actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_vitrines_ville      ON public.wozali_vitrines(ville);
CREATE INDEX IF NOT EXISTS idx_vitrines_user       ON public.wozali_vitrines(user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public._vitrine_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER vitrine_updated_at
  BEFORE UPDATE ON public.wozali_vitrines
  FOR EACH ROW EXECUTE FUNCTION public._vitrine_updated_at();

-- RLS
ALTER TABLE public.wozali_vitrines ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde peut voir les vitrines actives
CREATE POLICY "vitrines_public_select" ON public.wozali_vitrines
  FOR SELECT USING (actif = true OR auth.uid() = user_id);

-- Écriture : uniquement son propre record
CREATE POLICY "vitrines_insert_self" ON public.wozali_vitrines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vitrines_update_self" ON public.wozali_vitrines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "vitrines_delete_self" ON public.wozali_vitrines
  FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table wozali_vitrines créée (Je vends ici)';
END $$;
