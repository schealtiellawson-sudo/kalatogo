# Airtable — Schéma WOLO Business Suite

Base : `applmj1RDrJkR8C4w` (Bénin/Togo)

8 nouvelles tables nécessaires pour Modules 1-5. Crée-les manuellement dans l'UI Airtable ou via l'API REST.

---

## 1. `Employes` (Module 1, 2, 3)

| Champ | Type | Note |
|---|---|---|
| `Nom complet` | Single line text | Primary |
| `User ID` | Single line text | rec ID Prestataire (compte WOLO de l'employé) |
| `Patron ID` | Single line text | rec ID Prestataire (patron) |
| `Patron Nom` | Single line text | snapshot |
| `Poste` | Single line text | ex: Couturière senior |
| `Salaire FCFA` | Number (integer) | mensuel |
| `WhatsApp` | Phone | format international |
| `Email` | Email | optionnel |
| `Photo` | URL | ImgBB ou photo profil WOLO |
| `Statut` | Single select | `Actif`, `Suspendu`, `Parti` |
| `Date entrée` | Date | YYYY-MM-DD |
| `Date sortie` | Date | optionnel |
| `Notes` | Long text | privé patron |

---

## 2. `Invitations_Employes` (Module 1)

| Champ | Type | Note |
|---|---|---|
| `Token` | Single line text | Primary, unique 32 chars hex |
| `Patron ID` | Single line text | |
| `Patron Nom` | Single line text | |
| `Nom prévu` | Single line text | |
| `WhatsApp` | Phone | |
| `Poste prévu` | Single line text | |
| `Salaire prévu` | Number (integer) | |
| `Statut` | Single select | `Envoyée`, `Acceptée`, `Refusée`, `Expirée` |
| `Date envoi` | Date with time | |
| `Date acceptation` | Date with time | |
| `Employe ID` | Single line text | rempli après acceptation |

---

## 3. `Fiches_Paie` (Module 2)

| Champ | Type | Note |
|---|---|---|
| `Employe Nom` | Single line text | Primary |
| `Patron ID` | Single line text | |
| `Employe ID` | Single line text | |
| `Poste` | Single line text | snapshot |
| `Mois` | Single line text | format `YYYY-MM` |
| `Salaire FCFA` | Number | brut |
| `Primes FCFA` | Number | optionnel |
| `Retenues FCFA` | Number | optionnel |
| `Net FCFA` | Number | calculé |
| `Paiement ID` | Single line text | rec ID Paiements_Salaire |
| `Généré le` | Date with time | |
| `URL PDF` | URL | optionnel (généré à la demande) |

---

## 4. `Paiements_Salaire` (Module 2)

| Champ | Type | Note |
|---|---|---|
| `Employe Nom` | Single line text | Primary |
| `Patron ID` | Single line text | |
| `Employe ID` | Single line text | |
| `Mois` | Single line text | `YYYY-MM` |
| `Montant FCFA` | Number | |
| `Date` | Date | |
| `Méthode` | Single select | `WOLO Pay`, `Espèces`, `Mobile Money`, `Virement` |
| `Statut` | Single select | `Payé`, `En attente`, `Annulé` |
| `Référence` | Single line text | ID transaction WOLO Pay |

---

## 5. `Annonces_Equipe` (Module 4)

| Champ | Type | Note |
|---|---|---|
| `Titre` | Single line text | Primary |
| `Patron ID` | Single line text | |
| `Message` | Long text | |
| `Date` | Date with time | |
| `Canal` | Single select | `Dashboard`, `Dashboard + WhatsApp` |
| `Nb destinataires` | Number | snapshot |
| `Nb lus` | Number | incrémenté quand l'employé ouvre |

---

## 6. `Conges` (Module 4 — Phase F)

| Champ | Type | Note |
|---|---|---|
| `Employe Nom` | Single line text | Primary |
| `Employe ID` | Single line text | |
| `Patron ID` | Single line text | |
| `Type` | Single select | `Congé payé`, `Maladie`, `Sans solde`, `Maternité` |
| `Date début` | Date | |
| `Date fin` | Date | |
| `Nb jours` | Number | calculé |
| `Motif` | Long text | |
| `Statut` | Single select | `Demandé`, `Approuvé`, `Refusé` |

---

## 7. `CA_Journalier` (Module 5)

| Champ | Type | Note |
|---|---|---|
| `Date` | Date | Primary |
| `Patron ID` | Single line text | |
| `Montant FCFA` | Number | |
| `Mois` | Single line text | `YYYY-MM` (auto-rempli côté client) |
| `Source` | Single select | `Vente directe`, `Service`, `Acompte`, `Autre` |
| `Note` | Long text | |

---

## 8. `Depenses` (Module 5)

| Champ | Type | Note |
|---|---|---|
| `Date` | Date | Primary |
| `Patron ID` | Single line text | |
| `Montant FCFA` | Number | |
| `Mois` | Single line text | `YYYY-MM` |
| `Catégorie` | Single select | `Matières premières`, `Loyer`, `Transport`, `Salaires`, `Autre` |
| `Description` | Single line text | |

---

## Tables existantes — extension nécessaire

### `Prestataires` (existant)
Ajouter ces champs pour gérer le "patron":

| Champ | Type | Note |
|---|---|---|
| `Type compte` | Multiple select | `Prestataire`, `Patron`, `Employé` (cumulable) |
| `Activité business` | Single line text | description courte (ex: Atelier de couture) |
| `Nb employés` | Number | calculé/manuel |
| `Modules actifs` | Multiple select | `Equipe`, `Paie`, `Annonces`, `Finances`, `Mon emploi` |

---

## Variables d'env nécessaires (Vercel)

```
AIRTABLE_API_KEY = pat...   # déjà configuré
AIRTABLE_BASE_ID = applmj1RDrJkR8C4w   # déjà configuré
SUPABASE_URL = https://wikgdksyeygwpmqzmhez.supabase.co   # déjà configuré
SUPABASE_SERVICE_KEY = ...   # déjà configuré
```

Aucune nouvelle env var pour Modules 1-5 — tout passe par les credentials existants.

---

## Endpoints serverless créés (Vercel)

| Endpoint | Méthode | Module |
|---|---|---|
| `/api/invitations/create` | POST | 1 |
| `/api/invitations/[token]` | GET | 1 |
| `/api/invitations/accept` | POST | 1 |
| `/api/paie/pay` | POST | 2 |
| `/api/paie/bulletin/[id]` | GET | 2 (HTML imprimable) |
| `/api/annonces/broadcast` | POST | 4 |

Module 5 (Finances) écrit directement via `/api/airtable-proxy/CA_Journalier` et `/api/airtable-proxy/Depenses` — pas d'endpoint dédié.

Module 3 (Mon emploi) lit uniquement via `/api/airtable-proxy/*` — pas d'endpoint dédié.

---

## TODO Phase suivante

- Phase D : Intégrer WOLO Pay réel dans `/api/paie/pay` (débit solde patron, crédit employé)
- Phase F : Intégrer Twilio/Wassenger dans `/api/annonces/broadcast` pour push WhatsApp réel
- Phase F : Endpoint `/api/conges/request` + `/api/conges/approve`
- Phase G : Cron mensuel `/api/cron/cloture-mois` qui agrège CA + dépenses + paie en `Bilans_Mensuels`
