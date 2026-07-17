-- ═══════════════════════════════════════════════════════════════
-- COACH ZALI — CHANTIER 2, ÉTAPE 1 : LE SOCLE (2026-07-17)
-- Deux tables :
--   wozali_coach_profil : l'état de coaching de chaque membre
--     (réponses questionnaire, préférence audio, palier, rythme anti-spam)
--   wozali_coach_messages : le journal de la conversation Coach Zali
--     (leçons, résultats, questionnaire, événements fondateur)
-- La bibliothèque de leçons vit dans le code (cron), pas en base.
-- Écriture des messages : cron/serveur (service role). Le membre lit
-- et marque lu / action faite sur SES messages uniquement.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_coach_profil (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Réponses questionnaire (tags, null tant que pas répondu)
  objectif           text,          -- clients / emploi / recruter / mieux_gagner
  blocage            text,          -- tag de la Q2 (dépend de l'objectif)
  canal              text,          -- tag de la Q3
  prefere_audio      boolean NOT NULL DEFAULT false, -- Q4, modifiable à tout moment
  note_libre         text,          -- champ libre (texte ou transcription vocale)
  note_libre_tags    text[],        -- tags extraits par l'IA (vide si hors sujet)
  questionnaire_etat text NOT NULL DEFAULT 'a_faire', -- a_faire / fait / passe
  -- Parcours et rythme
  palier             int  NOT NULL DEFAULT 0,  -- 0..4 (Profil solide → Référence de ton métier)
  rythme             text NOT NULL DEFAULT 'quotidien', -- quotidien / reduit (anti-spam)
  lecons_ignorees    int  NOT NULL DEFAULT 0,  -- leçons consécutives sans action
  derniere_lecon_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wozali_coach_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'lecon',
    -- lecon / resultat / question / reponse_membre / systeme / fondateur_event
  lecon_key     text,               -- slug de la leçon (ex: 'photos', 'statut_jour') pour ne jamais répéter
  titre         text,
  corps         text NOT NULL,
  cta_label     text,               -- libellé du bouton d'action unique
  cta_target    text,               -- deep link interne (ex: 'dash:photos', 'dash:profil')
  audio_url     text,               -- version vocale de la leçon si dispo
  lu            boolean NOT NULL DEFAULT false,
  action_faite  boolean NOT NULL DEFAULT false,  -- le membre a cliqué le CTA / fait l'action
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_msgs_user ON public.wozali_coach_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_msgs_lecon ON public.wozali_coach_messages(user_id, lecon_key);

ALTER TABLE public.wozali_coach_profil   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wozali_coach_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Profil coaching : chacun le sien (lecture, création, mise à jour)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_profil' AND policyname='coach_profil_select_self') THEN
    CREATE POLICY "coach_profil_select_self" ON public.wozali_coach_profil FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_profil' AND policyname='coach_profil_insert_self') THEN
    CREATE POLICY "coach_profil_insert_self" ON public.wozali_coach_profil FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_profil' AND policyname='coach_profil_update_self') THEN
    CREATE POLICY "coach_profil_update_self" ON public.wozali_coach_profil FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Messages : le membre lit les siens, marque lu / action faite,
  -- et peut écrire ses propres réponses (type reponse_membre).
  -- Les messages du Coach sont insérés par le cron (service role, bypass RLS).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_messages' AND policyname='coach_msgs_select_self') THEN
    CREATE POLICY "coach_msgs_select_self" ON public.wozali_coach_messages FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_messages' AND policyname='coach_msgs_insert_self') THEN
    CREATE POLICY "coach_msgs_insert_self" ON public.wozali_coach_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id AND type IN ('reponse_membre'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_coach_messages' AND policyname='coach_msgs_update_self') THEN
    CREATE POLICY "coach_msgs_update_self" ON public.wozali_coach_messages FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
