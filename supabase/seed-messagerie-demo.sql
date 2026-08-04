-- Démo messagerie — 1 conversation entrante vers le compte fondateur.
-- À lancer APRÈS messagerie.sql. Le fondateur = 76cdd061-67a5-4b4e-b45a-c36063078cb5.
-- Client démo = dbcf36bd-50bf-4db9-91cb-3647409eeb8a (auth user existant).
insert into wozali_messages (expediteur_id, destinataire_id, contenu, type, meta, lu, created_at) values
  ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a','76cdd061-67a5-4b4e-b45a-c36063078cb5','Commande : Robe wax','systeme','{"kind":"commande","item":"Robe wax","taille":"M","quantite":1,"prix":"7 500 FCFA"}',false, now() - interval '4 minutes'),
  ('dbcf36bd-50bf-4db9-91cb-3647409eeb8a','76cdd061-67a5-4b4e-b45a-c36063078cb5','Bonjour ! J''ai commandé la Robe wax en taille M. Vous l''avez en rouge ?','texte',null,false, now() - interval '3 minutes');
