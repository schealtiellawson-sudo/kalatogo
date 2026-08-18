-- ════════════════════════════════════════════════════════════════════
-- WOZALI — Profils MODÈLES, vague 3 : le segment MARCHÉ
-- Sarah Mode · Da Akouvi · Afiwa Légumes · Rachidou Express · Nadège Fraîcheur · Yélé Pagnes
-- Photos servies par le site : repo/assets/casting/*.jpg
-- ⚠️ POUSSER LE REPO AVANT DE LANCER CE SQL.
-- Idempotent : relançable sans doublon.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare v_uid uuid; v_pid uuid; r record;
begin
  for r in select * from (values
      ('sarah.mode@demo.wozali.africa','Sarah Mode','Vendeur vêtements','Lomé','Adidogomé','sarah-mode-vendeur-vetements-lome','+22890111206',
       'Vente de vêtements au marché d''Assiyéyé (Adidogomé). Prêt-à-porter femme et enfant, tenues en pagne, robes, ensembles enfant. Je circule dans le marché tous les jours sauf le dimanche. Appelle-moi, je te dis où je suis.','sarah'),
      ('da.akouvi@demo.wozali.africa','Da Akouvi','Boucherie/Poissonnerie','Lomé','Totsi','da-akouvi-boucherie-poissonnerie-lome','+22890111207',
       'Poissons fumés et poissons séchés au marché de Totsi (Lomé). Gros poisson fumé, petits poissons séchés, crevettes séchées. Trente ans au même endroit. Je vends au tas ou à la mesure.','akouvi'),
      ('afiwa.legumes@demo.wozali.africa','Afiwa Légumes','Légumes & Fruits','Lomé','Adidogomé','afiwa-legumes-legumes-fruits-lome','+22890111208',
       'Légumes frais sous hangar au marché d''Assiyéyé (Adidogomé). Tomates, piment, gombo, gboma, adémé, oignons, tubercules. Livraison possible dans Adidogomé pour les commandes du matin.','afiwa'),
      ('rachidou.express@demo.wozali.africa','Rachidou Express','Vendeur de rue/Étale','Cotonou','Étoile Rouge','rachidou-express-vendeur-de-rue-etale-cotonou','+22990111209',
       'Accessoires téléphone et petits articles au carrefour de l''Étoile Rouge (Cotonou). Chargeurs, câbles, écouteurs, mouchoirs, lunettes, briquets. Je suis sur place du matin au soir. Appelle avant de passer, je viens à toi.','rachidou'),
      ('nadege.fraicheur@demo.wozali.africa','Nadège Fraîcheur','Vendeur de rue/Étale','Cotonou','Dantokpa','nadege-fraicheur-vendeur-de-rue-etale-cotonou','+22990111210',
       'Boissons fraîches au marché Dantokpa (Cotonou). Eau en sachet, jus de bissap et de gingembre maison, dégué, boissons en bouteille. Toujours glacé. Je circule dans les allées toute la journée.','nadege'),
      ('yele.pagnes@demo.wozali.africa','Yélé Pagnes','Boutique mode / Friperie','Lomé','Assigamé','yele-pagnes-boutique-mode-friperie-lome','+22890111211',
       'Pagnes et tissus wax au Grand marché d''Assigamé (Lomé). Wax hollandais, wax local, tissus de cérémonie, coupons et pièces complètes. Vente au pagne, au demi-pagne ou en gros pour les couturières.','yele')
    ) as t(email,nom,metier,ville,quartier,slug,tel,descr,code)
  loop
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
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', ''
      );
    end if;

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
        'Pro', true, 4.67, 3, 1240, 96, 380, 83, 9, ARRAY['Français']
      );
    else
      update public.wozali_prestataires set
        description_services = r.descr,
        photo_profil        = 'https://wozali.africa/assets/casting/'||r.code||'-portrait.jpg',
        photo_realisation_1 = 'https://wozali.africa/assets/casting/'||r.code||'-real1.jpg',
        photo_realisation_2 = 'https://wozali.africa/assets/casting/'||r.code||'-real2.jpg',
        photo_realisation_3 = 'https://wozali.africa/assets/casting/'||r.code||'-real3.jpg'
      where id = v_pid;
    end if;

    delete from public.wozali_realisations where prestataire_id = v_pid;
    delete from public.wozali_prestations  where prestataire_id = v_pid;
    delete from public.wozali_avis         where prestataire_id = v_pid;
    delete from public.wozali_posts        where prestataire_id = v_pid;
  end loop;
end $$;


-- ─── SARAH MODE ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Robe en pagne','Femme',3500,12000,0,0),
  ('Ensemble enfant','Enfant',2000,5000,0,1),
  ('Haut et jupe','Femme',2500,8000,0,2),
  ('Tenue de cérémonie','Femme',8000,25000,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='sarah-mode-vendeur-vetements-lome';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Arrivage du jour','sarah',1),
  ('Vêtements femme','sarah',2),
  ('Tenues enfant','sarah',3),
  ('Robes en pagne','sarah',4),
  ('Friperie triée','sarah',5),
  ('Essayage sur place','sarah',6),
  ('Ensembles assortis','sarah',7),
  ('Pagne prêt-à-porter','sarah',8),
  ('Nouvelle collection','sarah',9)
) as v(titre,code,i) where p.slug='sarah-mode-vendeur-vetements-lome';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Akossiwa D.',5,'Elle m''a trouvé exactement la taille de ma fille, et moins cher qu''en boutique.','2026-08-09'),
  ('Yawa K.',5,'Toujours du nouveau chaque semaine. Je l''appelle avant de venir au marché.','2026-07-28'),
  ('Edem A.',4,'Bon choix et bon prix, il faut juste la trouver dans le marché.','2026-07-06')
) as v(a,n,c,d) where p.slug='sarah-mode-vendeur-vetements-lome';

-- ─── DA AKOUVI ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Gros poisson fumé','Poisson',500,2000,0,0),
  ('Petits poissons séchés','Poisson',200,1000,0,1),
  ('Crevettes séchées','Poisson',500,2500,0,2),
  ('Mesure au bol','Poisson',200,500,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='da-akouvi-boucherie-poissonnerie-lome';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Poisson fumé du jour','akouvi',1),
  ('Petits poissons séchés','akouvi',2),
  ('Crevettes séchées','akouvi',3),
  ('Mon étal','akouvi',4),
  ('Poisson bien fumé','akouvi',5),
  ('Vente à la mesure','akouvi',6),
  ('Emballage client','akouvi',7),
  ('Arrivage du matin','akouvi',8)
) as v(titre,code,i) where p.slug='da-akouvi-boucherie-poissonnerie-lome';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Mensah T.',5,'Le meilleur poisson fumé de Totsi, jamais déçue en dix ans.','2026-08-11'),
  ('Ayélé S.',5,'Elle donne toujours bonne mesure. On ne discute même pas.','2026-07-30'),
  ('Kodjo B.',4,'Bon poisson, il faut venir tôt sinon c''est fini.','2026-07-14')
) as v(a,n,c,d) where p.slug='da-akouvi-boucherie-poissonnerie-lome';

-- ─── AFIWA LÉGUMES ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Tas de tomates','Légumes',200,500,0,0),
  ('Piment et gombo','Légumes',100,500,0,1),
  ('Feuilles gboma et adémé','Légumes',100,300,0,2),
  ('Igname et manioc','Tubercules',500,2500,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='afiwa-legumes-legumes-fruits-lome';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Tomates du jour','afiwa',1),
  ('Piments et gombo','afiwa',2),
  ('Feuilles fraîches','afiwa',3),
  ('Oignons et ail','afiwa',4),
  ('Tubercules','afiwa',5),
  ('Mon étal sous hangar','afiwa',6),
  ('Pesée client','afiwa',7),
  ('Arrivage du matin','afiwa',8)
) as v(titre,code,i) where p.slug='afiwa-legumes-legumes-fruits-lome';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Sena A.',5,'Ses tomates tiennent toute la semaine, elle choisit bien.','2026-08-07'),
  ('Rachelle K.',5,'Elle me met de côté ce que je demande, je passe le soir.','2026-07-25'),
  ('Komi D.',4,'Bons produits, un peu cher en saison sèche mais c''est partout pareil.','2026-06-29')
) as v(a,n,c,d) where p.slug='afiwa-legumes-legumes-fruits-lome';

-- ─── RACHIDOU EXPRESS ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Chargeur téléphone','Téléphone',1000,3000,0,0),
  ('Câble USB','Téléphone',500,1500,0,1),
  ('Écouteurs','Téléphone',1000,4000,0,2),
  ('Petits articles','Divers',100,1000,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='rachidou-express-vendeur-de-rue-etale-cotonou';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Mon plateau du jour','rachidou',1),
  ('Chargeurs et câbles','rachidou',2),
  ('Écouteurs','rachidou',3),
  ('Petits articles','rachidou',4),
  ('Au carrefour','rachidou',5),
  ('Vente au feu rouge','rachidou',6),
  ('Le soir sous les lampadaires','rachidou',7),
  ('Fin de journée','rachidou',8)
) as v(titre,code,i) where p.slug='rachidou-express-vendeur-de-rue-etale-cotonou';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Ulrich A.',5,'Chargeur acheté au feu, il tient depuis six mois. Bonne qualité.','2026-08-10'),
  ('Sylvie H.',4,'Prix corrects et il ne force pas la vente. Sérieux.','2026-07-22'),
  ('Firmin T.',5,'Je l''appelle, il m''apporte au bureau. Service rapide.','2026-07-03')
) as v(a,n,c,d) where p.slug='rachidou-express-vendeur-de-rue-etale-cotonou';

-- ─── NADÈGE FRAÎCHEUR ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Sachet d''eau glacée','Boissons',25,50,0,0),
  ('Jus de bissap maison','Boissons',100,500,0,1),
  ('Dégué','Boissons',200,500,0,2),
  ('Boisson en bouteille','Boissons',300,800,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='nadege-fraicheur-vendeur-de-rue-etale-cotonou';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Ma bassine du jour','nadege',1),
  ('Eau glacée','nadege',2),
  ('Bissap maison','nadege',3),
  ('Dégué frais','nadege',4),
  ('Jus de gingembre','nadege',5),
  ('Service client','nadege',6),
  ('Dans les allées','nadege',7),
  ('Toujours glacé','nadege',8)
) as v(titre,code,i) where p.slug='nadege-fraicheur-vendeur-de-rue-etale-cotonou';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Prudence G.',5,'Son bissap est le meilleur du marché, pas trop sucré.','2026-08-12'),
  ('Blaise K.',5,'Toujours bien glacé même à midi. Elle passe souvent.','2026-07-27'),
  ('Carine M.',4,'Bon dégué, parfois elle finit tôt le week-end.','2026-07-09')
) as v(a,n,c,d) where p.slug='nadege-fraicheur-vendeur-de-rue-etale-cotonou';

-- ─── YÉLÉ PAGNES ───
insert into public.wozali_prestations (prestataire_id, user_id, nom, groupe, prix_min, prix_max, duree_min, actif, ordre)
select p.id, p.user_id, v.nom, v.grp, v.pmin, v.pmax, 30, true, v.ord
from public.wozali_prestataires p, (values
  ('Pagne wax 6 yards','Wax',7500,35000,0,0),
  ('Demi-pagne','Wax',4000,18000,0,1),
  ('Wax hollandais','Wax',25000,60000,0,2),
  ('Gros pour couturières','Wax',50000,300000,0,3)
) as v(nom,grp,pmin,pmax,duree,ord) where p.slug='yele-pagnes-boutique-mode-friperie-lome';
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, photo_url, description, actif, ordre)
select p.id, p.user_id, v.titre, p.metier_principal, p.quartier, 'sur place',
       'https://wozali.africa/assets/casting/'||v.code||'-real'||v.i||'.jpg', v.titre, true, v.i
from public.wozali_prestataires p, (values
  ('Wax du jour','yele',1),
  ('Ma boutique','yele',2),
  ('Mesure au mètre','yele',3),
  ('Choix client','yele',4),
  ('Motifs wax','yele',5),
  ('Tissu de cérémonie','yele',6),
  ('Pile de pagnes','yele',7),
  ('Wax brodé','yele',8),
  ('Rayons complets','yele',9)
) as v(titre,code,i) where p.slug='yele-pagnes-boutique-mode-friperie-lome';
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis)
select p.id, p.user_id, v.a, v.n, v.c, true, v.d::date
from public.wozali_prestataires p, (values
  ('Delali A.',5,'Vrai wax, pas de contrefaçon. Je prends chez elle depuis des années.','2026-08-08'),
  ('Ama T.',5,'Elle conseille bien les motifs et fait un prix aux couturières.','2026-07-26'),
  ('Kafui E.',4,'Beau choix, un peu cher mais la qualité est là.','2026-07-05')
) as v(a,n,c,d) where p.slug='yele-pagnes-boutique-mode-friperie-lome';

-- Vérification
select nom_complet, metier_principal, ville, quartier, slug,
       (select count(*) from public.wozali_realisations r where r.prestataire_id = p.id) as photos,
       (select count(*) from public.wozali_prestations s where s.prestataire_id = p.id) as prestations,
       (select count(*) from public.wozali_avis a where a.prestataire_id = p.id) as avis
from public.wozali_prestataires p
where slug in ('sarah-mode-vendeur-vetements-lome','da-akouvi-boucherie-poissonnerie-lome','afiwa-legumes-legumes-fruits-lome','rachidou-express-vendeur-de-rue-etale-cotonou','nadege-fraicheur-vendeur-de-rue-etale-cotonou','yele-pagnes-boutique-mode-friperie-lome') order by nom_complet;