// ================================================================
// WOLO Pay — Payer son abonnement Pro via Crédit WOLO
// ================================================================
// POST /api/wolo-pay/debit-credit
// Body : { user_id, montant? }
// Débite le crédit, appelle traiterPaiementAbonnement (commission parrain 10%)
// 100% fonctionnel sans FedaPay.
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { debiterCreditWolo } from '../utils/credit.js';
import { traiterPaiementAbonnement } from '../paiements/abonnement.js';

const MONTANT_PRO_DEFAULT = 2500;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, montant = MONTANT_PRO_DEFAULT } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    // 1. Créer le paiement_abonnement interne
    const reference_interne = `ABO-${Date.now()}-CW${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data: paiement, error: errIns } = await supabase
      .from('paiements_abonnements')
      .insert({
        user_id,
        montant,
        methode_paiement: 'credit_wolo',
        statut: 'PENDING',
        reference_interne,
        parrainage_traite: false
      })
      .select()
      .single();
    if (errIns) throw errIns;

    // 2. Débiter le Crédit WOLO
    try {
      await debiterCreditWolo({
        user_id,
        montant,
        type: 'debit_abonnement',
        description: 'Abonnement Pro WOLO Market (1 mois)'
      });
    } catch (e) {
      await supabase
        .from('paiements_abonnements')
        .update({ statut: 'ÉCHEC' })
        .eq('id', paiement.id);
      return res.status(402).json({ error: e.message });
    }

    // 3. Traitement central (active Pro + commission parrain)
    const result = await traiterPaiementAbonnement({
      user_id,
      paiement_id: paiement.id,
      montant,
      methode: 'credit_wolo'
    });

    return res.status(200).json({ ok: true, paiement, result });
  } catch (err) {
    console.error('[debit-credit]', err);
    return res.status(500).json({ error: err.message });
  }
}
