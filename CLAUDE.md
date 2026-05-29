# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🧠 CERVEAU CLAUDE — RÈGLE ABSOLUE 100% DU TEMPS (gravée 2026-05-28)

**CHAQUE RÉPONSE. SANS EXCEPTION. PEU IMPORTE LA NATURE DE LA TÂCHE.**

Avant de répondre, vérifier et confirmer explicitement :

1. **Life Force activée ?**
   - Recrutement / Phase 3 : LF5 (revenus stables) = hook money-first
   - Phase 1 : LF3 (peur invisibilité) + LF7 (famille sans revenus)
   - Phase 2 : LF6 (meilleur du quartier) + LF8 (reconnaissance)

2. **Phase Sabri Suby correcte ?**
   - J01-10 : douleur pure, JAMAIS mentionner WOZALI
   - J11-20 : mécanisme Score WOZALI
   - J21-30 : urgence + countdown + CTA direct

3. **SB7 respecté ?**
   - Artisan = héros. WOZALI = guide. JAMAIS WOZALI en héros.

4. **CTA réel ?**
   - "Postuler maintenant" + URL wozali.africa/postuler
   - JAMAIS "Lien en bio" seul

5. **Règles absolues WOZALI ?**
   - Commission agents : 40% normal (1 000 FCFA/Pro), 60% si battle gagnée (1 500 FCFA/Pro)
   - 100 000 FCFA = 100 membres Pro actifs
   - Pas de fixe. Pas de prime.
   - Date lancement : 1er août 2026
   - Premier tirage : 25 septembre 2026
   - JAMAIS em dash "—"
   - JAMAIS "agent terrain" → "agent terrain WOZALI"
   - Documents internes : PDF, JAMAIS .md livré seul

**Cette règle a été violée. Le fondateur l'a demandé plusieurs fois. Elle est non négociable.**

**AU LANCEMENT DE CHAQUE SESSION :** envoyer ce message au fondateur avant toute chose :
"🧠 Cerveau Claude actif. Toutes mes réponses et réflexions cette session seront vérifiées avec le Cerveau Claude, sans exception."

---

## RÈGLE ABSOLUE — TERMINOLOGIE AGENTS (gravée 2026-05-27)

**"PIONNIER" est INTERDIT partout, sans exception.** Le mot a des connotations religieuses inacceptables.

- Terme OBLIGATOIRE : **"agent terrain WOZALI"** (en public ET en interne)
- Les agents se présentent aux prospects comme **"agent terrain WOZALI"**, pas comme "Pionnier"
- JAMAIS : "Pionnier WOZALI", "Pionniers", "PIONNIER" dans aucun document, visuel, code ou contenu

---

## 🚧 PROCHAINE SESSION — REPRENDRE ICI (mis à jour 2026-05-28)

### État actuel — tout est opérationnel

**KPI terrain** : auto-calculé depuis `wozali_prestataires.parrain_code`, zéro saisie manuelle.
**Battle H/F** : Pro signés ce mois depuis `wozali_prestataires` (pas `nb_filleuls`).
**Formation agents** : 20 docs accessibles depuis le dashboard agent ET le dashboard admin.

### Ce qui reste à faire (prochaine priorité)

- ⬜ Agents IA scoring + KYC (manque API keys Vercel : `GEMINI_API_KEY` / `GROQ_API_KEY`)
- ⬜ Séquence WhatsApp J30 (J0-J7 existent, manque `WHATSAPP_CLOUD_TOKEN` Vercel)
- ⬜ Bouton Embaucher → fiche employé (sprint J)
- ⬜ Espace équipe (sprint K)
- ⬜ 150-200 vrais profils avant 1er août (terrain)
- ⬜ 3-5 agents terrain Lomé + Cotonou (recrutement terrain)

---

## ✅ SESSION 2026-05-28 — KPI auto-calculé + Battle réel + Formation dashboard

**Commits pushés :** `90b1941` (doc 20 title fix), `bd9c38a` (formation admin link) + gros commit session précédente (39 fichiers modifiés)

### 1. KPI terrain — refonte complète auto-calculée

Ancien système : saisie manuelle des inscrits/Pro chaque semaine par l'admin.
Nouveau système : tout calculé depuis `wozali_prestataires.parrain_code` + `created_at`. Zéro chiffre à saisir.

**Fonctions ajoutées (app.js) :**
```javascript
function _weekStart(weeksAgo)          // retourne le lundi de la semaine N-weeksAgo
function _computeWeekBuckets(records)  // groupe les inscriptions par semaine (inscrits + pro)
function _computeCarton(buckets)       // carton orange/rouge basé sur semaines COMPLÈTES uniquement
async function loadKPITerrain()        // charge agents + prestataires des 10 dernières semaines
function openKPIHistorique(id, nom, code)  // affiche 8 semaines complètes calculées en réel
function openKPIStatut(id, nom)        // SEULE action manuelle restante : statut + notes
async function saveKPIStatut(id, nom)  // upsert wozali_kpi_semaines (inscrits_gratuit:0, pro_signes:0 — champs ignorés)
```

**Fonctions supprimées :** `openKPISaisie`, `updateKPIPreview`, `saveKPISaisie`

**Table `wozali_kpi_semaines`** : sert uniquement pour `statut_agent` (actif/formation/arrete) + `notes`. Les nombres viennent de `wozali_prestataires`.

**Logique carton :** basée sur les semaines W-1 et W-2 (semaines COMPLETES). La semaine en cours n'entre jamais dans le calcul pour éviter les faux positifs en milieu de semaine.

**Seuils KPI :** 150 inscrits Gratuit/semaine + 30 Pro (20% conversion).

### 2. Battle H/F — auto-calculé depuis données réelles

Ancien système : lisait `nb_filleuls` (champ statique stale).
Nouveau système : compte les Pro signés CE mois depuis `wozali_prestataires` groupés par `parrain_code`.

```javascript
let _battleProByCode = {};  // { code: count }

async function loadBattle(ville)   // query wozali_prestataires WHERE abonnement='Pro' AND created_at >= 1er du mois
function renderBattle()            // hPro/fPro depuis _battleProByCode (pas nb_filleuls)
```

**Commissions :** 1 000 FCFA/Pro (normal, 40%), 1 500 FCFA/Pro (battle gagné mois suivant, 60%).

**HTML mis à jour :** subtitle Battle, "inscrits" → "Pro signés ce mois", label "commissions base", `id="battle-mois-label"`.

### 3. Nettoyage repo

- 39 fichiers modifiés pré-existants commités proprement (git reset HEAD~1 + selective add pour exclure les fichiers non suivis)
- Fichiers legacy KalaTogo supprimés : scripts Python (`rewrite_*.py`), vieilles notes session, vidéo kala-presentation.mp4
- `/tmp/formation-preview/` synchronisé avec les 20 fichiers HTML formation du repo

### 4. Formation agents — dashboard opérationnel

**Section `ds-agents-ressources` :** déjà construite et complète.
- 20 documents de formation en grille
- Tracking lecture dans `agent_document_reads` (Supabase)
- Checklist onboarding 3 étapes (checkboxes persistées)
- Route `/formation/:slug` → `/formation/:slug.html` dans vercel.json

**Titre doc 20 corrigé (app.js ligne ~13742) :**
- Avant : "Suivre ses membres et passer de 10 à 50 Pro par mois"
- Après : "Atteindre 100 000 FCFA par mois : l'effet cumulé, le suivi membres et les KPI"

**Accès :**
- Agents terrain : via sidebar groupe "Agent terrain" → "Mes ressources" (contrôlé par `_isAgentTerrain`)
- Admin (fondateur) : via sidebar groupe "Admin" → "Formation agents" (lien ajouté ce jour)

---

## 🚧 PROCHAINE SESSION — REPRENDRE ICI (mis à jour 2026-05-26)

### Sprint Recrutement Agents terrain — EN COURS

**Point 1 : Flow postuler ✅ COMPLET**

| Fichier | État | Notes |
|---|---|---|
| `/offre-agents terrain.html` | ✅ | Landing refondue : 100K FCFA, équipe permanente, 4 étapes déploiement WOZALI |
| `/postuler.html` | ✅ | Formulaire complet, WhatsApp checkbox sans friction (pas de couleur verte, pas d'"Obligatoire"), redirect → /merci |
| `/merci.html` | ✅ | Page confirmation : photo fondateur format portrait 4/5 + citation côte à côte, réseaux sociaux (WOZALI + fondateur) même design |
| `/admin-agents terrain.html` | ✅ | Gestion candidatures : filtres statut/ville, stats bar, boutons ✓ Valider / ✗ Recaler ouvrant WhatsApp avec messages pré-rédigés |
| `/assets/fondateur.jpg` | ✅ | Photo pro fondateur (marine), utilisée merci.html + Notre Histoire |
| `style.css` + 3 pages standalone | ✅ | `overflow-x:hidden` sur `html,body` partout (fix blanc rebords définitif) |
| Supabase RLS | ✅ | `admin_read_agents terrain` (SELECT) + `admin_update_agents terrain` (UPDATE) + `candp_public_insert` (INSERT anon) déjà en place |
| `vercel.json` | ✅ | Routes : /postuler, /offre-agents terrain, /recruter, /merci, /admin-agents terrain |

**Messages WhatsApp admin (dans admin-agents terrain.html) :**
- Validé : "Ta candidature est retenue. Tu fais partie des Agents terrain WOZALI. Je t'appelle très bientôt."
- Recalé : bienveillant, porte pas fermée, premier membre le 1er août quand la plateforme ouvre

**Règles établies cette session :**
- "Schealtiel Lawson" autorisé sur merci.html (les candidats doivent mettre un nom sur le visage) — EXCEPTION à la règle générale
- Nom TOUJOURS interdit sur visuels sociaux et offre-agents terrain.html
- Terminologie : "Agent terrain WOZALI" côté public, jamais "agent terrain"
- Vision WOZALI élargie : pas que artisans, tout le monde qui travaille ou a un petit business (comme un LinkedIn/Instagram)

**Domaine wozali.africa ✅ LIVE (confirmé 2026-05-27)**
- DNS propagé, HTTP 200 confirmé
- URL prod officielle : https://wozali.africa
- wozali.vercel.app reste fonctionnel en fallback mais JAMAIS utilisé en public
- CTA partout : wozali.africa/postuler

**Point 2 : Visuels recrutement — EN COURS**
Produits (session 2026-05-27) :
- recrut-post-v2-dark.html (Post Instagram 1080x1080 dark) ✅
- recrut-post-v2-or.html (Post Instagram 1080x1080 or) ✅
- recrut-story-v2.html (Story 1080x1920 dark) ✅
- recrut-tiktok-dark.html (TikTok 1080x1350 dark matin) ✅
- recrut-tiktok-or.html (TikTok 1080x1350 or soir) ✅
- recrut-reel-cover.html (Cover Reel 1080x1920) ✅
- recrut-post-phase1-dark.html (Phase 1 douleur pure, sans WOZALI) ✅
- recrut-post-journee-agent terrain.html (Phase 2 mécanisme, journée Agent terrain) ✅
Tous les domaines : wozali.africa/postuler (mis à jour session 2026-05-27)

---

## 🚧 PROCHAINE SESSION — REPRENDRE ICI (mis à jour 2026-05-23 soir)

### ⚠️ URL PROD : https://wozali.africa ✅ LIVE — wozali.vercel.app en fallback uniquement, JAMAIS en public

---

### ✅ SESSION 2026-05-23 (soir) — Perf + Boosts offres + Je vends ici

**Commits pushés :** `378cf3d` (perf), `2e52e55` (boost+fix blanc), `e55dcd6` (fix boost modal), `30ca933` (Je vends ici)

**Ce qui a été fait :**

1. **Performance index.html** : 2.71MB → 540KB (-81%)
   - CSS extrait → `/style.css` (224KB, mis en cache)
   - JS extrait → `/app.js`, `/app2.js`, `/app3.js` (defer)
   - 5 images base64 → `/assets/` (lazy load)
   - Fix fond blanc : `html { background: #14100A }`

2. **Boost offres d'emploi** (4 plans : 7j/2500F, 14j/5000F, 30j/10000F, tête-liste/15000F) :
   - Modal boost avec instructions paiement Wave/Flooz
   - Référence unique `BOOST-XXXXXX-XXXX` générée
   - Offres boostées remontent en premier dans WOZALI Jobs
   - Badge ⭐ À LA UNE sur les cards publiques
   - Fix : `window.allMesOffres` exposé (let ne crée pas de prop window)
   - Numéro Wave : +33 7 43 60 69 16 (vrai numéro)
   - ⚠️ **Migration à appliquer** : `supabase/migrations/20260523_boost_offres.sql`

3. **Je vends ici — Vitrine ambulante** :
   - Sidebar : groupe "Je vends ici" → "Ma vitrine"
   - Section `ds-vente-ambulante` : toggle, produit, prix, photo, GPS, partage WhatsApp
   - Quartier pré-rempli depuis profil utilisateur
   - Section home page "Marchands du jour" (masquée si 0 vitrines actives)
   - JS : `loadVenteAmbulanteSection`, `saveVitrine`, `toggleVitrine`, `partagerVitrineWhatsApp`, `loadMarchandsSection`
   - ⚠️ **Migration à appliquer** : `supabase/migrations/20260523_vitrines_ambulantes.sql`

**⚠️ DEUX MIGRATIONS À APPLIQUER EN SUPABASE SQL EDITOR :**
```sql
-- 1. Boost offres
-- Contenu : supabase/migrations/20260523_boost_offres.sql

-- 2. Vitrines ambulantes
-- Contenu : supabase/migrations/20260523_vitrines_ambulantes.sql
```

**Checklist en cours :**
- ✅ 1. Réduire poids fichier
- ✅ 2. Activer boosts d'annonces
- ✅ 3. Créer profil "Je vends ici" commerçants ambulants
- ✅ 4. Pipeline Kanban recruteur — sprint G (bouton 🔲 Kanban + 4 colonnes + move 1-clic)
- ⬜ 5. Agents IA scoring + KYC — sprint H (partiellement livré sessions précédentes — manque API keys Vercel)
- ⬜ 6. Séquence WhatsApp J0→J3→J7→J30 (J0-J7 existent, J30 à ajouter, manque WHATSAPP_CLOUD_TOKEN Vercel)
- ⬜ 7. Bouton Embaucher → fiche employé — sprint J
- ⬜ 8. Espace équipe — sprint K
- ⬜ 9. 150-200 vrais profils avant 1er août (terrain)
- ⬜ 10. 3-5 agents terrain Lomé + Cotonou (terrain)

---

### ✅ SESSION 2026-05-23 — Suppression Mes entretiens + KYC IA retirée

**Commits pushés :** `34b3193`, `f0889fc`, `24fd9bf`, `752782e` + commit en cours

**Ce qui a été fait :**

1. **Fix Mode Emploi toggle** (`34b3193`) :
   - Mapping Supabase manquant pour le champ disponibilité emploi
   - Migration colonne ajoutée

2. **Fix migration wozali_entretiens** (`f0889fc`) :
   - Migration SQL créée pour la table entretiens

3. **Fix entretien-list double `.order()` + try/catch router** (`24fd9bf`) :
   - `api/entretien-list.js` : double `.order()` sur le scope `upcoming` → SQL invalide → crash
   - `api/[action].js` : try/catch global → erreurs retournent JSON au lieu de page HTML Vercel
   - Frontend : `res.text()` + JSON.parse pour afficher l'erreur réelle

4. **Suppression complète "Mes entretiens"** (`752782e`) :
   - Section `Mes entretiens` virée de "Mon emploi" ET "Je recrute"
   - 100 lignes supprimées, zéro résidu HTML/JS

5. **Suppression vérification IA recruiter** (session courante) :
   - Bandeau `#rd-kyc-banner` retiré du dashboard recruteur
   - Fonctions supprimées : `renderKycBanner()`, `ouvrirKycModal()`, `kycSubmit()`, `appliquerKycVerification()`
   - Appel `renderKycBanner()` retiré de `loadRecrutDashboard()`
   - Raison : friction inutile au lancement

**Personas E2E restants :**
- ⏳ Kodjo (Mécanicien moto, Akpakpa, Cotonou)
- ⏳ Akossiwa (Photographe, Lomé)
- ⏳ Madame Adjo (Restaurant, Cotonou)

---

### ✅ SESSION 2026-05-22 — Tests E2E Mariam + 8 bugs critiques fixés

**Commits pushés :** `eb52d1b`, `dd290a2`, `7bd724c`, `fb8fc9d`, `5b945b5`

**Bugs fixés :**

1. **Bouton "Passer Pro maintenant"** (page Comment ça marche + dernier slide onboarding) :
   - Si connecté → `showPage('dashboard')` + `showDashSection('abonnement')`
   - Si non connecté → `showPage('inscription')`
   - Avant : renvoyait systématiquement sur la page inscription même si déjà connecté

2. **Onboarding slide 4 — copy parrainage** :
   - Nouveau titre : *"Fais tourner le commerce des autres. Le tien en profite."*
   - Nouveau texte : angle service-first "aide quelqu'un à faire marcher son business → tu gagnes" au lieu de l'angle revenu passif générique

3. **Photos inscription/dashboard invisibles sur profil public** :
   - Cause : Supabase stocke `photo_profil` comme URL string, mais tout le code lisait `f['Photo de profil']?.[0]?.url` (format Airtable = tableau d'objets)
   - Fix : helper global `_wPhotoUrl(val)` qui normalise les deux formats (string OU `[{url}]`) → 8 occurrences patchées dans index.html + `components/supa-prest.js`
   - Fix `_toSupaRow` : accepte string OU `[{url}]` en écriture

4. **Photos inscription retry perdues** :
   - Cause : si profil existait déjà (retry), les photos uploadées n'étaient pas appliquées
   - Fix : `update(existing.id, updateFields)` avec les photos manquantes lors du retry

5. **Délai photos profil public (0 → 3 photos après 1 min)** :
   - Cause : cache mémoire servait l'ancien profil sans photos, background refresh mettait à jour le cache mais ne re-rendait pas la page
   - Fix 1 : propre profil → bypass cache systématique (fetch Supabase frais à chaque visite)
   - Fix 2 : background refresh → re-render silencieux si profil toujours affiché
   - Fix 3 : `_doUploadProfilCrop` + `_doUploadRealisationCrop` → `delete window._profilCache[id]` après upload

6. **Redirect vers login après actualisation** :
   - Cause : overlay 5s failsafe retire le blocage avant que Supabase ait répondu → utilisateur clique "Mon Profil Public" → `currentPrestataire` null → `showPage('login')`
   - Fix : `viewMyProfile()` — si `currentUser` existe, jamais de redirect login. Affiche un loader et réessaie toutes les secondes pendant 12s. Seulement si vraiment déconnecté → login.

**Tests E2E Mariam (persona coiffeuse, Lomé, Bè) :**
- ✅ Inscription créée avec succès (mariam.test2)
- ✅ Dashboard accessible
- ✅ Profil public visible
- ✅ Photos réalisations visibles dans dashboard ET profil public
- ⚠️ Photo de profil toujours "M" avatar (mariam.test2 n'a pas uploadé de photo profil à l'inscription)

**Personas E2E restants :**
- ⏳ Kodjo (Mécanicien moto, Akpakpa, Cotonou)
- ⏳ Akossiwa (Photographe, Lomé)
- ⏳ Madame Adjo (Restaurant, Cotonou)

---

## 🚧 PROCHAINE SESSION — REPRENDRE ICI (mis à jour 2026-05-21 soir)

### ⚠️ URL PROD : https://wozali.africa ✅ LIVE — wozali.vercel.app en fallback uniquement, JAMAIS en public

---

### ✅ SESSION 2026-05-21 (soir) — Audit exhaustif + 18 bugs fixés (commit 3d5ed38)

**Bugs critiques fixés :**
- **Inscription** : photo profil stockée dans `WhatsApp` au lieu de `Photo de profil` (bug silencieux depuis l'origine — toutes les photos d'inscription étaient perdues dans le mauvais champ)
- **Inscription** : `const authData` réassignée (TypeError silencieux sur "email déjà utilisé") → `let effectiveUser/effectiveSession`
- **loadDashOverview** : `completion['Photo de profil']` lisait `f['WhatsApp']` → corrigé
- **loadDashOverview** : `scoreComp` lisait `f['Photo Profil']` (inexistant) → `f['Photo de profil']`
- **loadDashOverview** : `scoreNote`/`scoreAvis` calculés avec `note=0`/`nbAvis=0` avant résolution `_avisPromise` → refactoré en 2 passes async (provisoire + finale)
- **loadDashOverview** : `f['Points Cowrie']` (inexistant) → `f['Score WOZALI']`
- **loadDashPhotos + recadrerPhotoProfil + posts + avis** : photo profil lue depuis `f['WhatsApp']` → `f['Photo de profil'] || f['WhatsApp']` (partout dans le code — 8 sites de lecture corrigés)
- **8 fichiers API** : `from('profiles')` stale (table inexistante) → `from('wozali_prestataires')` + pivot `user_id` (recompenses-status, parrainage-stats, parrainage-apply, awards-candidater, awards-candidats, feed-comment, leaderboard, eligibilite-bourse cron, score-wozali cron + lib)
- **supa-offres.js** : `'Salaire affiché'` absent du mapping → tous les salaires Jobs affichaient "À négocier" même avec min/max renseignés

**Copy/Brand fixé :**
- `500 000 FCFA` → `800 000 FCFA` dans 6 endroits (300K×2 Togo+Bénin + 100K×2)
- "WOZALI signifie grandir en Yoruba" → "nous existons en Lingala"
- `var(--vert)` + fonds verts dans renderRealisationsGrid et loadDashPosts → palette Nuit (#1E180E/#E8940A)

**Migration créée :**
- `20260521_offres_salaire_affiche.sql` — ADD COLUMN salaire_affiche BOOLEAN → **À APPLIQUER sur Supabase**

### ⚠️ ACTION MANUELLE REQUISE avant lancement

1. **Appliquer migration Supabase** (SQL Editor) :
   `repo/supabase/migrations/20260521_offres_salaire_affiche.sql`

2. **Corriger APP_URL sur Vercel** :
   Dashboard Vercel → Settings → Environment Variables → `APP_URL` → remplacer `wolomarket.vercel.app` par `wozali.com` (ou `wozali.vercel.app`)

3. **Configurer IA providers de fallback** (optionnel mais recommandé) :
   - `GROQ_API_KEY` → https://console.groq.com
   - Si Gemini tombe, aucun fallback IA configuré actuellement

---

### ✅ SESSION 2026-05-21 — Fix profil timeout + fix Mon Agenda spinner bloqué

**3 bugs fixés (tous pushés)** :

- **`showProfil()` timeout réseau au 2e+ passage** (commit `62d0b01`) :
  - `window._profilCache[recordId]` : sert le profil en 0ms depuis le cache mémoire après le 1er chargement
  - Pas de spinner si cache disponible (UX instantané)
  - Rafraîchissement Supabase silencieux en arrière-plan
  - Timeout 8s → 15s + retry automatique unique après 2s

- **Mon Agenda "Chargement..." infiniment bloqué** (commit `f368af6`) :
  - `supaRdv.list()` et le fetch Airtable n'avaient aucun timeout
  - Si Supabase ou Airtable ne répondait pas, le spinner restait éternellement
  - Fix : `_wt()` wrapper 8s sur Supabase, 10s sur Airtable fallback

- **RDV booké n'apparaît pas** : causé par le spinner bloqué — le chargement n'atteignait jamais `filterAndRenderRDVs()`. Avec le fix timeout, les RDVs s'affichent correctement.

### ✅ SESSION 2026-05-20 — Audit visuel complet 100% du site

**Objectif** : audit visuel exhaustif de toutes les sections dashboard + pages publiques, avec screenshots et correction immédiate des bugs trouvés.

**4 bugs fixés (tous committs pushés)** :
- `index.html` ~ligne 8138 : ajout global `function _sb() { return window.supabase || null; }` — fix ReferenceError dans WOZALI Match (la fonction n'était définie qu'à l'intérieur du feed IIFE)
- `index.html` ~ligne 7009 : suppression `style="display:none;"` inline sur `#ds-favoris` — l'inline style écrasait la classe CSS `.dash-section.active` → page noire au clic
- `index.html` ~ligne 9302 : `saveProfile()` envoie `null` au lieu de `''` pour `Langues parlées` — évite l'erreur PostgreSQL 22P02 "malformed array literal" sur la colonne `TEXT[]`
- `components/supa-prest.js` : conversion `langues_parlees TEXT[]` ↔ CSV string dans `_toAirtableRecord` et `_toSupaRow`

**Résultats de l'audit — toutes sections testées** :

| Section Dashboard | Statut |
|---|---|
| Mon activité, Modifier profil, Portfolio, Photos | ✅ |
| Mon agenda (RDV), Mes posts, **Mes favoris** (fix inline style) | ✅ |
| Mon abonnement, Parrainage, Notifications/Activité | ✅ |
| Mes avis, Mes abonnements | ✅ |
| **WOZALI Match** | ⚠️ `_sb is not defined` — fix local pas encore déployé |
| Trouver un emploi, Mon CV WOZALI, Mes candidatures | ✅ |
| **Mes entretiens** | ⚠️ Server error `/entretien-list` (env var Vercel manquante) |
| Tableau de bord recruteur, Mes offres, Candidatures reçues | ✅ |
| Publier une offre (gating Pro) | ✅ |
| Sécurité (Compte) | ✅ |

| Page Publique | Statut |
|---|---|
| Accueil | ✅ Hero, vedettes, géoloc, countdown récompenses, parrainage |
| Trouver un pro | ✅ Recherche, filtres, map toggle |
| WOZALI Jobs | ✅ Hero, filtres, IA match, WOZALI RECRUTE card |
| Récompenses | ✅ TikTok boost, Bourse de Croissance, Mains d'Or |
| Notre Histoire | ✅ Storytelling, aucun nom fondateur visible |
| Comment ça marche | ✅ 4 personas |
| Mon Fil | ✅ Tabs, empty state |
| Profil public | ✅ Stats, galerie, avis modal, RDV booking |

**Bugs non-bloquants (nécessitent action Vercel)** :
- `mes-entretiens` + `admin-verify` → server error → vérifier env vars Vercel (`ADMIN_EMAILS`, clé Supabase service role si nécessaire)

**Problème Bash détecté** : le shell perd l'accès à `~/Documents` en cours de session (macOS Full Disk Access). Ne pas modifier ce comportement — utiliser le Read/Edit tools de Claude Code directement pour les fichiers.

---

## 🚧 PROCHAINE SESSION — REPRENDRE ICI (mis à jour 2026-05-16)

---

### ✅ SESSION 2026-05-08 → 2026-05-16 — Refonte Récompenses + UX onboarding + Brand

**Lancement décalé** : 8 juin 2026 → **début juillet 2026** (mis à jour partout dans le code + docs)

**~20 commits poussés cette session** :
- Actions manuelles automatisées via Supabase Management API (Confirm email OFF, RLS avis/rdv, site_url update)
- VAPID keys générées + ajoutées à Vercel (push notifications actives en prod)
- Gemini API key régénérée + model `gemini-2.0-flash` → `gemini-2.5-flash`
- Numéro WhatsApp réel `+33743606916` (6 placeholders remplacés)
- Suppression 4 users fantômes Supabase (SQL nuke avec cascade FK)
- Drafts APDP Togo + Bénin + Politique confidentialité (4 fichiers `docs/APDP-*.md`)
- Inventaire marketing 107 features (`docs/MARKETING-INVENTAIRE-FEATURES.md`)
- Purge totale **"Sans piston"** (32 occurrences → 0 — phrase abandonnée par décision fondateur)
- 5 slides onboarding réécrites (narration douleur → solution, parrainage = vrai revenu)
- 2 messages WhatsApp réécrits (douleurs profondes : "travail manque pas, argent circule pas")
- Cascade **Pays → Ville → Quartier** (inscription + edit profil) — `f-pays`/`edit-pays`

**🏆 REFONTE COMPLÈTE BOURSE DES MAINS D'OR (ex-Mur des Reines)**

Nouveau nom validé par fondateur : **"Bourse des Mains d'Or"** (parallèle à "Bourse de Croissance")

3 docs de copywriting livrés par agents recherche net :
- `docs/COPYWRITING-CONCOURS-FEMMES-V2.md` (~10 200 mots, sources OIT/Banque mondiale + storytelling Mariam/Akossiwa/Madame Tchika + 30 hooks)
- `docs/COPYWRITING-RECOMPENSES-V2.md` (~9 287 mots, sources Afrobarometer/OBHDP/Persée + storytelling Kodjo/Awa/Issaka)
- Phrase noyau Bourse : *"Pas le plus connu. Le plus sérieux."*
- Phrase Mains d'Or : *"Une machine Singer neuve coûte 95 000 FCFA. La Bourse des Mains d'Or paie 100 000 FCFA."*

**Sprints refonte technique (3 commits atomiques)** :
1. Sprint 1 — Renommage massif `Mur des Reines` → `Bourse des Mains d'Or` (30 fichiers, 134 occurrences)
2. Sprint 2 — Suppression Battle Bénin vs Togo (page #battle + fonctions JS + nav) + désinscription 6 endpoints jeux (feed-discover, duels-list, badges-list, leaderboard, vote-share, boost-acheter) — fichiers _impl/ conservés
3. Sprint 3 — Migration SQL `20260515_refonte_recompenses.sql` (2 colonnes TikTok + drop 7 tables jeux) + 4 nouveaux endpoints (mdr-eligibilite, mdr-tirage-mensuel, bourse-eligibilite, bourse-tirage-mensuel) + UI page Récompenses refondue

**Nouveau modèle Récompenses validé** :
- **Bourse de Croissance** (300K × 2/mois — 1 Togo + 1 Bénin) : pour pros sérieux/focus/dévoués. 9 conditions (Plan Pro CE mois au lieu de 2 mois, profil complet, Score WOZALI ≥ 80, ≥ 3 avis/30j (au lieu de 4), note ≥ 4.2★/30j, activité ≤ 14j, pas gagné 3 derniers mois, 2 TikTok)
- **Bourse des Mains d'Or** (100K × 2/mois — 1 Togo + 1 Bénin) : pour toutes femmes coiffeuses/couturières (PAS Pro requis). 7 conditions (profil complet, métier alterné mois pair/impair, ≥ 1 photo réalisation sur profil ce mois, ≥ 1 avis sur 30j, activité ≤ 14j, 2 TikTok)
- Tirage **100% aléatoire** le 30 du mois (via cron CRON_SECRET)
- 2 cases TikTok déclaratives (honor system) sur page Récompenses, partagées entre les 2 récompenses
- Section TikTok + 2 checklists dynamiques (ratio X/N) en haut de #page-recompenses
- Décembre : finale annuelle 500K × 2 (Coiffure + Couture)
- **Total versé : 800 000 FCFA/mois** (300K × 2 + 100K × 2)

**Supprimé totalement** :
- Page publique Battle Bénin vs Togo
- Système Mur des Reines original (duels, swipes, points, streaks, badges, boost photo payant)
- 7 tables Supabase (duels_*, streaks_wolo, badges_wolo, boosts_photos, partages_whatsapp)
- 3 fonctions/triggers SQL (maj_streak_user, calc_niveau_user, update_feed_duel_stats)
- 3 vues SQL (hall_of_fame, leaderboard_*)

**Conservé** :
- Top Mains les Plus Demandées (classement passif des coiffeuses/couturières les plus taguées)
- Feed photos avec tag obligatoire de la pro
- Battle H vs F (admin dashboard pour scoreboard Agents terrain WOZALI Hommes/Femmes) — différent de la Battle publique virée

**URLs TikTok placeholders** : `@wolomarket` et `@schealtiellawson` (à créer par fondateur, puis search/replace 30 sec)

**Actions Supabase appliquées (✅ par fondateur)** :
- `20260507_fix_rls_avis_rdv.sql` ✅
- `20260515_refonte_recompenses.sql` ✅

---

### ✅ SESSION 2026-05-07 — Simplification + Sprint sécurité/UX/brand complet

**6 commits poussés ce jour** :
- `fe7e013` — Simplification MVP : retrait Business Suite Phases B→G (89 lignes nettoyées)
- `871ee72` — Sidebar splittée Mon emploi / Je recrute + masquage Mes posts
- `5e544ef` — Sprint 1 vague 1 : sécurité backend + brand purge (Schealtiel/agent/talent)
- `01c7308` — Sprint 1 vague 2 : ~65 escapeHtml + ID mismatch UUID/recXXX
- `51b37be` — Sprint 1 vague 3 : migration JS candidatures Airtable→Supabase
- `b47d082` — Sprint 1 vague 4 : UX fixes Mariam (templates desc, tarif presets, wizard premier pas, race condition init)

**Audits réalisés (3 angles)** :
- UX friction (avatar Mariam coiffeuse apprentie) : 6.3/10 avant fixes, 8/10 après
- Code & sécurité : 5.5/10 avant fixes, 7.5/10 après
- Brand voice : 7/10 avant fixes, 8.5/10 après

**Bugs critiques fixés** :
- 🔒 S1 — Proxy Airtable auth + whitelist tables (PATCH/DELETE require JWT + email match)
- 🔒 S2 — XSS stockée dans rendus (escapeHtml partout : offres, candidatures, profil, favoris, abonnements)
- 🔒 S3 — Migration `20260507_fix_rls_avis_rdv.sql` créée (à appliquer manuellement)
- 🎨 B1 — "Schealtiel" purgé du DOM public (9 occurrences → "WOZALI" / "le fondateur")
- 🎨 B2 — "agent terrain" purgé (11 occurrences → "Agents terrain WOZALI")
- 🎨 B3 — "talent" → "travail" / "pros" (11 occurrences)
- 📅 Date "4 mai" / "18 mai" → "début juillet 2026" partout
- 🔄 ID mismatch UUID Supabase vs recXXX Airtable géré (filtres OR + branches conditionnelles)
- 🔄 loadMesCandidatures, loadCandidaturesRecues, notifyCandidatStatut migrés Supabase + fallback Airtable
- 🪄 Inscription step 2 : description optionnelle + 16 templates métier, tarif en 5 presets, statut artisan obligatoire pour métiers configurés
- 🚀 Wizard "Premier pas" dashboard J+0 à J+7 (3 cards : Photos, GPS, Partage WhatsApp)
- 💬 Toasts génériques "Erreur" → brand voice ("Ça a calé. Réessaie dans 2 secondes.")
- ⚡ Race condition init scripts fixée : 6 helpers Supabase chargés AVANT bloc inline

---

### 🔴 ACTIONS MANUELLES CRITIQUES AVANT DÉBUT JUILLET (status au 2026-05-16)

```
✅ 1. "Confirm email" OFF Supabase                                       (via API Management)
✅ 2. Migration 20260507_fix_rls_avis_rdv.sql                           (appliquée)
✅ 3. Numéro WhatsApp +33743606916 (6 occurrences remplacées)
✅ 4. VAPID keys (Vercel env Production)
✅ 5. Gemini API key régénérée + model 2.5-flash
✅ 6. Migration 20260515_refonte_recompenses.sql                        (appliquée)
⏳ 7. Créer comptes TikTok @wolomarket + @schealtiellawson + me donner URLs (~5 min)
⏳ 8. Tests E2E 4 personas en navigation privée                          (30 min — à faire ensemble)
⏳ 9. RCCM Togo (en attente carte ID togolaise)                          (30 min CFE)
⏳ 10. APDP Togo + Bénin (drafts prêts dans docs/APDP-*.md)              (1-2h après RCCM)
```

### 🟠 RESTE À FAIRE (V1.1 post-lancement)
- 8 majeurs identifiés dans audit code (gating Pro côté serveur, findByEmail lowercase, race condition init partielle, etc.)
- Frictions UX secondaires (date naissance 3 dropdowns, hero cinématique perf 3G, multi-employeur)
- signalement.js contextLabel (composant externe)
- Refactor variable CSS `--vert` → `--or` (cosmétique)
- Cron Vercel pour tirage mensuel automatique (mdr-tirage-mensuel + bourse-tirage-mensuel) — Vercel Hobby = 1 cron/jour, à orchestrer
- Cascade Pays/Ville/Quartier sur page Recherche client (search) — actuellement ancien dropdown mélangé

---

### 🔴 Inscription — EN COURS DE FIX (reprendre ici en priorité)

**Commits pushés en session 2026-04-30 :**
- `9eee635` — Migration `20260430_fix_auth_trigger.sql` appliquée via Supabase SQL Editor ✅ + auto-signIn dans submitInscription
- `2f97289` — Fix cas "already registered" dans auto-signIn

**Action manuelle EN ATTENTE (critique) :**
→ Supabase Dashboard > projet Wolo > **Authentication > Settings > Email** > désactiver **"Confirm email"** > Save
→ SANS ça le signUp retourne session=null et supaPrest.create() peut encore échouer

**Quand on reprend :**
1. Vérifier que "Confirm email" est OFF dans Supabase Auth Settings
2. Tester inscription complète (nouvel email) sur wozali.vercel.app
3. Vérifier profil créé dans Supabase > Table Editor > `wolo_prestataires`
4. Tester login avec le compte créé → dashboard doit s'ouvrir

**Erreurs résolues en session :**
- "Database error saving new user" : trigger handle_new_auth_user() résilient (EXCEPTION blocks par INSERT)
- "PUBLIC_API_BILLING_LIMIT_EXCEEDED" : auto-signIn force session avant insert Supabase → élimine fallback Airtable

---

### 🔴 Actions manuelles avant lancement début juillet

```
✅ 0. Migration 20260430_fix_auth_trigger.sql appliquée dans Supabase SQL Editor
⏳ 1. Désactiver "Confirm email" dans Supabase Auth Settings             (2 min)
⏳ 2. Générer VAPID keys + add Vercel env (push notifications)           (5 min)
⏳ 3. Régénérer Supabase PAT + Gemini API key (sécurité credentials)     (5 min)
⏳ 4. Test inscription end-to-end 4 personas (BLOQÉ jusqu'au fix email)  (30 min)
⏳ 5. Remplacer numéro WhatsApp placeholder +22890000000                  (2 min)
⏳ 6. Déclaration APDP Togo + Bénin (RGPD local légal)                   (1-2h)
```

### Détail action 1 — VAPID keys (push notifications PWA)
```bash
cd /Users/schealtiellawson/Documents/04\ -\ WOZALI\ MARKET/Projet/wolomarket/repo
npx web-push generate-vapid-keys
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel deploy --prod --yes
```
Sans ça, push notifs tombent en silence (mais Boîte Fondateur + email Resend continuent à fonctionner).

### Détail action 2 — Régénérer credentials exposés en chat
- 🔗 https://supabase.com/dashboard/account/tokens → revoke ancien + nouveau
- 🔗 https://aistudio.google.com/app/apikey → delete + créer + `vercel env rm/add GEMINI_API_KEY production`

### Détail action 3 — Tests E2E 4 personas (à faire ensemble next session)
Pour chaque persona, créer compte sur https://wozali.vercel.app/ et vérifier :
- ✅ Bloc Statut adapté au métier apparaît à l'inscription
- ✅ Message Schealtiel apparaît dans dashboard "Mon activité" dès J+0
- ✅ Pas d'erreur JS console (F12 → Console)

| Persona | Métier | Quartier | Statut à choisir |
|---|---|---|---|
| Mariam | Coiffeuse | Bè (Lomé) | Apprentie |
| Kodjo | Mécanicien moto | Akpakpa (Cotonou) | Patron de garage |
| Akossiwa | Photographe | Lomé | Freelance débutant |
| Madame Adjo | Restaurant | Cotonou | Patronne |

Vérifier aussi :
- Recruteur publie offre → candidat postule → IA score → CSV export → entretien
- Client cherche prestataire → réserve table / demande devis chantier → message Boîte Fondateur arrive au pro

### Détail action 4 — Numéro WhatsApp placeholder
Dans `repo/index.html` chercher `22890000000` (placeholder du bouton "Parler à Schealtiel"). Remplacer par vrai numéro WhatsApp Business + `git push` + redeploy.

### Détail action 5 — APDP
- Togo : https://apdp.gouv.tg/
- Bénin : https://apdp.bj/

### 🟠 Actions optionnelles (peuvent attendre post-lancement)
- ☐ Activer Meta WhatsApp Cloud API (vrai push WhatsApp — sinon Boîte Fondateur seule)
- ☐ MoU partenariat ONG (Bluemind / Heal by Hair / ProEmploi) — risque concurrentiel V2
- ☐ Domaine custom wolomarket.com → pointer vers Vercel
- ☐ Comptes social media + Make.com automation
- ☐ Sauvegarder rapports stratégiques (3 .md du dossier parent) dans `repo/docs/` pour git-track

### 📊 État au 29 avril 2026 (fin session)

**Code en prod (https://wozali.vercel.app)** :
- Dernier deploy : `db5a400` Ready
- 4 commits poussés ce jour : `f0761b9`, `1c5f3ba`, `2580dc3`, `db5a400`
- Migration Airtable→Supabase **code livré** (helpers + 6 fonctions refactorées avec fallback)
- PWA + push notifications **prêts** (manque VAPID keys env)
- Monitoring + alerting **opérationnel**
- Dashboard recruteur UX final (CSV + tri IA + filtres avancés)
- Top Mains + Battle Bénin vs Togo **publics**
- Système Statut socio-économique 60+ métiers AOC
- Boîte du Fondateur (157 templates / 35 séquences)
- Widgets métier (9 verticales auto-injectées)

**DB Supabase prod** :
- 50+ tables wolo_*, ai_cache, push_subscriptions, errors_log, etc.
- 157 templates WhatsApp/Inbox seedés (8 familles métier × 3-4 statuts)
- 49 statuts socio-économiques acceptés (constraint élargi)

**Reste à faire en V1.1 (post-lancement)** :
- ⏳ Page "Mon emploi" employé (audit final inachevé — agent stallé)
- ⏳ Mécanique tag obligatoire UI raffinée (badge "Mains d'Or" en classement)
- ⏳ Tests de compétences par métier (V1.1)
- ⏳ Multi-employeurs (V1.1)

---

## ✅ SESSION 2026-04-29 — Top Mains les Plus Demandées + Battle Bénin vs Togo (gameplay public viral)

Deux features publiques virales adossées au Bourse des Mains d'Or.

### Endpoint `/api/wolo-pay/top-mains-list` (public)
Classement mensuel des coiffeuses/couturières les plus taguées sur les photos du Bourse des Mains d'Or.
- Query : `?categorie=coiffure|couture` `?pays=BJ|TG` `?mois=YYYY-MM` `?limit=10`
- Source : `feed_photos` (group by `tag_pro_user_id` filtré par `mois` + `categorie` + `video_validee=true`) enrichi par `wolo_prestataires`
- Renvoie : `{ ok, mois, categorie, pays, pros: [{ user_id, nom, photo_profil, metier, ville, pays, count, rang, emoji }] }` (top 1-3 = 👑🥈🥉, 4+ = ⭐)
- Implémentation : `api/wolo-pay/_impl/top-mains-list.js`

### Endpoint `/api/wolo-pay/battle-score` (public)
Scoreboard public Bénin vs Togo agrégé sur le mois courant.
- Source : `wolo_prestataires` (classement ville → pays), `feed_photos` (mois courant + pays), `duels_photos` (votes attribués au pays de la photo gagnante), `wolo_awards` (gagnantes du mois)
- Score = `prestataires*1 + photos*3 + votes*1 + gagnantes*50`
- Renvoie : `{ ok, mois, benin: {...}, togo: {...}, leader: 'BJ'|'TG'|'tie', score_total, updated_at }` + top 5 villes par pays
- Implémentation : `api/wolo-pay/_impl/battle-score.js`

### Câblage router
Les 2 endpoints sont importés dans `api/wolo-pay/[action].js` et déclarés dans `PUBLIC_ACTIONS`. Pas de nouveau fichier dans `api/*/` (Vercel Hobby reste à 12/12 functions).

### Page publique `#battle` (page-battle)
- Header dramatique "🇧🇯 BÉNIN vs TOGO 🇹🇬" + banner leader live
- 2 cards côte-à-côte (prestataires actifs / photos du Mur / votes / Reines du mois) avec halo or sur le pays leader
- CTA partage WhatsApp viral : "🇧🇯 BÉNIN MÈNE BÉNIN MÈNE 🇧🇯 sur WOZALI Market — viens voter pour ton pays" (texte adaptatif selon leader)
- Top 5 villes par pays (cards séparées Bénin/Togo)
- Auto-refresh chaque heure via `setTimeout` + check `page-battle.active`
- JS : `window.loadBattlePage()`, `window.shareBattleWhatsApp()`, `window._battleData`

### Section "Top Mains les Plus Demandées" sur page Récompenses
Ajoutée dans `#page-recompenses`, juste après la section Bourse des Mains d'Or, avant la Finale Annuelle Décembre. Filtres catégorie (coiffure/couture) + pays (Tous/BJ/TG). Podium top 3 visuel + liste rangs 4-10. Click pro → `goToPro(userId)` (fallback `showProfil` ou `search`).
- IDs DOM : `#recomp-top-mains` `#topmains-filters` `#topmains-podium` `#topmains-list` `#topmains-empty`
- JS : `window.loadTopMains()`, `window._topMainsState`, `_tmRefreshButtons()`
- Auto-déclenché au début de `loadPageRecompenses()`

### Navigation
- Desktop nav : bouton "🇧🇯 vs 🇹🇬" ajouté entre Récompenses et boutons auth
- Mobile nav : bouton "🇧🇯 vs 🇹🇬 Battle" ajouté sous Récompenses
- `publicPages` : `'battle'` ajouté à la liste
- `showPage` : `if (page === 'battle') loadBattlePage();`

### URLs
- `https://wolomarket.com/#battle` — page publique Battle
- `https://wolomarket.com/#recompenses` (section Top Mains intégrée)
- `https://wolomarket.com/api/wolo-pay/top-mains-list?categorie=coiffure&pays=BJ&limit=10`
- `https://wolomarket.com/api/wolo-pay/battle-score`

## ✅ SESSION 2026-04-29 — Notifications Push Web (PWA / VAPID)

Notifications push natives dans le navigateur + sur mobile installé en PWA. Quand un nouveau message inbox est créé (whatsapp-flush → fallback inbox), une notif push est envoyée à toutes les souscriptions du user. Stack 100% gratuite : VAPID + library `web-push` (npm) + Service Worker natif. **Aucun service tiers** (pas de FCM, pas de OneSignal).

### Migration SQL
- `supabase/migrations/20260429_push_subscriptions.sql` — table `wolo_push_subscriptions` (id, user_id FK auth.users, endpoint UNIQUE, p256dh_key, auth_key, user_agent, created_at, updated_at) + RLS self-only (SELECT/INSERT/UPDATE/DELETE) + trigger updated_at.

### Endpoints (consolidés dans `/api/wolo-pay/[action].js`)
- `POST push-subscribe` — auth requise, enregistre la souscription du user (upsert sur endpoint).
- `GET push-vapid-public` — public, retourne la VAPID public key.
- `POST push-send` — public mais protégé par `CRON_SECRET` header. Sert aux tests manuels. La prod l'appelle via l'export `sendPushToUser()` du module `_impl/push-send.js`.

Module `_impl/push-send.js` : import dynamique de `web-push`, configuration VAPID lazy, parcours des souscriptions du user, supprime auto les endpoints morts (404/410).

### Service Worker (`sw.js` v2)
Écoute `push` → `showNotification(title, { body, icon, badge, tag, data: { url } })`.
Écoute `notificationclick` → focus la fenêtre WOZALI existante (et navigue vers l'URL data.url) ou en ouvre une nouvelle (`/#dashboard` par défaut).

### Frontend (`index.html`)
- Card "🔔 Active les notifications" en haut de `ds-notifications` (Activité), affichée via `updatePushCard()` quand l'utilisateur ouvre la section.
- Fonction globale `enablePushNotifications()` :
  1. Demande la permission Notification ;
  2. Récupère la VAPID key via `/api/wolo-pay/push-vapid-public` ;
  3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` ;
  4. POST sur `/api/wolo-pay/push-subscribe` avec le JWT Supabase via `woloFetch()`.
- Auto-prompt 1× après login (`_maybeAutoPromptPush`) → toast discret 6s après ouverture, suggère la card. Pas de popup natif intempestif.

### Hook côté serveur
`_impl/whatsapp-flush.js` appelle `sendPushToUser()` quand un message tombe dans l'inbox du fondateur (fallback inbox). Best-effort, ne bloque pas le flush en cas d'échec push. La VAPID private key reste serveur uniquement (jamais frontend).

### Variables d'env Vercel à ajouter (CRITIQUE pour activer la feature)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (optionnel, défaut `mailto:contact@wolomarket.com`)

Génération :
```bash
npx web-push generate-vapid-keys
# → copier publicKey + privateKey dans Vercel env (Production + Preview)
```

Sans ces clés, `push-vapid-public` retourne 503 et `sendPushToUser` retourne `{ sent: 0 }` silencieusement (pas d'erreur, le flux inbox/email continue).

### Dépendance npm ajoutée
`package.json` : `"web-push": "^3.6.7"`. Vercel installe automatiquement au build. Pas d'augmentation du nombre de fonctions Vercel (tout consolidé dans le router `[action].js`).

### Pré-requis prod
1. Appliquer `20260429_push_subscriptions.sql` sur Supabase prod (Management API ou SQL Editor).
2. Générer + ajouter `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` dans Vercel env (Production + Preview).
3. `npm install` local pour MAJ `package-lock.json` avant push (Vercel build le fera de toute façon).
4. Redeploy Vercel.

### Test manuel
1. Ouvrir https://wolomarket.com → login → dashboard → "Mon activité".
2. Cliquer "Activer" sur la card or 🔔 → permission navigateur → souscription enregistrée.
3. POST `/api/wolo-pay/push-send` avec header `X-Cron-Secret: <CRON_SECRET>` et body `{"user_id":"<uuid>","title":"Test","body":"Hello"}` → notification visible immédiatement (même app fermée si PWA installée).
4. Sur Chrome desktop : `chrome://settings/content/notifications` pour révoquer/diagnostiquer.

### TODO V1.1 / V1.2
- Sur iOS : Web Push ne fonctionne **que** si l'utilisateur a installé la PWA via "Ajouter à l'écran d'accueil" (Safari 16.4+). Communiquer ça dans la card si user iOS détecté.
- Hook les autres événements vers push : `notifyCandidatStatut`, `notifyCandidatEntretien`, nouveaux likes/commentaires importants.
- Rate-limit côté serveur (max 5 push / user / heure pour éviter le spam si bug ailleurs).
- Toggle fin "Quels types de notifications recevoir" dans Préférences.

---

## ✅ SESSION 2026-04-29 — Dashboard Recruteur : Polish UX final (Sprints A→F++)

Polish UX final livré sur la section `ds-recrut-candidatures` (lignes ~7674-7790) avant lancement.

### Ajouts UI (HTML)
Nouvelle 2ᵉ rangée de filtres juste sous la barre existante (offre / statut / quartier / recherche) :

- `recrut-cand-filter-age` — Tranche d'âge : 18-25 / 26-35 / 36-45 / 45+
- `recrut-cand-filter-exp` — Expérience : Junior (0-2) / Confirmé (3-5) / Senior (5+)
- `recrut-cand-filter-distance` — Distance candidat ↔ offre : <2 km / 2-5 km / >5 km / Même quartier
- `recrut-cand-sort` — Tri : Récent (défaut) / 🤖 Score IA ↓↑ / ⚡ Score WOZALI ↓ / Plus ancien
- Bouton `↺ Reset` pour vider tous les filtres + tri

Un bouton `⤓ Export CSV` vert a été ajouté dans la barre actions à côté de "🤖 Scorer en lot".

### Ajouts JS (~ligne 18505)
- `recrutCandSort` (état tri courant) + `recrutCandFiltered` (cache du dernier rendu, source de l'export)
- `_woloAiScoreFor(c)` — lit le champ `Score IA` / `score_ia` persisté, fallback cache local `window.woloAi.getCachedScore`
- `_woloAgeFromDateNaissance(dateIso)` — calcul d'âge précis
- `_WOZALI_QUARTIER_COORDS` + `_woloDistanceQuartiers(qA, qB)` — distance haversine entre quartiers Lomé / Cotonou (~30 quartiers couverts)
- `_sortRecrutCandidatures(list, mode)` — applique le tri demandé, gère les nulls IA (renvoyés en fin)
- `setRecrutCandSort(mode)` / `resetRecrutFilters()` — handlers UI
- `_saveRecrutFilters()` / `_restoreRecrutFilters()` — persistance localStorage sous la clé `wolo_recrut_filters_<user_id>` (offre, statut, quartier, search, age, exp, distance, sort, view)
- `_csvEscape(v)` + `exportCandidaturesCSV()` — export du tableau filtré, BOM UTF-8 pour Excel, fichier `candidatures-recues-YYYY-MM-DD.csv`, colonnes : Date · Nom · Métier · Quartier · Score WOZALI · Score IA · Statut · Offre · WhatsApp

### Câblage
- `loadCandidaturesRecues()` appelle `_restoreRecrutFilters()` avant le fetch pour restaurer la session précédente
- `filterRecrutCandidatures()` applique les 3 nouveaux filtres + le tri, alimente `recrutCandFiltered`, sauvegarde l'état
- `setRecrutCandView()` sauvegarde le mode grille/tableau

### Champs Airtable lus (Candidatures)
- `Candidat Date naissance` (ou `Candidat Date de naissance` en fallback)
- `Candidat Années expérience` (avec fallbacks `Candidat Annees experience`, `Candidat Experience`)
- `Candidat Quartier` + `Offre Quartier` (ou `Quartier Offre`, `Quartier`)
- `Score IA` / `score_ia` + cache `window.woloAi`
- Existants : `Candidat Nom/Métier/Score WOZALI/Photo/WhatsApp/ID`, `Offre ID/Titre`, `Statut`, `Date candidature`

### Tests rapides
1. **Export CSV** : ouvrir `ds-recrut-candidatures`, appliquer un filtre, cliquer ⤓ Export CSV → fichier téléchargé avec virgules + accents corrects.
2. **Tri Score IA** : cliquer "🤖 Scorer en lot" puis dropdown Tri → Score IA ↓ → les cards remontent par score décroissant ; les non-scorés vont en fin.
3. **Filtres avancés** : sélectionner Tranche d'âge 26-35 + Expérience Confirmé + Distance <2 km combinés → KPI fixes mais le compteur "X candidatures" descend.
4. **Persistance** : changer filtres + tri, recharger la page, revenir sur la section → filtres restaurés.
5. **Reset** : cliquer ↺ Reset → tous les filtres se vident, tri = Récent.

## 🚧 SESSION 2026-04-28 — Refonte Bourse des Mains d'Or + suppression King & Queen

### Ce qui a été livré aujourd'hui (en code, NON committé)
- **3 migrations Supabase appliquées en prod** via Management API : `wolo_prestataires`, `ai_infrastructure` (ai_cache, ai_quota_log), `messagerie_entretiens` (wolo_threads, messages, entretiens, signalements, message_templates). Vérification : 22 tables `wolo_*`/`ai_*` présentes en prod.
- **Migration `20260416_sprint14_mur_des_reines.sql` skippée** (référence table `profiles` au lieu de `wolo_prestataires` — schéma incompatible, à reprendre si on relance feed_photos).
- **GEMINI_API_KEY ajoutée à Vercel prod** + redeploy effectué (déploiement `dpl_7xcSUEdqLCQMuYMR5gpsXbLkAehk`).
- **Suppression complète King & Queen WOZALI** de `index.html` (sidebar, sections, page-king-queen, FAQ, footer, recompenses, onboarding tour, ToS, meta SEO, publicPages, showPage, script include). Page route + composant orphelins. Le fichier `components/king-queen.js` n'est plus chargé mais n'est PAS supprimé (au cas où).
- **Refonte copy La Bourse des Mains d'Or** :
  - Pricing : 50K → **100 000 FCFA × 2 Reines/mois** (1 Bénin + 1 Togo, alternance Coiffure mois impair / Couture mois pair)
  - **Finale annuelle décembre** : 500K × 2 (Reine de l'Année Coiffure + Reine de l'Année Couture, Bénin vs Togo)
  - **Ouvert à toutes les femmes B/T** (pas Pro-only, c'est l'outil d'acquisition). Bourse de Croissance reste Pro-only.
  - Hero rewrite : *"Ta grand-mère a tressé pour nourrir. Ta mère a cousu pour t'envoyer à l'école. Maintenant c'est ton tour. Et le pays regarde."*
  - 6 nouveaux blocs dans `components/mur-des-reines.js` : stakes (100K = trimestre loyer), comment ça marche (3 photos + tag + duels), calendrier 3 phases (1-15 / 16-25 / 26-30), diaspora, finale annuelle décembre, bonus invisibles (profil épinglé, badge à vie, priorité Bourse).
  - Onglets renommés : Le feed → À la Une / Découvrir → Les Duels / Le podium → Le Podium / Mon mur → Mes Photos.
  - Modale upload : 3 photos (multi), **tag obligatoire** de la coiffeuse/couturière, disclaimer consentement modèle.
  - CTA partout : "Entrer sur la Bourse des Mains d'Or →" → "Poste ta photo · Deviens Reine du mois →"

### ✅ V1.1 livré dans cette même session (2026-04-28 suite)
1. **Storytelling apprenties** ✅ — section À Propos *"L'invisible dans l'invisible"* avec citation *"Tu as payé 80 000 FCFA à Madame Adjo... WOZALI Market c'est ton lundi toute la semaine"* + bloc 5 bénéfices.
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
2. Plan Pro Salon 5 000 F lancé début juillet OU repoussé V1.1 ?
3. Module "Mon premier client" subventionné -30% (budget 30K F/mois) — activer dès début juillet ?
4. MoU partenariat ONG (Bluemind/Heal by Hair/ProEmploi) avant début juillet pour anticiper concurrence ?
5. Bourse des Mains d'Or : ancrer le récit dans la **technique métier** (pas la beauté physique) pour éviter dérive concours de beauté.

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
- King & Queen tué (redondance avec MdR)
- Bourse des Mains d'Or pivote en outil d'acquisition massive (ouvert à toutes les femmes B/T, pas Pro-only)
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
- https://wozali.vercel.app → Inscription (3 étapes)
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

## ✅ LIVRÉ — WOZALI Business Suite (Phases A → G, commit 58ff6dc)

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
- Polymorphie : un compte WOZALI cumule patron + employé + solo + candidat

## ✅ LIVRÉ — Sprint 14 : La Bourse des Mains d'Or (Gamification Awards)

Refonte complète de WOZALI Awards → "La Bourse des Mains d'Or". Toutes les femmes (pas que les pros) postent coiffure/couture, la communauté vote, 2 Reines du mois gagnent 50K FCFA chacune.

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
- "WOZALI Awards" → "La Bourse des Mains d'Or" partout dans index.html
- Storytelling : "Ta grand-mère t'a appris. Ta mère t'a appris. Maintenant, le monde regarde."
- Hashtags : #MurDesReines #ReineWOZALI #TalentAfricain
- Email template : `emails/08-wolo-awards.html`
- Kit réseaux : `content/kit-reseaux-lancement.md` (10 scripts TikTok REINE01-10)

## ✅ LIVRÉ — King & Queen WOZALI

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

Conversion de WOZALI Pay → virement bancaire dans Business Suite Paie :
- `paie-dashboard.js` : checkbox "Viré" au lieu de bouton payer, `marquerVirement()` remplace `payerEmploye()`
- `equipe-dashboard.js` : champ IBAN dans modal invitation + modal détail employé avec édition IBAN/salaire
- `paie-pay.js` : méthode = "Virement bancaire"
- Champ IBAN dans table Airtable `Employes`

## ✅ LIVRÉ — Nettoyage WOZALI Pay

- 20 fichiers supprimés (17 `_impl/` + 3 libs mortes)
- CSS mort retiré (#page-paiement-client, WOZALI Pay Hero)
- Fonctions JS mortes retirées (woloNotifTransfert, checkPaymentUrl)
- Sidebar dashboard : "Finances" → "Mon abonnement" + groupe "Récompenses" séparé
- Footers : "Devenir Agent" retiré, "À propos" → "Notre Histoire"

## ✅ LIVRÉ — Hotfixes post-déploiement

### Bug critique : `</script>` dans les template literals
Deux template literals JS (QR code `printQRCode()` et CV print `emploi-cv`) contenaient des balises `<script>` FedaPay SDK non échappées. Le navigateur les interprétait comme la fermeture du bloc `<script>` principal → tout le JS après était parsé comme du HTML → modal "Ajouter comme agent" apparaissait, template literals (`${r.nom}`) affichés en clair, site cassé.
- Fix : retrait des doublons FedaPay (le vrai SDK est en fin de fichier lignes 24760-24761)
- Failsafe overlay : le loader `#wolo-init-overlay` se retire après 5s même si `initAuth()` échoue

### `checkPaymentUrl()` manquante
Fonction supprimée avec le nettoyage WOZALI Pay mais encore appelée dans le bloc d'init → erreur fatale JS. Retirée des appels `DOMContentLoaded`.

### Retry Airtable 429 (rate limit)
Airtable free tier = 5 req/s. Le dashboard envoie trop de requêtes en parallèle → 429 → `currentPrestataire = undefined` → "Profil non trouvé".
- `api/airtable-proxy.js` : retry automatique (2 tentatives, backoff 1.2s/2.5s)
- `loadCurrentPrestataire()` : retry côté frontend (3 tentatives, backoff progressif)
- ⚠️ **Problème partiellement résolu** — à investiguer si le profil public reste instable

## Projet

WOZALI Market (anciennement KalaTogo) — Application web SPA pour trouver des prestataires de services au Bénin et au Togo. Un seul fichier `index.html` (~24 700 lignes). Déployé sur Vercel à https://wozali.vercel.app.

## Commandes

```bash
# Servir en local (depuis le dossier parent)
python3 serve.py  # → http://localhost:3000/repo/

# Déployer (push auto-deploy Vercel)
git add index.html
git commit -m "description"
git push

# Panel admin (nécessite un compte Supabase admin + ?admin dans l'URL)
# https://wozali.vercel.app?admin
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

## Charte visuelle WOZALI Market

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
| `wolo_awards` | Candidatures WOZALI Awards (100k FCFA). Champs : user_id, mois, pays (BJ/TG), video_url, video_validee, nb_votes, gagnant, vice_champion |
| `votes_awards` | Votes (1 vote/personne/mois). UNIQUE(votant_id, mois) |
| `gains_recompenses` | Historique des gains versés. Types : bourse_croissance, wolo_awards |
| `agents_terrain` | Agents de terrain pour le lancement. Champs : user_id, airtable_id, nom, telephone, email, ville (Lomé/Cotonou), genre (H/F), code_parrainage, actif. Backup Airtable via syncToAirtable(). |

## WOZALI Jobs — Tables Airtable

| Table | Champs clés |
|---|---|
| `Offres d'Emploi` | Titre, Métier, Quartier, Ville, Type de contrat, Description, Salaire min/max FCFA, Recruteur ID/Nom/WhatsApp/vérifié, Active, Vues, Nb candidatures, Photo 1/2/3, Expérience requise, Urgente, Télétravail, Date expiration |
| `Candidatures` | Offre ID/Titre, Candidat ID/Nom/Métier/WhatsApp/Score WOZALI/Photo, Message, Statut (En attente/Vue/Retenue/Refusée), Date candidature, Recruteur ID/Nom |

### Sections dashboard WOZALI Jobs
```
showDashSection('emploi-mode')          → toggle disponibilité emploi
showDashSection('emploi-candidatures')  → mes candidatures envoyées
showDashSection('emploi-cv')            → mon CV WOZALI (preview)
showDashSection('recrut-publier')       → publier une offre
showDashSection('recrut-offres')        → mes offres publiées
showDashSection('recrut-candidatures')  → candidatures reçues
```

### Fonctions JS clés WOZALI Jobs
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
- **Codes parrainage** : préfixe `WOZALI`, format `WOZALIxxxx1234`.
- **Admin** : accès panel admin via `?admin` dans l'URL + authentification Supabase (vérifié côté serveur via `/api/admin-verify`). Les emails admin sont dans la variable d'environnement `ADMIN_EMAILS`.
- **Agents Terrain** : section dashboard admin-only (`showDashSection('agents-terrain')` et `showDashSection('battle')`). Recherche prestataire par téléphone/nom, ajout comme agent avec ville + genre. Scoreboard Battle H vs F. API : `/api/wolo-pay/agents-terrain` (POST, actions: list/search/add/remove/update).

## Score WOZALI (max 100 pts) — Sprint 7

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
