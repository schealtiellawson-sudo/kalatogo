-- ================================================================
-- WhatsApp Sequences — V1.1
-- Date : 2026-04-28
-- Tables : wolo_whatsapp_templates + wolo_whatsapp_queue
-- ================================================================

-- Templates de messages (clé → contenu paramétré)
CREATE TABLE IF NOT EXISTS wolo_whatsapp_templates (
  key            text PRIMARY KEY,
  sequence       text CHECK (sequence IN ('A_onboarding','B_apprentie','C_concours','transactionnel')),
  step           int NOT NULL,
  delay_hours    int NOT NULL DEFAULT 0,                 -- offset par rapport au début de la séquence
  content        text NOT NULL,                          -- avec placeholders {nom}, {ville}, etc.
  active         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_tpl_sequence ON wolo_whatsapp_templates(sequence, step);

-- File d'attente de messages à envoyer
CREATE TABLE IF NOT EXISTS wolo_whatsapp_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone          text NOT NULL,                          -- format international, ex +22890000000
  template_key   text REFERENCES wolo_whatsapp_templates(key),
  payload        jsonb DEFAULT '{}'::jsonb,              -- variables substituées dans le template
  scheduled_at   timestamptz NOT NULL,
  sent_at        timestamptz,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  error          text,
  attempts       int DEFAULT 0,
  provider       text,                                   -- 'whatsapp_cloud', 'twilio', 'log'
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_q_pending ON wolo_whatsapp_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_q_user ON wolo_whatsapp_queue(user_id, created_at DESC);

-- RLS — service_role uniquement
ALTER TABLE wolo_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut lire ses propres messages envoyés (debug / historique)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wa_q_read_own' AND tablename = 'wolo_whatsapp_queue') THEN
    CREATE POLICY "wa_q_read_own" ON wolo_whatsapp_queue FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ================================================================
-- SEED — Séquence A : Onboarding (J0 → J7) — pour TOUTES les inscrites
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES
('A1_bienvenue', 'A_onboarding', 1, 0, 'Bienvenue sur WOLO Market, {prenom} 👋

Ton profil est en ligne — visible à Cotonou et Lomé.

Première mission (5 min) : ajoute 3 photos de ton travail. Les profils avec photos reçoivent 3× plus de contacts.

→ {url_dashboard}'),

('A2_mission_photos', 'A_onboarding', 2, 24, 'Salut {prenom}, c''est WOLO 👋

Petit rappel — la photo de ton travail est ce qui te différencie. Une photo nette = un client qui s''arrête.

Si tu n''as pas encore ajouté tes photos : c''est 5 minutes max, et c''est gratuit.

→ {url_dashboard}'),

('A3_temoignage', 'A_onboarding', 3, 72, '{prenom}, voici une histoire vraie 📖

Aïcha de Tokpa s''est inscrite il y a 2 mois. Elle a posté 3 photos. Elle a reçu 18 contacts en un mois.

Ton tour. Ajoute tes photos, active ta disponibilité, et observe.

→ {url_dashboard}'),

('A4_concours', 'A_onboarding', 4, 120, '{prenom}, Le Mur des Reines commence le 1er du mois 👑

100 000 FCFA × 2 Reines (1 Bénin + 1 Togo). Pas besoin d''être Pro — toutes les femmes B/T peuvent gagner.

C''est ton talent. Pas tes connexions.

→ {url_awards}'),

('A5_relance', 'A_onboarding', 5, 168, '{prenom}, on n''a pas vu d''activité sur ton profil cette semaine.

WOLO Market fonctionne quand tu es présente. 5 minutes par jour suffisent : photo, réponse, mise à jour. Sinon ton profil descend dans le classement.

Tu veux qu''on t''aide ? Réponds simplement à ce message.

→ {url_dashboard}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence B : Apprentie (segment ciblé) — pour celles qui ont coché "apprentie"
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES
('B1_lundi', 'B_apprentie', 1, 0, '{prenom}, on sait que tu travailles pour Madame du mardi au samedi sans être payée.

WOLO Market, c''est ton lundi. Toute la semaine.

Tes propres clients perso. Tes propres avis. Sous ton nom à toi — pas celui du salon.

→ {url_dashboard}'),

('B2_carnet_client', 'B_apprentie', 2, 48, '{prenom}, voici le tutoriel : créer ton carnet de clientes perso en 10 minutes.

1. Ajoute 3 photos de ton travail
2. Active ta disponibilité
3. Partage ton lien WOLO sur ton statut WhatsApp

Tes clientes te trouvent direct. Sans passer par ta patronne.

→ {url_dashboard}'),

('B3_histoire_vraie', 'B_apprentie', 3, 120, '{prenom}, histoire vraie 📖

Mariam, apprentie couturière à Bè, a payé 80 000 FCFA pour apprendre. Elle a doublé ses revenus en 3 mois grâce à WOLO. Sans quitter son atelier de formation.

Comment ? 5 photos, 3 avis clients, 1 lien WhatsApp partagé chaque semaine.

Elle commence comme toi. Aujourd''hui elle gagne sa vie.

→ {url_dashboard}'),

('B4_concours_apprenties', 'B_apprentie', 4, 168, '{prenom}, Le Mur des Reines est ouvert aux apprenties aussi.

100 000 FCFA si tu gagnes. Pas besoin d''être patronne. Pas besoin d''être Pro.

Ta plus belle coiffure ou ta plus belle tenue. Sur toi-même ou sur une cliente. Avec le tag de ta patronne ou le tien.

→ {url_awards}'),

('B5_pro_indep', 'B_apprentie', 5, 504, '{prenom}, après 3 semaines avec WOLO :

Tu as posté tes photos ? ✅ ou ❌
Tu as reçu des contacts ? ✅ ou ❌

Si oui : passe Pro pour 2 500 FCFA/mois. Tu débloques la priorité dans les recherches + 40% de commission sur tes filleules + Bourse de Croissance 300K. Investis dans ton indépendance.

Si non : réponds à ce message, on t''aide.

→ {url_dashboard}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence C : Concours mensuel
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES
('C1_ouverture', 'C_concours', 1, 0, '👑 {prenom}, Le Mur des Reines de {mois_nom} est OUVERT.

Catégorie active : {categorie_active} ({pays_emoji} 1 Bénin + 1 Togo couronnées en fin de mois).

Poste 3 photos + le tag de ta {pro_type}. La communauté vote en duel. La gagnante touche 100 000 FCFA.

→ {url_awards}'),

('C2_milieu_mois', 'C_concours', 2, 168, '{prenom}, plus que 8 jours pour poster ta photo.

Les meilleures photos du mois sont {top_3_noms}. Tu peux encore entrer dans le classement — il suffit d''une photo et de partager le lien sur WhatsApp.

→ {url_awards}'),

('C3_phase_vote', 'C_concours', 3, 360, '{prenom}, phase de votes ouverte ! 🗳️

Du 16 au 25, la communauté vote en duel sur les photos. Plus tu postes, plus tu apparais dans les duels. Ta cousine à Paris, ta tante à Bruxelles : elles peuvent voter aussi via WhatsApp.

→ {url_awards}'),

('C4_avant_couronnement', 'C_concours', 4, 552, '🔥 {prenom}, plus que 3 jours avant le couronnement.

Top 3 actuel : {top_3_noms}. La Reine Bénin et la Reine Togo seront annoncées le 30. Si tu es dans le top : prépare ton message de victoire. Sinon : prochain round dans 2 semaines.

→ {url_awards}'),

('C5_couronnement', 'C_concours', 5, 696, '👑 {prenom}, les Reines de {mois_nom} sont annoncées !

🇧🇯 Reine {categorie_active} Bénin : {reine_bj}
🇹🇬 Reine {categorie_active} Togo : {reine_tg}

100 000 FCFA virées direct.

Le mois prochain : alternance vers {prochaine_categorie}. Reste connectée.

→ {url_awards}')

ON CONFLICT (key) DO NOTHING;
