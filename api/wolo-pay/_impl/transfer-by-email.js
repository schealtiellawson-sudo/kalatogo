// ================================================================
// WOLO Pay — Transfert par email (pratique pour l'UI Envoyer)
// POST /api/wolo-pay/transfer-by-email { from_user_id, to_email, montant, description }
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { debiterCreditWolo, crediterCreditWolo, envoyerNotification } from '../../_utils/credit.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { from_user_id, to_email, montant, description } = body;
    if (!from_user_id || !to_email || !montant || montant < 100) {
      return res.status(400).json({ error: 'from_user_id, to_email, montant >= 100 requis' });
    }

    const { data: dest } = await supabase
      .from('profiles').select('id, email').eq('email', to_email).single();
    if (!dest) return res.status(404).json({ error: 'Destinataire non trouvé sur WOLO Market', code: 'NOT_FOUND' });
    if (dest.id === from_user_id) return res.status(400).json({ error: 'Impossible de transférer vers soi-même' });

    await ensureUserProvisioned({ user_id: from_user_id });
    await ensureUserProvisioned({ user_id: dest.id });

    await debiterCreditWolo({
      user_id: from_user_id,
      montant,
      type: 'debit_transfert',
      description: description || `Transfert à ${to_email}`,
      destinataire_id: dest.id
    });

    try {
      await crediterCreditWolo({
        user_id: dest.id,
        montant,
        type: 'credit_paiement',
        description: description || 'Transfert WOLO reçu',
        destinataire_id: from_user_id
      });
    } catch (e) {
      await crediterCreditWolo({
        user_id: from_user_id, montant,
        type: 'credit_paiement', description: 'Rollback transfert échoué'
      });
      throw e;
    }

    // Marquer contact favori (derniere_transaction)
    await supabase.from('wolo_contacts_favoris')
      .update({ derniere_transaction: new Date().toISOString() })
      .eq('user_id', from_user_id).eq('contact_user_id', dest.id);

    await envoyerNotification({
      user_id: dest.id,
      titre: 'Transfert reçu',
      corps: `Tu as reçu ${montant.toLocaleString('fr-FR')} FCFA sur ton Crédit WOLO`
    });

    return res.status(200).json({ ok: true, destinataire: dest });
  } catch (err) {
    console.error('[transfer-by-email]', err);
    return res.status(500).json({ error: err.message });
  }
}
