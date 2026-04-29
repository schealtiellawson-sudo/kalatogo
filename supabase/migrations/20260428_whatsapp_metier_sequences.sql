-- ================================================================
-- WhatsApp Sequences MÉTIER — Verticale Beauté & Couture
-- Date : 2026-04-28
-- Cible : compléter wolo_whatsapp_templates avec 7 séquences ciblées
-- Pré-requis : 20260428_whatsapp_sequences.sql doit être appliquée
--   (tables wolo_whatsapp_templates + wolo_whatsapp_queue déjà créées)
--
-- 7 séquences livrées (codes) :
--   M_apprentie_coiffure   — apprentie coiffeuse (7 msg / 14j)
--   M_apprentie_couture    — apprentie couturière (7 msg / 14j)
--   M_patronne_coiffure    — cheffe de salon coiffure (5 msg / 21j)
--   M_patronne_couture     — cheffe atelier couture (5 msg / 21j)
--   M_indep_coiffure       — coiffeuse indépendante domicile (5 msg / 14j)
--   M_indep_couture        — couturière indépendante (5 msg / 14j)
--   M_client_recherche     — client final post-recherche infructueuse (4 msg / 7j)
--
-- Total : 38 templates
--
-- ⚠️ Prérequis migration parente : la contrainte CHECK sur sequence
--    doit accepter les nouveaux codes. Adaptation faite ci-dessous.
-- ================================================================

-- 0. Étendre la contrainte CHECK sur la colonne sequence pour accepter les codes métier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%wolo_whatsapp_templates_sequence_check%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE wolo_whatsapp_templates DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conname LIKE '%wolo_whatsapp_templates_sequence_check%'
      LIMIT 1
    );
  END IF;

  ALTER TABLE wolo_whatsapp_templates
    ADD CONSTRAINT wolo_whatsapp_templates_sequence_check
    CHECK (sequence IN (
      'A_onboarding','B_apprentie','C_concours','transactionnel',
      'M_apprentie_coiffure','M_apprentie_couture',
      'M_patronne_coiffure','M_patronne_couture',
      'M_indep_coiffure','M_indep_couture',
      'M_client_recherche'
    ));
EXCEPTION
  WHEN others THEN
    -- Si pas de contrainte préalable, on ajoute simplement la nouvelle
    BEGIN
      ALTER TABLE wolo_whatsapp_templates
        ADD CONSTRAINT wolo_whatsapp_templates_sequence_check
        CHECK (sequence IN (
          'A_onboarding','B_apprentie','C_concours','transactionnel',
          'M_apprentie_coiffure','M_apprentie_couture',
          'M_patronne_coiffure','M_patronne_couture',
          'M_indep_coiffure','M_indep_couture',
          'M_client_recherche'
        ));
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- ================================================================
-- SEED — Séquence M_apprentie_coiffure (7 messages, 14 jours)
-- Cible : Akossiwa, apprentie tresses Bè, paie Madame, invisible
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MAC1_bienvenue', 'M_apprentie_coiffure', 1, 0,
'Bienvenue {prenom} 👋

Tu travailles dur chez Madame du mardi au samedi. Tu mérites tes propres clientes en plus.

WOLO Market c''est ton dimanche à toi. Tes clientes perso. Sans piston.

→ {url_dashboard}'),

('MAC2_premiere_photo', 'M_apprentie_coiffure', 2, 24,
'{prenom}, sans photo de tes tresses, tu es invisible sur WOLO.

1 photo claire = 3× plus de contacts. Prends-en une ce soir, à la lumière du jour.

C''est gratuit. C''est 5 minutes max.

→ {url_dashboard}'),

('MAC3_histoire_akossi', 'M_apprentie_coiffure', 3, 72,
'{prenom}, histoire vraie 📖

Akossiwa (Bè) a posté 3 photos de tresses la semaine dernière. Hier elle a tressé sa première cliente perso. 8 000 F dans la poche. Sans Madame.

Toi aussi tu peux. Tes clientes du dimanche. Ta tarifaction.

→ {url_dashboard}'),

('MAC4_clientes_proches', 'M_apprentie_coiffure', 4, 120,
'{prenom}, {nb_clientes_proches} clientes dans ton quartier ({quartier}) cherchent une coiffeuse cette semaine.

Si ton profil est complet (photo + dispo + GPS), tu apparais. Sinon, elles passent à côté.

C''est maintenant ou jamais.

→ {url_dashboard}'),

('MAC5_mur_reines', 'M_apprentie_coiffure', 5, 168,
'👑 {prenom}, Le Mur des Reines de ce mois est ouvert.

100 000 FCFA pour la Reine Coiffure. Apprentie autorisée. Pas besoin d''être Pro.

Ta plus belle tresse + le tag de Madame (ou ton tag perso). La communauté vote. Tu peux gagner.

→ {url_awards}'),

('MAC6_marraine', 'M_apprentie_coiffure', 6, 240,
'{prenom}, on t''a assigné une marraine WOLO : {nom_marraine}.

Elle est Reine Coiffure de ton quartier ({quartier}) le mois dernier. Elle accompagne 5 nouvelles apprenties ce mois — toi tu es la 6ème.

Elle peut te donner ses combines. Tu veux qu''elle te dise bonjour direct sur WhatsApp ?

→ {url_dashboard}'),

('MAC7_pro_jour14', 'M_apprentie_coiffure', 7, 312,
'{prenom}, bilan 14 jours WOLO :

✓ {x} vues sur ton profil
✓ {y} contacts reçus

C''est solide. Pour aller plus loin (priorité dans les recherches Coiffure {ville}, badge Pro, 40% commission sur tes filleules, accès Bourse de Croissance) → 2 500 F/mois. C''est 1 plat de garba. C''est l''investissement de ta vie pro.

→ {url_pro}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_apprentie_couture (7 messages, 14 jours)
-- Cible : Mariam, apprentie couture Bè-Kpota, 80K payés à Madame Adjo
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MACO1_bienvenue', 'M_apprentie_couture', 1, 0,
'Bienvenue {prenom} 👋

Tu couds 12h par jour à l''atelier sans rien gagner. Tu ne mérites pas ça.

WOLO te donne tes propres clientes du dimanche. Tes tarifs. Ton nom à toi — pas celui de Madame.

→ {url_dashboard}'),

('MACO2_photo_robe_portee', 'M_apprentie_couture', 2, 24,
'{prenom}, 1 photo d''une robe finie portée par ta cliente = 5 contacts en 1 semaine.

Celle de l''atelier de Madame, c''est OK : tu l''as cousue, tu la montres. Demande à la cliente livrée la dernière fois — elle pose 30 secondes, c''est tout.

→ {url_dashboard}'),

('MACO3_histoire_mariam', 'M_apprentie_couture', 3, 72,
'{prenom}, histoire vraie 📖

Mariam (Tokpa) coud des pagnes le dimanche depuis 3 mois. Elle a posté 5 photos. Hier elle a livré sa 4ème robe perso à 25 000 F.

Madame ne le sait pas — c''est légal. Le dimanche t''appartient. Tes clientes t''appartiennent.

→ {url_dashboard}'),

('MACO4_clientes_mariage', 'M_apprentie_couture', 4, 120,
'{prenom}, saison mariage à {ville} 💒

7 clientes à {quartier} cherchent une couturière pour avant fin du mois. Si ton profil est complet, tu apparais. Sinon, d''autres prennent.

Ajoute 3 photos + ton délai standard (ex : robe pagne 5 jours). 10 minutes max.

→ {url_dashboard}'),

('MACO5_mur_reines_couture', 'M_apprentie_couture', 5, 168,
'👑 {prenom}, ce mois c''est Couture sur Le Mur des Reines.

100 000 FCFA pour la Reine Couture. Apprentie autorisée. Ta plus belle robe + le tag de Madame Adjo (ou ton tag).

La cliente que tu as livrée la semaine dernière peut être ton modèle.

→ {url_awards}'),

('MACO6_groupe_apprenties', 'M_apprentie_couture', 6, 240,
'{prenom}, on a un groupe WhatsApp privé de 12 apprenties couture {ville}.

Elles partagent les patrons gratuits, les fournisseurs Tokpa moins chers, les bonnes combines anti-Madame. Tu veux entrer ?

(Réponds OUI à ce message, on t''ajoute.)

→ {url_dashboard}'),

('MACO7_pro_jour14', 'M_apprentie_couture', 7, 312,
'{prenom}, bilan 14 jours WOLO :

✓ {x} vues sur ton profil
✓ {y} commandes reçues

Pro à 2 500 F/mois = priorité dans les recherches Couture {ville} + 40% commission sur tes filleules + Bourse de Croissance 300K. Tu rentabilises avec 1 robe perso de plus par mois.

→ {url_pro}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_patronne_coiffure (5 messages, 21 jours)
-- Cible : Madame Adjo, salon Bè-Kondji, 3 employées, recrutement + paie
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MPC1_recrutement_gratuit', 'M_patronne_coiffure', 1, 0,
'Bienvenue Madame 👋

Vous cherchez une apprentie sérieuse ? WOLO Market a {nb_candidates} coiffeuses candidates à {ville} ce mois.

Voir leurs profils + photos + zones est gratuit. Pas de cousin, pas de piston — juste leur travail.

→ {url_recrut}'),

('MPC2_paie_employees', 'M_patronne_coiffure', 2, 72,
'Madame, payer 3 employées en cash le 30 = perte de temps + risque erreur + pas de trace.

WOLO Paie : tu cliques, tu vires, c''est tracé. Bulletin de paie auto. Compatible Mobile Money + virement bancaire.

0 F en plus si tu es Pro.

→ {url_paie}'),

('MPC3_pro_salon', 'M_patronne_coiffure', 3, 168,
'Madame, le Plan Pro Salon 5 000 F/mois c''est :

✓ Équipe jusqu''à 5 employées dans ton dashboard
✓ 1 boost gratuit/mois sur tes annonces
✓ Apparition prioritaire dans "Coiffure {ville}"
✓ Paie auto incluse

Tu testes 14 jours gratuits ?

→ {url_pro}'),

('MPC4_apprentie_publicite', 'M_patronne_coiffure', 4, 336,
'Madame, ton apprentie {nom_apprentie} est candidate Reine Coiffure ce mois.

Si elle gagne (100 000 FCFA), ton salon apparaît dans la galerie des Marraines WOLO. Visibilité gratuite massive.

Pousse-la à poster ses photos. C''est aussi de la pub pour toi.

→ {url_awards}'),

('MPC5_kyc_badge', 'M_patronne_coiffure', 5, 504,
'Madame, après 3 semaines : ton salon a reçu {x} contacts.

Pour multiplier × 2 : badge Vérifié WOLO. KYC en 5 minutes (carte ID + photo enseigne) = priorité absolue dans les recherches Coiffure {ville}.

Gratuit avec Pro Salon.

→ {url_dashboard}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_patronne_couture (5 messages, 21 jours)
-- Cible : Madame Yawa, atelier Cocotomey-Calavi, recrutement saisonnier mariage
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MPCO1_saison_mariages', 'M_patronne_couture', 1, 0,
'Bienvenue Madame 👋

Saison mariages à {ville} = saison apprenties. {nb_candidates} candidates couture dispo ce mois.

Voir leurs profils + photos + zones = 0 F. Tu choisis. Pas de cousin du cousin.

→ {url_recrut}'),

('MPCO2_carnet_commandes', 'M_patronne_couture', 2, 72,
'Madame, vos commandes mariage volent à 5-10 par mois. Une cliente qui refuse à cause d''un retard livraison = perdue à vie.

WOLO Carnet : tableau commandes + dates promises + alerte automatique 48h avant. Inclus dans Pro 2 500 F/mois.

→ {url_dashboard}'),

('MPCO3_pro_salon', 'M_patronne_couture', 3, 168,
'Madame, le Plan Pro Salon 5 000 F/mois c''est :

✓ 5 employées dans ton dashboard
✓ Paie auto avec bulletins
✓ 1 boost annonce gratuit/mois
✓ Apparition prioritaire "Couture {ville}"

14 jours essai gratuits.

→ {url_pro}'),

('MPCO4_reines_mariage', 'M_patronne_couture', 4, 336,
'Madame, les Reines Couture WOLO sont devenues les références mariage à {ville}.

Ta meilleure apprentie en photo Mur des Reines = ton atelier mentionné direct dans la galerie. Pub gratuite massive.

Pousse {nom_apprentie} à poster.

→ {url_awards}'),

('MPCO5_diaspora_couture', 'M_patronne_couture', 5, 504,
'Madame, 35% des recherches couture WOLO viennent de la diaspora (mariage parents au pays, enterrement, fête).

Ton atelier dispo livraison express = niche premium. Active "Diaspora Ready" dans ton profil = 0 F en plus.

Une robe diaspora = 60 000 F. Une seule paye 1 an de Pro Salon.

→ {url_dashboard}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_indep_coiffure (5 messages, 14 jours)
-- Cible : Esther, coiffeuse à domicile, sans atelier fixe
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MIC1_rayon_clientes', 'M_indep_coiffure', 1, 0,
'Bienvenue {prenom} 👋

Sans atelier fixe, tu dépends du bouche-à-oreille. C''est aléatoire. C''est fragile.

WOLO te donne {nb_clientes_proches} clientes potentielles à <3km de chez toi. Stable. Net. Géolocalisé.

→ {url_dashboard}'),

('MIC2_safety_first', 'M_indep_coiffure', 2, 48,
'{prenom}, à domicile = vrai risque sécurité.

WOLO Safety : avant chaque RDV, tu partages ta live location avec 1 contact + WOLO. Bouton SOS rouge pendant le RDV. Code RDV vérifié.

Active une fois, c''est en place. Gratuit. Important.

→ {url_dashboard}'),

('MIC3_gps_critique', 'M_indep_coiffure', 3, 120,
'{prenom}, action critique : active ton GPS dans ton profil.

Les clientes filtrent par "à <2km". Sans GPS, tu disparais des résultats — peu importe ton talent.

30 secondes max. Tu actives, tu apparais.

→ {url_dashboard}'),

('MIC4_mur_reines_indep', 'M_indep_coiffure', 4, 216,
'👑 {prenom}, tu fais des coiffures hors salon = tu as des décors variés (chez la cliente, lumière naturelle, événement).

Le Mur des Reines récompense l''originalité. Tes photos sortent du lot vs photo de salon banal. 100 000 FCFA si tu gagnes.

→ {url_awards}'),

('MIC5_pro_priorite', 'M_indep_coiffure', 5, 312,
'{prenom}, après 14 jours : {x} vues, {y} contacts.

Pro à 2 500 F/mois = priorité dans "Coiffeuses dispo maintenant {quartier}". Pour une indépendante, c''est 60% des recherches mobiles. ROI = 1 prestation supplémentaire/mois.

→ {url_pro}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_indep_couture (5 messages, 14 jours)
-- Cible : Affoua, couturière indépendante machine chez elle
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MICO1_enseigne_digitale', 'M_indep_couture', 1, 0,
'Bienvenue {prenom} 👋

Couturière à domicile = invisible sans plateforme. Le bouche-à-oreille s''épuise.

WOLO te donne ton enseigne digitale à {ville}. Sans loyer atelier. Sans devanture. Juste tes photos + ton talent.

→ {url_dashboard}'),

('MICO2_photo_portee', 'M_indep_couture', 2, 48,
'{prenom}, photo robe sur cintre = -70% contacts vs photo robe portée.

Demande à ta cliente livrée hier — elle pose 30 secondes, tu shoot. Lumière naturelle, fond simple. C''est tout.

→ {url_dashboard}'),

('MICO3_delai_trust', 'M_indep_couture', 3, 120,
'{prenom}, dans ton profil, mets ton délai standard pour chaque type :

✓ Robe pagne : ex 5 jours
✓ Costume : ex 7 jours
✓ Retouche : ex 24h

Les clientes filtrent par délai. Sans = elles passent à la suivante. C''est ton premier signal de confiance.

→ {url_dashboard}'),

('MICO4_mur_reines_couture', 'M_indep_couture', 4, 216,
'👑 {prenom}, couturière indépendante = liberté de styles.

Le Mur des Reines récompense l''originalité, pas le prêt-à-porter. 100 000 FCFA pour la Reine Couture. Ta dernière création + ton tag.

→ {url_awards}'),

('MICO5_pro_diaspora', 'M_indep_couture', 5, 312,
'{prenom}, 35% des recherches couture WOLO viennent de la diaspora (mariage parents au pays).

Pro 2 500 F/mois = badge "Diaspora Ready" + priorité messages diaspora. ROI = 1 robe diaspora (60 000 F) paye 24 mois de Pro.

→ {url_pro}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SEED — Séquence M_client_recherche (4 messages, 7 jours)
-- Cible : Kodjo, client final, recherche infructueuse / pas de contact
-- Trigger : event recherche sans clic prestataire OU recherche sans contact 24h
-- ================================================================
INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

('MCR1_top3_metier', 'M_client_recherche', 1, 0,
'Bonjour 👋

Vous avez cherché "{metier_recherche} {quartier}" sur WOLO Market. 14 prestataires correspondent.

Voici les 3 mieux notées :

1. {nom_top1} — {note1}★ ({nb_avis1} avis)
2. {nom_top2} — {note2}★ ({nb_avis2} avis)
3. {nom_top3} — {note3}★ ({nb_avis3} avis)

→ {url_recherche}'),

('MCR2_garantie_24h', 'M_client_recherche', 2, 48,
'Toujours pas trouvé votre {metier_recherche} ?

Service "Trouver pour vous" WOLO : 500 F. On vous propose 3 pros vérifiées et disponibles sous 24h.

Caution intégralement remboursée si aucune ne répond dans les délais.

→ {url_recherche}'),

('MCR3_avis_vrais', 'M_client_recherche', 3, 96,
'Sur WOLO Market, chaque pro a des avis publics — pas du copier-collé Facebook ni du faux 5 étoiles.

{nom_top_pro_quartier} a {nb_avis} avis vrais, {note_moyenne}★ moyenne. Voir son profil + ses photos :

→ {url_recherche}'),

('MCR4_sans_piston', 'M_client_recherche', 4, 168,
'Sur WOLO Market : 0 piston, 0 cousin du cousin.

Juste les meilleures de {quartier} classées par avis vrais et qualité du travail. Si vous avez besoin demain, vous savez où chercher.

Sans piston. Le travail parle.

→ {url_recherche}')

ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- VÉRIFICATION POST-MIGRATION
-- Compter les templates par séquence métier
-- ================================================================
DO $$
DECLARE
  total_count int;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM wolo_whatsapp_templates
  WHERE sequence IN (
    'M_apprentie_coiffure','M_apprentie_couture',
    'M_patronne_coiffure','M_patronne_couture',
    'M_indep_coiffure','M_indep_couture',
    'M_client_recherche'
  );

  RAISE NOTICE 'Templates métier insérés : % (attendu : 38)', total_count;
END $$;

-- ================================================================
-- ROLLBACK (si besoin) — décommenter pour annuler
-- ================================================================
-- DELETE FROM wolo_whatsapp_templates WHERE sequence IN (
--   'M_apprentie_coiffure','M_apprentie_couture',
--   'M_patronne_coiffure','M_patronne_couture',
--   'M_indep_coiffure','M_indep_couture',
--   'M_client_recherche'
-- );
