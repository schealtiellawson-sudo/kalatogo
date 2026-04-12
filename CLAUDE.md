# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

WOLO Market (anciennement KalaTogo) — Application web SPA pour trouver des prestataires de services au Bénin et au Togo. Un seul fichier `index.html` (~14 000 lignes, ~2 MB). Déployé sur Vercel à https://wolomarket.vercel.app.

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

### Tables Supabase (Sprint 7 — Récompenses)

| Table | Description |
|---|---|
| `bourse_croissance` | Éligibilité + tirages mensuels (300k FCFA). Champs : user_id, mois, eligible, score_wolo, nb_avis, note_moyenne, pro_mois_consecutifs, gagnant |
| `wolo_awards` | Candidatures WOLO Awards (100k FCFA). Champs : user_id, mois, pays (BJ/TG), video_url, video_validee, nb_votes, gagnant, vice_champion |
| `votes_awards` | Votes (1 vote/personne/mois). UNIQUE(votant_id, mois) |
| `gains_recompenses` | Historique des gains versés. Types : bourse_croissance, wolo_awards |

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
