-- ═══════════════════════════════════════════════════════════════
-- COACH SANDY — DIAGNOSTIC GRATUIT (2026-07-22)
-- Un membre gratuit a droit à UN diagnostic complet par mois avec
-- Coach Sandy (quota généreux de sécurité, jamais coupé en plein
-- flux). Ces 3 colonnes suivent l'état de ce diagnostic sur
-- wozali_coach_profil (déjà créée par 20260717_coach_zali_socle.sql).
-- Granularité choisie : flag mensuel simple (pas de table à part).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_coach_profil
  ADD COLUMN IF NOT EXISTS diagnostic_gratuit_mois     text,              -- 'YYYY-MM' du mois où le diagnostic en cours a été entamé
  ADD COLUMN IF NOT EXISTS diagnostic_gratuit_messages int  NOT NULL DEFAULT 0,  -- messages envoyés dans le diagnostic de ce mois
  ADD COLUMN IF NOT EXISTS diagnostic_gratuit_termine  boolean NOT NULL DEFAULT false; -- diagnostic conclu (closing livré ou quota atteint) : le verrou Pro s'affiche

-- Pas de nouvel index nécessaire : la lecture se fait toujours par
-- user_id (clé primaire), déjà indexée.

COMMENT ON COLUMN public.wozali_coach_profil.diagnostic_gratuit_mois IS
  'Mois (YYYY-MM) auquel appartient le diagnostic gratuit en cours ou déjà consommé. Remis à zéro automatiquement côté application dès que le mois change.';
COMMENT ON COLUMN public.wozali_coach_profil.diagnostic_gratuit_messages IS
  'Nombre de messages envoyés par le membre gratuit dans le diagnostic du mois courant (quota de sécurité : 10, voir coach-chat.js QUOTA_DIAGNOSTIC_GRATUIT).';
COMMENT ON COLUMN public.wozali_coach_profil.diagnostic_gratuit_termine IS
  'true une fois le diagnostic gratuit du mois conclu (closing livré par Sandy ou quota de messages atteint) : le chat affiche alors le verrou Pro plutôt que d''appeler l''IA.';
