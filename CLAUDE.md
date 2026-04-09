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

# Panel admin
# https://wolomarket.vercel.app?admin=WOLO2025
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
- **Admin secret** : `WOLO2025` — accès panel admin via `?admin=WOLO2025`.

## Score WOLO (max 100 pts)

```
completion × 0.30     (max 30) — % profil rempli
note/5 × 25           (max 25) — note moyenne
min(nbAvis × 2, 15)   (max 15) — nombre d'avis
photos                (max 10) — photos de réalisations
min(floor(vues/10),10)(max 10) — vues du profil
min(nbAvisTexte×2,10) (max 10) — avis avec commentaire texte
```

## Paiement Pro — flux

1. Prestataire clique "Passer au Pro" → code `WOL-XXXXXX` généré + sauvé dans Airtable
2. Modal affiche placeholder "Paiement sécurisé via FedaPay (bientôt disponible)" + code de référence
3. Prestataire envoie 2 500 FCFA
4. Admin sur `?admin=WOLO2025` → voit demandes en attente → active
5. Airtable passe `Abonnement: Pro`, efface `Code Paiement`

## Plans tarifaires

- **Base** : Gratuit — fonctions limitées, parrainage verrouillé
- **Pro** : 2 500 FCFA/mois — tout débloqué, parrainage actif
- **Commission parrainage** : 40% = 1 000 FCFA/filleul Pro/mois
