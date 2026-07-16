-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 14 PHASE D — RÉACTIONS EMOJI (2026-07-16)
-- On étend wozali_likes plutôt que d'ajouter une table : une réaction
-- par personne par post (la contrainte unique post_id+user_id reste),
-- l'ancien "like" devient une réaction ❤️. Le compteur nb_likes = nombre
-- de lignes, donc le total reste juste quel que soit l'emoji.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_likes ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '❤️';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wozali_likes_emoji_valide') THEN
    ALTER TABLE public.wozali_likes
      ADD CONSTRAINT wozali_likes_emoji_valide
      CHECK (emoji IN ('👏','🔥','❤️','🙏'));
  END IF;
END $$;
