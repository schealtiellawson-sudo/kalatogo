# CHECKLIST AVANT SOUMISSION APDP TOGO + BÉNIN

**Cible** : pouvoir soumettre simultanément les déclarations APDP Togo et APDP Bénin avant le lancement WOZALI du début juillet 2026.
**Owner** : Schealtiel Kpomblawoun (fondateur)
**Mise à jour** : 7 mai 2026

---

## 1. DOCUMENTS PUBLIÉS SUR LE SITE

- [ ] **Politique de confidentialité** publiée sur https://wozali.com/confidentialite
  - Draft prêt : `docs/POLITIQUE-CONFIDENTIALITE-DRAFT.md`
  - Action : intégrer en HTML dans `index.html` (section ou route `/confidentialite`) + lien depuis le footer
  - Date cible : 20 mai 2026

- [ ] **CGU (Conditions Générales d'Utilisation)** publiées sur https://wozali.com/cgu
  - Action : rédiger CGU.md (storytelling WOZALI mais structure juridique : objet, services, inscription, abonnement Pro 2 500 FCFA, obligations utilisateur, responsabilité, propriété intellectuelle, résiliation, droit applicable Togo+Bénin, juridiction)
  - Date cible : 20 mai 2026
  - Note : peut être généré dans une session ultérieure si besoin

- [ ] **Mentions légales** publiées sur https://wozali.com/mentions-legales
  - Identité du RT, hébergeur Vercel, contact
  - Date cible : 20 mai 2026

- [ ] **Page Contact** opérationnelle avec formulaire et adresse contact@wozali.com
  - Date cible : 20 mai 2026

- [ ] **Cookie banner** : à évaluer
  - Si WOZALI ne pose pas de cookies tiers de tracking (analytics, pub) : pas de banner obligatoire, mais mention dans la Politique de confidentialité
  - Si Vercel Analytics ou Google Analytics ajoutés : banner obligatoire
  - Action : auditer les cookies actuels (DevTools > Application > Cookies sur wolomarket.vercel.app)

---

## 2. FONCTIONNALITÉS PRODUIT REQUISES

- [ ] **Bouton "Supprimer mon compte"** dans le tableau de bord
  - Action : vérifier l'existence dans `index.html` (chercher `deleteAccount` ou `supprimer-compte`)
  - Si absent : implémenter (suppression Supabase Auth + Airtable + ImgBB photos + confirmation par email)
  - Délai d'effacement effectif : sous 30 jours

- [ ] **Bouton "Exporter mes données"** (portabilité — RGPD-like)
  - Action : générer un JSON contenant toutes les données utilisateur
  - Format : profil + offres + candidatures + messages + avis
  - Date cible : 25 mai 2026

- [ ] **Opt-in explicite géolocalisation** au moment de l'inscription
  - Vérifier que la case n'est pas pré-cochée
  - Vérifier qu'un utilisateur peut s'inscrire sans GPS (saisie manuelle quartier)

- [ ] **Opt-in explicite photo de profil et photos de réalisations**
  - Une mention claire au moment de l'upload : "En uploadant cette photo, je consens à sa publication sur WOZALI et confirme avoir les droits."

- [ ] **Opt-in explicite notifications push (VAPID)**
  - Native browser permission OK ; ajouter une explication contextuelle avant la pop-up système

- [ ] **Vérification d'âge** (déclaration date de naissance ≥ 16 ans)
  - Action : ajouter blocage à l'inscription si < 16 ans
  - Pour 16-18 ans : ajouter case "consentement parental obtenu"

- [ ] **Anonymisation IA des PII** avant envoi aux providers (Gemini, Groq, Cerebras, Mistral)
  - Action : vérifier que la fonction d'anonymisation existe et est appliquée systématiquement
  - Mapping nom ↔ placeholder stocké en base locale chiffrée

---

## 3. ENVIRONNEMENT TECHNIQUE

- [ ] **Domaine wozali.com configuré** (DNS + SSL)
  - Action : pointer A/CNAME vers Vercel
  - Vérifier certificat SSL automatique Vercel

- [ ] **Email contact@wozali.com opérationnel**
  - Action : configurer alias via Resend ou redirection Gmail/Workspace
  - Tester réception et envoi

- [ ] **Email dpo@wozali.com opérationnel** (alias)

- [ ] **MFA activé** sur Supabase, Vercel, GitHub, Resend

- [ ] **Backups Supabase** : vérifier que la rétention est bien à 30 jours rolling (plan Supabase)

- [ ] **VAPID keys** générées et stockées en variables d'environnement Vercel

- [ ] **Régénération des secrets exposés** :
  - PAT Supabase (mentionné comme exposé dans MEMORY.md)
  - Gemini API key (idem)

---

## 4. PIÈCES JURIDIQUES À PRÉPARER

### 4.1 Communes Togo + Bénin

- [ ] **Pièce d'identité du fondateur** : copie certifiée CNI ou passeport (Schealtiel Kpomblawoun)
  - Lieu : à faire certifier en mairie ou notaire à Lomé (gratuit ou ~500 FCFA)

- [ ] **Justificatif d'enregistrement de l'activité**
  - Option A : RCCM Togo (registre du commerce, ~30 000 FCFA, 2-5 jours au CFE Lomé)
  - Option B : Patente / NIF Togo si auto-entrepreneur informel (moins coûteux)
  - **Recommandation** : RCCM SARL ou entreprise individuelle pour crédibilité APDP

### 4.2 Spécifique Bénin

- [ ] **Représentant local au Bénin** (article 393 Code du Numérique)
  - Option A : constituer une succursale ou filiale béninoise (RCCM Cotonou) — coût ~150 000 à 300 000 FCFA
  - Option B : désigner un mandataire béninois (avocat ou cabinet conseil) — coût variable, compter 100 000 à 500 000 FCFA/an
  - **Recommandation** : Option B pour MVP, Option A si revenus consolidés au Bénin

- [ ] **Mandat / procuration** si dépôt par avocat
  - Modèle à demander à l'avocat retenu

### 4.3 Spécifique Togo

- [ ] **Adresse complète du siège** à Lomé (immeuble, quartier, BP)

---

## 5. FRAIS À PRÉVOIR (À CONFIRMER AUPRÈS DES APDP)

| Item | Estimation | À confirmer |
|---|---|---|
| Frais de dépôt APDP Togo | 25 000 à 50 000 FCFA (estimation) | Confirmer sur apdp.gouv.tg ou par appel |
| Frais de dépôt APDP Bénin | 50 000 à 100 000 FCFA (estimation) | Confirmer sur service.apdp.bj |
| Honoraires avocat local Togo (relecture) | 50 000 à 150 000 FCFA | Devis 2-3 cabinets |
| Honoraires avocat local Bénin (relecture + représentation) | 100 000 à 500 000 FCFA/an | Devis 2-3 cabinets |
| RCCM Togo | 30 000 FCFA | CFE Lomé |
| Certification CNI mairie | 500 à 2 000 FCFA | Mairie Lomé |
| Hébergement domaine wozali.com | déjà payé | — |

**Budget total estimé** : 250 000 à 800 000 FCFA selon options retenues.

---

## 6. SOUMISSION

### 6.1 Togo

- [ ] Méthode de dépôt à confirmer : en ligne, courrier, dépôt physique
- [ ] URL si en ligne : https://apdp.gouv.tg/ (à vérifier — section "Déclaration")
- [ ] Adresse physique APDP Togo : à confirmer (généralement Lomé)
- [ ] Délai de traitement : 30 à 60 jours (à confirmer)

### 6.2 Bénin

- [ ] Création d'un compte sur https://service.apdp.bj/
- [ ] Soumission via https://service.apdp.bj/declaration-prealable/
- [ ] Délai de traitement : 30 à 60 jours (à confirmer)

---

## 7. APRÈS SOUMISSION

- [ ] Conserver les récépissés de dépôt (PDF) dans `/docs/`
- [ ] Afficher les numéros de récépissé dans le footer du site (preuve de conformité)
- [ ] Renouveler les déclarations en cas de modification substantielle (nouvelles features, nouveaux sous-traitants, expansion géographique)
- [ ] Audit annuel de conformité

---

## 8. RISQUES IDENTIFIÉS À ARBITRER

1. **Représentation locale Bénin** : sans représentant local désigné, le dossier sera probablement rejeté ou bloqué. À trancher avant soumission.
2. **RCCM ou statut juridique** : sans entité juridique constituée, l'APDP peut refuser le dépôt par une personne physique seule.
3. **Anonymisation IA** : non implémentée à ce jour selon le brief. Critique pour la conformité — doit être livrée avant soumission.
4. **Délai de traitement** : prévoir 30-60 jours, donc soumettre **au plus tard le 10 mai 2026** pour avoir un récépissé avant le lancement de début juillet (en pratique : un dépôt avec accusé de réception suffit pour démarrer, l'autorisation peut arriver après).
5. **Frais réels** : à confirmer impérativement, les estimations ci-dessus sont indicatives.

---

*Fin de la checklist — Version 1.0 — WOZALI*
