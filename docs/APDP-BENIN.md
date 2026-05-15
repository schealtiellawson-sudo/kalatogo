# DÉCLARATION DE TRAITEMENT DE DONNÉES À CARACTÈRE PERSONNEL — APDP BÉNIN

**Plateforme** : WOLO Market
**Responsable de traitement** : Schealtiel Kpomblawoun
**Date estimée de soumission** : mai 2026 (avant lancement public le 8 juin 2026)
**Version du dossier** : 1.0
**Cadre légal** : Loi N°2017-20 du 20 avril 2018 portant Code du Numérique en République du Bénin (Livre V — Protection des données à caractère personnel, articles 391 et suivants)
**Autorité** : Autorité de Protection des Données Personnelles (APDP Bénin) — https://apdp.bj/ — Service en ligne : https://service.apdp.bj/
**Adresse postale APDP Bénin** : Cotonou, Bénin (à confirmer sur le portail officiel)

> Note méthodologique : le portail APDP Bénin propose un service de déclaration en ligne (https://service.apdp.bj/declaration-prealable/) qui structure le dossier selon le Code du Numérique. Le présent document reprend la trame imposée par les articles 391 à 470 du Code et doit être copié-collé dans le formulaire en ligne après création de compte sur https://service.apdp.bj/. À valider avec un avocat béninois avant soumission.

---

## SECTION 1 — IDENTIFICATION DU RESPONSABLE DE TRAITEMENT (RT)

| Champ | Valeur |
|---|---|
| Nom légal du RT | Schealtiel Kpomblawoun (personne physique, fondateur — entité juridique en cours de constitution) |
| Forme juridique | [À COMPLÉTER : entreprise individuelle / SARL / SAS — préciser RCCM ou IFU] |
| Numéro RCCM Bénin / IFU | [À COMPLÉTER] |
| Adresse du siège ou point de contact local | [À COMPLÉTER : adresse à Cotonou, ou désignation d'un représentant local au Bénin si siège au Togo — exigence article 393 Code du Numérique] |
| Téléphone | [À COMPLÉTER] |
| Email officiel | contact@wolomarket.com |
| Site internet | https://wolomarket.com |
| Représentant légal | Schealtiel Kpomblawoun, fondateur |
| Pièce d'identité | [À COMPLÉTER : CNI ou passeport — joindre copie certifiée] |

> **Spécificité Bénin** : l'article 393 du Code du Numérique exige la désignation d'un **représentant local au Bénin** si le RT est établi à l'étranger. Le fondateur ayant son siège prévu au Togo, il convient soit de constituer une filiale béninoise, soit de désigner un mandataire béninois (avocat, cabinet) — à arbitrer avant soumission.

---

## SECTION 2 — DESCRIPTION DE LA FINALITÉ DU TRAITEMENT

### 2.1 Finalité principale

WOLO Market est une marketplace numérique dont la mission est de rendre visible l'économie informelle en Afrique de l'Ouest, en commençant par le Togo (Lomé) et le Bénin (Cotonou). La plateforme met en relation prestataires informels/formels, clients, recruteurs et candidats.

### 2.2 Finalités opérationnelles déclarées

1. Création et gestion des comptes utilisateurs.
2. Mise en relation géolocalisée prestataires/clients.
3. Publication, diffusion et candidature à des offres d'emploi.
4. Messagerie interne entre utilisateurs.
5. Gestion des avis et de la réputation.
6. Notifications transactionnelles.
7. Lutte contre la fraude et modération.
8. Concours communautaires (Bourse des Mains d'Or, King & Queen).
9. Statistiques agrégées et anonymisées.
10. Matching candidat/offre par IA avec anonymisation préalable des données personnelles.

### 2.3 Régime applicable au Bénin

Conformément aux articles 408 et suivants du Code du Numérique, le traitement relève du **régime de la déclaration préalable** (et non de l'autorisation préalable), sous réserve d'arbitrage par l'APDP. Les sous-régimes applicables :

- **Déclaration ordinaire** : profils publics, mise en relation, messagerie.
- **Déclaration spécifique** : géolocalisation (article 410), traitements automatisés à finalité de profilage / scoring IA (article 421).

Aucun traitement ne relève du régime de l'autorisation préalable au sens de l'article 411 (pas de données sensibles au sens de l'article 396).

---

## SECTION 3 — CATÉGORIES DE DONNÉES COLLECTÉES ET BASES LÉGALES (ART. 394)

| # | Catégorie | Données concrètes | Base légale (art. 394 Code du Numérique) |
|---|---|---|---|
| 1 | Identité | Nom, prénom, email, mot de passe (haché), date de naissance, genre, photo de profil | Exécution du contrat + Consentement (photo) |
| 2 | Localisation | Ville, quartier, GPS Lat/Lon, rayon de mobilité | Consentement explicite (opt-in) |
| 3 | Contact | WhatsApp (obligatoire), TikTok, Instagram (optionnels) | Exécution du contrat |
| 4 | Données pro | Métier, statut artisan, services, tarifs, photos, vidéos, CV | Exécution du contrat |
| 5 | Activité | Avis, RDV, candidatures, messages | Exécution du contrat + Intérêt légitime (modération) |
| 6 | Données techniques | IP, user-agent, session ID, endpoint VAPID push | Intérêt légitime (sécurité) |
| 7 | Référence paiement Pro | ID transaction FedaPay (pas de PAN/CVV) | Exécution du contrat |

**Aucune donnée sensible** au sens de l'article 396 du Code du Numérique (santé, religion, opinions politiques, vie sexuelle, données biométriques d'identification, infractions).

---

## SECTION 4 — CATÉGORIES DE PERSONNES CONCERNÉES

1. Prestataires inscrits (artisans, indépendants, TPE/PME béninois et togolais).
2. Recruteurs / employeurs.
3. Candidats.
4. Visiteurs / clients consultant les profils publics.
5. Employés ajoutés post-embauche par un employeur (V1.1+).

Volume estimé Bénin à 12 mois post-lancement : 4 000 à 12 000 comptes.

---

## SECTION 5 — DESTINATAIRES DES DONNÉES (SOUS-TRAITANTS)

| Sous-traitant | Pays | Rôle | Engagement |
|---|---|---|---|
| Supabase Inc. | États-Unis | Auth + DB PostgreSQL | DPA, TLS, RLS |
| Airtable Inc. | États-Unis | DB opérationnelle (en migration) | DPA |
| Vercel Inc. | États-Unis (edge Frankfurt) | Hébergement frontend | DPA |
| ImgBB | États-Unis | Hébergement images | CGU |
| Resend | États-Unis | Emails transactionnels | DPA |
| Google (Gemini Flash) | États-Unis | Scoring IA (anonymisé) | API terms |
| Groq | États-Unis | Scoring IA backup (anonymisé) | API terms |
| Cerebras | États-Unis | Analyse IA (anonymisée) | API terms |
| Mistral AI | France (UE) | Backup IA (anonymisée) | RGPD natif |
| FedaPay | Bénin | Encaissement abonnement Pro | Convention prestataire |

Aucune revente de données. Aucune publicité comportementale.

---

## SECTION 6 — TRANSFERTS HORS BÉNIN (ART. 433 À 437 CODE DU NUMÉRIQUE)

Oui — la majorité des sous-traitants sont aux États-Unis et un en France. Conformément à l'article 433, les transferts hors Bénin vers un pays n'assurant pas un niveau de protection adéquat sont fondés sur :

- les **clauses contractuelles types** signées avec chaque fournisseur (DPA équivalent SCC européens) ;
- les engagements de confidentialité, chiffrement TLS 1.2+ en transit, AES-256 au repos ;
- l'**anonymisation préalable** des PII avant envoi vers les fournisseurs IA ;
- la finalité strictement nécessaire à l'exécution du service ;
- la demande d'autorisation spécifique à l'APDP Bénin (article 435) si requise — à confirmer lors de l'instruction du dossier.

L'APDP Bénin sera informée de tout changement substantiel.

---

## SECTION 7 — DURÉE DE CONSERVATION (ART. 397 CODE DU NUMÉRIQUE)

| Donnée | Durée active | Archivage | Justification |
|---|---|---|---|
| Compte utilisateur actif | Durée du contrat | — | Exécution contractuelle |
| Compte supprimé sur demande | Suppression immédiate des données identifiantes | 3 ans (anonymisées) | Article 397 et obligations légales |
| Logs techniques (IP, user-agent) | 12 mois glissants | — | Sécurité (article 410) |
| Backups Supabase | 30 jours rolling | — | Continuité d'activité |
| Messages internes | Durée de la relation | 1 an post-suppression | Preuve en cas de litige |
| Candidatures | 12 mois après clôture offre | — | Contestation possible |
| Données de facturation | 10 ans | — | Obligation comptable et fiscale |

---

## SECTION 8 — MESURES DE SÉCURITÉ (ART. 401 À 407 CODE DU NUMÉRIQUE)

> **Spécificité Bénin** : les articles 401 à 407 du Code du Numérique imposent au RT des obligations renforcées en matière de cybersécurité, allant au-delà du minimum RGPD. La présente section détaille les mesures conformes.

### 8.1 Sécurité technique (art. 401)

- TLS 1.2+ obligatoire (HTTPS forcé via Vercel).
- Chiffrement AES-256 au repos (Supabase, Airtable).
- Mots de passe hachés bcrypt (Supabase Auth natif).
- JWT court + refresh token.
- Row Level Security (RLS) PostgreSQL.
- Content Security Policy stricte.
- Échappement HTML systématique des inputs (`escapeHtml`).
- Rate limiting sur endpoints sensibles.
- Protection CSRF.
- VAPID pour push notifications, clés privées en variables d'environnement Vercel.
- Audit logs Supabase + Vercel.

### 8.2 Sécurité organisationnelle (art. 402)

- Accès aux consoles d'administration limité au RT, MFA activé sur Supabase, Vercel, GitHub.
- Secrets en variables d'environnement (jamais en clair).
- Pas de partage de credentials par messagerie.

### 8.3 Notification de violation (art. 405)

En cas de violation susceptible d'engendrer un risque pour les personnes, notification à l'APDP Bénin sous **72 heures** et information des personnes concernées si le risque est élevé.

### 8.4 Sécurité IA

- Anonymisation des PII avant transmission aux providers IA.
- Mapping nom ↔ placeholder en base locale chiffrée.
- Cache 7 jours sur scoring candidat.
- Quotas stricts (10 req/jour gratuit, 50 req/jour Pro).

### 8.5 Audit de sécurité

Engagement à réaliser un audit de sécurité annuel et à mettre en œuvre les recommandations dans les 6 mois.

---

## SECTION 9 — DROITS DES PERSONNES CONCERNÉES (ART. 414 À 432)

| Droit | Article | Modalité d'exercice | Délai |
|---|---|---|---|
| Information | 414 | CGU + Politique de confidentialité publiées | À l'inscription |
| Accès | 416 | Email à contact@wolomarket.com avec ID | 30 jours |
| Rectification | 419 | Tableau de bord OU email | Immédiat / 30 jours |
| Effacement | 420 | Bouton "Supprimer mon compte" OU email | Immédiat / 30 jours |
| Opposition | 422 | Email | 30 jours |
| Portabilité | 424 | Email — export JSON | 30 jours |
| Retrait du consentement | 415 | Désactivation des opt-ins dans le tableau de bord | Immédiat |
| Plainte | 426 | Saisine APDP Bénin | — |

**Procédure interne** : tout email reçu à contact@wolomarket.com est traité sous 7 jours ouvrés en première réponse, et clos dans les 30 jours conformément à l'article 432.

---

## SECTION 10 — DÉLÉGUÉ À LA PROTECTION DES DONNÉES (DPO) (ART. 446 À 452)

Pour le MVP, les fonctions de DPO sont assumées par le RT lui-même conformément à l'article 447 (désignation interne possible si volume de traitement modéré) :

- **Nom** : Schealtiel Kpomblawoun
- **Email DPO** : dpo@wolomarket.com
- **Téléphone** : [À COMPLÉTER]

Un DPO externe certifié sera désigné dès franchissement des seuils de l'article 446 (recommandation : 50 000 utilisateurs actifs).

---

## SECTION 11 — MESURES SPÉCIFIQUES

### 11.1 Mineurs (art. 398)

Âge minimum d'inscription **16 ans révolus**. Vérification déclarative via la date de naissance. Suspension automatique de tout compte signalé comme mineur de moins de 16 ans. Pour les 16-18 ans, consentement parental sollicité dans les CGU.

### 11.2 Photos et vidéos

Upload de photos soumis à **consentement explicite** lors de l'inscription. Suppression possible à tout moment depuis le tableau de bord. Aucune reconnaissance faciale.

### 11.3 Géolocalisation (art. 410)

**Opt-in explicite**. Saisie manuelle quartier+ville possible (sans GPS). Rayon de mobilité paramétrable.

### 11.4 Notifications push

**Opt-in explicite** via permission native du navigateur (VAPID). Révocation à tout moment.

### 11.5 Concours Bourse des Mains d'Or / King & Queen

Photos rendues publiques avec consentement séparé. Retrait possible à tout moment.

### 11.6 IA et décisions automatisées (art. 421)

Le scoring IA est un outil d'aide à la décision, **jamais une décision automatisée** au sens de l'article 421. Le recruteur conserve la décision finale. Le candidat peut demander la justification du score.

### 11.7 Représentation locale (art. 393)

Pour le Bénin, désignation d'un mandataire local (avocat ou filiale) à finaliser avant soumission. Coordonnées :
[À COMPLÉTER avant soumission]

---

## SECTION 12 — ANNEXES À JOINDRE

1. Politique de confidentialité publiée (https://wolomarket.com/confidentialite).
2. CGU publiées (https://wolomarket.com/cgu).
3. Schéma fonctionnel et flux de données.
4. Liste des sous-traitants avec DPA.
5. CNI / passeport du RT (copie certifiée).
6. RCCM Bénin ou IFU (ou justificatif d'enregistrement Togo + désignation représentant local).
7. Mandat / procuration si dépôt par tiers.
8. Justificatif de paiement des frais APDP (à confirmer sur https://service.apdp.bj/).

---

## ANNEXE — CHECKLIST D'ACTIONS À FINALISER AVANT SOUMISSION

- [ ] Constituer ou désigner un représentant légal au Bénin (filiale ou mandataire local — exigence art. 393).
- [ ] Obtenir RCCM Bénin ou justificatif d'enregistrement Togo + mandat béninois.
- [ ] Compléter l'adresse de contact à Cotonou.
- [ ] Publier la Politique de confidentialité sur https://wolomarket.com/confidentialite.
- [ ] Publier les CGU sur https://wolomarket.com/cgu.
- [ ] Activer contact@wolomarket.com et dpo@wolomarket.com.
- [ ] Vérifier que "Supprimer mon compte" est opérationnel.
- [ ] Vérifier que "Exporter mes données" est opérationnel.
- [ ] Préparer copie certifiée CNI / passeport du fondateur.
- [ ] Créer compte sur https://service.apdp.bj/ et recopier le présent dossier dans le formulaire.
- [ ] Confirmer auprès de l'APDP Bénin le montant des frais.
- [ ] Faire relire par un avocat béninois.

---

*Fin du dossier APDP Bénin — Version 1.0 — WOLO Market*
