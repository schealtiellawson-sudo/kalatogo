-- Migration : garantit que wozali_entretiens existe
-- (wolo_entretiens peut ne pas avoir été renommé si la table n'existait pas)

CREATE TABLE IF NOT EXISTS wozali_entretiens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_airtable_id TEXT NOT NULL,
  thread_id               UUID,
  candidat_user_id        UUID NOT NULL,
  recruteur_user_id       UUID NOT NULL,
  offre_titre             TEXT,
  type                    TEXT CHECK (type IN ('presentiel', 'visio', 'telephone')),
  date_heure              TIMESTAMPTZ NOT NULL,
  lieu                    TEXT,
  lien_visio              TEXT,
  telephone               TEXT,
  rencontre               BOOLEAN DEFAULT FALSE,
  note_recruteur          TEXT,
  resultat                TEXT CHECK (resultat IN ('pending', 'concluant', 'non_concluant', 'annule')) DEFAULT 'pending',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wozali_entretiens_candidat   ON wozali_entretiens(candidat_user_id);
CREATE INDEX IF NOT EXISTS idx_wozali_entretiens_recruteur  ON wozali_entretiens(recruteur_user_id);
CREATE INDEX IF NOT EXISTS idx_wozali_entretiens_date_heure ON wozali_entretiens(date_heure);

ALTER TABLE wozali_entretiens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wozali_entretiens' AND policyname = 'entretiens_select'
  ) THEN
    CREATE POLICY "entretiens_select" ON wozali_entretiens
      FOR SELECT USING (
        auth.uid() = candidat_user_id OR auth.uid() = recruteur_user_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wozali_entretiens' AND policyname = 'entretiens_insert'
  ) THEN
    CREATE POLICY "entretiens_insert" ON wozali_entretiens
      FOR INSERT WITH CHECK (auth.uid() = recruteur_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wozali_entretiens' AND policyname = 'entretiens_update'
  ) THEN
    CREATE POLICY "entretiens_update" ON wozali_entretiens
      FOR UPDATE USING (auth.uid() = recruteur_user_id);
  END IF;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION wozali_entretiens_set_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wozali_entretiens_updated ON wozali_entretiens;
CREATE TRIGGER trg_wozali_entretiens_updated
  BEFORE UPDATE ON wozali_entretiens
  FOR EACH ROW EXECUTE FUNCTION wozali_entretiens_set_updated();

-- Vue backward-compat si l'ancienne table wolo_entretiens a été renommée via view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wolo_entretiens'
  ) THEN
    CREATE OR REPLACE VIEW public.wolo_entretiens AS SELECT * FROM public.wozali_entretiens;
    RAISE NOTICE 'Vue wolo_entretiens créée pour backward-compat';
  ELSE
    RAISE NOTICE 'wolo_entretiens existe déjà (table ou vue) — skip';
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '✅ wozali_entretiens prête';
END $$;
