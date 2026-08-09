-- ════════════════════════════════════════════════════════════
-- WOZALI — Profil MODÈLE COMPLET : Adjo Couture (couturière, Tokoin/Lomé)
-- Vitrine de référence : décor vidéos tuto + densité lancement + démo Sandy.
-- SQL Editor → Run. Idempotent (nettoie d'abord ses données démo).
-- prestataire_id = ac28181e-ce43-4ddf-9050-8a7857631367
-- user_id        = c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d
-- ════════════════════════════════════════════════════════════

-- 0. Profil : bio, tarif réel, score/stats cohérents, tag "modele" (badge)
update public.wozali_prestataires set
  description_services = 'Atelier de couture à Tokoin (Lomé). Sur-mesure femme, homme et enfant : tenues de cérémonie, boubous brodés, ensembles wax, retouches et ourlets. Prise de mesures à l''atelier, essayage inclus. Délai actuel : 7 jours. Je conseille aussi le choix du tissu au marché si besoin.',
  tarif_min_fcfa = 2000,
  tarif_max_fcfa = 25000,
  score_wozali   = 88,
  note_moyenne   = 4.6,
  nb_avis_recus  = 5,
  nb_transactions = 42,
  nb_vues_profil = 1840,
  disponible_maintenant = true,
  tags = ARRAY['modele']
where id = 'ac28181e-ce43-4ddf-9050-8a7857631367';

-- On repart propre (au cas où on relance)
delete from public.wozali_modeles      where user_id = 'c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d';
delete from public.wozali_realisations where user_id = 'c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d';
delete from public.wozali_posts        where prestataire_id = 'ac28181e-ce43-4ddf-9050-8a7857631367';
delete from public.wozali_avis         where prestataire_id = 'ac28181e-ce43-4ddf-9050-8a7857631367';

-- 1. Catalogue : 4 modèles (prestations + tarifs)
insert into public.wozali_modeles (prestataire_id, user_id, nom, prix_facon, tissu_inclus, delai_jours, photo_url, description, actif, ordre) values
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Robe de cérémonie sur-mesure', 15000, false, 7,  'https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014040_ee6f74fd-5a5d-44ce-843b-c16effacb36f.png', 'Robe wax ajustée, doublure et fermeture soignées. Façon seule, tissu à ta charge.', true, 0),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Grand boubou brodé homme',    25000, false, 10, 'https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014154_ea68c64c-f6b0-4441-a2e7-9726e0ac1f04.png', 'Boubou 3 pièces avec broderie main sur le plastron. Pour cérémonie et grandes occasions.', true, 1),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Ensemble enfant en pagne',     8000, false, 5,  'https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014154_ba8528a4-3aa1-456c-b847-fef0005b452b.png', 'Chemise + short assortis en wax. Coupe confortable, du 2 au 10 ans.', true, 2),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Retouche & ourlet',            2000, false, 2,  null, 'Reprise de taille, ourlet, changement de fermeture. Rendu en 48h.', true, 3);

-- 2. Portfolio : 5 réalisations (3 + 2 nouvelles)
insert into public.wozali_realisations (prestataire_id, user_id, titre, type, quartier, cout_txt, duree_txt, photo_url, description, actif, ordre) values
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Robe de cérémonie wax','Tenue de cérémonie','Tokoin','à partir de 15 000 F (façon)','7 jours','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014040_ee6f74fd-5a5d-44ce-843b-c16effacb36f.png','Commande d''une cliente pour un mariage à Lomé. Coupe ajustée, patchwork wax.', true, 0),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Tenue wax sur-mesure portée','Tenue de cérémonie','Tokoin','à partir de 15 000 F (façon)','7 jours','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260809_151838_0001297a-6424-4716-938c-e0b5126be840.png','Cliente ravie de sa tenue wax cousue à l''atelier. Coupe évasée à volants, finitions main.', true, 1),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Grand boubou brodé','Boubou homme','Tokoin','à partir de 25 000 F (façon)','10 jours','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014154_ea68c64c-f6b0-4441-a2e7-9726e0ac1f04.png','Boubou bleu roi, broderie dorée faite main. Livré pour une cérémonie familiale.', true, 2),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Broderie main sur plastron','Détail couture','Tokoin','incluse dans le boubou','—','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260809_151838_36e97897-bd8b-4061-91ce-66573a310d8f.png','Le détail qui change tout : broderie dorée cousue main sur le plastron du boubou.', true, 3),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Ensemble enfant assorti','Tenue enfant','Tokoin','à partir de 8 000 F (façon)','5 jours','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014154_ba8528a4-3aa1-456c-b847-fef0005b452b.png','Ensemble chemise + short en wax pour un petit garçon. Finitions solides.', true, 4);

-- 3. Fil : 3 posts (avec photo)
insert into public.wozali_posts (auteur_id, prestataire_id, type, contenu, media_url, media_type, actif, ordre) values
('c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','ac28181e-ce43-4ddf-9050-8a7857631367','realisation','Nouvelle robe de cérémonie livrée cette semaine. Cousue main à l''atelier de Tokoin. Ta tenue pour la prochaine fête, on en parle ?','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014040_ee6f74fd-5a5d-44ce-843b-c16effacb36f.png','photo', true, 0),
('c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','ac28181e-ce43-4ddf-9050-8a7857631367','realisation','Une journée à l''atelier. Chaque tenue est cousue à la main, avec le temps qu''il faut. Passe prendre tes mesures quand tu veux.','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260809_151838_0dcd669c-0b76-4156-b2c9-8ab8155b55f7.png','photo', true, 1),
('c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','ac28181e-ce43-4ddf-9050-8a7857631367','realisation','Bienvenue dans mon atelier à Tokoin. Sur-mesure, retouches, tenues de cérémonie pour toute la famille. Délai 7 jours en ce moment.','https://d8j0ntlcm91z4.cloudfront.net/user_3GuKuXxueb0P9FCICDoAPKYUc51/hf_20260805_014154_cab7014c-fd1d-4b64-8640-a1dee67a02c6.png','photo', true, 2);

-- 4. Avis clients (validés) — 5 avis variés
insert into public.wozali_avis (prestataire_id, prestataire_user_id, auteur_nom, note_globale, commentaire, validated, date_avis) values
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Akouvi D.',   5, 'Robe livrée à temps et parfaitement ajustée. Je recommande vivement.', true, '2026-07-20'),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Fifamé K.',   5, 'Ma tenue de mariage était exactement comme je l''imaginais. Adjo prend le temps de bien mesurer, rien à redire.', true, '2026-08-02'),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Sévérine A.', 5, 'Le boubou de mon mari est magnifique, la broderie est très soignée. Merci Adjo.', true, '2026-07-28'),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Komlan T.',   4, 'Bon travail et délai respecté. Je reviendrai pour les tenues des enfants.', true, '2026-06-15'),
('ac28181e-ce43-4ddf-9050-8a7857631367','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Mensah A.',   4, 'Retouche faite en 2 jours comme promis. Prix correct, accueil sympa.', true, '2026-07-10');

-- ✅ Fini. Recharge le profil d'Adjo Couture pour voir le résultat.
