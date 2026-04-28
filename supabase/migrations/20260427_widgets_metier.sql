-- ================================================================
-- Migration WOLO Market — Widgets métier modulaires
-- Date : 2026-04-27
-- Objectif : Ajouter des fonctionnalités spécifiques par métier sur
-- chaque profil (réservation table restaurant, demande de devis chantier,
-- portfolio multi-projets, grille prestations coiffure/couture, commandes
-- à façon, RDV mécano, commandes pâtisserie, réservation chambre, etc.)
--
-- Chaque table porte FK -> auth.users(id) côté pro, optionnellement
-- côté client (anonyme autorisé). RLS ouvre la lecture publique sur les
-- catalogues (prestations, portfolio) et limite l'écriture au pro
-- propriétaire ; les commandes/réservations/devis n'autorisent en
-- lecture que le pro destinataire ou l'auteur authentifié.
-- ================================================================

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 1. PRESTATIONS — grille de services + prix individuels         ║
-- ║ Métiers : Coiffeuse, Couturière, Esthéticienne, Coach, Prof,   ║
-- ║           Mécanicien (forfaits), tout métier au catalogue.     ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_prestations_catalogue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libelle         TEXT NOT NULL,
  description     TEXT,
  prix_fcfa       INT  NOT NULL CHECK (prix_fcfa >= 0),
  duree_min       INT,                       -- en minutes (si pertinent)
  categorie       TEXT,                      -- ex: "Lavage", "Tresses", "Couture-femme"
  ordre           INT  DEFAULT 0,
  actif           BOOLEAN DEFAULT TRUE,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestcat_pro    ON wolo_prestations_catalogue(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_prestcat_actif  ON wolo_prestations_catalogue(pro_user_id) WHERE actif = TRUE;

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 2. PORTFOLIO — projets multi-photos pour créatifs              ║
-- ║ Métiers : Graphiste, Photographe, Vidéaste, Architecte,        ║
-- ║           Décorateur, Artiste, Stylistes.                      ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_portfolio_projets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  description     TEXT,
  categorie       TEXT,                      -- "Logo", "Mariage", "Portrait", "Reportage"
  client_nom      TEXT,
  date_realisation DATE,
  photos          JSONB DEFAULT '[]'::jsonb, -- ["https://...","https://..."]
  video_url       TEXT,
  prix_indicatif_fcfa INT,
  ordre           INT  DEFAULT 0,
  publie          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_pro     ON wolo_portfolio_projets(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_publie  ON wolo_portfolio_projets(pro_user_id) WHERE publie = TRUE;

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 3. RÉSERVATIONS TABLE — restaurant / bar / lounge              ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_reservations_table (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  client_email    TEXT,
  date_reservation DATE NOT NULL,
  heure           TIME NOT NULL,
  nb_personnes    INT  NOT NULL CHECK (nb_personnes BETWEEN 1 AND 200),
  occasion        TEXT,                      -- "Anniversaire", "Pro", etc.
  message         TEXT,
  statut          TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirmee','refusee','annulee','honoree','no_show')),
  reponse_pro     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserv_table_pro    ON wolo_reservations_table(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_reserv_table_client ON wolo_reservations_table(client_user_id);
CREATE INDEX IF NOT EXISTS idx_reserv_table_date   ON wolo_reservations_table(pro_user_id, date_reservation);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 4. DEMANDES DE DEVIS CHANTIER                                  ║
-- ║ Métiers : Maçon, Plombier, Électricien, Peintre, Menuisier,    ║
-- ║           Carreleur, Soudeur, Climatisation, Forage…           ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_devis_chantier (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  client_email    TEXT,
  type_travaux    TEXT,                      -- "Réfection toiture", "Installation clim", etc.
  description     TEXT NOT NULL,
  surface_m2      INT,
  budget_estime_fcfa INT,
  delai_souhaite  TEXT,                      -- "Cette semaine", "1 mois", "Pas pressé"
  adresse_chantier TEXT,
  photos          JSONB DEFAULT '[]'::jsonb, -- photos du lieu / problème
  statut          TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau','vu','devis_envoye','accepte','refuse','annule','termine')),
  devis_montant_fcfa INT,
  devis_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_chantier_pro    ON wolo_devis_chantier(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_devis_chantier_client ON wolo_devis_chantier(client_user_id);
CREATE INDEX IF NOT EXISTS idx_devis_chantier_statut ON wolo_devis_chantier(pro_user_id, statut);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 5. COMMANDES À FAÇON — Cordonnier, Tailleur, Bijoutier,        ║
-- ║                          Couturière sur mesure, Artisan        ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_commande_facon (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  type_article    TEXT,                      -- "Robe", "Chaussures", "Bague"
  description     TEXT NOT NULL,
  photos_modele   JSONB DEFAULT '[]'::jsonb, -- modèles inspirants
  mensurations    JSONB,                     -- libre : {tour_taille, longueur, ...}
  date_voulue     DATE,
  budget_fcfa     INT,
  statut          TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau','vu','en_cours','pret','livre','annule')),
  reponse_pro     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facon_pro    ON wolo_commande_facon(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_facon_client ON wolo_commande_facon(client_user_id);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 6. RDV MÉCANIQUE / GARAGE — marque + modèle véhicule           ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_rdv_mecano (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  marque          TEXT,
  modele          TEXT,
  annee           INT,
  immatriculation TEXT,
  type_intervention TEXT,                    -- "Vidange", "Freins", "Diagnostic"
  description     TEXT,
  date_souhaitee  DATE,
  heure_souhaitee TIME,
  statut          TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau','confirme','refuse','annule','honore')),
  reponse_pro     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rdv_mecano_pro ON wolo_rdv_mecano(pro_user_id);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 7. COMMANDE PÂTISSERIE / GÂTEAU                                ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_commande_patisserie (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  type_produit    TEXT,                      -- "Gâteau anniversaire", "Pièce montée"
  saveurs         TEXT,                      -- "Chocolat / Vanille"
  nb_personnes    INT,
  message_personnalise TEXT,                 -- inscription sur le gâteau
  photo_inspiration TEXT,
  date_evenement  DATE NOT NULL,
  heure_retrait   TIME,
  livraison       BOOLEAN DEFAULT FALSE,
  adresse_livraison TEXT,
  budget_fcfa     INT,
  statut          TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau','confirme','en_preparation','pret','livre','annule')),
  reponse_pro     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patisserie_pro ON wolo_commande_patisserie(pro_user_id);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 8. RÉSERVATION CHAMBRE — Hôtel / Auberge / Maison d'hôtes      ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_reservation_chambre (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_nom      TEXT NOT NULL,
  client_telephone TEXT NOT NULL,
  client_email    TEXT,
  type_chambre    TEXT,                      -- "Standard", "Suite", "Deluxe"
  nb_chambres     INT  DEFAULT 1,
  nb_adultes      INT  DEFAULT 1,
  nb_enfants      INT  DEFAULT 0,
  arrivee         DATE NOT NULL,
  depart          DATE NOT NULL,
  message         TEXT,
  statut          TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirmee','refusee','annulee','honoree','no_show')),
  reponse_pro     TEXT,
  prix_total_fcfa INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (depart > arrivee)
);

CREATE INDEX IF NOT EXISTS idx_resa_chambre_pro    ON wolo_reservation_chambre(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_resa_chambre_client ON wolo_reservation_chambre(client_user_id);
CREATE INDEX IF NOT EXISTS idx_resa_chambre_dates  ON wolo_reservation_chambre(pro_user_id, arrivee);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 9. COURS / COACHING — matières + niveaux + tarif horaire       ║
-- ║ Métiers : Professeur particulier, Coach sportif, Coach perso   ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_cours_offres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matiere         TEXT NOT NULL,             -- "Maths", "Anglais", "Yoga"
  niveau          TEXT,                      -- "Primaire", "Lycée", "Adulte"
  tarif_horaire_fcfa INT NOT NULL,
  duree_seance_min INT DEFAULT 60,
  modalite        TEXT,                      -- "domicile", "visio", "studio"
  description     TEXT,
  actif           BOOLEAN DEFAULT TRUE,
  ordre           INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cours_pro ON wolo_cours_offres(pro_user_id);

-- ================================================================
-- TRIGGERS updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION wolo_widgets_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wolo_prestations_catalogue',
    'wolo_portfolio_projets',
    'wolo_reservations_table',
    'wolo_devis_chantier',
    'wolo_commande_facon',
    'wolo_rdv_mecano',
    'wolo_commande_patisserie',
    'wolo_reservation_chambre',
    'wolo_cours_offres'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION wolo_widgets_set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- ================================================================
-- RLS
-- ================================================================
-- Catalogues publics (tout le monde peut lire les prestations / portfolio /
-- offres de cours pour afficher sur le profil public).
ALTER TABLE wolo_prestations_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_portfolio_projets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_cours_offres          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prestcat_read_all"  ON wolo_prestations_catalogue FOR SELECT USING (true);
CREATE POLICY "prestcat_write_self" ON wolo_prestations_catalogue
  FOR ALL USING (auth.uid() = pro_user_id) WITH CHECK (auth.uid() = pro_user_id);

CREATE POLICY "portfolio_read_all"   ON wolo_portfolio_projets FOR SELECT USING (true);
CREATE POLICY "portfolio_write_self" ON wolo_portfolio_projets
  FOR ALL USING (auth.uid() = pro_user_id) WITH CHECK (auth.uid() = pro_user_id);

CREATE POLICY "cours_read_all"   ON wolo_cours_offres FOR SELECT USING (true);
CREATE POLICY "cours_write_self" ON wolo_cours_offres
  FOR ALL USING (auth.uid() = pro_user_id) WITH CHECK (auth.uid() = pro_user_id);

-- Demandes / réservations / commandes : lecture par pro destinataire
-- ou client (auth) qui a soumis ; insert public via service_role uniquement
-- (les endpoints API valident et tagguent client_user_id quand présent).
ALTER TABLE wolo_reservations_table   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_devis_chantier       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_commande_facon       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_rdv_mecano           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_commande_patisserie  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_reservation_chambre  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wolo_reservations_table',
    'wolo_devis_chantier',
    'wolo_commande_facon',
    'wolo_rdv_mecano',
    'wolo_commande_patisserie',
    'wolo_reservation_chambre'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%s_read_pro_or_client" ON %s
         FOR SELECT USING (auth.uid() = pro_user_id OR auth.uid() = client_user_id);',
      t, t);
    -- Le pro destinataire peut update (changer statut, ajouter réponse).
    EXECUTE format(
      'CREATE POLICY "%s_update_pro" ON %s
         FOR UPDATE USING (auth.uid() = pro_user_id);',
      t, t);
    -- Insert client authentifié (si non auth, passe par service_role via API).
    EXECUTE format(
      'CREATE POLICY "%s_insert_self" ON %s
         FOR INSERT WITH CHECK (client_user_id IS NULL OR auth.uid() = client_user_id);',
      t, t);
  END LOOP;
END $$;

-- Pas de DELETE par les users (admin only via service_role).
