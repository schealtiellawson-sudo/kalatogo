# WOLO Business Suite — Plan d'exécution

> Refonte dashboard pour créer un flow 100% continu entre **Recrutement → Intégration → Gestion équipe → Paie → Finances**.

---

## 1. Architecture finale — Sidebar unifiée

Regroupement par **univers** au lieu de sections dispersées.

```
👤 PROFIL
   Mon profil public · Photos & albums · Avis reçus · Paramètres

📱 MON ACTIVITÉ  (prestataire)
   Rendez-vous · Publications · Favoris & abonnements · Score WOLO

🏢 MON ENTREPRISE  (patron — rôle conditionnel)
   │
   ├─ PIPELINE TALENT
   │   Mes offres · Candidatures (Kanban) · Vivier · Équipe active
   │
   ├─ OPÉRATIONS RH
   │   Paie & bulletins · Documents RH · Annonces équipe · Congés
   │
   └─ FINANCES
       CA · Dépenses · WOLO Pay Pro · Tableau de bord

💼 MON EMPLOI  (employé — rôle conditionnel)
   Contrat & employeur · Bulletins · Paiements · Annonces · Congés

🎯 WOLO JOBS  (candidat)
   Mode dispo · Candidatures envoyées · Mon CV WOLO

💰 WOLO PAY
   Solde · Historique · Abonnement Pro

🎁 RÉCOMPENSES
   Bourse de croissance · WOLO Awards
```

---

## 2. Pipeline Talent unifié (Kanban)

Une SEULE vue Kanban pour tout le parcours candidat → employé :

| Colonne | Signification | Transitions |
|---|---|---|
| 📢 Offre en ligne | offres publiées, candidatures entrent ici | auto |
| 👀 À examiner | nouvelles candidatures | patron clique → déplace |
| ⭐ Shortlist | présélectionnés | drag & drop |
| 📞 Entretien | entretiens planifiés / en cours | drag & drop |
| ✅ Retenu | validé pour embauche | déclenche modal onboarding |
| 🎯 Onboarding | docs à recevoir (checklist) | auto quand checklist complète |
| 💼 Équipe active | employé intégré, en poste | visible côté module Paie |
| 🚪 Parti | archive (démission, licenciement) | archivage |

**Règle clé** : passage en "Équipe active" crée automatiquement un record dans `Employes` + initialise la fiche de paie.

**Toggle vues** : Kanban / Tableau / Grille (localStorage).

---

## 3. Renommage sections (avec alias rétrocompat)

| Ancien ID | Nouveau ID | Univers |
|---|---|---|
| `recrut-publier` | `talent-offre-new` | Entreprise > Talent |
| `recrut-offres` | `talent-offres` | Entreprise > Talent |
| `recrut-candidatures` | `talent-pipeline` | Entreprise > Talent |
| (nouveau) | `talent-vivier` | Entreprise > Talent |
| (nouveau) | `talent-equipe` | Entreprise > Talent |
| (nouveau) | `rh-paie` | Entreprise > RH |
| (nouveau) | `rh-documents` | Entreprise > RH |
| (nouveau) | `rh-annonces` | Entreprise > RH |
| (nouveau) | `rh-conges` | Entreprise > RH |
| (nouveau) | `finance-ca` | Entreprise > Finances |
| (nouveau) | `finance-depenses` | Entreprise > Finances |
| (nouveau) | `finance-pay` | Entreprise > Finances |
| (nouveau) | `finance-dashboard` | Entreprise > Finances |
| `emploi-mode` | `jobs-dispo` | Candidat |
| `emploi-candidatures` | `jobs-envoyees` | Candidat |
| `emploi-cv` | `jobs-cv` | Candidat |
| (nouveau) | `employe-contrat`, `employe-bulletins`, `employe-paiements`, `employe-annonces`, `employe-conges` | Employé |

**Alias rétrocompat obligatoire** : `showDashSection()` intercepte les anciens IDs → redirige vers les nouveaux. Zéro cassure sur les liens existants (emails, notifs, bookmarks).

---

## 4. Flow d'invitation employé

1. Patron → Équipe → **"➕ Inviter"**
2. Saisit Prénom + Téléphone WhatsApp + Poste + Salaire prévu
3. Plateforme génère token unique → `wolomarket.com/invite/<token>`
4. WhatsApp auto-ouvert : *"Salut Koffi, [Entreprise] t'invite à rejoindre son équipe sur WOLO. Clique pour créer ton compte et recevoir tes salaires : <lien>"*
5. Landing invitation → inscription simplifiée (Prénom/Tel préremplis) + email + PIN 4 chiffres
6. Rattachement auto bidirectionnel (Supabase user_id ↔ Airtable Employes)
7. Employé arrive sur dashboard avec section **"Mon Emploi"** peuplée

**Cas employé sans smartphone** : compte géré par patron (PIN temporaire SMS).
**Cas employé déjà inscrit** : demande de rattachement → notif accepte/refuse.

---

## 5. Paiement salaires via WOLO Pay

### Pré-requis
Patron a un solde WOLO Pay alimenté par mobile money (MoMo/Flooz/TMoney).

### Flow mensuel
- **J-3** : notif patron "Jour de paie dans 3 jours — Total à verser : 425 000 FCFA · Solde : 200 000 · Recharge : 225 000"
- **J** : bouton **"Payer toute l'équipe — 1 clic"** → code PIN → ✅
- Virement instantané WOLO Pay → WOLO Pay (0 frais entre comptes WOLO)
- Employé reçoit simultanément :
  - Notif in-app : "Salaire avril reçu — 75 000 FCFA"
  - WhatsApp : "Ton salaire est sur ton WOLO Pay. Retire sur MoMo/Flooz/TMoney."
  - Fiche de paie PDF dans son espace

### Options
- Paiement partiel (avance sur salaire, déduit auto suivante)
- Paiement individuel (vs batch)
- Paiement auto-récurrent (v2, le 28 de chaque mois si solde suffisant)

### Bénéfices
- 0 frais entre WOLO Pay (vs 1-2% MoMo)
- Traçabilité totale (audit, impôts, litiges)
- Fiche paie + virement en 1 étape
- Score Employeur WOLO (crédit entreprise)

---

## 6. Fiches de paie (gestion facile)

Template auto par fiche :
- En-tête : logo + raison sociale + NIF
- Employé : nom, poste, matricule WOLO
- Période : Mois/Année
- Détail : Salaire brut — Avances — Prélèvements CNSS (opt.) — Bonus — Retenues — **Net à payer**
- Pied : signature patron + mention "WOLO Business"

**Workflow patron** (`rh-paie`) :
1. Vue mensuelle tableau × (employé / base / avance / bonus / retenue / net / statut / action)
2. Édition en batch (cellules inline)
3. Validation en 1 clic → génère N PDF + assigne + statut "À payer"
4. Paiement en 1 clic → flow WOLO Pay ci-dessus
5. Templates personnalisables (logo/mentions 1× → auto à vie)

**Côté employé** : historique bulletins téléchargeable dans "Mon Emploi > Bulletins".

---

## 7. Tables Airtable à créer

| Table | Rôle |
|---|---|
| `Employes` | lien patron↔employé + statut rattachement + contrat + docs admin + notes RH |
| `Invitations_Employes` | tokens + expiration + statut (Envoyée/Acceptée/Expirée) |
| `Fiches_Paie` | PDF mensuel par employé + statut (Brouillon/Validé/Payé) |
| `Paiements_Salaire` | transactions WOLO Pay patron→employé |
| `Annonces_Equipe` | broadcasts patron + accusés lecture |
| `Conges` | demandes + validation |
| `CA_Journalier` | recettes quotidiennes |
| `Depenses` | dépenses par catégorie |

---

## 8. Ajustements existant

1. **Champ `Rôle`** dans Prestataires : Patron / Employé / Pro indépendant / Multi
2. **WOLO Pay** : accélérer MVP (prérequis paiements salaires)
3. **Sidebar conditionnelle** : menu selon rôle
4. **Landing `/invite/:token`** : nouvelle page publique
5. **Score WOLO** : bonus ancienneté employé + bonus patron ponctuel
6. **Parrainage** : invitation employé compte comme filleul si upgrade Pro

---

## 9. 10 éléments de fluidité UX

1. Bouton **"Intégrer à l'équipe"** dans carte Retenu → modal onboarding
2. **Widget Pipeline** en haut dashboard patron (funnel live)
3. **Breadcrumb** : Offre > Candidat > Employé
4. **Actions rapides `⋯`** contextuelles sur chaque carte
5. **Recherche globale** (offres + candidats + employés + bulletins)
6. **Notifications unifiées** (1 centre)
7. **Empty states éducatifs** + CTA clair
8. **Tour guidé 30s** 1ère visite hub Entreprise
9. **Checklist setup sticky** (Logo · NIF · RIB · 1er employé)
10. **Bottom-nav mobile** 5 icônes

---

## 10. Phases d'exécution

- **Phase A** (en cours) — Plan doc + Sidebar refondue + alias rétrocompat + renommage IDs
- **Phase B** — Vue Kanban Pipeline Talent (drag & drop + toggle)
- **Phase C** — Module Équipe + invitation compte WOLO
- **Phase D** — WOLO Pay Payroll + fiches de paie
- **Phase E** — Espace employé "Mon Emploi"
- **Phase F** — Annonces + Congés
- **Phase G** — Finances (CA + dépenses + graphs)

---

## 11. Polymorphie — s'adapte à TOUT type d'entreprise

Le système doit servir aussi bien un menuisier solo qu'un restaurant de 15 couverts ou une entreprise BTP de 40 ouvriers. Principe : **modules activables selon profil**, pas de one-size-fits-all.

### Types d'activité supportés (wizard setup)

| Type | Modules activés par défaut | Spécificités |
|---|---|---|
| **Solopreneur** (artisan seul, freelance) | Profil · CA · Dépenses · WOLO Pay · Récompenses | Pas de module équipe, mais peut l'activer si embauche |
| **Commerçant (boutique/marché)** | Tout Finance + Équipe light (1-5) | CA journalier en mode "caisse", paiement équipe hebdo/journalière |
| **Entreprise de travaux / BTP** | Talent (recrutement massif chantier) + Équipe (multi-chantier) + Paie journalière/hebdo | Projets = chantiers, paie à la semaine ou fin de chantier |
| **Services (coiffure/resto/atelier)** | Équipe stable + Paie mensuelle + RDV + CA | Lien avec rendez-vous existant |
| **PME formelle (10-50 employés)** | Tout + CNSS/NIF + Congés + Annonces | Mode comptabilité avancée, export comptable |
| **Employé pur** (pas patron) | Mon Emploi uniquement | Peut cumuler plusieurs employeurs |

### Wizard "Décris ton activité" (à l'activation de Mon Entreprise)

1. "Tu es seul ou tu as une équipe ?" → Solo vs Équipe
2. Si équipe : "Combien de personnes ?" (1-5 · 6-20 · 20+)
3. "Ton activité principale ?" (liste : commerce / artisanat / services / BTP / restauration / beauté / autre)
4. "Tu paies tes employés à quelle fréquence ?" (journalier / hebdo / bimensuel / mensuel)
5. "Tu gardes une comptabilité ?" (cahier / rien / logiciel / comptable externe)

→ Selon réponses : modules activés + interface allégée/avancée + templates adaptés (bulletin journalier vs mensuel, CA caisse vs projet, etc.)

### Cumul de rôles (compte WOLO polymorphe)

Un seul compte WOLO peut cumuler :
- Solopreneur (sa propre activité)
- Patron (son équipe)
- Employé (d'un autre patron)
- Candidat (cherche un autre job)

Exemples réels :
- Femme de ménage employée chez 3 familles → 3 contrats dans "Mon Emploi"
- Artisan menuisier qui bosse en solo + emploie 2 apprentis 3 mois/an
- Serveur qui a son propre side business d'artisanat + employé d'un resto

→ Dashboard affiche **toutes les casquettes** avec toggle contextuel. Sidebar réorganisée dynamiquement.

---

## 12. Expérience employé temps réel (côté salarié)

Objectif : quand le patron fait quelque chose qui concerne l'employé, l'employé le voit **immédiatement** dans son dashboard, sans délai, sans friction.

### Widget "Mes finances pro" (top du dashboard employé)

```
┌─────────────────────────────────────────────────┐
│ 💰 Salaire avril reçu · 75 000 FCFA             │
│ ✉️ 1 nouveau bulletin · Avril 2026              │
│ 📢 1 annonce de [Entreprise]                    │
│ [Voir détails →]                                 │
└─────────────────────────────────────────────────┘
```

### Notifications temps réel déclenchées côté employé

| Événement patron | Notif employé |
|---|---|
| Paiement salaire validé | Toast + push "Ton salaire de {mois} est arrivé — {montant} FCFA" + badge rouge sidebar |
| Bulletin PDF généré | "Nouveau bulletin disponible · Avril 2026" + icône PDF dans sidebar |
| Avance accordée | "Avance de {montant} accordée par {Entreprise}" |
| Bonus crédité | "🎉 Bonus {montant} FCFA crédité" |
| Annonce équipe | "📢 {Entreprise} — {titre message}" |
| Congé validé/refusé | "✅ Ta demande de congé du {date} est validée" |
| Document ajouté | "📄 {Entreprise} a ajouté un contrat à ton dossier — signature requise" |
| Changement salaire | "Ton salaire passe de {ancien} à {nouveau} FCFA dès {date}" |

### Section "Mon Emploi" côté employé — détails

**Header** (toujours visible en haut) :
- Logo + nom employeur (clickable → fiche entreprise)
- Poste · Date d'embauche · Ancienneté
- Salaire mensuel · Fréquence de paie · Prochain paiement prévu le {date}

**Tabs** :
1. **💰 Paiements** — timeline chronologique de tous les salaires reçus (mois / montant / statut / preuve WOLO Pay)
2. **📄 Bulletins** — tous les PDF téléchargeables avec filtre année + export bulk ZIP pour déclaration impôts
3. **📢 Annonces** — fil des messages patron avec accusé de lecture
4. **🏖️ Congés** — solde jours / demandes en cours / historique validé
5. **📋 Contrat & documents** — contrat signé, règlement intérieur, fiche de poste, docs admin uploadés
6. **ℹ️ Mon employeur** — infos entreprise, contact RH (WhatsApp direct)

### Cas multi-employeur (frequent Afrique de l'Ouest)

Si l'employé a 2+ rattachements actifs :
- Section **"Mes Emplois"** (pluriel) avec cartes par employeur
- Chaque carte = mini-dashboard spécifique (salaire, bulletins, annonces)
- Tableau de bord consolidé : total revenus du mois tous employeurs confondus

### Fluidité compte particulier ↔ entreprise

Quand un utilisateur WOLO devient employé :
1. **Zéro recréation** de compte — son compte WOLO existant reçoit la nouvelle dimension
2. Tous ses **données existantes** (profil public, récompenses, parrainages) restent intactes
3. **Séparation claire** : espace pro (Mon Emploi) ≠ profil public (prestataire)
4. **Bascule instant** : toggle en haut du dashboard "Vue particulier / Vue pro / Vue employé"

### Accusé de lecture automatique

- Bulletin ouvert → marqué "lu" côté patron (transparence mutuelle)
- Annonce lue → "lu par 8/12 employés" côté patron
- Confirmation paiement : l'employé peut cocher "✅ Reçu confirmé" → rassure le patron

---

## 13. Vision

> **WOLO Market te trouve des clients. WOLO Business t'aide à grandir. WOLO Emploi te connecte à tes employeurs.**
> Un pro qui utilise la suite entreprise devient 10× moins susceptible de partir. Sa croissance devient mesurable = argument d'acquisition pour les prochains pros. Un employé qui reçoit ses bulletins + salaires via WOLO devient ambassadeur naturel de la plateforme auprès de sa communauté.
