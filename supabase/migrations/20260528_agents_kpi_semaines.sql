-- KPI hebdomadaires agents terrain WOZALI
-- Carton orange : 1 semaine sous KPI
-- Carton rouge  : 2 semaines consecutives sous KPI -> formation obligatoire
-- KPI minimum   : 150 inscrits Gratuit + 30 Pro signes (20% conversion)

CREATE TABLE IF NOT EXISTS wozali_kpi_semaines (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          TEXT        NOT NULL,
  agent_nom         TEXT,
  semaine_debut     DATE        NOT NULL, -- Lundi de la semaine
  inscrits_gratuit  INTEGER     NOT NULL DEFAULT 0,
  pro_signes        INTEGER     NOT NULL DEFAULT 0,
  taux_conversion   NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN inscrits_gratuit > 0
    THEN ROUND((pro_signes::numeric / inscrits_gratuit) * 100, 2)
    ELSE 0 END
  ) STORED,
  kpi_ok            BOOLEAN GENERATED ALWAYS AS (
    inscrits_gratuit >= 150 AND pro_signes >= 30
  ) STORED,
  carton            TEXT        NOT NULL DEFAULT 'aucun'
                    CHECK (carton IN ('aucun', 'orange', 'rouge')),
  statut_agent      TEXT        NOT NULL DEFAULT 'actif'
                    CHECK (statut_agent IN ('actif', 'formation', 'arrete')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, semaine_debut)
);

CREATE INDEX IF NOT EXISTS idx_kpi_agent_semaine
  ON wozali_kpi_semaines (agent_id, semaine_debut DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_semaine_debut
  ON wozali_kpi_semaines (semaine_debut DESC);

ALTER TABLE wozali_kpi_semaines ENABLE ROW LEVEL SECURITY;

-- Seuls les admins authentifies peuvent lire/ecrire
CREATE POLICY "admin_all_kpi" ON wozali_kpi_semaines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION _update_kpi_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_kpi_updated_at ON wozali_kpi_semaines;
CREATE TRIGGER trg_kpi_updated_at
  BEFORE UPDATE ON wozali_kpi_semaines
  FOR EACH ROW EXECUTE FUNCTION _update_kpi_updated_at();
