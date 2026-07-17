-- ═══════════════════════════════════════════════════════════════
-- COACH ZALI — CHANTIER 2, ÉTAPE 2 : LA CONVERSATION (2026-07-17)
-- Le flux d'onboarding (présentation, questions, reformulation,
-- première leçon immédiate) est écrit côté client par le membre
-- lui-même, pour lui-même. On élargit donc la policy INSERT aux
-- types de messages du Coach. Aucun risque : un membre ne peut
-- écrire QUE dans sa propre conversation, visible de lui seul.
-- Les leçons quotidiennes viendront du cron (service role).
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "coach_msgs_insert_self" ON public.wozali_coach_messages;
CREATE POLICY "coach_msgs_insert_self" ON public.wozali_coach_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND type IN ('reponse_membre','question','systeme','lecon','resultat'));
