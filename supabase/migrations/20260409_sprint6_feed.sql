-- ============================================================
-- Sprint 6 — Feed social WOLO Market
-- Tables: wolo_posts, wolo_likes, wolo_commentaires,
--         wolo_abonnements, wolo_epingles
-- ============================================================

-- Posts du feed
CREATE TABLE IF NOT EXISTS wolo_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auteur_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'realisation',
  -- types : 'realisation', 'cherche_prestataire', 'offre_express'
  contenu text,
  media_url text,        -- URL photo ou vidéo
  media_type text,       -- 'photo' ou 'video'
  ville text,
  quartier text,
  pays text,
  metier text,
  nb_likes integer DEFAULT 0,
  nb_commentaires integer DEFAULT 0,
  nb_partages integer DEFAULT 0,
  verifie_client boolean DEFAULT false,
  coup_du_jour boolean DEFAULT false,
  coup_du_jour_date date,
  created_at timestamptz DEFAULT now(),
  actif boolean DEFAULT true
);

-- Likes
CREATE TABLE IF NOT EXISTS wolo_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES wolo_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Commentaires
CREATE TABLE IF NOT EXISTS wolo_commentaires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES wolo_posts(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  nb_likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  actif boolean DEFAULT true
);

-- Abonnements (qui suit qui)
CREATE TABLE IF NOT EXISTS wolo_abonnements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  suiveur_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  suivi_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(suiveur_id, suivi_id)
);

-- Talents épinglés (favoris recruteur)
CREATE TABLE IF NOT EXISTS wolo_epingles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recruteur_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  talent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  note_privee text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(recruteur_id, talent_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_posts_auteur ON wolo_posts(auteur_id);
CREATE INDEX IF NOT EXISTS idx_posts_ville ON wolo_posts(ville);
CREATE INDEX IF NOT EXISTS idx_posts_metier ON wolo_posts(metier);
CREATE INDEX IF NOT EXISTS idx_posts_created ON wolo_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_coup_jour ON wolo_posts(coup_du_jour_date);
CREATE INDEX IF NOT EXISTS idx_likes_post ON wolo_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_post ON wolo_commentaires(post_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_suiveur ON wolo_abonnements(suiveur_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE wolo_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_commentaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_epingles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_read" ON wolo_posts FOR SELECT USING (actif = true);
CREATE POLICY "posts_self_insert" ON wolo_posts FOR INSERT WITH CHECK (auth.uid() = auteur_id);
CREATE POLICY "posts_self_update" ON wolo_posts FOR UPDATE USING (auth.uid() = auteur_id);

CREATE POLICY "likes_public_read" ON wolo_likes FOR SELECT USING (true);
CREATE POLICY "likes_self_all" ON wolo_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "comm_public_read" ON wolo_commentaires FOR SELECT USING (actif = true);
CREATE POLICY "comm_self_insert" ON wolo_commentaires FOR INSERT WITH CHECK (auth.uid() = auteur_id);

CREATE POLICY "abos_self_all" ON wolo_abonnements FOR ALL USING (auth.uid() = suiveur_id);
CREATE POLICY "epin_self_all" ON wolo_epingles FOR ALL USING (auth.uid() = recruteur_id);
