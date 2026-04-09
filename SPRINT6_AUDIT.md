# SPRINT 6 — AUDIT Feed Social WOLO Market

Date : 2026-04-09

## Base de données
- [x] Table wolo_posts créée (fichier migration écrit)
- [x] Table wolo_likes créée avec UNIQUE(post_id,user_id)
- [x] Table wolo_commentaires créée
- [x] Table wolo_abonnements créée
- [x] Table wolo_epingles créée
- [x] Tous les index créés
- [x] RLS policies ajoutées
- [ ] ⚠️ SQL à EXÉCUTER MANUELLEMENT dans Supabase SQL editor
  (fichier : `supabase/migrations/20260409_sprint6_feed.sql`)
- [ ] ⚠️ Bucket Supabase Storage **wolo-media** à CRÉER MANUELLEMENT
  dans Supabase Studio → Storage → New bucket (public = true)

## Navigation
- [x] Onglet "📰 Feed WOLO" ajouté dans nav desktop (entre "Trouver un pro" et "WOLO Jobs")
- [x] Onglet ajouté dans menu hamburger mobile
- [x] Bottom navigation mobile (`<nav class="mobile-bottom-nav">`) avec 5 items
- [x] Feed est l'onglet central (bouton or surélevé)
- [x] `publicPages` array updated to include `'feed'`

## Feed principal
- [x] Stories WOLO (Bourse + À la Une) — dégradation gracieuse si table vide
- [x] 4 onglets (Pour toi / Abonnements / Ma ville / Talent Radar)
- [x] Onglet Talent Radar visible uniquement si profile.type_profil = 'recruteur'
- [x] Infinite scroll via IntersectionObserver
- [x] Zone publication visible selon connexion
- [x] Popup inscription déclenchée par `verifierConnexionOuPopup` — redirige via `showPage('inscription')`

## Interactions
- [x] Like/Unlike avec compteur temps réel
- [x] Commentaires (affichage + publication)
- [x] Bouton partage WhatsApp avec message pré-rempli
- [x] Bouton Contacter → ouvre profil via `contacterAuteur(auteurId)` (pas de `wa.me` car `telephone` absent des profiles)
- [x] Toute interaction non authentifiée → popup inscription

## Publication
- [x] Modal publication
- [x] Upload photo + vidéo vers Supabase Storage bucket `wolo-media`
- [x] Preview avant publication
- [x] Insert dans `wolo_posts`
- [x] Refresh du feed après publication

## Coup du Jour
- [x] Cron `/api/cron/coup-du-jour` créé (8h00 quotidien)
- [x] `vercel.json` mis à jour avec le nouveau cron
- [x] Fonction `chargerCoupDuJour` côté client
- [x] Badge "⭐ COUP DU JOUR" sur le post sélectionné
- [ ] ⚠️ Variable d'environnement `CRON_SECRET` à définir sur Vercel

## Talent Radar
- [x] Section talents disponibles (profiles.cherche_emploi = true)
- [x] Bouton Épingler → insert dans wolo_epingles

## Notifications feed
- [x] Fonction `envoyerNotificationFeed` avec quota max 3/jour
- [x] Pas de notifications 22h-7h
- [x] Notification Coup du Jour envoyée par le cron

## Réalisations vérifiées
- [ ] ⚠️ Badge "✅ Vérifié par le client" affiché côté UI (champ `verifie_client` dans le schéma)
- [ ] ⚠️ Logique de vérification automatique lors d'un avis ≥4★ : à implémenter dans le flow d'ajout d'avis existant (hors scope Sprint 6)

## Notes techniques
- Tout le JS Sprint 6 est défensif (try/catch autour des appels Supabase)
- Fallback `{ nom:'Prestataire', metier:'', quartier:'' }` si `post.profiles` est null
- `currentUser` global utilisé en priorité avec fallback `supabase.auth.getUser()`
- Pas de top-level `await` — tout dans des IIFEs ou fonctions async
