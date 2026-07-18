-- ═══════════════════════════════════════════════════════════════
-- CHANTIER 8 DIGNITÉ — ÉTAPE 1 (2026-07-18)
-- Bouton "Ce message me met mal à l'aise" + analyse IA du
-- signalement. L'IA n'analyse JAMAIS toutes les conversations :
-- uniquement celles qu'une victime signale.
--   ia_classification : sollicitation_sexuelle / chantage_emploi /
--                       insistance_deplacee / injures / rien_detecte
--   ia_gravite        : 0-100 (>= 85 = gel automatique du compte,
--                       2 signalements >= 60 = suspension)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_signalements
  ADD COLUMN IF NOT EXISTS ia_classification text,
  ADD COLUMN IF NOT EXISTS ia_gravite int,
  ADD COLUMN IF NOT EXISTS ia_justification text;
