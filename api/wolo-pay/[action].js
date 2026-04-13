// ================================================================
// WOLO Pay — Router unique (consolide tous les endpoints)
// Vercel route: /api/wolo-pay/<action>  →  req.query.action
// ================================================================
import { requireAuth } from '../_lib/auth.js';
import balance from './_impl/balance.js';
import contacts from './_impl/contacts.js';
import createSubscription from './_impl/create-subscription.js';
import createTransaction from './_impl/create-transaction.js';
import debitCredit from './_impl/debit-credit.js';
import history from './_impl/history.js';
import pinSet from './_impl/pin-set.js';
import pinVerify from './_impl/pin-verify.js';
import recharger from './_impl/recharger.js';
import recuperer from './_impl/recuperer.js';
import searchUser from './_impl/search-user.js';
import transfer from './_impl/transfer.js';
import transferByEmail from './_impl/transfer-by-email.js';
import merchantPublic from './_impl/merchant-public.js';
import createPaymentLink from './_impl/create-payment-link.js';
import processPublicPay from './_impl/process-public-pay.js';
import stats from './_impl/stats.js';
import parrainageStats from './_impl/parrainage-stats.js';
import parrainageApply from './_impl/parrainage-apply.js';
import abonnementFedapay from './_impl/abonnement-fedapay.js';
import recompensesStatus from './_impl/recompenses-status.js';
import awardsCandidats from './_impl/awards-candidats.js';
import awardsVote from './_impl/awards-vote.js';
import awardsCandidater from './_impl/awards-candidater.js';
import adminVerify from './_impl/admin-verify.js';
import agentsTerrain from './_impl/agents-terrain.js';

// Endpoints publics (pas besoin d'authentification)
const PUBLIC_ACTIONS = new Set([
  'merchant-public',     // Affichage public du commerçant
  'process-public-pay',  // Paiement public via lien/QR
  'awards-candidats',    // Liste publique des candidats Awards
  'awards-vote',         // Vote public
  'admin-verify',        // Gère sa propre auth via token
  'agents-terrain',      // Gère sa propre auth via token admin
]);

const handlers = {
  'merchant-public': merchantPublic,
  'create-payment-link': createPaymentLink,
  'process-public-pay': processPublicPay,
  'stats': stats,
  'parrainage-stats': parrainageStats,
  'parrainage-apply': parrainageApply,
  'abonnement-fedapay': abonnementFedapay,
  'recompenses-status': recompensesStatus,
  'awards-candidats': awardsCandidats,
  'awards-vote': awardsVote,
  'awards-candidater': awardsCandidater,
  'admin-verify': adminVerify,
  'agents-terrain': agentsTerrain,
  'balance': balance,
  'contacts': contacts,
  'create-subscription': createSubscription,
  'create-transaction': createTransaction,
  'debit-credit': debitCredit,
  'history': history,
  'pin-set': pinSet,
  'pin-verify': pinVerify,
  'recharger': recharger,
  'recuperer': recuperer,
  'search-user': searchUser,
  'transfer': transfer,
  'transfer-by-email': transferByEmail,
};

export default async function handler(req, res) {
  const action = req.query.action;
  const fn = handlers[action];
  if (!fn) return res.status(404).json({ error: 'Action inconnue' });

  // Vérifier l'authentification pour les endpoints protégés
  if (!PUBLIC_ACTIONS.has(action)) {
    const user = await requireAuth(req, res);
    if (!user) return; // 401 déjà envoyé par requireAuth
    // Injecter l'utilisateur authentifié dans la requête
    req.authenticatedUser = user;
  }

  return fn(req, res);
}
