-- Agent contrats v2 — ajout document_type pour gérer contrat ET charte
ALTER TABLE agent_contrats
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'contrat'
    CHECK (document_type IN ('contrat', 'charte'));

-- Supprimer l'ancienne contrainte unique sur agent_id seul
ALTER TABLE agent_contrats
  DROP CONSTRAINT IF EXISTS agent_contrats_unique_agent;

-- Nouvelle contrainte : un seul enregistrement par (agent, document)
ALTER TABLE agent_contrats
  ADD CONSTRAINT agent_contrats_unique_agent_doc UNIQUE (agent_id, document_type);

-- Mettre à jour les lignes existantes (si elles n'ont pas encore de document_type)
UPDATE agent_contrats SET document_type = 'contrat' WHERE document_type IS NULL;
