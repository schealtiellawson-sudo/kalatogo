// ================================================================
// WOLO Pay — Créer transaction marchand (WP-)
// ================================================================
// POST /api/wolo-pay/create-transaction
// Body : { merchant_id, client_email?, client_nom?, montant, mode_paiement, description? }
// Retour : { reference_interne, fedapay? }
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { creerTransactionFedaPay } from '../fedapay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { merchant_id, client_email, client_nom, montant, mode_paiement, description } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!merchant_id || !montant || montant <= 0) {
      return res.status(400).json({ error: 'merchant_id et montant > 0 requis' });
    }

    const reference_interne = `WP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: tx, error } = await supabase
      .from('wolo_transactions')
      .insert({
        merchant_id,
        client_email: client_email || null,
        client_nom: client_nom || null,
        montant,
        mode_paiement: mode_paiement || 'mtn_open',
        statut: 'PENDING',
        reference_interne,
        description: description || 'Paiement WOLO Pay'
      })
      .select()
      .single();

    if (error) throw error;

    // Tentative FedaPay (échoue proprement tant que la clé est placeholder)
    let fedapay = null;
    try {
      fedapay = await creerTransactionFedaPay({
        montant,
        description: description || 'Paiement WOLO Pay',
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
