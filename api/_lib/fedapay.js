// ================================================================
// WOLO Pay — Wrapper FedaPay API (sandbox par défaut)
// ================================================================
// ENV :
//   FEDAPAY_SECRET_KEY  sk_sandbox_xxx | sk_live_xxx
//   FEDAPAY_ENV         'sandbox' (défaut) | 'live'
//   APP_URL             https://wolomarket.vercel.app
// ================================================================

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
if (!FEDAPAY_SECRET_KEY) {
  console.error('[fedapay] FEDAPAY_SECRET_KEY env var manquant');
}
const FEDAPAY_BASE_URL = process.env.FEDAPAY_ENV === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

function authHeaders(extra = {}) {
  return {
    'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

// Créer une transaction FedaPay
export async function creerTransactionFedaPay({ montant, description, client_email, client_nom, reference }) {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      description,
      amount: montant,
      currency: { iso: 'XOF' },
      callback_url: `${process.env.APP_URL}/api/webhooks/fedapay`,
      customer: { email: client_email, lastname: client_nom },
      custom_metadata: { reference_interne: reference }
    })
  });
  return response.json();
}

// Générer un token de paiement pour une transaction
export async function genererTokenPaiement(transaction_id) {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${transaction_id}/token`, {
    method: 'POST',
    headers: authHeaders()
  });
  return response.json();
}

// Paiement sans redirection (mobile money direct)
// operateur : 'mtn_open' · 'moov' · 'moov_tg' · 'togocel'
export async function paiementSansRedirection({ token, operateur, telephone }) {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${token}/pay`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ mode: operateur, phone_number: telephone })
  });
  return response.json();
}

// Récupérer le statut d'une transaction
export async function getTransactionFedaPay(transaction_id) {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${transaction_id}`, {
    headers: authHeaders()
  });
  return response.json();
}
