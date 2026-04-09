// ================================================================
// WOLO Pay — Transfert P2P Crédit WOLO
// ================================================================
import { debiterCreditWolo, crediterCreditWolo, envoyerNotification } from '../../_utils/credit.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { from_user_id, to_user_id, montant, description } = body;

    if (!from_user_id || !to_user_id || !montant || montant <= 0) {
      return res.status(400).json({ error: 'from_user_id, to_user_id, montant > 0 requis' });
    }
    if (from_user_id === to_user_id) {
      return res.status(400).json({ error: 'Impossible de transférer vers soi-même' });
    }

    await ensureUserProvisioned({ user_id: from_user_id });
    await ensureUserProvisioned({ user_id: to_user_id });

    await debiterCreditWolo({
      user_id: from_user_id,
      montant,
      type: 'debit_transfert',
      description: description || 'Transfert WOLO sortant',
      destinataire_id: to_user_id
    });

    try {
      await crediterCreditWolo({
        user_id: to_user_id,
        montant,
        type: 'credit_paiement',
        description: description || 'Transfert WOLO reçu',
        destinataire_id: from_user_id
      });
    } catch (e) {
      await crediterCreditWolo({
        user_id: from_user_id,
        montant,
        type: 'credit_paiement',
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
