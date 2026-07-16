-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 16 PHASE D — STATUT DU JOUR (2026-07-16)
-- Phrase courte (60 car) affichée sur le profil, expire après 24h.
-- Ex : "Libre cet après-midi à Bè". Pas de table : 2 colonnes.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_prestataires ADD COLUMN IF NOT EXISTS statut_jour text;
ALTER TABLE public.wozali_prestataires ADD COLUMN IF NOT EXISTS statut_jour_at timestamptz;
