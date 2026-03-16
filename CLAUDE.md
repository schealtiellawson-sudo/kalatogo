# KalaTogo — Contexte Projet pour Claude

## C'est quoi ?
Application web SPA (Single Page App) pour trouver des prestataires de services au Togo.
Un seul fichier : `index.html` (~9000+ lignes). Navigation via `showPage()` / `showDashSection()`.

## Stack technique
- **Frontend** : HTML/CSS/JS vanilla, tout dans `index.html`
- **Auth** : Supabase (`https://wikgdksyeygwpmqzmhez.supabase.co`)
- **Base de données** : Airtable (base `applmj1RDrJkR8C4w`)
- **Photos** : ImgBB (upload)
- **Crop photos** : Cropper.js v1.6.2 via cdnjs
- **Cartes** : Leaflet.js (mini-map GPS sur profil)
- **Paiement** : CinetPay (clés à configurer — NON FONCTIONNEL pour l'instant)
- **Déploiement** : Vercel → `https://kalatogo.vercel.app`

## Tokens / Clés
```
Airtable token : patFdOUZvtxsOmvpH.a21aaa9924b0c94587faa3dd58b227da7702ffded3201589a9f0308732fc2474
Airtable base  : applmj1RDrJkR8C4w
Supabase URL   : https://wikgdksyeygwpmqzmhez.supabase.co
Supabase key   : sb_publishable_sakHYR_n46YFOq4msulssg_ahtXvacU
```

## Tables Airtable
| Table | Champs principaux |
|---|---|
| `Prestataires` | Nom complet, Email, Métier, Ville, Description, Photo Profil, Realisation 1/2/3, Albums (Long text JSON), Abonnement, Code Parrainage, Parrain Code, GPS Lat, GPS Lon, Disponible, Notifications (Long text JSON) |
| `Rendez-vous` | Prestataire ID, Client Nom, Client Email, Client Téléphone, Date, Heure, Statut, Message |
| `Avis` | Prestataire ID, Auteur, Note, Commentaire, Date |
| `Clients` | User ID, Nom, Email, Photo |
| `Posts` | Prestataire ID, Contenu, Date, Likes, Likeurs (JSON), Commentaires (JSON) |
| `Favoris` | User ID, Prestataire Favori ID, Nom Prestataire, Date |
| `Photos Avis` | Prestataire ID, Slot, Photo URL, Likes, Likeurs (JSON), Commentaires (JSON) |

## Architecture navigation
```
showPage('home')        → page d'accueil
showPage('search')      → recherche prestataires
showPage('profil')      → profil public prestataire
showPage('dashboard')   → tableau de bord connecté
showPage('login')       → connexion
showPage('inscription') → inscription

showDashSection('profil')       → modifier son profil
showDashSection('photos')       → gérer ses photos/albums
showDashSection('rdv')          → ses rendez-vous
showDashSection('posts')        → ses publications
showDashSection('favoris')      → ses favoris sauvegardés
showDashSection('avis')         → ses avis reçus
showDashSection('parrainage')   → son parrainage
showDashSection('notifications')→ ses notifications
showDashSection('abonnement')   → son abonnement
```

## Fonctionnalités implémentées
- ✅ Inscription / Connexion / Mot de passe oublié (Supabase)
- ✅ Profil public prestataire (photos, avis, RDV, map, posts)
- ✅ Recherche avec filtres (métier, ville, disponibilité)
- ✅ Dashboard complet (modifier profil, GPS, disponibilité)
- ✅ Système de RDV avec calendrier
- ✅ Posts / Publications avec likes et commentaires
- ✅ Notifications (vues, avis, RDV, likes, favoris, photos)
- ✅ Parrainage avec commissions
- ✅ Favoris (sauvegarder un profil, section "Mes Favoris" dashboard)
- ✅ Likes et commentaires sur photos de profil
- ✅ Gestion albums/photos depuis le dashboard
- ✅ Recadrage photo (Cropper.js) — modal avec handles visibles
- ❌ Paiement CinetPay (clés placeholder à remplacer)

## Points techniques importants
- **Cropper.js** : nécessite double `requestAnimationFrame` + `setTimeout(150ms)` avant init, et le conteneur image ne doit PAS avoir `overflow:hidden`
- **Photos Avis** : identifié par slot (`profil`, `real1`, `real2`, `real3`), données JSON dans Airtable
- **Albums** : champ `Albums` (Long text) dans Prestataires, stocke JSON `[{id, nom, photos:[url,...]}]`
- **Notifications** : stockées en JSON dans le champ `Notifications` de Prestataires
- **Favoris** : table dédiée, clé `{User ID, Prestataire Favori ID}`
- **Auth** : `currentUser` = objet Supabase user, `currentPrestataire` = record Airtable chargé par email

## Ce qui reste à faire
- [ ] Configurer les vraies clés CinetPay quand compte activé
- [ ] Tester le flux Favoris end-to-end avec la table Airtable réelle
- [ ] Tester les likes/commentaires photos avec la table Photos Avis réelle
- [ ] Vérifier dans Supabase si la confirmation d'email est désactivée (pour inscription directe)
- [ ] Nettoyage de la fonction `renderMetierBanner` (code mort — bouton favoris dupliqué)

## Commande de déploiement
```bash
cd /Users/schealtiellawson/Documents/KALAtogo/repo
# push sur git → Vercel déploie automatiquement
git add index.html
git commit -m "description"
git push
```
