-- Renommage table : wozali_candidatures_pionniers → wozali_candidatures_agents_terrain
-- Raison : terminologie "Pionnier" interdite sur tout le projet WOZALI
ALTER TABLE IF EXISTS wozali_candidatures_pionniers
  RENAME TO wozali_candidatures_agents_terrain;
