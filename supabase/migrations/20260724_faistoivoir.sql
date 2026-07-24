-- ============================================================
-- WOZALI — Fais-toi voir : persistance de l'accroche (2026-07-24)
-- L'accroche générée par Sandy (ou saisie) est stockée sur le profil
-- pour être réutilisée dans tous les visuels et partagée entre appareils.
-- ============================================================

ALTER TABLE wozali_prestataires
  ADD COLUMN IF NOT EXISTS ftv_accroche text;
