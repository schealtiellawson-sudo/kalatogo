-- ================================================================
-- WOLO Pay — Infrastructure base de données
-- Sprint 3 · 2026-04-09
-- ================================================================
-- Pré-requis : table `profiles` déjà créée (Supabase Auth)
-- À exécuter dans l'éditeur SQL Supabase dans l'ordre.
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE 1 : Transactions WOLO Pay
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wolo_transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid REFERENCES profiles(id),
  client_id          uuid REFERENCES profiles(id),
  montant            integer NOT NULL CHECK (montant >= 100),
  montant_avec_frais integer NOT NULL,
  frais_traitement   integer NOT NULL,
  taux_frais         numeric DEFAULT 0.015,
  operateur          text NOT NULL,
  -- 'mtn_bj' · 'moov_bj' · 'togocom_tg' · 'flooz_tg' · 'credit_wolo'
  statut             text DEFAULT 'PENDING',
  -- PENDING → PAYÉ → ÉCHOUÉ
  mode_paiement      text NOT NULL,
  -- 'qr_permanent' · 'identifiant' · 'lien_paiement'
  reference_fedapay  text,
  reference_interne  text UNIQUE DEFAULT 'WP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
  pays_client        text CHECK (pays_client IN ('BJ', 'TG')),
  lien_token         text,
  lien_expire_at     timestamptz,
  created_at         timestamptz DEFAULT now(),
  paid_at            timestamptz
);

-- ----------------------------------------------------------------
-- TABLE 2 : Crédit WOLO par utilisateur
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wolo_credit (
  user_id           uuid REFERENCES profiles(id) PRIMARY KEY,
  solde_disponible  integer DEFAULT 0 CHECK (solde_disponible >= 0),
  plafond_max       integer DEFAULT 200000,
  total_recu        integer DEFAULT 0,
  total_retire      integer DEFAULT 0,
  total_depense     integer DEFAULT 0,
  total_commissions integer DEFAULT 0,
  updated_at        timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- TABLE 3 : Historique des mouvements de Crédit WOLO
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wolo_credit_mouvements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id),
  type            text NOT NULL,
  -- credit_paiement · credit_rechargement · credit_parrainage
  -- credit_bourse · credit_awards
  -- debit_abonnement · debit_transfert · debit_retrait
  montant         integer NOT NULL CHECK (montant > 0),
  solde_avant     integer NOT NULL,
  solde_apres     integer NOT NULL,
  description     text,
  transaction_id  uuid REFERENCES wolo_transactions(id),
  destinataire_id uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- TABLE 4 : Contacts favoris
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wolo_contacts_favoris (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES profiles(id),
  contact_user_id      uuid REFERENCES profiles(id),
  surnom               text NOT NULL,
  ordre_affichage      integer DEFAULT 0,
  derniere_transaction timestamptz,
  created_at           timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- ----------------------------------------------------------------
-- TABLE 5 : Abonnements
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abonnements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) UNIQUE,
  plan                text DEFAULT 'gratuit' CHECK (plan IN ('gratuit', 'pro')),
  statut              text DEFAULT 'actif'   CHECK (statut IN ('actif', 'expiré', 'suspendu')),
  date_debut          timestamptz DEFAULT now(),
  date_fin            timestamptz,
  renouvellement_auto boolean DEFAULT true,
  methode_paiement    text CHECK (methode_paiement IN ('fedapay', 'credit_wolo')),
  montant             integer DEFAULT 2500,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- TABLE 6 : Paiements d'abonnements
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paiements_abonnements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abonnement_id      uuid REFERENCES abonnements(id),
  user_id            uuid REFERENCES profiles(id),
  montant            integer NOT NULL,
  montant_avec_frais integer,
  statut             text DEFAULT 'EN_ATTENTE'
                     CHECK (statut IN ('EN_ATTENTE', 'PAYÉ', 'ÉCHOUÉ', 'REMBOURSÉ')),
  methode            text CHECK (methode IN ('fedapay', 'credit_wolo')),
  reference_fedapay  text,
  reference_interne  text UNIQUE DEFAULT 'ABO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
  parrainage_traite  boolean DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  paid_at            timestamptz
);

-- ----------------------------------------------------------------
-- TABLE 7 : Parrainages
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parrainages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_id                uuid REFERENCES profiles(id),
  filleul_id                uuid REFERENCES profiles(id) UNIQUE,
  code_parrainage           text UNIQUE,
  taux_commission           numeric DEFAULT 0.10,
  total_commissions_versees integer DEFAULT 0,
  statut                    text DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at                timestamptz DEFAULT now(),
  UNIQUE(parrain_id, filleul_id)
);

-- ----------------------------------------------------------------
-- TABLE 8 : Commissions de parrainage
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commissions_parrainage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrainage_id uuid REFERENCES parrainages(id),
  paiement_id   uuid REFERENCES paiements_abonnements(id),
  parrain_id    uuid REFERENCES profiles(id),
  filleul_id    uuid REFERENCES profiles(id),
  montant       integer NOT NULL,
  statut        text DEFAULT 'versée' CHECK (statut IN ('versée', 'en_attente')),
  created_at    timestamptz DEFAULT now()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE wolo_credit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_credit" ON wolo_credit;
CREATE POLICY "user_own_credit" ON wolo_credit
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE wolo_credit_mouvements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_mouvements" ON wolo_credit_mouvements;
CREATE POLICY "user_own_mouvements" ON wolo_credit_mouvements
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE wolo_contacts_favoris ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_contacts" ON wolo_contacts_favoris;
CREATE POLICY "user_own_contacts" ON wolo_contacts_favoris
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_abonnement" ON abonnements;
CREATE POLICY "user_own_abonnement" ON abonnements
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE wolo_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merchant_or_client" ON wolo_transactions;
CREATE POLICY "merchant_or_client" ON wolo_transactions
  FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = client_id);

ALTER TABLE paiements_abonnements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_paiements_abo" ON paiements_abonnements;
CREATE POLICY "user_own_paiements_abo" ON paiements_abonnements
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parrain_or_filleul" ON parrainages;
CREATE POLICY "parrain_or_filleul" ON parrainages
  FOR SELECT USING (auth.uid() = parrain_id OR auth.uid() = filleul_id);

ALTER TABLE commissions_parrainage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parrain_reads_commissions" ON commissions_parrainage;
CREATE POLICY "parrain_reads_commissions" ON commissions_parrainage
  FOR SELECT USING (auth.uid() = parrain_id);

-- ================================================================
-- TRIGGERS AUTOMATIQUES
-- ================================================================

-- updated_at auto
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wolo_credit_updated_at ON wolo_credit;
CREATE TRIGGER trigger_wolo_credit_updated_at
  BEFORE UPDATE ON wolo_credit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_abonnements_updated_at ON abonnements;
CREATE TRIGGER trigger_abonnements_updated_at
  BEFORE UPDATE ON abonnements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Création auto wolo_credit à l'inscription
CREATE OR REPLACE FUNCTION create_wolo_credit_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wolo_credit (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_credit_on_signup ON profiles;
CREATE TRIGGER trigger_create_credit_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_wolo_credit_on_signup();

-- Création auto abonnement Gratuit à l'inscription
CREATE OR REPLACE FUNCTION create_abonnement_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO abonnements (user_id, plan, statut)
  VALUES (NEW.id, 'gratuit', 'actif')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_abonnement_on_signup ON profiles;
CREATE TRIGGER trigger_create_abonnement_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_abonnement_on_signup();

-- ================================================================
-- INDEXES utiles
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_wolo_tx_merchant ON wolo_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wolo_tx_statut   ON wolo_transactions(statut);
CREATE INDEX IF NOT EXISTS idx_wolo_mvt_user    ON wolo_credit_mouvements(user_id);
CREATE INDEX IF NOT EXISTS idx_parrainages_parrain ON parrainages(parrain_id);
CREATE INDEX IF NOT EXISTS idx_commissions_parrain ON commissions_parrainage(parrain_id);
