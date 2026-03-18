# KalaTogo — Contexte Projet pour Claude

## C'est quoi ?
Application web SPA (Single Page App) pour trouver des prestataires de services au Togo.
Un seul fichier : `index.html` (~9500+ lignes). Navigation via `showPage()` / `showDashSection()`.

## Stack technique
- **Frontend** : HTML/CSS/JS vanilla, tout dans `index.html`
- **Auth** : Supabase (`https://wikgdksyeygwpmqzmhez.supabase.co`)
- **Base de données** : Airtable (base `applmj1RDrJkR8C4w`)
- **Photos** : ImgBB (upload)
- **Crop photos** : Cropper.js v1.6.2 via cdnjs
- **Cartes** : Leaflet.js (mini-map GPS sur profil)
- **Paiement** : Manuel Flooz/TMoney numéro `97473040` + validation admin Airtable (FONCTIONNEL)
- **Déploiement** : Vercel → `https://kalatogo.vercel.app`

## Tokens / Clés
```
Airtable token : patFdOUZvtxsOmvpH.a21aaa9924b0c94587faa3dd58b227da7702ffded3201589a9f0308732fc2474
Airtable base  : applmj1RDrJkR8C4w
Supabase URL   : https://wikgdksyeygwpmqzmhez.supabase.co
Supabase key   : sb_publishable_sakHYR_n46YFOq4msulssg_ahtXvacU
Admin panel    : kalatogo.vercel.app?admin=KALA2025
Numéro Flooz/TMoney KalaTogo : 97473040
```

## Tables Airtable
| Table | Champs principaux |
|---|---|
| `Prestataires` | Nom complet, Email, Métier principal, Quartier, Description des services, Photo Profil, Photo Réalisation 1/2/3, Albums (Long text JSON), Abonnement, Code Paiement, Plan Demande, Code Parrainage, Parrain Code, Commission totale payée FCFA, GPS Lat, GPS Lon, Disponible maintenant, Notifications (Long text JSON), Résumé Profil IA, WhatsApp, Numéro de téléphone, Genre, Âge, Date de naissance |
| `Rendez-vous` | Prestataire ID, Client Nom, Client Email, Client Téléphone, Date, Heure, Statut, Message |
| `Avis` | Prestataire ID, Auteur, Note, Commentaire, Date |
| `Clients` | User ID, Nom, Email, Photo |
| `Posts` | Prestataire ID, Contenu, Date, Likes, Likeurs (JSON), Commentaires (JSON) |
| `Favoris` | User ID, Prestataire Favori ID, Nom Prestataire, Date |
| `Photos Avis` | Prestataire ID, Slot, Photo URL, Likes, Likeurs (JSON), Commentaires (JSON) |
| `Abonnements` | Abonné ID, Prestataire ID, Date |

## Architecture navigation
```
showPage('home')        → page d'accueil
showPage('search')      → recherche prestataires
showPage('profil')      → profil public prestataire
showPage('dashboard')   → tableau de bord connecté
showPage('login')       → connexion
showPage('inscription') → inscription
showPage('fil')         → fil d'actualité (posts des prestataires suivis)

showDashSection('profil')            → modifier son profil
showDashSection('photos')            → gérer ses photos/albums
showDashSection('rdv')               → ses rendez-vous
showDashSection('posts')             → ses publications
showDashSection('favoris')           → ses favoris sauvegardés
showDashSection('avis')              → ses avis reçus
showDashSection('parrainage')        → son parrainage
showDashSection('notifications')     → ses notifications
showDashSection('abonnement')        → son abonnement (paiement Pro)
showDashSection('abonnements')       → les prestataires que l'on suit
showDashSection('paiement')          → encaisser un paiement client
showDashSection('historique-paiements') → historique paiements reçus
```

## Fonctionnalités implémentées
- ✅ Inscription / Connexion / Mot de passe oublié (Supabase)
- ✅ Profil public prestataire (photos, avis, RDV, map, posts)
- ✅ Recherche avec filtres (métier, ville, disponibilité)
- ✅ Dashboard complet (modifier profil, GPS, disponibilité)
- ✅ Système de RDV avec calendrier
- ✅ Posts / Publications avec likes et commentaires
- ✅ Notifications (vues, avis, RDV, likes, favoris, photos, suivi)
- ✅ Parrainage avec commissions (40% abonnement filleul)
- ✅ Favoris (sauvegarder un profil)
- ✅ Likes et commentaires sur photos de profil
- ✅ Gestion albums/photos depuis le dashboard
- ✅ Recadrage photo (Cropper.js)
- ✅ Score KALA (jauge 0-100 : completion + note + nb avis + photos + vues + commentaires texte)
- ✅ Système de suivi (Follow) — table Abonnements Airtable
- ✅ Bouton Suivre / Suivi avec feedback visuel immédiat (optimistic UI)
- ✅ Compteur abonnés sur profil public
- ✅ Page "Mon Fil" (page-fil) — publications des prestataires suivis, accessible depuis la nav principale
- ✅ Paiement Pro manuel Flooz/TMoney (numéro 97473040, code unique KAL-XXXXXX, validation admin)
- ✅ Panel admin (kalatogo.vercel.app?admin=KALA2025) — activation bulk des comptes Pro
- ✅ Encaissement client (lien de paiement partageable via FedaPay)

## Système de paiement Pro — fonctionnement
1. Prestataire clique "Passer au Pro" → code `KAL-XXXXXX` généré + sauvé dans Airtable (`Code Paiement` + `Plan Demande`)
2. Modal affiche le numéro **97473040** (Flooz ou TMoney) + le code à mettre en note
3. Prestataire envoie 2 500 FCFA via Flooz ou TMoney
4. Admin va sur `?admin=KALA2025` → voit les demandes en attente → coche + "Activer"
5. Airtable passe `Abonnement: Pro`, efface `Code Paiement`
6. Le prestataire voit son badge ⭐ Pro activé dans son dashboard

## Score KALA — formule (max 100 pts)
```
completion × 0.30     (max 30) — % profil rempli
note/5 × 25           (max 25) — note moyenne
min(nbAvis × 2, 15)   (max 15) — nombre d'avis
photos                (max 10) — photos de réalisations
min(floor(vues/10),10)(max 10) — vues du profil
min(nbAvisTexte×2,10) (max 10) — avis avec commentaire texte
```

## Points techniques importants
- **Cropper.js** : nécessite double `requestAnimationFrame` + `setTimeout(150ms)` avant init, conteneur image sans `overflow:hidden`
- **Photos Avis** : identifié par slot (`profil`, `real1`, `real2`, `real3`), données JSON dans Airtable
- **Albums** : champ `Albums` (Long text) dans Prestataires, stocke JSON `[{id, nom, photos:[url,...]}]`
- **Notifications** : stockées en JSON dans le champ `Notifications` de Prestataires
- **Auth** : `currentUser` = objet Supabase user, `currentPrestataire` = record Airtable chargé par email
- **Suivre** : boutons identifiés par `data-suivi-prest="${recordId}"` (pas id=), `querySelectorAll` pour màj simultanée de tous les boutons
- **Optimistic UI** : `_setSuiviBtnState()` donne feedback immédiat avant retour API, rollback en cas d'erreur
- **page-fil** : standalone, accessible via `showPage('fil')`, nav desktop "📰 Mon Fil"
- **FedaPay** : SDK retiré (code mort supprimé)

## Ce qui reste à faire
- [ ] Tester le flux Favoris end-to-end avec la table Airtable réelle
- [ ] Tester les likes/commentaires photos avec la table Photos Avis réelle
- [ ] Vérifier dans Supabase si la confirmation d'email est désactivée (inscription directe)
- [ ] Nettoyage fonction `renderMetierBanner` (code mort — bouton favoris dupliqué)

## Commande de déploiement
```bash
cd /Users/schealtiellawson/Documents/KALAtogo/repo
git add index.html
git commit -m "description"
git push
# Vercel déploie automatiquement sur push main
```
