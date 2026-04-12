// ================================================================
// WOLO Pay — Payer abonnement Pro via Crédit WOLO
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { debiterCreditWolo } from '../../_utils/credit.js';
import { traiterPaiementAbonnement } from '../../paiements/abonnement.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

const MONTANT_PRO_DEFAULT = 2500;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, email = null, montant = MONTANT_PRO_DEFAULT } = body;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    // Sécurité : vérifier que l'utilisateur agit sur son propre compte
    if (req.authenticatedUser && req.authenticatedUser.user_id !== user_id) {
      return res.status(403).json({ error: 'Opération non autorisée' });
    }

    await ensureUserProvisioned({ user_id, email });

    const { data: abonnement } = await supabase
      .from('abonnements')
      .select('id')
      .eq('user_id', user_id)
      .single();

    const reference_interne = `ABO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-CW${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: paiement, error: errIns } = await supabase
      .from('paiements_abonnements')
      .insert({
        abonnement_id: abonnement?.id || null,
        user_id,
        montant,
        statut: 'EN_ATTENTE',
        methode: 'credit_wolo',
        reference_interne,
        parrainage_traite: false
      })
      .select()
      .single();
    if (errIns) throw errIns;

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
        .update({ statut: 'ÉCHOUÉ' })
        .eq('id', paiement.id);
      return res.status(402).json({ error: e.message });
    }

    const result = await traiterPaiementAbonnement({
      user_id,
      paiement_id: paiement.id,
      montant,
      methode: 'credit_wolo'
    });

    return res.status(200).json({ ok: true, paiement, result });
  } catch (err) {
    console.error('[debit-credit]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
