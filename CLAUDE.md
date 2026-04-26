# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ✅ LIVRÉ — Migration Prestataires Airtable → Supabase (2026-04-26)

Bascule complète de la table `Prestataires` vers Supabase pour éliminer la dépendance au quota mensuel API Airtable (PUBLIC_API_BILLING_LIMIT_EXCEEDED).

### Migration SQL
`supabase/migrations/20260426_wolo_prestataires.sql` — table `wolo_prestataires` avec ~45 colonnes mappées d'Airtable, RLS (SELECT public, INSERT/UPDATE self), 10 indexes, vue `wolo_prestataires_airtable_compat`.

### Helper frontend
`/components/supa-prest.js` — `window.supaPrest.{findByEmail, findById, findByUserId, create, update, list}`. Renvoie des objets au format Airtable `{id, fields, createdTime}` pour minimiser le refactoring (~25 fonctions).

### Fonctions migrées (avec fallback Airtable défensif)
- **Lecture profil** : `loadCurrentPrestataire`, `showProfil`, `loadHomeVedette`, `fetchPrestataires`, `countPrestataires`
- **Écriture profil** : `submitInscription` (création 3 étapes), `saveProfile` (édition), `toggleDispo`, `saveDashLocation` (GPS), `_doUploadProfilCrop` (photo profil)
- **Notifications candidat** : `notifyCandidatStatut`, `notifyCandidatEntretien` (lecture+update Notifications JSON)
- **KYC** : `appliquerKycVerification` (badge "Recruteur vérifié")

### Gating Pro
Helper `window.isProUser(prestataire?)` — gère string / objet singleSelect / array. Sidebar "Je recrute" maintenant toujours visible (gating reste sur les actions individuelles).

### ⚠️ Pré-requis prod
1. Exécuter `supabase/migrations/20260426_wolo_prestataires.sql` sur la DB prod
2. Si tu veux migrer les data Airtable existantes : utiliser la vue `wolo_prestataires_airtable_compat` ou un script CSV import

### À faire en V1.1 si besoin
Migrer aussi `Offres d'Emploi`, `Candidatures`, `Avis`, `RDV` vers Supabase (toujours sur Airtable pour l'instant).

## ✅ LIVRÉ — Sprint H/I : IA + Messagerie + Entretiens + Signalement (2026-04-25)

Branchement frontend des 6 handlers backend qui existaient mais n'étaient pas routés ni utilisés. Les tables Supabase étaient déjà créées par la migration `20260424_messagerie_entretiens.sql`.

### Routage `/api/wolo-pay/[action].js` (6 nouvelles actions)
`thread-list`, `message-list`, `message-send`, `entretien-list`, `entretien-upsert`, `signalement-create` — toutes auth-only, branchées dans le router consolidé.

### Composants frontend ajoutés
- `/components/ai-helper.js` (existait, n'était pas chargé) — `window.woloAi.scoreCandidat`, `ameliorerCv`, `preparerEntretien`, `analyserAnnonce`
- `/components/messagerie.js` — `window.woloMessagerie.open({ candidature, role })`, polling 8s, templates recruteur (convocation/refus/demande_docs)
- `/components/entretien.js` — `window.woloEntretien.open({ candidature, onSaved })`, type présentiel/visio/téléphone, notif candidat via `Prestataires.Notifications` JSON
- `/components/signalement.js` — `window.woloSignalement.open({ targetUserId|offreId|candidatureId, contextLabel })`, motifs arnaque/ghosting/fake_offre/harcelement/autre

### Boutons branchés dans `index.html`
- **Cards candidatures recruteur** (grid + table, `renderRecrutCandidatures`) : 🤖 Score IA, 💬 Message, 📅 Entretien, 🚨 Signaler
- **Modale détail offre** (`showOffreDetail`) : "🚨 Signaler cette offre" en bas
- **Table mes candidatures** (`loadMesCandidatures`) : 💬 Message, 🤖 Préparer entretien (si Retenue), 🚨 Signaler
- **Formulaire publier offre** (`ds-recrut-publier`) : "🤖 Analyser mon annonce avec l'IA" au-dessus du CTA

### Helpers ajoutés (index.html, après `updateStatutCandidature`)
`scoreCandidatRecru`, `openMessagerieRecru`, `openEntretienRecru`, `signalerCandidat`, `_getOffreById`, `notifyCandidatEntretien`, `openMessagerieCandidat`, `preparerEntretienCandidat`, `signalerOffreCandidat`, `analyserAnnonceAvantPublication`.

### ⚠️ Pré-requis pour activation prod
1. **Migration appliquée** : exécuter `20260424_messagerie_entretiens.sql` sur la DB Supabase de prod si pas déjà fait.
2. **Clés API IA** (au moins une) : `GEMINI_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `MISTRAL_API_KEY` dans les env vars Vercel. Sinon l'IA renvoie 503.
3. **Champs Airtable optionnels** : pour la messagerie + entretiens, le record Candidatures peut contenir `Candidat User ID` et `Recruteur User ID` (UUIDs Supabase). Sans eux, le composant affiche un message d'erreur clair et propose le fallback WhatsApp. Recommandé : ajouter ces champs et les peupler à la création de candidature/offre.

## ✅ LIVRÉ — WOLO Business Suite (Phases A → G, commit 58ff6dc)

Flow continu Recrutement → Intégration → Équipe → Paie → Finances. **Plan** : `/docs/BUSINESS-SUITE-PLAN.md`, **schéma Airtable** : `/docs/AIRTABLE-SCHEMA-BUSINESS-SUITE.md`.

- **A** ✅ Plan + roadmap
- **B** ✅ Pipeline Kanban Talent
- **C** ✅ Équipe + invitation WhatsApp (`/invite.html?token=`)
- **D** ✅ Paie + bulletins PDF (`paie-pay` + `paie-bulletin`)
- **E** ✅ Mon emploi (vue employé : bulletins + annonces)
- **F** ✅ Annonces équipe (`annonces-broadcast`)
- **G** ✅ Finances (CA journalier + dépenses)

### Composants frontend (tous sous `/components/`)
`pipeline-kanban.js`, `equipe-dashboard.js`, `paie-dashboard.js`, `mon-emploi.js`, `annonces-patron.js`, `finances-dashboard.js`

### Endpoints consolidés dans `/api/wolo-pay/[action].js`
Contrainte Vercel Hobby = **12 functions max**. Implémentations sous `/api/wolo-pay/_impl/` (préfixe `_` = non-routable, ne compte pas). Actions ajoutées :
- `invitation-create` / `invitation-get` (public) / `invitation-accept` (public)
- `paie-pay` / `paie-bulletin` (public, retourne HTML print-ready)
- `annonces-broadcast`

⚠️ **NE PAS créer de nouveaux fichiers dans `/api/*/`** sans consolider dans le router — on est à 12/12.

### Tables Airtable créées (8)
`Employes`, `Invitations_Employes`, `Fiches_Paie`, `Paiements_Salaire`, `Annonces_Equipe`, `Conges`, `CA_Journalier`, `Depenses`

### Patterns établis
- IIFE + state closure + `window.loadXxx` pour chaque composant
- `const wFetch = window.woloFetch || fetch` pour auth-fallback
- Filtrage Airtable : `{Patron ID}='${patronId}'` via `filterByFormula`
- Polymorphie : un compte WOLO cumule patron + employé + solo + candidat

## ✅ LIVRÉ — Sprint 14 : Le Mur des Reines (Gamification Awards)

Refonte complète de WOLO Awards → "Le Mur des Reines". Toutes les femmes (pas que les pros) postent coiffure/couture, la communauté vote, 2 Reines du mois gagnent 50K FCFA chacune.

### Composant frontend
`/components/mur-des-reines.js` — IIFE, `window.loadMurDesReines`, tabs: feed | discover | podium | moi

### Endpoints ajoutés (consolidés dans le router existant)
- `feed-list` (public) / `feed-post` / `feed-like` / `feed-comment`
- `feed-discover` (public) — modes: swipe, duel, roulette
- `badges-list` (public) / `leaderboard` (public) / `duels-list` / `theme-mois` (public)
- `vote-share` / `boost-acheter`

### Tables Supabase créées (10)
`feed_photos`, `likes_photos`, `commentaires_photos`, `themes_mensuels`, `streaks_wolo`, `badges_wolo`, `duels_quartiers`, `duels_votes`, `partages_whatsapp`, `boosts_photos`

### Views Supabase
`hall_of_fame`, `leaderboard_quartier_7j`, `leaderboard_ville_mois`

### Fonctions Supabase
`maj_streak_user(uuid)`, `calc_niveau_user(uuid)`

### Migration
`/supabase/migrations/20260416_sprint14_mur_des_reines.sql`

### Gamification
- 16 types de badges (premiere_photo → legende)
- 5 niveaux (Apprentie → Légende)
- Streak système (×1/×2/×3 multiplicateur à 1/3/7 jours)
- Duels quartier/ville/catégorie (hebdomadaires)
- Boost photo payant (500 FCFA / 24h)
- Partage WhatsApp/TikTok avec tracking + badge virale_100
- Prompt partage viral tous les 5 votes de duel
- Thème du mois avec hashtag (#ReineDAvril etc.)

### Copywriting global mis à jour
- "WOLO Awards" → "Le Mur des Reines" partout dans index.html
- Storytelling : "Ta grand-mère t'a appris. Ta mère t'a appris. Maintenant, le monde regarde."
- Hashtags : #MurDesReines #ReineWOLO #TalentAfricain
- Email template : `emails/08-wolo-awards.html`
- Kit réseaux : `content/kit-reseaux-lancement.md` (10 scripts TikTok REINE01-10)

## ✅ LIVRÉ — King & Queen WOLO

Composant de duels communautaires. Hommes et femmes s'affrontent par catégorie (Coiffure, Couture, etc.). 500K FCFA/mois en jeu.

### Composant frontend
`/components/king-queen.js` — IIFE, `window.loadKingQueen`

### Viralité intégrée
- Boutons partage WhatsApp/TikTok/Copie après chaque batch de duels
- Bouton "Partager" pendant les duels actifs
- Prompt viral tous les 5 votes : "Tu kiffes ? Tes amis aussi vont kiffer."
- Fonctions : `kqShareWhatsApp()`, `kqShareTikTok()`, `kqCopyLink()`

## ✅ LIVRÉ — Refonte Parrainage / Affiliation

Section parrainage entièrement refondue en section vendeuse :
- Simulateur interactif (slider 1-500 filleuls) avec barre SMIG
- Tableau paliers étendu (3→500 filleuls, gains mensuels/annuels)
- 3 profils terrain (étudiant UCAO, mama Dantokpa, coiffeuse Bè)
- 3 profils influenceurs (5K, 50K, 500K+ followers)
- Fonction JS : `updateParrainSimulator(val)` (script inline après section)
- Comparaison au SMIG Togo/Bénin (52 500 FCFA)

⚠️ **TERMINOLOGIE** : JAMAIS "agent terrain" ou "agent" côté utilisateur. Uniquement "parrainage", "affiliation", "invite tes amis". La section admin `ds-agents-terrain` reste interne.

## ✅ LIVRÉ — Paie par virement bancaire

Conversion de WOLO Pay → virement bancaire dans Business Suite Paie :
- `paie-dashboard.js` : checkbox "Viré" au lieu de bouton payer, `marquerVirement()` remplace `payerEmploye()`
- `equipe-dashboard.js` : champ IBAN dans modal invitation + modal détail employé avec édition IBAN/salaire
- `paie-pay.js` : méthode = "Virement bancaire"
- Champ IBAN dans table Airtable `Employes`

## ✅ LIVRÉ — Nettoyage WOLO Pay

- 20 fichiers supprimés (17 `_impl/` + 3 libs mortes)
- CSS mort retiré (#page-paiement-client, WOLO Pay Hero)
- Fonctions JS mortes retirées (woloNotifTransfert, checkPaymentUrl)
- Sidebar dashboard : "Finances" → "Mon abonnement" + groupe "Récompenses" séparé
- Footers : "Devenir Agent" retiré, "À propos" → "Notre Histoire"

## ✅ LIVRÉ — Hotfixes post-déploiement

### Bug critique : `</script>` dans les template literals
Deux template literals JS (QR code `printQRCode()` et CV print `emploi-cv`) contenaient des balises `<script>` FedaPay SDK non échappées. Le navigateur les interprétait comme la fermeture du bloc `<script>` principal → tout le JS après était parsé comme du HTML → modal "Ajouter comme agent" apparaissait, template literals (`${r.nom}`) affichés en clair, site cassé.
- Fix : retrait des doublons FedaPay (le vrai SDK est en fin de fichier lignes 24760-24761)
- Failsafe overlay : le loader `#wolo-init-overlay` se retire après 5s même si `initAuth()` échoue

### `checkPaymentUrl()` manquante
Fonction supprimée avec le nettoyage WOLO Pay mais encore appelée dans le bloc d'init → erreur fatale JS. Retirée des appels `DOMContentLoaded`.

### Retry Airtable 429 (rate limit)
Airtable free tier = 5 req/s. Le dashboard envoie trop de requêtes en parallèle → 429 → `currentPrestataire = undefined` → "Profil non trouvé".
- `api/airtable-proxy.js` : retry automatique (2 tentatives, backoff 1.2s/2.5s)
- `loadCurrentPrestataire()` : retry côté frontend (3 tentatives, backoff progressif)
- ⚠️ **Problème partiellement résolu** — à investiguer si le profil public reste instable

## Projet

WOLO Market (anciennement KalaTogo) — Application web SPA pour trouver des prestataires de services au Bénin et au Togo. Un seul fichier `index.html` (~24 700 lignes). Déployé sur Vercel à https://wolomarket.vercel.app.

## Commandes

```bash
# Servir en local (depuis le dossier parent)
python3 serve.py  # → http://localhost:3000/repo/

# Déployer (push auto-deploy Vercel)
git add index.html
git commit -m "description"
git push

# Panel admin (nécessite un compte Supabase admin + ?admin dans l'URL)
# https://wolomarket.vercel.app?admin
```

## Stack technique

- **Frontend** : HTML/CSS/JS vanilla, tout dans `index.html`
- **Auth** : Supabase (`wikgdksyeygwpmqzmhez.supabase.co`)
- **Base de données** : Airtable REST API (base `applmj1RDrJkR8C4w`)
- **Photos** : ImgBB (upload via API)
- **Crop photos** : Cropper.js v1.6.2 (CDN)
- **Cartes** : Leaflet.js + OpenStreetMap
- **Paiement Pro** : FedaPay (intégration Sprint 6 — actuellement placeholder "bientôt disponible"), validation admin via panel
- **Vidéos** : Cloudflare R2 (hébergement), URLs dans `videos-urls.json`
- **Déploiement** : Vercel (auto sur push main)

## Charte visuelle WOLO Market

- **Palette** : Noir chaud `#0f1410`, Or `#E8940A`, Crème `#F8F6F1` — ZÉRO vert
- **Typographies** : Fraunces (titres), Space Mono (données/chiffres), Cabinet Grotesk (corps)
- **Logo** : SVG inline — cercle noir + W or + ligne or + MARKET espacé
- **Variables CSS** : `--wolo-*` (nouvelles) + aliases `--vert` → `#E8940A` pour compat

## Architecture navigation

```
showPage('home')        → accueil
showPage('search')      → recherche prestataires
showPage('profil')      → profil public prestataire
showPage('dashboard')   → tableau de bord (connecté)
showPage('login')       → connexion
showPage('inscription') → inscription (3 étapes)
showPage('fil')         → fil d'actualité (posts des prestataires suivis)
showPage('recompenses') → page récompenses (Bourse + Awards)

showDashSection('profil')               → modifier son profil
showDashSection('photos')               → gérer photos/albums
showDashSection('rdv')                  → rendez-vous
showDashSection('posts')                → publications
showDashSection('favoris')              → favoris sauvegardés
showDashSection('avis')                 → avis reçus
showDashSection('parrainage')           → parrainage
showDashSection('notifications')        → notifications
showDashSection('abonnement')           → paiement Pro
showDashSection('abonnements')          → prestataires suivis
showDashSection('agents-terrain')       → gestion agents terrain (admin only)
showDashSection('battle')               → scoreboard Battle H vs F (admin only)
showDashSection('paiement')             → encaisser un paiement client
showDashSection('historique-paiements') → historique paiements
showDashSection('recompenses')          → récompenses (Bourse + Awards widgets)
```

## Tables Airtable

| Table | Champs clés |
|---|---|
| `Prestataires` | Nom complet, Email, Métier principal, Quartier, Description des services, Photo Profil, Photo Réalisation 1/2/3, Albums (JSON), Abonnement, Code Paiement, Plan Demande, Code Parrainage, Parrain Code, GPS Lat/Lon, Disponible maintenant, Notifications (JSON), Résumé Profil IA, WhatsApp, Genre, Âge, Date de naissance |
| `Rendez-vous` | Prestataire ID, Client Nom/Email/Téléphone, Date, Heure, Statut, Message |
| `Avis` | Prestataire ID, Auteur, Note, Commentaire, Date |
| `Clients` | User ID, Nom, Email, Photo |
| `Posts` | Prestataire ID, Contenu, Date, Likes, Likeurs (JSON), Commentaires (JSON) |
| `Favoris` | User ID, Prestataire Favori ID, Nom Prestataire, Date |
| `Photos Avis` | Prestataire ID, Slot, Photo URL, Likes, Likeurs (JSON), Commentaires (JSON) |
| `Abonnements` | Abonné ID, Prestataire ID, Date |
| `Agents Terrain` | Nom, Téléphone, Email, Ville (Lomé/Cotonou), Genre (H/F), Code Parrainage, Actif, Supabase ID, User ID, Date Ajout |

### Tables Supabase (Sprint 7 — Récompenses)

| Table | Description |
|---|---|
| `bourse_croissance` | Éligibilité + tirages mensuels (300k FCFA). Champs : user_id, mois, eligible, score_wolo, nb_avis, note_moyenne, pro_mois_consecutifs, gagnant |
| `wolo_awards` | Candidatures WOLO Awards (100k FCFA). Champs : user_id, mois, pays (BJ/TG), video_url, video_validee, nb_votes, gagnant, vice_champion |
| `votes_awards` | Votes (1 vote/personne/mois). UNIQUE(votant_id, mois) |
| `gains_recompenses` | Historique des gains versés. Types : bourse_croissance, wolo_awards |
| `agents_terrain` | Agents de terrain pour le lancement. Champs : user_id, airtable_id, nom, telephone, email, ville (Lomé/Cotonou), genre (H/F), code_parrainage, actif. Backup Airtable via syncToAirtable(). |

## WOLO Jobs — Tables Airtable

| Table | Champs clés |
|---|---|
| `Offres d'Emploi` | Titre, Métier, Quartier, Ville, Type de contrat, Description, Salaire min/max FCFA, Recruteur ID/Nom/WhatsApp/vérifié, Active, Vues, Nb candidatures, Photo 1/2/3, Expérience requise, Urgente, Télétravail, Date expiration |
| `Candidatures` | Offre ID/Titre, Candidat ID/Nom/Métier/WhatsApp/Score WOLO/Photo, Message, Statut (En attente/Vue/Retenue/Refusée), Date candidature, Recruteur ID/Nom |

### Sections dashboard WOLO Jobs
```
showDashSection('emploi-mode')          → toggle disponibilité emploi
showDashSection('emploi-candidatures')  → mes candidatures envoyées
showDashSection('emploi-cv')            → mon CV WOLO (preview)
showDashSection('recrut-publier')       → publier une offre
showDashSection('recrut-offres')        → mes offres publiées
showDashSection('recrut-candidatures')  → candidatures reçues
```

### Fonctions JS clés WOLO Jobs
- `loadOffresEmploi(filtres)` — charge offres (~l.18740)
- `renderOffreEmploi(offre)` — carte offre (~l.18758)
- `showOffreDetail(offreId)` — détail offre (~l.18801)
- `submitCandidature()` — soumettre candidature (~l.19046)
- `publierOffre()` — publier offre (~l.19333)
- `loadMesOffres()` — mes offres (~l.19423)
- `loadCandidaturesRecues(offreId)` — candidatures reçues (~l.19520)
- `updateStatutCandidature(id, statut)` — màj statut (~l.19572)

## Points techniques critiques

- **Le fichier est TRÈS gros** (~14 000 lignes). Toujours utiliser Grep pour localiser le code avant d'éditer. Ne jamais lire le fichier entier.
- **Cropper.js** : nécessite double `requestAnimationFrame` + `setTimeout(150ms)` avant init ; conteneur image sans `overflow:hidden`.
- **Auth** : `currentUser` = objet Supabase, `currentPrestataire` = record Airtable chargé par email.
- **Albums** : champ `Albums` (Long text) dans Prestataires, JSON `[{id, nom, photos:[url,...]}]`.
- **Notifications** : stockées en JSON dans le champ `Notifications` de Prestataires.
- **Suivre** : boutons identifiés par `data-suivi-prest="${recordId}"`, `querySelectorAll` pour màj simultanée.
- **Optimistic UI** : `_setSuiviBtnState()` donne feedback immédiat avant retour API, rollback si erreur.
- **Photos Avis** : identifiées par slot (`profil`, `real1`, `real2`, `real3`).
- **Listes de métiers** : dupliquées en plusieurs endroits (recherche home, recherche page, inscription, dashboard edit) — penser à toutes les mettre à jour.
- **localStorage** : préfixé `wolo_` — migration automatique des anciennes clés `kala_` au premier chargement.
- **Pas de champ `Nom` dans Airtable** — utiliser `Nom complet` partout.
- **Codes parrainage** : préfixe `WOLO`, format `WOLOxxxx1234`.
- **Admin** : accès panel admin via `?admin` dans l'URL + authentification Supabase (vérifié côté serveur via `/api/admin-verify`). Les emails admin sont dans la variable d'environnement `ADMIN_EMAILS`.
- **Agents Terrain** : section dashboard admin-only (`showDashSection('agents-terrain')` et `showDashSection('battle')`). Recherche prestataire par téléphone/nom, ajout comme agent avec ville + genre. Scoreboard Battle H vs F. API : `/api/wolo-pay/agents-terrain` (POST, actions: list/search/add/remove/update).

## Score WOLO (max 100 pts) — Sprint 7

```
Profil complet         : 30 pts
  Photo de profil        : 8 pts
  Bio renseignée         : 7 pts
  Métier renseigné       : 5 pts
  Ville et quartier      : 5 pts
  Numéro vérifié         : 5 pts

Note moyenne clients   : 25 pts (paliers 5★=25, 4★=20, 3★=12, <3=0)
Nombre d'avis          : 15 pts (paliers 1-2=3, 3-5=7, 6-10=11, 11-20=13, 21+=15)
Photos publiées        : 10 pts (paliers 1-2=3, 3-5=6, 6+=10)
Vues du profil         : 10 pts (progressif 0-100 vues = 0-10 pts)
Activité récente       : 10 pts (≤3j=10, 4-7j=7, 8-14j=4, 14j+=0)

Pente douce : -1pt/jour après 14j sans connexion
Alerte push envoyée à J+10 d'inactivité
Recalcul : cron horaire api/cron/score-wolo.js
```

## Paiement Pro — flux

1. Prestataire clique "Passer au Pro" → code `WOL-XXXXXX` généré + sauvé dans Airtable
2. Modal affiche placeholder "Paiement sécurisé via FedaPay (bientôt disponible)" + code de référence
3. Prestataire envoie 2 500 FCFA
4. Admin connecté sur `?admin` → voit demandes en attente → active
5. Airtable passe `Abonnement: Pro`, efface `Code Paiement`

## Plans tarifaires

- **Base** : Gratuit — fonctions limitées, parrainage verrouillé
- **Pro** : 2 500 FCFA/mois — tout débloqué, parrainage actif
- **Commission parrainage** : 40% = 1 000 FCFA/filleul Pro/mois
