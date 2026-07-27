-- ============================================================
-- WOZALI — Catalogue produits (Module "Ma boutique")
-- (2026-07-27) Prestataires de type vente affichent un catalogue
--   de produits sur leur profil public : photo + prix + statut stock
--   + bouton "Commander sur WhatsApp".
-- Colonnes calées EXACTEMENT sur l'insert front (saveProduitCatalogue) :
--   user_id, prestataire_id, nom, prix, categorie, photo_url,
--   description, stock_statut, actif, ordre
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wozali_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  prix           INTEGER,
  categorie      TEXT,
  photo_url      TEXT,
  description    TEXT,
  stock_statut   TEXT DEFAULT 'en_stock'
                 CHECK (stock_statut IN ('en_stock','sur_commande','epuise')),
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_user_ordre ON public.wozali_items(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_items_actif      ON public.wozali_items(actif);

-- ── RLS : lecture publique des items actifs, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_public_read"  ON public.wozali_items;
DROP POLICY IF EXISTS "items_self_insert"  ON public.wozali_items;
DROP POLICY IF EXISTS "items_self_update"  ON public.wozali_items;
DROP POLICY IF EXISTS "items_self_delete"  ON public.wozali_items;

CREATE POLICY "items_public_read" ON public.wozali_items FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "items_self_insert" ON public.wozali_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "items_self_update" ON public.wozali_items FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "items_self_delete" ON public.wozali_items FOR DELETE
  USING (auth.uid() = user_id);
