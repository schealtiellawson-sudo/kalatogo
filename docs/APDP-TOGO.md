# DÉCLARATION DE TRAITEMENT DE DONNÉES À CARACTÈRE PERSONNEL — APDP TOGO

**Plateforme** : WOZALI
**Responsable de traitement** : Schealtiel Kpomblawoun
**Date estimée de soumission** : mai 2026 (avant lancement public le début juillet 2026)
**Version du dossier** : 1.0
**Cadre légal** : Loi N°2019-014 du 29 octobre 2019 relative à la protection des données à caractère personnel (Togo)
**Autorité** : Autorité de Protection des Données Personnelles (APDP Togo) — https://apdp.gouv.tg/

> Note méthodologique : Le portail APDP Togo n'expose pas de formulaire structuré accessible publiquement à la date de rédaction. Le présent dossier suit l'architecture imposée par la Loi N°2019-014 (articles 47 à 60) et reprend la trame standard CEDEAO/UEMOA. À valider/adapter avec un avocat local ou directement à l'APDP avant soumission.

---

## SECTION 1 — IDENTIFICATION DU RESPONSABLE DE TRAITEMENT (RT)

| Champ | Valeur |
|---|---|
| Nom légal du RT | Schealtiel Kpomblawoun (personne physique, fondateur — entité juridique en cours de constitution) |
| Forme juridique | [À COMPLÉTER : entreprise individuelle / SARL / SAS — préciser RCCM ou patente] |
| Numéro RCCM / patente | [À COMPLÉTER] |
| Adresse du siège | [À COMPLÉTER : adresse complète, Lomé, Togo] |
| Téléphone | [À COMPLÉTER] |
| Email officiel | contact@wozali.com |
| Site internet | https://wozali.com |
| Représentant légal | Schealtiel Kpomblawoun, fondateur |
| Pièce d'identité | [À COMPLÉTER : CNI ou passeport — joindre copie certifiée] |

---

## SECTION 2 — DESCRIPTION DE LA FINALITÉ DU TRAITEMENT

### 2.1 Finalité principale

WOZALI est une marketplace numérique dont la mission est de rendre visible l'économie informelle en Afrique de l'Ouest, en commençant par le Togo (Lomé) et le Bénin (Cotonou). La plateforme met en relation :

- des **prestataires de services** (artisans, indépendants, micro-entrepreneurs informels et formels) qui publient un profil professionnel ;
- des **clients** qui recherchent un prestataire à proximité ;
- des **recruteurs** qui publient des offres d'emploi ;
- des **candidats** qui postulent à ces offres.

### 2.2 Finalités opérationnelles déclarées

1. Création et gestion des comptes utilisateurs (authentification, profil public).
2. Mise en relation géolocalisée entre prestataires et clients.
3. Publication, diffusion et candidature à des offres d'emploi.
4. Messagerie interne entre utilisateurs.
5. Gestion des avis et de la réputation.
6. Notifications transactionnelles (push web, email).
7. Lutte contre la fraude et modération de la plateforme.
8. Concours communautaires (Bourse des Mains d'Or, King & Queen).
9. Statistiques d'usage agrégées et anonymisées.
10. Amélioration des services et matching candidat/offre par intelligence artificielle (avec anonymisation des données personnelles avant transmission aux fournisseurs IA).

---

## SECTION 3 — CATÉGORIES DE DONNÉES COLLECTÉES ET BASES LÉGALES

| # | Catégorie | Données concrètes | Base légale (art. 6 Loi 2019-014) |
|---|---|---|---|
| 1 | Identité | Nom, prénom, email, mot de passe (haché), date de naissance, genre, photo de profil | Exécution du contrat (CGU) + Consentement (photo) |
| 2 | Localisation | Ville, quartier, coordonnées GPS (Lat/Lon), rayon de mobilité | Consentement explicite (opt-in) |
| 3 | Contact | Numéro WhatsApp (obligatoire), TikTok, Instagram (optionnels) | Exécution du contrat |
| 4 | Données professionnelles | Métier, statut artisan, description des services, tarifs, photos de réalisations, vidéos, CV | Exécution du contrat |
| 5 | Activité plateforme | Avis donnés/reçus, RDV pris, candidatures envoyées/reçues, messages échangés | Exécution du contrat + Intérêt légitime (modération) |
| 6 | Données techniques | Adresse IP, user-agent, identifiant de session, endpoint VAPID push | Intérêt légitime (sécurité, anti-abus) |
| 7 | Données de paiement (abonnement Pro) | Référence transaction FedaPay (pas de PAN ni CVV stockés) | Exécution du contrat |

**Aucune donnée sensible** au sens de l'article 8 de la Loi 2019-014 n'est collectée (pas de données de santé, religion, opinions politiques, vie sexuelle, données biométriques d'identification, infractions).

---

## SECTION 4 — CATÉGORIES DE PERSONNES CONCERNÉES

1. **Prestataires inscrits** (artisans, indépendants, TPE/PME) — public principal.
2. **Recruteurs / employeurs** publiant des offres d'emploi.
3. **Candidats** postulant à des offres.
4. **Visiteurs / clients** consultant les profils publics (collecte minimale : IP, user-agent).
5. **Employés** ajoutés à un espace équipe par un employeur (post-embauche, V1.1+).

Volume estimé à 12 mois post-lancement : 10 000 à 30 000 comptes Togo/Bénin cumulés.

---

## SECTION 5 — DESTINATAIRES DES DONNÉES (SOUS-TRAITANTS)

| Sous-traitant | Pays d'hébergement | Rôle | Engagement contractuel |
|---|---|---|---|
| Supabase Inc. | États-Unis (AWS us-east-1) | Authentification, base de données PostgreSQL, stockage | DPA signé, chiffrement TLS, RLS |
| Airtable Inc. | États-Unis | Base de données opérationnelle (en migration vers Supabase) | DPA standard, accès restreint |
| Vercel Inc. | États-Unis (edge Frankfurt + IAD) | Hébergement frontend, CDN | DPA standard, TLS 1.3 |
| ImgBB | États-Unis | Hébergement images (photos de profil, réalisations) | CGU publiques |
| Resend | États-Unis | Envoi d'emails transactionnels | DPA standard |
| Google (Gemini Flash) | États-Unis | Scoring IA candidat (anonymisé) | Conditions API Google Cloud |
| Groq Inc. | États-Unis | Scoring IA backup (anonymisé) | Conditions API |
| Cerebras | États-Unis | Analyse IA longue (anonymisée) | Conditions API |
| Mistral AI | France (UE) | Backup IA (anonymisée) | RGPD-compliant natif |
| FedaPay | Bénin / Togo | Encaissement abonnement Pro | Convention prestataire de paiement |

Aucune donnée personnelle n'est revendue à des tiers. Aucune publicité comportementale n'est diffusée.

---

## SECTION 6 — TRANSFERTS HORS TOGO

Oui — la majorité des sous-traitants techniques sont situés aux États-Unis (Supabase, Vercel, Airtable, ImgBB, Resend, Google, Groq, Cerebras) et un en France (Mistral). Les transferts sont fondés sur :

- les **clauses contractuelles types** de chaque fournisseur (DPA équivalent aux SCC de la Commission européenne) ;
- les engagements de confidentialité, de chiffrement en transit (TLS 1.2+) et au repos (AES-256) ;
- l'**anonymisation préalable** des PII avant tout envoi vers les fournisseurs IA (substitution nom/téléphone/email par des placeholders, mapping conservé en base locale) ;
- la finalité strictement nécessaire à l'exécution du service.

L'APDP Togo sera informée en cas de changement substantiel de pays d'hébergement ou d'évolution réglementaire (équivalent Schrems II togolais).

---

## SECTION 7 — DURÉE DE CONSERVATION

| Donnée | Durée active | Durée d'archivage | Justification |
|---|---|---|---|
| Compte utilisateur actif | Tant que le compte est actif | — | Exécution du contrat |
| Compte supprimé sur demande | Suppression immédiate des données identifiantes | 3 ans (anonymisées, finalité statistique et obligations légales) | Article 32 Loi 2019-014, prescriptions civiles |
| Logs techniques (IP, user-agent) | 12 mois glissants | — | Sécurité, lutte contre la fraude |
| Backups Supabase | 30 jours rolling | — | Continuité d'activité |
| Messages internes | Durée de la relation contractuelle | 1 an post-suppression | Preuve en cas de litige |
| Candidatures | 12 mois après clôture de l'offre | — | Contestation possible |
| Données de facturation Pro | 10 ans | — | Obligation comptable et fiscale |

---

## SECTION 8 — MESURES DE SÉCURITÉ (ART. 47 LOI 2019-014)

### 8.1 Sécurité technique

- Chiffrement TLS 1.2+ obligatoire sur toutes les communications (HTTPS forcé via Vercel).
- Chiffrement au repos AES-256 sur Supabase et Airtable.
- Mots de passe hachés via bcrypt (algorithme natif Supabase Auth).
- Authentification via JWT à courte durée + refresh token.
- Row Level Security (RLS) PostgreSQL sur toutes les tables Supabase : un utilisateur ne peut lire/modifier que ses propres données.
- Content Security Policy (CSP) stricte côté frontend.
- Échappement HTML systématique des inputs utilisateur (fonction `escapeHtml`).
- Rate limiting sur les endpoints sensibles (proxy Airtable, auth).
- Protection CSRF sur les actions mutantes.
- VAPID pour notifications push (clés privées en variable d'environnement Vercel).
- Audit des accès via logs Supabase et Vercel.

### 8.2 Sécurité organisationnelle

- Accès aux consoles d'administration limité au fondateur (MFA activé sur Supabase, Vercel, GitHub).
- Secrets stockés en variables d'environnement Vercel (jamais en clair dans le code).
- Pas de partage de credentials par email ou messagerie.
- Procédure de notification de violation de données : sous 72 heures à l'APDP Togo en cas de violation susceptible d'engendrer un risque pour les personnes (article 49 Loi 2019-014).

### 8.3 Sécurité IA

- Anonymisation des PII avant transmission aux providers IA.
- Mapping nom ↔ placeholder conservé en base locale chiffrée.
- Cache 7 jours sur scoring candidat pour limiter les requêtes.
- Quota strict par utilisateur (10 req/jour gratuit, 50 req/jour Pro).

---

## SECTION 9 — DROITS DES PERSONNES CONCERNÉES

Conformément aux articles 33 à 46 de la Loi N°2019-014, les personnes concernées disposent des droits suivants :

| Droit | Modalité d'exercice | Délai de réponse |
|---|---|---|
| Droit d'accès (art. 36) | Email à contact@wozali.com avec copie d'identité | 30 jours |
| Droit de rectification (art. 38) | Directement dans le tableau de bord OU email | Immédiat / 30 jours |
| Droit à l'effacement (art. 39) | Bouton "Supprimer mon compte" dans le tableau de bord OU email | Immédiat / 30 jours |
| Droit d'opposition (art. 40) | Email | 30 jours |
| Droit à la portabilité (art. 41) | Email — export JSON des données | 30 jours |
| Droit de retrait du consentement | Désactivation des opt-ins dans le tableau de bord | Immédiat |
| Droit de plainte | Saisine directe de l'APDP Togo | — |

**Procédure interne** : tout email reçu à contact@wozali.com est traité sous 7 jours ouvrés en première réponse, et clos dans les 30 jours conformément à la loi.

---

## SECTION 10 — DÉLÉGUÉ À LA PROTECTION DES DONNÉES (DPO)

Pour le MVP et jusqu'au seuil de désignation obligatoire (art. 23 Loi 2019-014 — à confirmer auprès de l'APDP), les fonctions de DPO sont assumées par le RT lui-même :

- **Nom** : Schealtiel Kpomblawoun
- **Email DPO** : dpo@wozali.com (alias dédié)
- **Téléphone** : [À COMPLÉTER]

Un DPO externe certifié sera désigné dès franchissement des seuils légaux ou contractuels (recommandation : avant 50 000 utilisateurs actifs).

---

## SECTION 11 — MESURES SPÉCIFIQUES

### 11.1 Mineurs

Âge minimum d'inscription fixé à **16 ans révolus**. Vérification déclarative via la date de naissance lors de l'inscription. Tout compte signalé comme appartenant à un mineur de moins de 16 ans est suspendu et supprimé après vérification. Pour les 16-18 ans, un consentement parental est sollicité dans les CGU (case à cocher).

### 11.2 Photos et vidéos

L'upload de photos (profil, réalisations, concours Bourse des Mains d'Or) est soumis à un **consentement explicite** lors de l'inscription. Chaque utilisateur peut supprimer chacune de ses photos à tout moment depuis son tableau de bord. Aucun outil de reconnaissance faciale n'est utilisé.

### 11.3 Géolocalisation

La géolocalisation GPS est **opt-in explicite**. L'utilisateur peut :
- saisir manuellement quartier + ville (pas de GPS) ;
- ou autoriser le navigateur à transmettre les coordonnées exactes.

Le rayon de mobilité affiché publiquement est paramétrable (1 km à 50 km).

### 11.4 Notifications push

Les notifications push (VAPID) sont activées **uniquement après opt-in explicite** via la permission native du navigateur. L'utilisateur peut révoquer la permission à tout moment dans les paramètres du navigateur ou dans le tableau de bord WOZALI.

### 11.5 Concours Bourse des Mains d'Or / King & Queen

Les photos soumises aux concours mensuels sont rendues publiques sur la plateforme avec consentement explicite séparé. La participation peut être retirée à tout moment.

### 11.6 IA et décisions automatisées

Le scoring IA candidat-offre est un outil **d'aide à la décision**, jamais une décision automatisée au sens de l'article 42 de la Loi 2019-014. Le recruteur conserve la décision finale. Le candidat peut demander la justification du score.

---

## SECTION 12 — ANNEXES À JOINDRE AU DOSSIER

1. Politique de confidentialité publiée sur https://wozali.com/confidentialite (voir `POLITIQUE-CONFIDENTIALITE-DRAFT.md`).
2. CGU publiées sur https://wozali.com/cgu.
3. Schéma fonctionnel de la plateforme (annexe technique).
4. Schéma des flux de données et des sous-traitants.
5. Copie de la pièce d'identité du RT.
6. Justificatif d'enregistrement de l'activité (RCCM ou patente).
7. Mandat / procuration si dépôt par tiers.
8. Justificatif de paiement des frais de dépôt (si applicable — à confirmer auprès de l'APDP Togo).

---

## ANNEXE — CHECKLIST D'ACTIONS À FINALISER AVANT SOUMISSION

- [ ] Constituer l'entité juridique (entreprise individuelle / SARL) et obtenir le RCCM ou la patente Togo.
- [ ] Compléter l'adresse du siège social à Lomé.
- [ ] Publier la Politique de confidentialité sur https://wozali.com/confidentialite.
- [ ] Publier les CGU sur https://wozali.com/cgu.
- [ ] Activer l'email contact@wozali.com et dpo@wozali.com (Resend ou redirection Gmail).
- [ ] Vérifier que la fonctionnalité "Supprimer mon compte" est opérationnelle dans le tableau de bord.
- [ ] Vérifier que la fonctionnalité "Exporter mes données" est opérationnelle (JSON).
- [ ] Préparer une copie certifiée de la CNI / passeport du fondateur.
- [ ] Préparer le mandat si dépôt par avocat ou tiers.
- [ ] Confirmer auprès de l'APDP Togo le montant des frais de dépôt.
- [ ] Confirmer le mode de soumission (en ligne, courrier, dépôt physique).
- [ ] Faire relire le dossier par un juriste ou avocat local.

---

*Fin du dossier APDP Togo — Version 1.0 — WOZALI*
