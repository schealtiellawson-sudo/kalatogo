// ================================================================
// WOLO Pay — Transfert P2P entre deux Crédit WOLO
// ================================================================
// POST /api/wolo-pay/transfer
// Body : { from_user_id, to_user_id, montant, description? }
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { debiterCreditWolo, crediterCreditWolo, envoyerNotification } from '../utils/credit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { from_user_id, to_user_id, montant, description } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!from_user_id || !to_user_id || !montant || montant <= 0) {
      return res.status(400).json({ error: 'from_user_id, to_user_id, montant > 0 requis' });
    }
    if (from_user_id === to_user_id) {
      return res.status(400).json({ error: 'Impossible de transférer vers soi-même' });
    }

    // 1. Débit émetteur
    await debiterCreditWolo({
      user_id: from_user_id,
      montant,
      type: 'debit_transfert',
      description: description || 'Transfert WOLO sortant',
      destinataire_id: to_user_id
    });

    // 2. Crédit destinataire
    try {
      await crediterCreditWolo({
        user_id: to_user_id,
        montant,
        type: 'credit_transfert',
        description: description || 'Transfert WOLO reçu',
        destinataire_id: from_user_id
      });
    } catch (e) {
      // rollback
      await crediterCreditWolo({
        user_id: from_user_id,
        montant,
        type: 'credit_rollback',
        description: 'Rollback transfert échoué'
      });
      throw e;
    }

    await envoyerNotification({
      user_id: to_user_id,
      titre: 'Transfert reçu',
      corps: `Tu as reçu ${montant.toLocaleString('fr-FR')} FCFA sur ton Crédit WOLO`
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[transfer]', err);
    return res.status(500).json({ error: err.message });
  }
}
