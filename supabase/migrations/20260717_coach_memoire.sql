-- ═══════════════════════════════════════════════════════════════
-- COACH SANDY — MÉMOIRE LONGUE (2026-07-17)
-- Notes glissantes de la relation : chaque échange Pro laisse une
-- ligne (date, question, conseil donné). Sandy les relit avant de
-- répondre : elle se souvient d'un mois à l'autre et peut relancer
-- ("La dernière fois tu devais afficher tes tarifs. C'est fait ?").
-- On garde les ~15 dernières lignes, côté serveur uniquement.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_coach_profil
  ADD COLUMN IF NOT EXISTS memoire text;
