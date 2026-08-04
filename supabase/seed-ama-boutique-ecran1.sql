-- ════════════════════════════════════════════════════════════
-- SEED démo — Ama Boutique (écran 1). À lancer APRÈS boutique-ecran1.sql
-- Renseigne tailles + stock + coût sur ses articles, et crée des commandes démo.
-- Idempotent pour les articles (UPDATE). Les commandes : lancer UNE fois.
-- prestataire (profil) : f5d4970e-71f0-4f1e-9e5b-111cae181704
-- ════════════════════════════════════════════════════════════

-- 1) Enrichir les articles (tailles, stock interne, seuil, coût d'achat)
update wozali_items i set tailles='S, M, L, XL', stock_qty=14, seuil_stock=4, cout_achat=4500
  from wozali_prestataires p where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.user_id=p.user_id and i.nom ilike 'Robe wax';

update wozali_items i set tailles=null, stock_qty=3, seuil_stock=4, cout_achat=9800, stock_statut='sur_commande'
  from wozali_prestataires p where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.user_id=p.user_id and i.nom ilike 'Sac cuir';

update wozali_items i set tailles='M, L, XL', stock_qty=9, seuil_stock=3, cout_achat=5400
  from wozali_prestataires p where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.user_id=p.user_id and i.nom ilike 'Chemise homme';

update wozali_items i set tailles=null, stock_qty=0, seuil_stock=2, cout_achat=1200, stock_statut='epuise'
  from wozali_prestataires p where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.user_id=p.user_id and i.nom ilike 'Foulard';

-- 2) Commandes démo (à lancer une seule fois)
-- Robe wax = best-seller (plusieurs ventes), Chemise homme quelques ventes, + 1 commande à traiter.
insert into wozali_commandes (client_user_id, prestataire_id, prestataire_user_id, type, item_id, item_nom, client_nom, taille, quantite, prix_txt, statut, created_at)
select cu.uid, 'f5d4970e-71f0-4f1e-9e5b-111cae181704', i.user_id, 'produit', i.id, i.nom, cu.nom, cu.taille, cu.qte, '7 500 FCFA', cu.statut, now() - (cu.jours || ' days')::interval
from wozali_items i
join wozali_prestataires p on p.user_id = i.user_id
cross join (values
  ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a'::uuid,'Fatou K.','M',1,'livree',2),
  ('76cdd061-67a5-4b4e-b45a-c36063078cb5'::uuid,'Awa D.','L',1,'livree',5),
  ('6bdd312f-5625-428d-9fab-d6559f994e32'::uuid,'Chantal M.','S',1,'livree',9),
  ('2f506c61-bc6e-4449-82cb-10eeccdedd28'::uuid,'Bella T.','L',1,'confirmee',1),
  ('c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d'::uuid,'Rita K.','M',1,'recue',0)
) as cu(uid,nom,taille,qte,statut,jours)
where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.nom ilike 'Robe wax';

insert into wozali_commandes (client_user_id, prestataire_id, prestataire_user_id, type, item_id, item_nom, client_nom, taille, quantite, prix_txt, statut, created_at)
select cu.uid, 'f5d4970e-71f0-4f1e-9e5b-111cae181704', i.user_id, 'produit', i.id, i.nom, cu.nom, cu.taille, cu.qte, '9 000 FCFA', cu.statut, now() - (cu.jours || ' days')::interval
from wozali_items i
join wozali_prestataires p on p.user_id = i.user_id
cross join (values
  ('38aec4b9-8c07-48c0-a597-f67153cef18d'::uuid,'Kossi A.','L',2,'livree',3),
  ('3a20755a-7d99-4c2e-bd6d-7c79f81e0411'::uuid,'Yao B.','XL',1,'livree',7)
) as cu(uid,nom,taille,qte,statut,jours)
where p.id='f5d4970e-71f0-4f1e-9e5b-111cae181704' and i.nom ilike 'Chemise homme';

-- ✅ Fini.
