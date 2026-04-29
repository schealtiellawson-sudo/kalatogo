-- ================================================================
-- WhatsApp — Séquence pédagogique transverse (M_pedago)
-- Date : 2026-04-29
-- Cible : TOUS les utilisateurs, déclenchée à J+30 après inscription
-- Objectif : éduquer sur les fonctionnalités-clés qui font grossir la plateforme
-- ================================================================

INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('PED1_parrainage_40pct', 'M_pedago', 1, 720, '{prenom}, c''est WOLO 👋

Tu sais que tu as déjà un lien de parrainage personnel ?

→ Pour chaque pro que tu parraines et qui passe en Plan Pro, tu touches **40% de son abonnement chaque mois**.
→ 1 000 FCFA / filleul actif. Récurrent. À vie.

Mathématiquement :
- 3 filleuls = ton Pro est remboursé + bénéfice
- 53 filleuls = 1 SMIG togolais (53 000 FCFA/mois)
- 200 filleuls = 4× SMIG (200 000 FCFA/mois)

C''est pas un bonus. C''est un revenu que tu construis.

→ Ton lien : {url_parrainage}'),

('PED2_pourquoi_pro', 'M_pedago', 2, 840, '{prenom}, pourquoi passer Plan Pro à 2 500 FCFA/mois ?

5 raisons concrètes :

1️⃣ **Tu apparais en premier** quand un client cherche ton métier dans ton quartier — toujours
2️⃣ **Bourse de Croissance** — chance de gagner 300 000 FCFA chaque mois
3️⃣ **Parrainage actif** — tu touches 40% des abos de tes filleuls
4️⃣ **Statistiques** — tu vois exactement combien de clients ont cherché ton métier
5️⃣ **Top 50 WOLO Bénin-Togo** — classement public des meilleurs

2 500 FCFA = moins qu''une recharge MTN. Une seule prestation supplémentaire dans le mois et c''est remboursé.

→ {url_dashboard}'),

('PED3_recompenses', 'M_pedago', 3, 960, '{prenom}, tu connais les récompenses WOLO ?

500 000 FCFA distribués chaque mois :

🏆 **Bourse de Croissance** : 300 000 FCFA pour le membre Pro le plus méritant (Score WOLO ≥ 80, 4 avis récents, 2 mois Pro)

👑 **Le Mur des Reines** : 100 000 FCFA × 2 (Reine Coiffure + Reine Couture, 1 par pays)
→ Ouvert à toutes les femmes du Togo et du Bénin, pas besoin d''être Pro

🏆 **+ Décembre** : finale annuelle 500 000 FCFA × 2 — Reine de l''Année Bénin vs Togo

C''est public. C''est permanent. C''est mensuel.

→ {url_recompenses}'),

('PED4_avis_clients', 'M_pedago', 4, 1080, '{prenom}, ton truc le plus puissant : les avis clients.

→ Un client avec 5 avis 5★ est contacté **3× plus** qu''un client sans avis
→ Ton Score WOLO monte de 25 points avec une note moyenne 5/5
→ Plus tes clients laissent un avis, plus les NOUVEAUX clients te font confiance

Comment faire ?
1. Après chaque prestation, envoie le lien WhatsApp de ton profil au client
2. Demande lui : "Si tu as aimé, laisse-moi un avis sur WOLO Market — ça m''aide énormément"
3. C''est tout. 30 secondes pour ton client. 1 vie de visibilité pour toi.

→ Ton profil : {url_profil}'),

('PED5_score_wolo', 'M_pedago', 5, 1200, '{prenom}, comprends ton Score WOLO sur 100 :

📋 **Profil complet** : 30 pts (photo, description, tarif, téléphone, géoloc)
⭐ **Note moyenne clients** : 25 pts
💬 **Nombre d''avis** : 15 pts
📸 **Photos publiées** : 10 pts (3 photos minimum)
👀 **Vues du profil** : 10 pts
⚡ **Activité récente** : 10 pts (post, mise à jour dans les 14 derniers jours)

⚠️ Attention : zéro activité 14j = perte de points progressive (-1 pt/jour)

Ton Score décide de ton classement. Plus haut tu es, plus de clients te trouvent.

→ Voir ton score : {url_dashboard}'),

('PED6_disponibilite', 'M_pedago', 6, 1320, '{prenom}, active ta disponibilité maintenant.

→ Quand tu actives "⭐ Disponible", tu apparais dans la **carte interactive** des prestataires actifs maintenant
→ Les clients pressés (urgences électricité, plombier, mécano) te trouvent en premier
→ Ça te donne un boost dans le classement

Désactive-la quand tu pars te coucher ou en pause. Active-la quand tu commences ta journée.

C''est juste un switch dans ton dashboard. 2 secondes par jour. Ça change tout.

→ {url_dashboard}'),

('PED7_partage_whatsapp', 'M_pedago', 7, 1440, '{prenom}, voici ton arme secrète : ton lien WOLO partageable.

→ Copie ton lien profil
→ Mets-le dans ta bio WhatsApp
→ Partage-le sur ton statut WhatsApp 1× par semaine
→ Envoie-le aux clients qui te demandent "tu as un site ?" ou "tu fais de la pub ?"

Avantages vs ton numéro WhatsApp seul :
✓ Ton portfolio visible (photos, avis, score)
✓ Plus pro qu''un simple numéro
✓ Si le client te recommande, le link va loin

→ Ton lien : {url_profil}'),

('PED8_recap', 'M_pedago', 8, 1800, '{prenom}, ça fait 75 jours que tu es sur WOLO. Voici le récap :

🎯 **Ce que WOLO fait pour toi** :
- Visibilité gratuite à Cotonou et Lomé
- Profil professionnel sans site web à construire
- Avis clients = preuve sociale automatique
- Système de RDV intégré
- Géoloc pour les clients proches

💰 **Si Plan Pro 2 500 FCFA/mois activé** :
- +Priorité dans les recherches
- +300 000 FCFA Bourse possible
- +40% commission parrainage
- +Top 50 Bénin-Togo

📊 **Tes leviers cette semaine** :
1. Ajouter 1 photo de réalisation
2. Demander 1 avis à un client récent
3. Activer ta disponibilité 1 fois/jour

→ Si tu n''as pas vu d''effet encore : réponds à ce message, on t''aide.

→ {url_dashboard}')

ON CONFLICT (key) DO NOTHING;

-- Étendre la contrainte CHECK pour accepter M_pedago
DO $$ BEGIN
  ALTER TABLE wolo_whatsapp_templates DROP CONSTRAINT IF EXISTS wolo_whatsapp_templates_sequence_check;
  ALTER TABLE wolo_whatsapp_templates ADD CONSTRAINT wolo_whatsapp_templates_sequence_check
    CHECK (sequence IN ('A_onboarding','B_apprentie','C_concours','transactionnel',
                        'M_apprentie_coiffure','M_apprentie_couture',
                        'M_patronne_coiffure','M_patronne_couture',
                        'M_indep_coiffure','M_indep_couture',
                        'M_client_recherche',
                        'M_pedago'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
