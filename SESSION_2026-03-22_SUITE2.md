# Session 2026-03-22 — Suite 2 : Vidéo Remotion & Script Parrainage

## Contexte
Continuation après la session précédente sur l'email & SMTP.
Objectif : Fixer le Mode Emploi badge + tester et corriger les bugs + améliorer le parrainage.

---

## 1. Vidéo Remotion — Correction sans voix

### Problème identifié
- L'utilisateur a noté que la vidéo affichée sur la homepage avait une voix au début
- J'avais utilisé le mauvais fichier : `kala-presentation.mp4` (13MB) qui contenait une voix
- La vraie version sans voix est générée par Remotion depuis `/Users/schealtiellawson/Documents/KALAtogo/kala-video/`

### Clarification
- L'utilisateur avait validé une version SANS VOIX créée par moi via Remotion
- Serveur Remotion tourne localement : `http://localhost:3333/KalaTogoVideo`
- Processus Node.js actif (PID 3500)

### Action prise
- ✅ Tâche Remotion lancée en background : `npx remotion render KalaTogoVideo out/kala-intro.mp4`
- ✅ Rendu complété avec succès (exit code 0)
- Output généré : `/Users/schealtiellawson/Documents/KALAtogo/kala-video/out/kala-intro.mp4`
- Fichier : **75 secondes** | **1920×1080** | **30fps** | **Musique Afrobeat uniquement (pas de voix)**

### Intégration site
- Remplacé la carte profil "Aminata Kokou" par lecteur vidéo HTML5 native
- Source vidéo : `/kala-intro.mp4` (URL relative, servie depuis Vercel)
- Contrôles : Play, Mute, Fullscreen, Progress bar activés
- Demande en cours : agrandir le lecteur vidéo

### Fichiers vidéo
```
/Users/schealtiellawson/Documents/KALAtogo/repo/
├── kala-intro.mp4       ← Nouvelle vidéo sans voix (générée Remotion, 75s)
└── kala-presentation.mp4 ← Ancienne (13MB, avec voix — à archiver)

/Users/schealtiellawson/Documents/KALAtogo/kala-video/
├── src/KalaTogoVideo.jsx ← Composition Remotion (contenu + musique)
├── public/music.mp3      ← Afrobeat Pixabay (6.1MB)
└── out/kala-intro.mp4    ← Sortie rendu Remotion
```

---

## 2. Script Parrainage V9 — Réécrit angle "100k+ FCFA"

### Contexte
Ancien script V9 (7 min résumé) était trop faiblard sur le REVENU.
Utilisateur demande version axée sur :
- Monétisation réelle (100k+ FCFA/mois possible)
- Revenu passif/récurrent
- Commercial indépendant (pas salarié)
- Monétisation réseau TikTok vs rémunération TikTok minable

### Nouveau script (90 secondes)

**Titre** : "Transforme ton réseau en revenu récurrent — 100k+ FCFA/mois"

**[ACCROCHE (0-10s)]**
```
Tu scrolles TikTok 3 heures par jour en espérant que TikTok te paie.
Ça arrive jamais, c'est vrai ?

Avec KalaTogo, tu fais la même chose — partager — mais tu touches
40% de commission à chaque filleul que tu parraines. Récurrent.
Chaque mois.
```

**[MODÈLE REVENU (10-35s)]**
```
C'est simple. Tu as un lien de parrainage unique dans ton dashboard.
Tu le partages à tes amis prestataires.

Un chauffeur s'inscrit ? Il passe au Pro à 2 500 FCFA/mois ?
Tu touches 1 000 FCFA par mois. Automatiquement. Pour toujours.

Une coiffeuse s'inscrit ? Même chose. 1 000 FCFA/mois.

T'as 5 filleuls Pro ? C'est 5 000 FCFA/mois.
T'en as 50 ? C'est 50 000 FCFA/mois.
T'en as 100 ? C'est 100 000 FCFA/mois — sans faire une seule prestation.
```

**[MINE D'OR RÉSEAU SOCIAL (35-55s)]**
```
Si tu as un réseau TikTok — même 10k abonnés, même 50k —
tu dois comprendre quelque chose :

TikTok te paie une misère. Genre 100-200 FCFA pour 1 000 vues.
C'est rien.

Mais avec KalaTogo, tu monétises le vrai pouvoir de ton réseau :
l'INFLUENCE.

Tu recommandes KalaTogo à ton audience. Pas besoin que tout le monde
s'inscrive — juste les prestataires que tu connais. Ceux qui travaillent
à leur compte.

Chaque personne que tu amènes = revenu récurrent qui s'accumule.
```

**[DEVIENS COMMERCIAL INDÉPENDANT (55-75s)]**
```
T'as un choix à faire :

Soit tu continues à faire du 8 heures-5 heures pour un patron,
à attendre la fin du mois pour un salaire fixe.

Soit tu utilises ce que tu as déjà — ton réseau, ta confiance —
et tu construis quelque chose qui TE PAIE PENDANT QUE TU DORS.

5 personnes = 5 000/mois.
20 personnes = 20 000/mois.
100 personnes = 100 000/mois — et tu continues à en recruter.

C'est pas du rêve. C'est une vraie structure de revenu.
```

**[CAS CONCRET (75-85s)]**
```
Tu connais un mécanicien qui travaille seul ?
Un vendeur en téléphone ?
Une vendeuse de maquillage ?

Montre-lui KalaTogo en 2 minutes.
"Regarde, tu t'inscris, tu montres ton profil aux clients,
tu peux même recruter du personnel directement."

Il voit l'intérêt. Il s'inscrit avec ton lien.
Il devient Pro.

Tu reçois 1 000 FCFA chaque mois. Pour le reste de votre amitié.
```

**[CTA FINAL (85-90s)]**
```
Ton lien de parrainage est dans ton dashboard, section Parrainage.

Commence à partager. Aujourd'hui.
```

### Optimisation copywriting
- ✅ URGENCE : "100k+ FCFA" mentionné dès la 10e seconde
- ✅ REVENU RÉEL : Examples 5→50→100k FCFA (progression clear)
- ✅ REVENU PASSIF : "automatiquement", "pour toujours", "sans rien faire"
- ✅ RÉSEAU SOCIAL : Comparaison TikTok rémunération (minable) vs KalaTogo parrainage (gold)
- ✅ PSYCHOLOGIE : "pendant que tu dors" (aspiration universelle)
- ✅ MENTALITÉ : "entrepreneur" vs "salarié" (psyche shift)
- ✅ SOCIAL PROOF : Cas concrets (mécano, vendeur, coiffeuse)

---

## 3. Status badges Mode Emploi — Diagnostic

### Problème persistant
🔴 **Badges conditionnels NE S'AFFICHENT PAS** sur profil public :
- Vérifié (ligne 9278)
- Fondateur (ligne 9280)
- Digital (ligne 9282)
- Mode Emploi (ligne 9283)

✅ **CE QUI MARCHE** :
- Badge PRO subscription (hardcoded, pas conditionnel)
- Rating stars (5 ⭐)

### Root cause hypothesis
- Code template strings sont **syntaxiquement corrects**
- Variables utilisées dans les conditions (`verifie`, `isDigital`, `f['Mode Emploi']`) ne sont **PAS déclarées/évaluées correctement** dans le scope de `showProfil()`

### À faire (pas encore fait)
- [ ] Lire `showProfil()` complet (lines ~9045+)
- [ ] Vérifier si `verifie` est défini (devrait être = `f['Badge vérifié']`)
- [ ] Vérifier si `isDigital` est défini (devrait être = `isDigitalMetier(f['Métier principal'])`)
- [ ] Vérifier si variables sont accessibles dans le scope du template string (lines 9276-9284)
- [ ] Si manquantes → ajouter les déclarations près de line 9066-9088
- [ ] Tester le rendu sur profil public
- [ ] Valider que TOUS les badges (Vérifié, Fondateur, Digital, Mode Emploi) s'affichent correctement

---

## 4. Plan des prochaines actions

### 🔴 URGENT (avant tests complets)
1. Agrandir le lecteur vidéo sur la homepage
2. Fixer le diagnostic badges (vérifier variables scope)
3. Corriger l'affichage des badges conditionnels

### 🟡 TESTS COMPLÈTEMENT (une fois badges OK)
- Système favoris (ajouter/retirer)
- Commentaires + likes sur photos profil
- Notifications (test trigger)
- Système Follow/Abonnement (test sync)
- Paiement Pro (Manuel Flooz/TMoney modal)
- Partage profil (copier lien, WhatsApp, partage)
- Albums (créer, uploader, afficher)
- Système RDV (créer, accepter, refuser)
- Page "Mon Fil" (feed prestataires suivis)
- Admin panel (`?admin=KALA2025`)
- Référral/parrainage (créer code, vérifier commission)
- Client payment modal (Flooz/TMoney encaissement)

### 🟢 SESSION COMPLÈTE
- Naviguer sur TOUS les pages
- Tester TOUTES les interactions
- Documenter bugs trouvés
- Corriger chaque bug

---

## Notes techniques
- **Vidéo MP4** : stockée dans root `/repo/` → servie par Vercel comme asset static
- **Remotion** : toujours disponible sur `localhost:3333` pour re-render si besoin
- **Script parrainage** : 90s, angle commercial/entrepreneur, ready for YouTube shorts
- **Badges** : scope issue probable, fix rapide une fois diagnostic confirmé

---

**Session enregistrée dans** : `/Users/schealtiellawson/.claude/projects/-Users-schealtiellawson-Documents-KALAtogo/memory/kalatogo.md`
