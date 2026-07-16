-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 20 — BADGES COMPORTEMENTAUX AUTOMATIQUES (2026-07-16)
-- "Répond vite" et "Très demandé" : calculés chaque jour par le
-- cron score-wozali, zéro intervention humaine.
--   repond_vite  : >= 2 RDV répondus sur 30j, temps de réponse médian <= 3h
--   tres_demande : >= 15 visiteurs distincts sur 7j OU >= 3 demandes RDV sur 7j
-- Chaque badge actif ajoute +2 pts au Score WOZALI (plafonné à 100).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_prestataires
  ADD COLUMN IF NOT EXISTS badges_auto text[] NOT NULL DEFAULT '{}';
