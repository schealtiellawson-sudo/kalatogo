-- ════════════════════════════════════════════════════════════
-- WOZALI — Mur des témoignages : choix Anonyme / Signé + seed modèles
-- SQL Editor → Run. Idempotent.
-- Sujet du mur : harcèlement & faveurs sexuelles exigées pour un emploi.
-- ════════════════════════════════════════════════════════════

-- 1. Colonnes du choix
alter table public.wozali_temoignages add column if not exists anonyme boolean default true;
alter table public.wozali_temoignages add column if not exists auteur_affiche text;

-- 2. Seed de démonstration (modèles pour la vidéo tuto).
--    Marqués ia_verdict='seed_demo' → à effacer avant le vrai lancement :
--    delete from public.wozali_temoignages where ia_verdict='seed_demo';
delete from public.wozali_temoignages where ia_verdict = 'seed_demo';

insert into public.wozali_temoignages (user_id, texte, statut, ia_verdict, anonyme, auteur_affiche, created_at) values
('76cdd061-67a5-4b4e-b45a-c36063078cb5','À l''embauche, on m''a fait comprendre que le poste était pour moi "si j''étais compréhensive". J''ai refusé de comprendre. Je cherche encore, mais je dors tranquille.','approuve','seed_demo',true,null, now() - interval '3 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','Mon patron me répétait que je garderais ma place si j''acceptais de le voir en dehors du travail. J''ai dit non. Du jour au lendemain, je n''avais plus d''heures.','approuve','seed_demo',false,'Sènan · Lomé', now() - interval '8 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','Le gérant me touchait "pour rire" devant les autres. Le jour où j''ai osé parler, c''est moi qu''on a renvoyée.','approuve','seed_demo',true,null, now() - interval '22 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','Un recruteur m''a promis le poste contre une nuit. J''ai raccroché. Je préfère chercher plus longtemps que payer avec mon corps.','approuve','seed_demo',false,'Grâce · Cotonou', now() - interval '12 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','On m''a proposé d''être "gentille" avec le chef pour passer titulaire. J''ai refusé. Je suis restée intérimaire, mais entière.','approuve','seed_demo',true,null, now() - interval '30 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','Il m''a coincée au bureau après la fermeture. J''ai crié, il a ri. Le lendemain j''ai démissionné. Aujourd''hui je le dis tout haut.','approuve','seed_demo',false,'Reine · Lomé', now() - interval '5 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','Chaque augmentation avait un prix que je ne voulais pas payer. J''ai arrêté d''espérer une augmentation, pas d''être respectée.','approuve','seed_demo',true,null, now() - interval '40 days'),
('76cdd061-67a5-4b4e-b45a-c36063078cb5','On m''a dit que les filles "sérieuses" n''avancent pas ici. J''ai préféré partir sérieuse plutôt que rester salie.','approuve','seed_demo',false,'Blandine · Cotonou', now() - interval '15 days');

-- ✅ Fini. Recharge « Notre Histoire » ou le dashboard → Le Mur des témoignages.
