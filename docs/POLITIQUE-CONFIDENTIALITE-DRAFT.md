# Politique de confidentialité — WOZALI

**Dernière mise à jour : début juillet 2026**

Tes données c'est ta vie. On le sait. Voilà exactement ce qu'on garde, pourquoi, et comment tu peux nous demander de tout effacer.

---

## C'est quoi WOZALI ?

WOZALI, c'est un site qui rend visible le travail. On connecte les coiffeuses, mécaniciens, couturiers, photographes, restauratrices et tous les pros invisibles du Togo et du Bénin avec des clients qui les cherchent. Sans réseau. Juste le travail.

Pour faire ça, on a besoin de quelques infos sur toi. Pas pour les vendre. Pas pour t'inonder de pubs. Juste pour faire tourner la plateforme.

Cette politique te dit tout. En clair. Sans charabia juridique. Si quelque chose te pose question, tu écris à contact@wozali.com et on te répond.

---

## Qui collecte tes données ?

Le responsable du traitement, c'est :

**Schealtiel Kpomblawoun**
Fondateur de WOZALI
Lomé, Togo
Email : contact@wozali.com
Email DPO : dpo@wozali.com

WOZALI est déclarée à :
- l'Autorité de Protection des Données Personnelles du Togo (APDP Togo)
- l'Autorité de Protection des Données Personnelles du Bénin (APDP Bénin)

Les numéros de récépissé sont affichés en bas du site dès qu'on les a.

---

## Quelles données on collecte exactement ?

### Quand tu t'inscris

- Ton **nom** et ton **prénom**
- Ton **email**
- Ton **mot de passe** (jamais en clair, on le hash avec bcrypt — même nous on peut pas le lire)
- Ta **date de naissance** (pour vérifier que tu as au moins 16 ans)
- Ton **genre** (pour les concours Bourse des Mains d'Or et King & Queen)
- Ton **numéro WhatsApp** (c'est comme ça que les clients te contactent)

### Quand tu remplis ton profil pro

- Ton **métier** (coiffeuse, mécanicien, couturier, photographe, etc.)
- Ton **statut** (artisan, freelance, employé)
- Une **description** de ce que tu fais
- Tes **tarifs** indicatifs
- Ta **photo de profil**
- Tes **photos de réalisations** (jusqu'à 3, parfois plus)
- Tes **vidéos** si tu en mets
- Optionnel : tes liens **TikTok** et **Instagram**

### Quand tu actives la géolocalisation

Si — et seulement si — tu acceptes :
- Ta **ville** (Lomé ou Cotonou)
- Ton **quartier**
- Tes **coordonnées GPS** (Lat/Lon)
- Ton **rayon de mobilité** (jusqu'où tu te déplaces pour bosser)

Tu peux aussi taper ton quartier à la main sans activer le GPS. C'est ton choix.

### Quand tu utilises la plateforme

- Les **avis** que tu reçois et que tu donnes
- Les **rendez-vous** que tu prends
- Les **candidatures** que tu envoies ou reçois
- Les **messages** que tu échanges sur la messagerie interne

### Données techniques (forcées par tout le web)

- Ton **adresse IP** (ce que ton fournisseur internet te donne)
- Ton **user-agent** (le type de téléphone et navigateur)
- L'**identifiant** de ta session
- L'**endpoint** de notification push si tu actives les notifs

Ces données on les garde 12 mois max et c'est uniquement pour la sécurité.

---

## Ce qu'on collecte PAS

- Pas de carte bancaire (le paiement de l'abonnement Pro 2 500 FCFA passe par FedaPay, on voit juste l'ID de transaction)
- Pas de données de santé
- Pas de données religieuses, politiques, syndicales
- Pas de données biométriques d'identification
- Pas de cookies de pub ou de tracking tiers

---

## Pourquoi on collecte ces données ?

1. **Pour faire marcher ton compte** : t'authentifier, afficher ton profil, te laisser publier des offres ou candidater.
2. **Pour te connecter aux clients** : c'est le cœur de WOZALI. Sans ton métier, tes photos et ta zone, on peut pas te rendre visible.
3. **Pour la messagerie** : pour que tu puisses parler à un client ou un recruteur.
4. **Pour la sécurité** : détecter les fraudes, les faux profils, les arnaques.
5. **Pour les concours** : Bourse des Mains d'Or, King & Queen, distribution de récompenses.
6. **Pour l'amélioration du service** : statistiques globales anonymisées, scoring IA pour matcher candidat et offre.
7. **Pour respecter la loi** : factures, comptabilité, obligations légales togolaises et béninoises.

---

## Avec qui on partage tes données ?

Avec personne pour de la pub. Mais on a des prestataires techniques sans qui WOZALI peut pas tourner :

| Partenaire | Pour quoi | Où |
|---|---|---|
| Supabase | Authentification + base de données | États-Unis |
| Airtable | Base de données opérationnelle (en migration) | États-Unis |
| Vercel | Hébergement du site | États-Unis (serveur Frankfurt) |
| ImgBB | Stockage de tes photos | États-Unis |
| Resend | Envoi des emails de WOZALI vers toi | États-Unis |
| Google (Gemini) | IA scoring candidat (PII anonymisées avant envoi) | États-Unis |
| Groq, Cerebras | IA backup (PII anonymisées avant envoi) | États-Unis |
| Mistral AI | IA backup (PII anonymisées avant envoi) | France |
| FedaPay | Paiement de l'abonnement Pro | Bénin |

Tous ces prestataires ont signé des engagements de confidentialité avec nous.

**On ne vend jamais tes données.**

---

## Tes données partent à l'étranger ?

Oui. La plupart de nos prestataires techniques sont aux États-Unis. C'est la réalité du web actuel.

On a pris des précautions :
- TLS partout (le petit cadenas de ton navigateur)
- Chiffrement au repos (AES-256)
- Avant d'envoyer des données aux IA, on **remplace ton nom, ton email et ton numéro par des codes anonymes**
- On a signé des engagements contractuels (clauses contractuelles types) avec chaque prestataire

Si tu veux éviter ça, on comprend. Tu peux pas utiliser WOZALI sans accepter ce minimum technique. Mais tu peux à tout moment supprimer ton compte (voir plus bas).

---

## Combien de temps on garde tes données ?

| Donnée | Durée |
|---|---|
| Compte actif | Tant que tu utilises WOZALI |
| Compte supprimé | Suppression immédiate des données identifiantes. On garde une version anonymisée 3 ans (statistiques) |
| Logs techniques (IP, etc.) | 12 mois max |
| Backups | 30 jours rolling |
| Messages | Durée du compte + 1 an après suppression |
| Candidatures | 12 mois après clôture de l'offre |
| Factures Pro | 10 ans (obligation comptable) |

---

## Tes droits (et comment les exercer)

Tu as le contrôle. Voilà ce que tu peux faire :

| Droit | Comment |
|---|---|
| **Accéder** à toutes tes données | Email à contact@wozali.com |
| **Corriger** une info fausse | Directement dans ton tableau de bord, ou par email |
| **Supprimer ton compte** | Bouton "Supprimer mon compte" dans le tableau de bord |
| **Exporter tes données** (en JSON) | Email à contact@wozali.com |
| **T'opposer** à un traitement | Email |
| **Retirer ton consentement** (géoloc, push, photos) | Désactivation directe dans le tableau de bord |
| **Porter plainte** | APDP Togo (apdp.gouv.tg) ou APDP Bénin (apdp.bj) |

On répond sous 7 jours ouvrés en première réponse, et on clôture sous 30 jours max.

---

## Sécurité — ce qu'on fait pour protéger tes données

- Mot de passe **haché** avec bcrypt (jamais stocké en clair)
- **TLS 1.2+** sur toutes les connexions
- **Chiffrement AES-256** sur la base de données
- **Row Level Security** : tu ne peux voir que tes propres données
- **Authentification renforcée** (MFA) sur les outils d'admin
- **Anonymisation** des données envoyées aux IA
- **Pas de cookies de tracking** publicitaire
- **Audit régulier** des accès

Si jamais une faille de sécurité expose tes données, on te prévient sous 72 heures et on prévient l'APDP. C'est la loi, et c'est aussi notre engagement moral.

---

## Cas particuliers

### Si tu as moins de 18 ans

L'âge minimum pour s'inscrire sur WOZALI c'est **16 ans révolus**. Si tu as entre 16 et 18 ans, on te demande de confirmer que tes parents sont au courant.

Si tu as moins de 16 ans : on supprime ton compte dès qu'on s'en aperçoit.

### Tes photos

Tu mets une photo de profil. Tu mets des photos de tes réalisations. Tu mets des photos pour le concours Bourse des Mains d'Or. À chaque fois, c'est **toi qui décides** et tu peux supprimer chaque photo à tout moment.

On n'utilise **aucun outil de reconnaissance faciale**.

### Géolocalisation

Si tu actives le GPS, on stocke ta position. Si tu le désactives, on stocke juste ton quartier que tu as tapé à la main. Tu peux changer d'avis quand tu veux.

### Notifications push

Quand ton navigateur te demande "WOZALI veut t'envoyer des notifications", tu peux dire oui ou non. Tu peux aussi changer d'avis n'importe quand dans les paramètres de ton navigateur.

### Le scoring IA

Quand tu candidates, on utilise une IA pour aider le recruteur à voir si ton profil colle à l'offre. **L'IA ne décide jamais à ta place ni à la place du recruteur.** C'est juste un score, le recruteur décide. Et tu peux nous demander pourquoi tu as eu ce score-là.

Avant de passer ta candidature à l'IA, on remplace ton nom, ton numéro et ton email par des codes anonymes. L'IA voit ton profil, pas ton identité.

---

## Concours Bourse des Mains d'Or et King & Queen

Si tu participes, tu acceptes que ta photo et ton métier soient affichés publiquement pendant le concours. Tu peux retirer ta participation à tout moment, et la photo est retirée dans la foulée.

Les gagnant·es sont annoncé·es publiquement (prénom + métier + ville). Si tu gagnes mais ne veux pas être annoncé·e, dis-le-nous, on respecte.

---

## Modifications de cette politique

Si on change quelque chose d'important, on te préviendra par email et par notification dans le tableau de bord. La version la plus à jour est toujours sur https://wozali.com/confidentialite avec la date en haut.

---

## Tu as une question ?

- Email général : **contact@wozali.com**
- DPO (questions données perso) : **dpo@wozali.com**
- WhatsApp : [à venir]

Tu peux aussi contacter directement :
- **APDP Togo** — https://apdp.gouv.tg/
- **APDP Bénin** — https://apdp.bj/

WOZALI t'appartient. Tes données aussi.

---

*Politique de confidentialité — WOZALI — Version 1.0 — début juillet 2026*
