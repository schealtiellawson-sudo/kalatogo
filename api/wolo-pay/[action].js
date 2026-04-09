// ================================================================
// WOLO Pay — Router unique (consolide tous les endpoints)
// Vercel route: /api/wolo-pay/<action>  →  req.query.action
// ================================================================
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

const handlers = {
  'merchant-public': merchantPublic,
  'create-payment-link': createPaymentLink,
  'process-public-pay': processPublicPay,
  'stats': stats,
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
  if (!fn) return res.status(404).json({ error: `Unknown action: ${action}` });
  return fn(req, res);
}
