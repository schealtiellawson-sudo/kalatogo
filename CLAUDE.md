# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚧 SESSION 2026-04-28 — Refonte Mur des Reines + suppression King & Queen

### Ce qui a été livré aujourd'hui (en code, NON committé)
- **3 migrations Supabase appliquées en prod** via Management API : `wolo_prestataires`, `ai_infrastructure` (ai_cache, ai_quota_log), `messagerie_entretiens` (wolo_threads, messages, entretiens, signalements, message_templates). Vérification : 22 tables `wolo_*`/`ai_*` présentes en prod.
- **Migration `20260416_sprint14_mur_des_reines.sql` skippée** (référence table `profiles` au lieu de `wolo_prestataires` — schéma incompatible, à reprendre si on relance feed_photos).
- **GEMINI_API_KEY ajoutée à Vercel prod** + redeploy effectué (déploiement `dpl_7xcSUEdqLCQMuYMR5gpsXbLkAehk`).
- **Suppression complète King & Queen WOLO** de `index.html` (sidebar, sections, page-king-queen, FAQ, footer, recompenses, onboarding tour, ToS, meta SEO, publicPages, showPage, script include). Page route + composant orphelins. Le fichier `components/king-queen.js` n'est plus chargé mais n'est PAS supprimé (au cas où).
- **Refonte copy Le Mur des Reines** :
  - Pricing : 50K → **100 000 FCFA × 2 Reines/mois** (1 Bénin + 1 Togo, alternance Coiffure mois impair / Couture mois pair)
  - **Finale annuelle décembre** : 500K × 2 (Reine de l'Année Coiffure + Reine de l'Année Couture, Bénin vs Togo)
  - **Ouvert à toutes les femmes B/T** (pas Pro-only, c'est l'outil d'acquisition). Bourse de Croissance reste Pro-only.
  - Hero rewrite : *"Ta grand-mère a tressé pour nourrir. Ta mère a cousu pour t'envoyer à l'école. Maintenant c'est ton tour. Et le pays regarde."*
  - 6 nouveaux blocs dans `components/mur-des-reines.js` : stakes (100K = trimestre loyer), comment ça marche (3 photos + tag + duels), calendrier 3 phases (1-15 / 16-25 / 26-30), diaspora, finale annuelle décembre, bonus invisibles (profil épinglé, badge à vie, priorité Bourse).
  - Onglets renommés : Le feed → À la Une / Découvrir → Les Duels / Le podium → Le Podium / Mon mur → Mes Photos.
  - Modale upload : 3 photos (multi), **tag obligatoire** de la coiffeuse/couturière, disclaimer consentement modèle.
  - CTA partout : "Entrer sur le Mur des Reines →" → "Poste ta photo · Deviens Reine du mois →"

### ✅ V1.1 livré dans cette même session (2026-04-28 suite)
1. **Storytelling apprenties** ✅ — section À Propos *"L'invisible dans l'invisible"* avec citation *"Tu as payé 80 000 FCFA à Madame Adjo... WOLO Market c'est ton lundi toute la semaine"* + bloc 5 bénéfices.
2. **Bandeau dashboard apprentie** ✅ — fonction `injectApprentieBanner()` auto-détecte coiffeuse/couturière, distingue apprentie déclarée vs cible non déclarée, dismissible localStorage.
3. **Détection apprentie inscription** ✅ — bloc 3 options (Apprentie / Cheffe de salon / Indépendante) avec descriptifs anti-confusion. Affiché uniquement pour Coiffeuse/Couturière. Champ `Statut Artisan` sauvegardé.
4. **Colonne SQL `statut_artisan`** ✅ — ajoutée à `wolo_prestataires` (CHECK constraint apprentie/patronne/independante) + mapping `supa-prest.js`.
5. **Migration MdR DB v2** ✅ — `20260428_mur_des_reines_v2.sql` (411 lignes) pushée prod. Adaptée `profiles` → `auth.users` + `wolo_prestataires`. Vues + fonctions corrigées. Nouvelles tables `duels_photos` + `classement_reines_mois`.
6. **Mécanique tag obligatoire** ✅ — colonnes `tag_pro_user_id` + `tag_pro_libre` dans `feed_photos`. `feed-post.js` v2 valide tag obligatoire pour candidats Awards. `feed-list.js` v2 enrichit avec données pro taguée. Plus de gating Pro pour candidater (ouvert à toutes).
7. **Système duels +10/+1/+20 streak + shuffle bag** ✅ — `duels_photos` avec trigger SQL `update_feed_duel_stats` (auto-update wins/losses/streak/points sur feed_photos). `feed-discover.js` v2 utilise `voter_session` pour le shuffle bag (exclut paires déjà votées dans les 6h).
8. **Séquences WhatsApp A/B/C** ✅ — Migration `20260428_whatsapp_sequences.sql` pushée prod. 2 tables (`wolo_whatsapp_templates` + `wolo_whatsapp_queue`). 15 templates seed (5 onboarding + 5 apprentie + 5 concours). Endpoints `/api/wolo-pay/whatsapp-enqueue` + `/whatsapp-flush` (cron). Cron Vercel à 9h/12h/15h/18h. Provider auto : WhatsApp Cloud API si `WHATSAPP_CLOUD_TOKEN` env, sinon Twilio si `TWILIO_*`, sinon mode log. Trigger après inscription (séquence A toujours, séquence B si statut=apprentie).

### ✅ TOUT V1.1 livré + push prod (3 commits)
- `c309248` : K&Q retiré + MdR refonte + WhatsApp séquences + apprenties
- `e2fbdb5` : 3 photos multi-upload + Statut Artisan dashboard + Mains d'Or badge
- `b21a93a` : widgets métier (8 verticales) + migration Airtable Jobs/Avis/RDV (SQL)

### ✅ DB Supabase prod (toutes migrations appliquées via Management API)
- `20260424_ai_infrastructure.sql` (ai_cache, ai_quota_log)
- `20260424_messagerie_entretiens.sql` (5 tables messagerie/entretiens/signalements)
- `20260426_wolo_prestataires.sql` (wolo_prestataires + view compat)
- `20260427_widgets_metier.sql` (9 tables widgets : prestations_catalogue, portfolio_projets, reservations_table, devis_chantier, commande_facon, rdv_mecano, commande_patisserie, reservation_chambre, cours_offres)
- `20260428_mur_des_reines_v2.sql` (feed_photos enrichi + duels_photos + classement_reines_mois)
- `20260428_whatsapp_sequences.sql` (15 templates onboarding/apprentie/concours)
- `20260428_whatsapp_metier_sequences.sql` (38 templates métier : 7 séquences × 5-7 messages)
- `20260428_airtable_jobs_avis_rdv.sql` (4 tables : wolo_offres_emploi, wolo_candidatures, wolo_avis, wolo_rdv + vues compat)
- Colonne `statut_artisan` ajoutée à wolo_prestataires
- Total : **48 tables** dans le schéma public + 53 templates WhatsApp seedés

### 📚 Rapports stratégiques livrés (sub-agents)
- `/STRATEGIE-AUDIT-2026-04-28.md` — audit produit complet, score 64/100→81/100 si top 10 propositions appliquées (acquisition, rétention, monétisation, UX, etc.)
- `/BEAUTE-COUTURE-VERTICAL-2026-04-28.md` — verticale Beauté/Couture + 38 templates WhatsApp métier + verdict "Reines + Bâtisseurs" (combo Coiffure/Couture + Construction au lancement)

### 🚧 Reste à faire pour passer en V1.2 (priorisé)

**Activations (user actions)**
- **WhatsApp Cloud OU Twilio en prod** : ajouter `WHATSAPP_CLOUD_TOKEN` + `WHATSAPP_PHONE_ID` (Meta) OU `TWILIO_SID/TOKEN/FROM` dans Vercel env. Sans ça, mode log (status=sent, provider=log) — utile pour test sans coût.
- **Régénérer credentials exposés** : Gemini API Key (`AIzaSyCKdPlSftDOltyj4Ef_qDdhXCQaDTDrum8`) + Supabase PAT actif (`sbp_6a944ed0c1157acd6a56186ea6f5a02a9b5eb02a`). Régénère les deux après stabilisation.

**Décisions stratégiques à trancher (issues du rapport Beauté/Couture)**
1. Verticale phare lancement = combo "Reines + Bâtisseurs" (Coiffure/Couture + Construction) ou Beauté seul ?
2. Plan Pro Salon 5 000 F lancé le 8 juin OU repoussé V1.1 ?
3. Module "Mon premier client" subventionné -30% (budget 30K F/mois) — activer dès le 8 juin ?
4. MoU partenariat ONG (Bluemind/Heal by Hair/ProEmploi) avant 8 juin pour anticiper concurrence ?
5. Mur des Reines : ancrer le récit dans la **technique métier** (pas la beauté physique) pour éviter dérive concours de beauté.

**Implémentations restantes (V1.1 → V1.2)**
- 5 widgets métier secondaires (commande_facon, rdv_mecano, commande_patisserie, reservation_chambre, cours_offres) : tables + config OK, manque les composants frontend (suivre pattern `widget-reservation-table.js`)
- Migrer le code applicatif (loadOffresEmploi, submitCandidature, fetchAvis, loadDashRDV) pour utiliser `wolo_offres_emploi` / `wolo_candidatures` / `wolo_avis` / `wolo_rdv` au lieu des tables Airtable (les tables Supabase sont en place avec vues compat)
- Helpers JS frontend (`supa-offres.js`, `supa-candidatures.js`, `supa-avis.js`, `supa-rdv.js`) sur le pattern de `supa-prest.js`
- Intégrer ImgBB upload direct dans widget-portfolio.js et widget-devis-chantier.js (actuellement attendent URLs string)
- Notification WhatsApp auto au pro à la création de demande (réservation table, devis chantier) — utiliser `wolo_whatsapp_queue` existant
- Dashboard recruteur : tester les Sprints A→F en live sur prod (déjà livrés en code)
- 3 scripts TikTok APPRENTIE01-03 dans Notion (mis de côté sur demande user, à reprendre)

### 📝 MÉMOS pour future stratégie réseaux sociaux (note user 2026-04-29)
- **Posts Instagram, Reels, interviews vidéo** : appuyer ÉNORMÉMENT sur la douleur des apprenties coiffeuses/couturières
- Storytelling brut : 84h/semaine, 0 FCFA, 120-200K payés à la patronne
- Faire interviews vraies apprenties (avec consentement, anonymisable)
- Format Reel : *"Le système de l'apprentissage au Togo"* en mode pédagogique
- Hooks : *"On t'a dit que c'était normal de payer pour travailler 3 ans gratis ?"*
- Frères/maris dans le copy (cible diaspora qui finance la nièce/cousine apprentie)
- À intégrer lors du prochain sprint marketing/social (séquence virale 30 jours)

### Crédits API exposés en chat (à RÉGÉNÉRER après commit)
- Supabase Personal Access Token : `sbp_62da29bde3edb1fa6465b20b43afe597eeca3166`
- Gemini API Key : `AIzaSyCKdPlSftDOltyj4Ef_qDdhXCQaDTDrum8` (utilisée dans Vercel env GEMINI_API_KEY)
- → User doit régénérer ces deux après validation des changements.

### Décisions stratégiques validées (à NE PAS revenir dessus)
- King & Queen tué (cassait le brand "Sans piston", redondance avec MdR)
- Mur des Reines pivote en outil d'acquisition massive (ouvert à toutes les femmes B/T, pas Pro-only)
- Mécanique Option A : quota pays + alternance catégorie (12 Bénin + 12 Togo/an garantis)
- Pas de "Mains d'Or" payantes pour les pros — uniquement visibilité gratuite (boost profil + badge "Taguée par X reines")
- Duels = moteur principal de scoring viral, partage WhatsApp = bonus accessoire (+2 pts/nouveau votant, cap 30/mois)
- Photos coiffure : selfie OU cliente (visage autorisé), disclaimer consentement
- Photos couture : tenue portée par toi ou modèle, visage libre, tag couturière obligatoire

### État Airtable
- Quota mensuel API EXPLOSÉ (PUBLIC_API_BILLING_LIMIT_EXCEEDED)
- Migration partielle effectuée (Prestataires → Supabase, helper supa-prest.js)
- User en réflexion : migrer TOUT (Offres d'Emploi, Candidatures, Avis, RDV, Posts, etc.) vers Supabase ou attendre reset mensuel ?
- Décision en attente.

---

## 🚧 SESSION ANTÉRIEURE (2026-04-26) — Migration Prestataires + Sprint H/I

### Contexte rapide
On vient de livrer 15 push en une session monstre :
- Sprint H/I (IA + messagerie + entretiens + signalement + anti-ghosting + matches IA + KYC + alertes + mes signalements + carte interactive + top candidats IA)
- Migration `Prestataires` Airtable → Supabase complète (4 push, commits `479af59` `c6832db` `2a2620c` `508d5a5`)

Le user a hit le quota mensuel Airtable (PUBLIC_API_BILLING_LIMIT_EXCEEDED) → on a basculé la table Prestataires sur Supabase. Migration **livrée mais PAS encore appliquée par le user en prod**.

### To-do prioritaire (faire valider par le user dans cet ordre)

**1. ⚠️ CRITIQUE — Exécuter la migration SQL Supabase**
- Le user doit aller sur https://supabase.com/dashboard → SQL Editor
- Lancer `supabase/migrations/20260426_wolo_prestataires.sql`
- Vérif : `SELECT COUNT(*) FROM wolo_prestataires;` retourne `0`
- Sans ça, **rien ne marche** (loadCurrentPrestataire plante)

**2. Supprimer l'ancien profil de test**
- Auth Supabase → Users → delete `schealtiellawson@gmail.com`
- Airtable Prestataires → delete sa ligne (optionnel, plus utilisé pour la lecture)

**3. Recréer un profil test via inscription**
- https://wolomarket.vercel.app → Inscription (3 étapes)
- Le record sera créé direct dans `wolo_prestataires` Supabase avec `user_id = auth.users.id`

**4. Tester ces flows un par un**
| Test | Doit marcher |
|---|---|
| Login | profil chargé via Supabase (console : `[wolo] currentPrestataire chargé via Supabase`) |
| Modifier profil | sauvegarde immédiate |
| Toggle "Disponible" | switch sauvegardé |
| GPS (saveDashLocation) | position enregistrée |
| Profil public d'un autre user | s'affiche |
| Recherche prestataires (fetchPrestataires) | listings + filtres |
| Vedettes home (loadHomeVedette) | grid affiché |
| Sidebar "Je recrute" | toujours visible (peu importe plan) |
| KYC IA → Appliquer le badge | écriture Supabase OK |

**5. Pour activer le mode Pro test**
- Supabase Table Editor → `wolo_prestataires` → ligne user → champ `abonnement` → `Pro` → Save
- Recharge wolomarket → "Je recrute" toujours visible mais features Pro débloquées (publier offre, etc.)

**6. Tests des features Sprint H/I (après migration validée)**
Voir la check-list complète dans la session précédente. Ordre rapide :
- Page Trouver un emploi → toggle Liste/Carte, 🤖 Trouver mes meilleurs matches, 🔔 Mes alertes
- Dashboard recruteur → bandeau KYC + 🤖 Vérifier mon entreprise
- Mes offres → 🤖 Top candidats IA sur une card
- Candidatures reçues → widget anti-ghosting + 🤖💬📅🚨 sur les cards
- Mes entretiens (sidebar) → liste à venir + historique

### Pré-requis prod restants (à confirmer avec le user)
- Migration `20260424_messagerie_entretiens.sql` appliquée ? (sinon messagerie/entretiens/signalement plantent)
- Au moins 1 clé API IA dans Vercel env (`GEMINI_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `MISTRAL_API_KEY`) ? (sinon toutes les features 🤖 retournent 503)
- Champs `Candidat User ID` + `Recruteur User ID` ajoutés dans Airtable `Candidatures` ? (sinon messagerie/entretien refuse)

### Si on continue le projet
Features pas encore faites (V1.1+) :
- Migrer aussi `Offres d'Emploi`, `Candidatures`, `Avis`, `RDV` vers Supabase (si quota Airtable continue de poser problème)
- Templates messages CRUD (table `wolo_message_templates` existe déjà, juste UI à créer)
- OCR Vision pour le KYC (Gemini Vision API)
- Tests de compétences
- Cooptation rémunérée
- Notifications push (au-delà du JSON localStorage)

### À NE PAS faire
- Ne pas relancer le user sur les boutons "Plan détecté" debug — c'est résolu
- Ne pas remettre du code Airtable Prestataires sans fallback Supabase
- Ne pas créer de nouveaux fichiers `/api/*/` sans consolider dans le router (12/12 functions Vercel Hobby)

---

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
