-- ================================================================
-- Agent Terrain — Journal de bord quotidien
-- Responsable Terrain — Compte rendu hebdomadaire
-- ================================================================

-- ── Journal de bord agent ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_journaux_terrain (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  conversations   INT  NOT NULL DEFAULT 0,
  inscrits        INT  NOT NULL DEFAULT 0,
  pros            INT  NOT NULL DEFAULT 0,
  zones           TEXT DEFAULT '',
  ce_qui_a_marche          TEXT DEFAULT '',
  ce_qui_na_pas_marche     TEXT DEFAULT '',
  demain_je_change         TEXT DEFAULT '',
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, date)
);

CREATE INDEX IF NOT EXISTS idx_journaux_agent_date
  ON agent_journaux_terrain (agent_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_journaux_date
  ON agent_journaux_terrain (date DESC);

ALTER TABLE agent_journaux_terrain ENABLE ROW LEVEL SECURITY;

-- L'agent lit et ecrit uniquement ses propres journaux
CREATE POLICY "agent_journaux_self_select" ON agent_journaux_terrain
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "agent_journaux_self_insert" ON agent_journaux_terrain
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "agent_journaux_self_update" ON agent_journaux_terrain
  FOR UPDATE USING (agent_id = auth.uid());

-- Le responsable (role = 'responsable' dans agents_terrain) peut lire tous les journaux
-- de son equipe via service_role (pas de policy client — appels via backend)


-- ── Compte rendu hebdomadaire responsable ─────────────────────────
CREATE TABLE IF NOT EXISTS responsable_cr_hebdo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsable_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semaine_debut     DATE NOT NULL,
  inscrits_togo     INT  DEFAULT 0,
  inscrits_benin    INT  DEFAULT 0,
  pros_togo         INT  DEFAULT 0,
  pros_benin        INT  DEFAULT 0,
  top_agent_togo    TEXT DEFAULT '',
  top_agent_benin   TEXT DEFAULT '',
  agents_orange     TEXT DEFAULT '',
  agents_rouge      TEXT DEFAULT '',
  blocage_semaine   TEXT DEFAULT '',
  victoire_semaine  TEXT DEFAULT '',
  action_prioritaire TEXT DEFAULT '',
  submitted_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (responsable_id, semaine_debut)
);

CREATE INDEX IF NOT EXISTS idx_cr_responsable_semaine
  ON responsable_cr_hebdo (responsable_id, semaine_debut DESC);

ALTER TABLE responsable_cr_hebdo ENABLE ROW LEVEL SECURITY;

-- Le responsable lit et ecrit ses propres CRs
CREATE POLICY "cr_self_select" ON responsable_cr_hebdo
  FOR SELECT USING (responsable_id = auth.uid());

CREATE POLICY "cr_self_insert" ON responsable_cr_hebdo
  FOR INSERT WITH CHECK (responsable_id = auth.uid());

CREATE POLICY "cr_self_update" ON responsable_cr_hebdo
  FOR UPDATE USING (responsable_id = auth.uid());
