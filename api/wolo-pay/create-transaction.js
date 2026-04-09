// ================================================================
// WOLO Pay — Créer transaction marchand (WP-)
// ================================================================
// POST /api/wolo-pay/create-transaction
// Body : { merchant_id, merchant_email?, montant, operateur?, mode_paiement?, pays_client?, description? }
// Retour : { ok, transaction, fedapay? }
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { creerTransactionFedaPay } from '../fedapay.js';
import { ensureUserProvisioned } from '../_lib/provisioning.js';

const TAUX_FRAIS = 0.015;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const {
      merchant_id,
      merchant_email = null,
      montant,
      operateur = 'mtn_bj',
      mode_paiement = 'lien_paiement',
      pays_client = null,
      description = 'Paiement WOLO Pay',
      client_nom = null,
      client_email = null
    } = body;

    if (!merchant_id || !montant || montant < 100) {
      return res.status(400).json({ error: 'merchant_id et montant >= 100 requis' });
    }

    await ensureUserProvisioned({ user_id: merchant_id, email: merchant_email });

    const frais_traitement = Math.ceil(montant * TAUX_FRAIS);
    const montant_avec_frais = montant + frais_traitement;
    const reference_interne = `WP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const { data: tx, error } = await supabase
      .from('wolo_transactions')
      .insert({
        merchant_id,
        montant,
        montant_avec_frais,
        frais_traitement,
        taux_frais: TAUX_FRAIS,
        operateur,
        mode_paiement,
        statut: 'PENDING',
        reference_interne,
        pays_client
      })
      .select()
      .single();

    if (error) throw error;

    // Miroir Airtable (best effort, non bloquant)
    try {
      const AT_TOKEN = process.env.AIRTABLE_TOKEN;
      const AT_BASE = process.env.AIRTABLE_BASE_ID || 'applmj1RDrJkR8C4w';
      if (AT_TOKEN) {
        await fetch(`https://api.airtable.com/v0/${AT_BASE}/WOLO%20Pay%20%E2%80%94%20Transactions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            'Reference Interne': reference_interne,
            'Merchant Email': merchant_email || '',
            'Client Email': client_email || '',
            'Montant FCFA': montant,
            'Mode Paiement': operateur,
            'Statut': 'PENDING',
            'Date création': new Date().toISOString()
          }})
        });
      }
    } catch (e) { console.warn('[airtable mirror]', e.message); }

    // Tentative FedaPay (fail silencieux tant que clé = placeholder)
    let fedapay = null;
    try {
      fedapay = await creerTransactionFedaPay({
        montant: montant_avec_frais,
        description,
        client_email: client_email || 'anonyme@wolomarket.com',
        client_nom: client_nom || 'Client',
        reference: reference_interne
      });
    } catch (e) {
      fedapay = { error: 'FedaPay indisponible', detail: e.message };
    }

    return res.status(200).json({ ok: true, transaction: tx, fedapay });
  } catch (err) {
    console.error('[create-transaction]', err);
    return res.status(500).json({ error: err.message });
  }
}
