-- ================================================================
-- WOZALI — Ajout colonnes priorité / urgence au chat
-- Date : 2026-05-24
-- ================================================================

ALTER TABLE wolo_chat_messages
  ADD COLUMN IF NOT EXISTS priorite SMALLINT CHECK (priorite BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS urgence  SMALLINT CHECK (urgence  BETWEEN 1 AND 4);

COMMENT ON COLUMN wolo_chat_messages.priorite IS
  '1=très important pour WOZALI, 5=question basique. Classifié automatiquement par l''IA.';

COMMENT ON COLUMN wolo_chat_messages.urgence IS
  '1=très urgent (fondateur doit répondre vite), 4=non urgent. Classifié automatiquement par l''IA.';
