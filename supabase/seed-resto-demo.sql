-- Démo « Mon resto » sur le compte fondateur (76cdd061-…). APRÈS resto-restaurant.sql. Lancer une fois.
-- 1) Carte (plats)
insert into wozali_menu (user_id, prestataire_id, nom, prix, categorie, actif, ordre) values
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Poulet DG',3500,'Plats',true,0),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Poisson braisé',4000,'Plats',true,1),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Riz gras',2000,'Plats',true,2),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Amiwo poulet',2500,'Plats',true,3),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Spaghetti sauce',1500,'Plats',true,4),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5','d4f40ed6-8929-4fc2-bcad-7db0e6beaf82','Cocktail maison',2000,'Boissons',true,5);

-- 2) Avis clients (👍/👎) depuis des comptes démo
insert into wozali_menu_reactions (menu_item_id, user_id, reaction)
select m.id, v.uid::uuid, v.r
from wozali_menu m
join (values
  ('Poulet DG','dbcf36bd-50bf-4db9-91cb-3647409eeb8a','like'),('Poulet DG','6bdd312f-5625-428d-9fab-d6559f994e32','like'),('Poulet DG','2f506c61-bc6e-4449-82cb-10eeccdedd28','like'),('Poulet DG','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','like'),('Poulet DG','38aec4b9-8c07-48c0-a597-f67153cef18d','like'),('Poulet DG','3a20755a-7d99-4c2e-bd6d-7c79f81e0411','like'),('Poulet DG','e8fba3ad-8096-4b6d-9f42-9587fa28d5e7','like'),('Poulet DG','a886ccdf-eb6b-4a06-9f16-232bc47150d2','like'),
  ('Poisson braisé','dbcf36bd-50bf-4db9-91cb-3647409eeb8a','like'),('Poisson braisé','6bdd312f-5625-428d-9fab-d6559f994e32','like'),('Poisson braisé','2f506c61-bc6e-4449-82cb-10eeccdedd28','like'),('Poisson braisé','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','like'),('Poisson braisé','38aec4b9-8c07-48c0-a597-f67153cef18d','like'),('Poisson braisé','3a20755a-7d99-4c2e-bd6d-7c79f81e0411','like'),
  ('Riz gras','dbcf36bd-50bf-4db9-91cb-3647409eeb8a','like'),('Riz gras','6bdd312f-5625-428d-9fab-d6559f994e32','like'),('Riz gras','2f506c61-bc6e-4449-82cb-10eeccdedd28','like'),('Riz gras','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','like'),
  ('Amiwo poulet','dbcf36bd-50bf-4db9-91cb-3647409eeb8a','like'),('Amiwo poulet','6bdd312f-5625-428d-9fab-d6559f994e32','like'),('Amiwo poulet','2f506c61-bc6e-4449-82cb-10eeccdedd28','like'),
  ('Spaghetti sauce','dbcf36bd-50bf-4db9-91cb-3647409eeb8a','dislike'),('Spaghetti sauce','6bdd312f-5625-428d-9fab-d6559f994e32','dislike'),('Spaghetti sauce','2f506c61-bc6e-4449-82cb-10eeccdedd28','dislike'),('Spaghetti sauce','c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','dislike'),('Spaghetti sauce','38aec4b9-8c07-48c0-a597-f67153cef18d','dislike')
) as v(plat,uid,r) on v.plat = m.nom
where m.user_id='76cdd061-67a5-4b4e-b45a-c36063078cb5'
on conflict (menu_item_id, user_id) do update set reaction = excluded.reaction;

-- 3) Recettes de la semaine
insert into wozali_recettes (user_id, jour, montant) values
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5', current_date - 4, 32000),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5', current_date - 3, 28000),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5', current_date - 2, 41000),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5', current_date - 1, 39000),
 ('76cdd061-67a5-4b4e-b45a-c36063078cb5', current_date,     48000)
on conflict (user_id, jour) do update set montant = excluded.montant;
