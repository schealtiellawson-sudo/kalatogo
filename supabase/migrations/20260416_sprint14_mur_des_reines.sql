-- ================================================================
-- Sprint 14 — Le Mur des Reines
-- WOLO Awards refondu : feed viral + découverte + gamification + duels
-- À coller dans Supabase SQL Editor (ordre important)
-- ================================================================

-- ════════════════════════════════════════
-- 1) FEED_PHOTOS — photos postées par les femmes
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feed_photos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mois                text NOT NULL,                     -- 'YYYY-MM'
  photo_url           text NOT NULL,
  description         text DEFAULT '',
  categorie           text NOT NULL CHECK (categorie IN ('coiffure','couture','libre')),
  quartier            text,
  ville               text,                              -- 'Lomé' / 'Cotonou'
  pays                text CHECK (pays IN ('TG','BJ')),
  theme_mois          text,                              -- ex: "Ma plus belle tresse"
  is_awards_candidate boolean DEFAULT false,             -- true = candidate officiellement
  nb_likes            integer DEFAULT 0,
  nb_commentaires     integer DEFAULT 0,
  nb_shares           integer DEFAULT 0,
  nb_vues             integer DEFAULT 0,
  boost_until         timestamptz,                       -- épinglée top-feed jusqu'à cette date
  video_validee       boolean DEFAULT true,              -- admin peut masquer
  duel_wins           integer DEFAULT 0,                 -- victoires en duels infinis
  duel_losses         integer DEFAULT 0,                 -- défaites en duels infinis
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_mois ON feed_photos(mois, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_photos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_quartier ON feed_photos(quartier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_ville ON feed_photos(ville, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_categorie ON feed_photos(categorie, mois);
CREATE INDEX IF NOT EXISTS idx_feed_awards ON feed_photos(mois, categorie, is_awards_candidate) WHERE is_awards_candidate = true;
CREATE INDEX IF NOT EXISTS idx_feed_boost ON feed_photos(boost_until) WHERE boost_until IS NOT NULL;

-- Ajout colonnes duels (si table existe déjà)
DO $$ BEGIN
  ALTER TABLE feed_photos ADD COLUMN IF NOT EXISTS duel_wins integer DEFAULT 0;
  ALTER TABLE feed_photos ADD COLUMN IF NOT EXISTS duel_losses integer DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ════════════════════════════════════════
-- 2) LIKES_PHOTOS — likes sur chaque photo
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS likes_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_photo ON likes_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes_photos(user_id);

-- Trigger : incrémenter/décrémenter nb_likes sur feed_photos
CREATE OR REPLACE FUNCTION update_feed_nb_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_photos SET nb_likes = nb_likes + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_photos SET nb_likes = GREATEST(0, nb_likes - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_likes_photo_count ON likes_photos;
CREATE TRIGGER trg_likes_photo_count
  AFTER INSERT OR DELETE ON likes_photos
  FOR EACH ROW EXECUTE FUNCTION update_feed_nb_likes();

-- ════════════════════════════════════════
-- 3) COMMENTAIRES_PHOTOS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commentaires_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contenu       text NOT NULL CHECK (length(contenu) > 0 AND length(contenu) <= 500),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_photo ON commentaires_photos(photo_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_feed_nb_commentaires()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_photos SET nb_commentaires = nb_commentaires + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_photos SET nb_commentaires = GREATEST(0, nb_commentaires - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comm_photo_count ON commentaires_photos;
CREATE TRIGGER trg_comm_photo_count
  AFTER INSERT OR DELETE ON commentaires_photos
  FOR EACH ROW EXECUTE FUNCTION update_feed_nb_commentaires();

-- ════════════════════════════════════════
-- 4) THEMES_MENSUELS — thème imposé chaque mois
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS themes_mensuels (
  mois               text PRIMARY KEY,                   -- 'YYYY-MM'
  theme_coiffure     text NOT NULL,
  theme_couture      text NOT NULL,
  description        text,
  hashtag            text,                                -- ex: "#PlusBelleTresseAvril"
  partenaire_marque  text,                                -- ex: "Vlisco", "Uniwax"
  created_at         timestamptz DEFAULT now()
);

-- Seed 12 thèmes 2026
INSERT INTO themes_mensuels (mois, theme_coiffure, theme_couture, hashtag) VALUES
  ('2026-04', 'Ma plus belle tresse', 'Mon pagne préféré', '#ReineDAvril'),
  ('2026-05', 'Coupe du dimanche', 'Tenue de cérémonie', '#ReineDeMai'),
  ('2026-06', 'Coiffure d''événement', 'Robe qui fait parler', '#ReineDeJuin'),
  ('2026-07', 'Tresses colorées', 'Ensemble pagne wax', '#ReineDeJuillet'),
  ('2026-08', 'Bridal / coiffure mariée', 'Robe de mariée africaine', '#ReineDAout'),
  ('2026-09', 'Rentrée chic', 'Boubou moderne', '#ReineDeSeptembre'),
  ('2026-10', 'Tresses géantes', 'Tailleur féminin', '#ReineDOctobre'),
  ('2026-11', 'Coiffure traditionnelle', 'Tenue traditionnelle', '#ReineDeNovembre'),
  ('2026-12', 'Look de fête', 'Tenue de fin d''année', '#ReineDeDecembre'),
  ('2027-01', 'Nouveau départ', 'Nouvelle année nouveau style', '#ReineDeJanvier'),
  ('2027-02', 'Coiffure amour', 'Tenue Saint-Valentin', '#ReineDeFevrier'),
  ('2027-03', 'Tresses féminines', 'Robe du 8 mars', '#ReineDeMars')
ON CONFLICT (mois) DO NOTHING;

-- ════════════════════════════════════════
-- 5) STREAKS — série quotidienne
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS streaks_wolo (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   integer DEFAULT 0,                    -- jours consécutifs actuel
  longest_streak   integer DEFAULT 0,                    -- record
  last_post_date   date,
  multiplicateur   integer DEFAULT 1,                    -- 1, 2, 3 selon streak
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_streaks_current ON streaks_wolo(current_streak DESC);

-- ════════════════════════════════════════
-- 6) BADGES_WOLO — badges collectés
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS badges_wolo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type    text NOT NULL CHECK (badge_type IN (
    'premiere_photo',
    'likes_100','likes_500','likes_1000',
    'top_10_mois','podium_mois','gagnante_mois',
    'serie_rouge_7','serie_rouge_30',
    'coup_coeur_jury',
    'virale_100',
    'mentor_5',
    'apprentie','ambassadrice','reine','legende'
  )),
  mois          text,                                     -- 'YYYY-MM' si badge lié au mois
  unlocked_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type, mois)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON badges_wolo(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges_wolo(badge_type, unlocked_at DESC);

-- ════════════════════════════════════════
-- 7) DUELS_QUARTIERS — duels hebdo
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS duels_quartiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semaine         text NOT NULL,                         -- 'YYYY-WW'
  type            text NOT NULL CHECK (type IN ('quartier','ville','categorie')),
  nom_a           text NOT NULL,
  nom_b           text NOT NULL,
  pays            text CHECK (pays IN ('TG','BJ','BOTH')),
  votes_a         integer DEFAULT 0,
  votes_b         integer DEFAULT 0,
  statut          text DEFAULT 'actif' CHECK (statut IN ('actif','termine')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(semaine, type, nom_a, nom_b)
);

CREATE TABLE IF NOT EXISTS duels_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id       uuid NOT NULL REFERENCES duels_quartiers(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  choix         text NOT NULL CHECK (choix IN ('a','b')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(duel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_duels_actifs ON duels_quartiers(statut, semaine);

-- ════════════════════════════════════════
-- 8) PARTAGES_WHATSAPP — tracking viralité
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partages_whatsapp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid REFERENCES feed_photos(id) ON DELETE CASCADE,
  candidature_id uuid REFERENCES wolo_awards(id) ON DELETE CASCADE,
  shared_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  token         text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
  clicks        integer DEFAULT 0,
  votes_generes integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partages_token ON partages_whatsapp(token);
CREATE INDEX IF NOT EXISTS idx_partages_photo ON partages_whatsapp(photo_id);

-- ════════════════════════════════════════
-- 9) BOOSTS — historique achats boost
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS boosts_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duree_h       integer NOT NULL DEFAULT 24,
  prix_fcfa     integer NOT NULL DEFAULT 500,
  ends_at       timestamptz NOT NULL,
  statut        text DEFAULT 'actif' CHECK (statut IN ('actif','expire','rembourse')),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boosts_active ON boosts_photos(ends_at) WHERE statut = 'actif';

-- ════════════════════════════════════════
-- 10) HALL_OF_FAME — vue gagnantes historiques
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW hall_of_fame AS
SELECT
  w.user_id,
  p.nom_complet,
  p.pays,
  p.avatar_url,
  w.categorie,
  COUNT(*) FILTER (WHERE w.gagnant = true) as nb_victoires,
  SUM(w.montant_gagne) FILTER (WHERE w.gagnant = true) as total_fcfa,
  MAX(w.mois) FILTER (WHERE w.gagnant = true) as derniere_victoire,
  array_agg(w.mois ORDER BY w.mois DESC) FILTER (WHERE w.gagnant = true) as mois_gagnes
FROM wolo_awards w
JOIN profiles p ON p.id = w.user_id
WHERE w.gagnant = true
GROUP BY w.user_id, p.nom_complet, p.pays, p.avatar_url, w.categorie
ORDER BY nb_victoires DESC, total_fcfa DESC;

-- ════════════════════════════════════════
-- 11) LEADERBOARDS (vues calculées)
-- ════════════════════════════════════════

-- Top par quartier sur 7 jours glissants
CREATE OR REPLACE VIEW leaderboard_quartier_7j AS
SELECT
  quartier,
  ville,
  pays,
  user_id,
  p.nom_complet,
  p.avatar_url,
  SUM(nb_likes) as total_likes_7j,
  COUNT(*) as nb_photos_7j,
  RANK() OVER (PARTITION BY quartier ORDER BY SUM(nb_likes) DESC) as rang_quartier
FROM feed_photos f
JOIN profiles p ON p.id = f.user_id
WHERE f.created_at >= now() - interval '7 days'
  AND f.video_validee = true
  AND f.quartier IS NOT NULL
GROUP BY quartier, ville, pays, user_id, p.nom_complet, p.avatar_url;

-- Top par ville sur le mois en cours
CREATE OR REPLACE VIEW leaderboard_ville_mois AS
SELECT
  ville,
  pays,
  user_id,
  p.nom_complet,
  p.avatar_url,
  SUM(nb_likes) as total_likes_mois,
  COUNT(*) as nb_photos_mois,
  RANK() OVER (PARTITION BY ville ORDER BY SUM(nb_likes) DESC) as rang_ville
FROM feed_photos f
JOIN profiles p ON p.id = f.user_id
WHERE f.mois = to_char(now(), 'YYYY-MM')
  AND f.video_validee = true
  AND f.ville IS NOT NULL
GROUP BY ville, pays, user_id, p.nom_complet, p.avatar_url;

-- ════════════════════════════════════════
-- 12) FONCTION maj_streak (appelée à chaque post)
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION maj_streak_user(p_user_id uuid)
RETURNS TABLE(current_streak integer, multiplicateur integer, badge_debloque text) AS $$
DECLARE
  v_last_date date;
  v_current integer;
  v_longest integer;
  v_mult integer;
  v_today date := current_date;
  v_diff integer;
  v_badge text := null;
BEGIN
  SELECT s.last_post_date, s.current_streak, s.longest_streak, s.multiplicateur
    INTO v_last_date, v_current, v_longest, v_mult
  FROM streaks_wolo s WHERE s.user_id = p_user_id;

  IF v_last_date IS NULL THEN
    v_current := 1;
    v_longest := 1;
    v_mult := 1;
  ELSE
    v_diff := v_today - v_last_date;
    IF v_diff = 0 THEN
      -- même jour : on ne touche pas au streak
      null;
    ELSIF v_diff = 1 THEN
      v_current := v_current + 1;
      v_longest := GREATEST(v_longest, v_current);
    ELSE
      v_current := 1;
      v_mult := 1;
    END IF;
  END IF;

  -- Calculer multiplicateur
  IF v_current >= 7 THEN v_mult := 3;
  ELSIF v_current >= 3 THEN v_mult := 2;
  ELSE v_mult := 1;
  END IF;

  -- Débloquer badge
  IF v_current = 7 THEN v_badge := 'serie_rouge_7'; END IF;
  IF v_current = 30 THEN v_badge := 'serie_rouge_30'; END IF;

  INSERT INTO streaks_wolo (user_id, current_streak, longest_streak, last_post_date, multiplicateur, updated_at)
  VALUES (p_user_id, v_current, v_longest, v_today, v_mult, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_current,
    longest_streak = v_longest,
    last_post_date = v_today,
    multiplicateur = v_mult,
    updated_at = now();

  IF v_badge IS NOT NULL THEN
    INSERT INTO badges_wolo (user_id, badge_type)
    VALUES (p_user_id, v_badge)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_current, v_mult, v_badge;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════
-- 13) FONCTION calc_niveau_user
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION calc_niveau_user(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_total_likes integer;
BEGIN
  SELECT COALESCE(SUM(nb_likes), 0) INTO v_total_likes
  FROM feed_photos WHERE user_id = p_user_id;

  IF v_total_likes >= 2001 THEN RETURN 'legende';
  ELSIF v_total_likes >= 501 THEN RETURN 'reine';
  ELSIF v_total_likes >= 51 THEN RETURN 'ambassadrice';
  ELSE RETURN 'apprentie';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════
-- 14) RLS policies
-- ════════════════════════════════════════
ALTER TABLE feed_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks_wolo ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_wolo ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels_quartiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partages_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosts_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes_mensuels ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_read_all' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_read_all" ON feed_photos FOR SELECT USING (video_validee = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_read_all' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_read_all" ON likes_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_read_all' AND tablename = 'commentaires_photos') THEN
    CREATE POLICY "comm_read_all" ON commentaires_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badges_read_all' AND tablename = 'badges_wolo') THEN
    CREATE POLICY "badges_read_all" ON badges_wolo FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'streaks_read_all' AND tablename = 'streaks_wolo') THEN
    CREATE POLICY "streaks_read_all" ON streaks_wolo FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'themes_read_all' AND tablename = 'themes_mensuels') THEN
    CREATE POLICY "themes_read_all" ON themes_mensuels FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_read_all' AND tablename = 'duels_quartiers') THEN
    CREATE POLICY "duels_read_all" ON duels_quartiers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_votes_read_all' AND tablename = 'duels_votes') THEN
    CREATE POLICY "duels_votes_read_all" ON duels_votes FOR SELECT USING (true);
  END IF;
END $$;

-- Insertion par propriétaire
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_insert_own' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_insert_own" ON feed_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_update_own' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_update_own" ON feed_photos FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_insert_own' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_insert_own" ON likes_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_delete_own' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_delete_own" ON likes_photos FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_insert_own' AND tablename = 'commentaires_photos') THEN
    CREATE POLICY "comm_insert_own" ON commentaires_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_votes_insert_own' AND tablename = 'duels_votes') THEN
    CREATE POLICY "duels_votes_insert_own" ON duels_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ════════════════════════════════════════
-- FIN migration Sprint 14 — Le Mur des Reines
-- ════════════════════════════════════════
