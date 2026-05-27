CREATE TABLE agent_document_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  document_slug TEXT NOT NULL,
  first_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  read_count INTEGER DEFAULT 1,
  UNIQUE(agent_id, document_slug)
);
-- RLS : agent voit seulement ses propres lignes, admin voit tout
ALTER TABLE agent_document_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_self_read" ON agent_document_reads FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "agent_self_insert" ON agent_document_reads FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "agent_self_update" ON agent_document_reads FOR UPDATE USING (agent_id = auth.uid());
