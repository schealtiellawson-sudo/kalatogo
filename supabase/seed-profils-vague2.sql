-- ════════════════════════════════════════════════════════════════════
-- WOZALI — Profils MODÈLES, vague 2 : Kwessi Coupe · Kodjo Auto ·
--          Kofi Métal · Yao Bois · Ama Pâtisserie
-- Complète la vague 1 pour que chaque personnage du casting vidéo
-- ait son vrai profil sur le site.
-- Photos servies par le site : repo/assets/casting/*.jpg
-- ⚠️ POUSSER LE REPO AVANT DE LANCER CE SQL (sinon photos en 404).
-- Idempotent : relançable sans créer de doublon.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare
  v_uid   uuid;
  v_pid   uuid;
  v_email text;
  r record;
begin
  for r in
    select * from (values
      -- email                        nom            metier            ville     quartier  slug                              tel
      ('kwessi.coupe@demo.wozali.africa','Kwessi Coupe','Barbier',        'Lomé',   'Tokoin',  'kwessi-coupe-barbier-lome',        '+22890111201',
       'Salon de coiffure homme à Tokoin (Lomé). Dégradé, coupe classique, taille de barbe, contour au rasoir. Coupe enfant le week-end. Sans rendez-vous du mardi au dimanche.',
       'kwessi'),
      ('kodjo.auto@demo.wozali.africa','Kodjo Auto','Mécanicien auto',    'Cotonou','Akpakpa', 'kodjo-auto-mecanicien-auto-cotonou','+22990111202',
       'Garage auto et moto à Akpakpa (Cotonou). Vidange, freins, embrayage, diagnostic, réparation moteur. Dépannage sur place dans Cotonou. Devis avant travaux, pièces d''origine ou adaptables.',
       'kodjo'),
      ('kofi.metal@demo.wozali.africa','Kofi Métal','Soudeur',            'Cotonou','Godomey', 'kofi-metal-soudeur-cotonou',       '+22990111203',
       'Atelier de soudure et métallerie à Godomey (Cotonou). Portails, grilles de fenêtre, portes métalliques, escaliers, réparation de structures. Prise de mesures sur place, pose incluse.',
       'kofi'),
      ('yao.bois@demo.wozali.africa','Yao Bois','Menuisier',              'Cotonou','Fidjrossè','yao-bois-menuisier-cotonou',      '+22990111204',
       'Menuiserie bois à Fidjrossè (Cotonou). Armoires, lits, portes, tables et meubles sur mesure. Bois local et bois exotique. Réparation et restauration de meubles. Devis clair, délais tenus.',
       'yao'),
      ('ama.patisserie@demo.wozali.africa','Ama Pâtisserie','Pâtissier/Boulanger','Lomé','Bè', 'ama-patisserie-patissier-boulanger-lome','+22890111205',
       'Pâtisserie maison à Bè (Lomé). Gâteaux d''anniversaire et de mariage sur commande, cake design, beignets et petits gâteaux au plateau. Commande 48h à l''avance, livraison dans Lomé.',
       'ama')
    ) as t(email,nom,metier,ville,quartier,slug,tel,descr,code)
  loop
    -- 1) compte auth (créé une seule fois)
    select id into v_uid from auth.users where email = r.email;
    if v_uid is null then
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        r.email, crypt('WozaliDemo2026!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
    end if;

    -- 2) fiche prestataire
    select id into v_pid from public.wozali_prestataires where slug = r.slug;
    if v_pid is null then
      v_pid := gen_random_uuid();
      insert into public.wozali_prestataires (
        id, user_id, email, nom_complet, metier_principal, description_services,
        quartier, ville, numero_telephone, whatsapp, slug,
        photo_profil, photo_realisation_1, photo_realisation_2, photo_realisation_3,
        abonnement, disponible_maintenant, note_moyenne, nb_avis_recus,
        nb_vues_profil, vues_7j, vues_30j, score_wozali, annees_experience, langues_parlees
      ) values (
        v_pid, v_uid, r.email, r.nom, r.metier, r.descr,
        r.quartier, r.ville, r.tel, r.tel, r.slug,
        'https://wozali.africa/assets/casting/'||r.code||'-portrait.jpg',
        'https://wozali.africa/assets/casting/'||r.code||'-real1.jpg',
        'https://wozali.africa/assets/casting/'||r.code||'-real2.jpg',
        'https://wozali.africa/assets/casting/'||r.code||'-real3.jpg',
        'Pro', true, 4.67, 3,
        1240, 96, 380, 83, 7, ARRAY['Français']
      );
    else
      update public.wozali_prestataires set
        description_services = r.descr,
        photo_profil         = 'https://wozali.africa/assets/casting/'||r.code||'-portrait.jpg',
        photo_realisation_1  = 'https://wozali.africa/assets/casting/'||r.code||'-real1.jpg',
        photo_realisation_2  = 'https://wozali.africa/assets/casting/'||r.code||'-real2.jpg',
        photo_realisation_3  = 'https://wozali.africa/assets/casting/'||r.code||'-real3.jpg'
      where id = v_pid;
      select user_id into v_uid from public.wozali_prestataires where id = v_pid;
    end if;

    -- 3) on repart propre sur le contenu
    delete from public.wozali_realisations where prestataire_id = v_pid;
    delete from public.wozali_prestations  where prestataire_id = v_pid;
    delete from public.wozali_avis         where prestataire_id = v_pid;
    delete from public.wozali_posts        where prestataire_id = v_pid;
  end loop;
end $$;

-- ─────────── Contenu par profil ───────────
-- helper : on récupère les ids par slug à chaque insert

-- KWESSI COUPE (barbier, Tokoin/Lomé)
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.groupe, v.pmin, v.pmax, v.duree, true, v.ord
from public.wozali_prestataires p, (values
  ('Coupe homme','Coupe',1500,2500,30,0),
  ('Coupe + barbe','Coupe',2500,4000,45,1),
  ('Dégradé américain','Coupe',2000,3500,40,2),
  ('Coupe enfant','Coupe',1000,1500,25,3)
) as v(nom,groupe,pmin,pmax,duree,ord) where p.slug='kwessi-coupe-barbier-lome';

insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, v.typ, 'Tokoin', v.cout, 'https://wozali.africa/assets/casting/'||v.img, v.descr, true, v.ord
from public.wozali_prestataires p, (values
  ('Dégradé net','Coupe','à partir de 2 000 F','kwessi-real1.jpg','Dégradé propre avec contour au rasoir.',0),
  ('Coupe + barbe','Coupe','à partir de 2 500 F','kwessi-real2.jpg','Coupe complète avec taille de barbe.',1),
  ('Coupe enfant','Coupe','à partir de 1 000 F','kwessi-real3.jpg','Coupe enfant, patience garantie.',2)
) as v(titre,typ,cout,img,descr,ord) where p.slug='kwessi-coupe-barbier-lome';

insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Komi A.',5,'Le meilleur dégradé de Tokoin, jamais raté une coupe.','2026-08-02'),
  ('Sena D.',5,'Rapide et propre, mon fils ne veut plus aller ailleurs.','2026-07-21'),
  ('Yaovi K.',4,'Bon travail, parfois un peu d''attente le samedi.','2026-07-08')
) as v(a,n,c,d) where p.slug='kwessi-coupe-barbier-lome';

-- KODJO AUTO (mécanicien, Akpakpa/Cotonou)
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.groupe, v.pmin, v.pmax, v.duree, true, v.ord
from public.wozali_prestataires p, (values
  ('Vidange complète','Entretien',5000,12000,60,0),
  ('Diagnostic moteur','Diagnostic',3000,5000,45,1),
  ('Réparation freins','Réparation',10000,25000,120,2),
  ('Dépannage sur place','Dépannage',5000,15000,60,3)
) as v(nom,groupe,pmin,pmax,duree,ord) where p.slug='kodjo-auto-mecanicien-auto-cotonou';

insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, v.typ, 'Akpakpa', v.cout, 'https://wozali.africa/assets/casting/'||v.img, v.descr, true, v.ord
from public.wozali_prestataires p, (values
  ('Moto remise à neuf','Entretien','à partir de 8 000 F','kodjo-real1.jpg','Révision complète, moteur remonté et testé.',0),
  ('Moteur démonté et remonté','Réparation','sur devis','kodjo-real2.jpg','Réparation moteur avec pièces changées.',1),
  ('Entretien voiture','Entretien','à partir de 5 000 F','kodjo-real3.jpg','Batterie, courroies et niveaux refaits.',2)
) as v(titre,typ,cout,img,descr,ord) where p.slug='kodjo-auto-mecanicien-auto-cotonou';

insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Rodrigue H.',5,'Il a trouvé la panne que deux garages avaient ratée.','2026-08-05'),
  ('Alice T.',5,'Devis annoncé, devis respecté. Rare et appréciable.','2026-07-19'),
  ('Serge A.',4,'Bon mécanicien, le garage est un peu difficile à trouver.','2026-06-30')
) as v(a,n,c,d) where p.slug='kodjo-auto-mecanicien-auto-cotonou';

-- KOFI MÉTAL (soudeur, Godomey/Cotonou)
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.groupe, v.pmin, v.pmax, v.duree, true, v.ord
from public.wozali_prestataires p, (values
  ('Portail sur mesure','Portails',150000,400000,10080,0),
  ('Grille de fenêtre','Grilles',25000,60000,2880,1),
  ('Porte métallique','Portes',60000,150000,4320,2),
  ('Réparation soudure','Réparation',5000,15000,120,3)
) as v(nom,groupe,pmin,pmax,duree,ord) where p.slug='kofi-metal-soudeur-cotonou';

insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, v.typ, 'Godomey', v.cout, 'https://wozali.africa/assets/casting/'||v.img, v.descr, true, v.ord
from public.wozali_prestataires p, (values
  ('Portail deux battants','Portails','à partir de 150 000 F','kofi-real1.jpg','Portail sur mesure, motifs et pose comprise.',0),
  ('Soudure de structure','Réparation','sur devis','kofi-real2.jpg','Reprise de soudure sur structure métallique.',1),
  ('Grilles de fenêtre','Grilles','à partir de 25 000 F','kofi-real3.jpg','Grilles posées, peinture antirouille.',2)
) as v(titre,typ,cout,img,descr,ord) where p.slug='kofi-metal-soudeur-cotonou';

insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Bénédicte T.',5,'Portail livré et posé en une semaine, finition propre.','2026-08-01'),
  ('Marius A.',5,'Travail solide, il a pris les mesures lui-même à la maison.','2026-07-15'),
  ('Pascal G.',4,'Bonne soudure, un jour de retard sur le délai annoncé.','2026-06-24')
) as v(a,n,c,d) where p.slug='kofi-metal-soudeur-cotonou';

-- YAO BOIS (menuisier, Fidjrossè/Cotonou)
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.groupe, v.pmin, v.pmax, v.duree, true, v.ord
from public.wozali_prestataires p, (values
  ('Armoire sur mesure','Meubles',80000,250000,14400,0),
  ('Lit deux places','Meubles',60000,150000,10080,1),
  ('Porte en bois','Menuiserie',35000,90000,4320,2),
  ('Réparation de meuble','Réparation',5000,20000,240,3)
) as v(nom,groupe,pmin,pmax,duree,ord) where p.slug='yao-bois-menuisier-cotonou';

insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, v.typ, 'Fidjrossè', v.cout, 'https://wozali.africa/assets/casting/'||v.img, v.descr, true, v.ord
from public.wozali_prestataires p, (values
  ('Armoire en bois massif','Meubles','à partir de 80 000 F','yao-real1.jpg','Armoire deux portes avec tiroir, bois verni.',0),
  ('Lit et table de chevet','Meubles','à partir de 60 000 F','yao-real2.jpg','Ensemble chambre en bois massif.',1),
  ('Travail du bois','Menuiserie','sur devis','yao-real3.jpg','Rabotage et ajustage à la main.',2)
) as v(titre,typ,cout,img,descr,ord) where p.slug='yao-bois-menuisier-cotonou';

insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Clarisse N.',5,'Armoire exactement aux mesures de ma chambre, très content.','2026-08-04'),
  ('Ibrahim S.',5,'Beau bois, travail soigné, il explique bien ses choix.','2026-07-11'),
  ('Delphine A.',4,'Bon menuisier, prévoir un peu plus de délai que prévu.','2026-06-20')
) as v(a,n,c,d) where p.slug='yao-bois-menuisier-cotonou';

-- AMA PÂTISSERIE (pâtissière, Bè/Lomé)
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.groupe, v.pmin, v.pmax, v.duree, true, v.ord
from public.wozali_prestataires p, (values
  ('Gâteau d''anniversaire','Gâteaux',8000,35000,2880,0),
  ('Gâteau de mariage','Gâteaux',50000,200000,7200,1),
  ('Cake design personnalisé','Gâteaux',15000,60000,4320,2),
  ('Plateau de beignets','Snacks',2000,5000,240,3)
) as v(nom,groupe,pmin,pmax,duree,ord) where p.slug='ama-patisserie-patissier-boulanger-lome';

insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, v.typ, 'Bè', v.cout, 'https://wozali.africa/assets/casting/'||v.img, v.descr, true, v.ord
from public.wozali_prestataires p, (values
  ('Gâteau d''anniversaire','Gâteaux','à partir de 8 000 F','ama-real1.jpg','Gâteau décoré, parfum au choix.',0),
  ('Plateau de beignets','Snacks','à partir de 2 000 F','ama-real2.jpg','Beignets et petits gâteaux pour événement.',1),
  ('Cake design','Gâteaux','à partir de 15 000 F','ama-real3.jpg','Décoration à la poche, sur commande.',2)
) as v(titre,typ,cout,img,descr,ord) where p.slug='ama-patisserie-patissier-boulanger-lome';

insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Afiwa M.',5,'Le gâteau était magnifique et surtout très bon.','2026-08-06'),
  ('Kossi E.',5,'Commande passée la veille, livrée à l''heure. Merci.','2026-07-23'),
  ('Delali K.',4,'Très bon goût, la décoration était un peu simple.','2026-07-02')
) as v(a,n,c,d) where p.slug='ama-patisserie-patissier-boulanger-lome';

-- ─────────── Vérification ───────────
select nom_complet, metier_principal, ville, slug, nb_avis_recus,
       (select count(*) from public.wozali_realisations r where r.prestataire_id = p.id) as realisations,
       (select count(*) from public.wozali_prestations s where s.prestataire_id = p.id) as prestations,
       (select count(*) from public.wozali_avis a where a.prestataire_id = p.id)        as avis
from public.wozali_prestataires p
where slug in ('kwessi-coupe-barbier-lome','kodjo-auto-mecanicien-auto-cotonou','kofi-metal-soudeur-cotonou','yao-bois-menuisier-cotonou','ama-patisserie-patissier-boulanger-lome')
order by nom_complet;
