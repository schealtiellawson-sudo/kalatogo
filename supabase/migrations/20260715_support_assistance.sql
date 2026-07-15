-- ════════════════════════════════════════════════════════════════
-- SERVICE D'ASSISTANCE WOZALI — étape 7 Phase B (2026-07-15)
-- ════════════════════════════════════════════════════════════════
-- Décision fondateur : bouton "Besoin d'aide ?" → service d'assistance
-- INTERNE (call center WOZALI), jamais WhatsApp. Le socle complet est
-- construit avant le recrutement de l'équipe : dès qu'une assistante
-- est recrutée, on l'ajoute comme agent et on lui attribue des demandes.
-- Le fondateur voit tout : volumes, sujets, agents, notes clients.
-- ════════════════════════════════════════════════════════════════

-- 1. L'équipe d'assistance (vide au départ, remplie au recrutement)
CREATE TABLE IF NOT EXISTS public.wozali_support_agents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent','admin')),
  actif      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Les demandes d'assistance
CREATE TABLE IF NOT EXISTS public.wozali_support_demandes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sujet       TEXT NOT NULL CHECK (sujet IN ('compte','paiement','profil','emploi','technique','signalement','autre')),
  type        TEXT NOT NULL DEFAULT 'ecrit' CHECK (type IN ('ecrit','rappel')),
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 2000),
  telephone   TEXT,
  statut      TEXT NOT NULL DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle','assignee','en_cours','traitee','fermee')),
  agent_id    UUID REFERENCES public.wozali_support_agents(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  traitee_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_support_dem_user   ON public.wozali_support_demandes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_dem_statut ON public.wozali_support_demandes (statut, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_dem_agent  ON public.wozali_support_demandes (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_dem_sujet  ON public.wozali_support_demandes (sujet);

-- 3. Le fil de conversation d'une demande (client ↔ agent)
CREATE TABLE IF NOT EXISTS public.wozali_support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id  UUID NOT NULL REFERENCES public.wozali_support_demandes(id) ON DELETE CASCADE,
  de_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('client','agent')),
  contenu     TEXT NOT NULL CHECK (char_length(contenu) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_msg_demande ON public.wozali_support_messages (demande_id, created_at);

-- 4. La note du client après traitement (1 note par demande)
CREATE TABLE IF NOT EXISTS public.wozali_support_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id  UUID NOT NULL UNIQUE REFERENCES public.wozali_support_demandes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Helper RLS : suis-je un agent d'assistance actif ?
CREATE OR REPLACE FUNCTION public.wozali_est_agent_support()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.wozali_support_agents WHERE user_id = auth.uid() AND actif = true);
$$;

-- 6. RLS
ALTER TABLE public.wozali_support_agents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wozali_support_demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wozali_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wozali_support_notes    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Agents : visibles par les agents ; gérés (ajout/retrait) par les admins support
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_agents' AND policyname='sup_agents_select') THEN
    CREATE POLICY "sup_agents_select" ON public.wozali_support_agents FOR SELECT TO authenticated
      USING (public.wozali_est_agent_support());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_agents' AND policyname='sup_agents_admin_all') THEN
    CREATE POLICY "sup_agents_admin_all" ON public.wozali_support_agents FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.wozali_support_agents a WHERE a.user_id = auth.uid() AND a.actif AND a.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.wozali_support_agents a WHERE a.user_id = auth.uid() AND a.actif AND a.role = 'admin'));
  END IF;

  -- Demandes : le client crée et voit les siennes ; les agents voient et gèrent tout
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_demandes' AND policyname='sup_dem_insert_self') THEN
    CREATE POLICY "sup_dem_insert_self" ON public.wozali_support_demandes FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_demandes' AND policyname='sup_dem_select') THEN
    CREATE POLICY "sup_dem_select" ON public.wozali_support_demandes FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.wozali_est_agent_support());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_demandes' AND policyname='sup_dem_update_agents') THEN
    CREATE POLICY "sup_dem_update_agents" ON public.wozali_support_demandes FOR UPDATE TO authenticated
      USING (public.wozali_est_agent_support())
      WITH CHECK (public.wozali_est_agent_support());
  END IF;

  -- Messages : parties de la demande (client de la demande OU agents)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_messages' AND policyname='sup_msg_select') THEN
    CREATE POLICY "sup_msg_select" ON public.wozali_support_messages FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.wozali_support_demandes d WHERE d.id = demande_id AND d.user_id = auth.uid())
        OR public.wozali_est_agent_support()
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_messages' AND policyname='sup_msg_insert') THEN
    CREATE POLICY "sup_msg_insert" ON public.wozali_support_messages FOR INSERT TO authenticated
      WITH CHECK (
        de_user_id = auth.uid() AND (
          (role = 'client' AND EXISTS (SELECT 1 FROM public.wozali_support_demandes d WHERE d.id = demande_id AND d.user_id = auth.uid()))
          OR (role = 'agent' AND public.wozali_est_agent_support())
        )
      );
  END IF;

  -- Notes : le client note sa propre demande traitée, une seule fois ; agents lisent
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_notes' AND policyname='sup_note_insert') THEN
    CREATE POLICY "sup_note_insert" ON public.wozali_support_notes FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.wozali_support_demandes d WHERE d.id = demande_id AND d.user_id = auth.uid() AND d.statut IN ('traitee','fermee'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_support_notes' AND policyname='sup_note_select') THEN
    CREATE POLICY "sup_note_select" ON public.wozali_support_notes FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.wozali_est_agent_support());
  END IF;
END $$;

-- 7. Amorcer : le fondateur est le premier admin du support.
--    (⚠️ REMPLACER l'email si différent du compte fondateur en prod)
INSERT INTO public.wozali_support_agents (user_id, nom, role, actif)
SELECT id, 'Fondateur', 'admin', true FROM auth.users WHERE email = 'schealtiellawson@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', actif = true;
