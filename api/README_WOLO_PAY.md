# WOLO Pay — Infrastructure Sprint 3

## Contenu

```
supabase/migrations/20260409_wolo_pay_infra.sql   → 8 tables + RLS + triggers
api/_lib/supabase.js                              → client Supabase service role
api/fedapay.js                                    → wrapper FedaPay (sandbox/live)
api/utils/credit.js                               → crediter/debiter Crédit WOLO + notif
api/paiements/abonnement.js                       → traiterPaiementAbonnement() central
api/webhooks/fedapay.js                           → webhook FedaPay (WP- et ABO-)
```

## Déploiement

### 1. Migration Supabase
Exécuter `20260409_wolo_pay_infra.sql` dans l'éditeur SQL Supabase.
**Pré-requis** : table `profiles` existante (référencée par toutes les FK).
Si le projet n'a pas encore de `profiles`, la créer avant :
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  nom text,
  created_at timestamptz DEFAULT now()
);
```

### 2. Variables d'environnement Vercel
```
FEDAPAY_SECRET_KEY=sk_sandbox_XXXXXXXX
FEDAPAY_ENV=sandbox
APP_URL=https://wolomarket.vercel.app
SUPABASE_URL=https://wikgdksyeygwpmqzmhez.supabase.co
SUPABASE_SERVICE_KEY=XXXX   # service_role, jamais exposé côté client
```

Pour passer en production : `sk_sandbox_*` → `sk_live_*` et `FEDAPAY_ENV=live`.

### 3. Configurer le webhook dans FedaPay Dashboard
URL : `https://wolomarket.vercel.app/api/webhooks/fedapay`
Événements : `transaction.approved`

### 4. Dépendance
```bash
npm i @supabase/supabase-js
```

## Tests de validation

| Test | Méthode |
|---|---|
| Tables créées | Supabase → Table Editor |
| RLS actif | Supabase → Authentication → Policies |
| Trigger create_wolo_credit | INSERT profiles → SELECT wolo_credit WHERE user_id=… |
| Trigger create_abonnement | INSERT profiles → SELECT abonnements WHERE user_id=… |
| Webhook signature | POST `/api/webhooks/fedapay` avec payload `transaction.approved` simulé |
| traiterPaiementAbonnement sans parrain | Crée paiements_abonnements → appelle fn → vérifier `statut=PAYÉ` + `plan=pro` |
| traiterPaiementAbonnement avec parrain | Idem + créer parrainages → vérifier commission versée dans wolo_credit_mouvements |

## Flux de référence

### Paiement marchand (WP-)
1. Client scanne QR → frontend crée `wolo_transactions` (`statut=PENDING`, `reference_interne=WP-xxx`)
2. Frontend appelle `creerTransactionFedaPay()` avec `reference`
3. Client paie → FedaPay POST `/api/webhooks/fedapay`
4. Webhook détecte prefix `WP-` → update `statut=PAYÉ` + `crediterCreditWolo(merchant)` + notif

### Abonnement Pro (ABO-)
1. Prestataire clique "Passer au Pro" → crée `paiements_abonnements` (`reference_interne=ABO-xxx`)
2. `creerTransactionFedaPay()` avec ce `reference`
3. Webhook détecte prefix `ABO-` → `traiterPaiementAbonnement()`
4. Fonction : statut PAYÉ + plan='pro' + commission parrain 10% si filleul
