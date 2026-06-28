-- Agent contrats — système de signature interne (DocuSign WOZALI)
CREATE TABLE IF NOT EXISTS agent_contrats (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  agent_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_nom                 TEXT        NOT NULL,
  agent_telephone           TEXT,
  agent_ville               TEXT        CHECK (agent_ville IN ('Lomé', 'Cotonou')),
  lieu_signature            TEXT,
  date_signature            DATE        NOT NULL DEFAULT CURRENT_DATE,
  signature_data_url        TEXT,
  signed_at                 TIMESTAMPTZ,
  fondateur_signature_data_url TEXT,
  fondateur_signed_at       TIMESTAMPTZ,
  statut                    TEXT        NOT NULL DEFAULT 'en_attente'
                              CHECK (statut IN ('en_attente', 'agent_signe', 'cosigne')),
  contract_ref              TEXT        DEFAULT 'RT-CT-2026-018',
  notes_admin               TEXT,
  CONSTRAINT agent_contrats_unique_agent UNIQUE (agent_id)
);

ALTER TABLE agent_contrats ENABLE ROW LEVEL SECURITY;

-- Lecture : chacun voit tous (filtrage côté JS — admin voit tout, agent voit le sien)
CREATE POLICY "agent_contrats_select" ON agent_contrats
  FOR SELECT TO authenticated USING (true);

-- Insertion : uniquement son propre contrat
CREATE POLICY "agent_contrats_insert_own" ON agent_contrats
  FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());

-- Mise à jour : autorisée pour tous les authentifiés (agent signe le sien, fondateur contresigne)
CREATE POLICY "agent_contrats_update" ON agent_contrats
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
