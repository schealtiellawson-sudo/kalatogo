-- Démo « Mon salon » sur le compte fondateur (76cdd061-…). À lancer APRÈS salon-coiffure.sql.
-- Prestations + RDV (Honoré = compte dans le CA, Confirmé/Demandé = agenda à venir).

-- 1) Prestations
insert into wozali_prestations (user_id, prestataire_id, nom, prix_min, duree_min, actif, ordre)
select '76cdd061-67a5-4b4e-b45a-c36063078cb5', p.id, v.nom, v.prix, v.duree, true, v.ord
from wozali_prestataires p,
  (values ('Box braids',8000,180,0),('Tissage',6500,120,1),('Nattes collées',3000,90,2),('Soin profond',5000,45,3)) as v(nom,prix,duree,ord)
where p.user_id='76cdd061-67a5-4b4e-b45a-c36063078cb5';

-- 2) RDV démo
insert into wozali_rdv (prestataire_id, prestataire_user_id, client_user_id, client_nom, date_rdv, heure_rdv, service, prestation_nom, statut, message)
select p.id, '76cdd061-67a5-4b4e-b45a-c36063078cb5', v.cli_id::uuid, v.cli, v.d, v.h, v.serv, v.serv, v.st, 'RDV démo'
from wozali_prestataires p,
  (values
    ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a','Mariam T.', to_char(current_date - 10,'YYYY-MM-DD'),'09:00','Box braids','Honoré'),
    ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a','Mariam T.', to_char(current_date - 3, 'YYYY-MM-DD'),'10:00','Box braids','Honoré'),
    ('6bdd312f-5625-428d-9fab-d6559f994e32','Chantal M.',to_char(current_date - 8, 'YYYY-MM-DD'),'14:00','Nattes collées','Honoré'),
    ('6bdd312f-5625-428d-9fab-d6559f994e32','Chantal M.',to_char(current_date - 2, 'YYYY-MM-DD'),'11:00','Box braids','Honoré'),
    ('2f506c61-bc6e-4449-82cb-10eeccdedd28','Awa D.',    to_char(current_date - 4, 'YYYY-MM-DD'),'15:00','Tissage','Honoré'),
    ('2f506c61-bc6e-4449-82cb-10eeccdedd28','Awa D.',    to_char(current_date + 1, 'YYYY-MM-DD'),'11:00','Tissage','Confirmé'),
    ('c96096be-2bf5-4fd3-8ba4-c7ef7b743d4d','Rita K.',   to_char(current_date + 2, 'YYYY-MM-DD'),'16:30','Soin profond','Demandé'),
    ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a','Mariam T.', to_char(current_date + 3, 'YYYY-MM-DD'),'09:00','Box braids','Demandé')
  ) as v(cli_id,cli,d,h,serv,st)
where p.user_id='76cdd061-67a5-4b4e-b45a-c36063078cb5';
