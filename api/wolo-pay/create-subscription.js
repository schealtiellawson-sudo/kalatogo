// ================================================================
// WOLO Pay — Créer paiement abonnement Pro (ABO-)
// ================================================================
// POST /api/wolo-pay/create-subscription
// Body : { user_id, montant?, methode? }
// methode = 'fedapay' (défaut) | 'credit_wolo'
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { creerTransactionFedaPay } from '../fedapay.js';

const MONTANT_PRO_DEFAULT = 2500;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, montant = MONTANT_PRO_DEFAULT, methode = 'fedapay', email, nom } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    const reference_interne = `ABO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: paiement, error } = await supabase
      .from('paiements_abonnements')
      .insert({
        user_id,
        montant,
        methode_paiement: methode,
        statut: 'PENDING',
        reference_interne,
        parrainage_traite: false
      })
      .select()
      .single();

    if (error) throw error;

    let fedapay = null;
    if (methode === 'fedapay') {
      try {
        fedapay = await creerTransactionFedaPay({
          montant,
          description: 'Abonnement Pro WOLO Market',
          client_email: email || 'anonyme@wolomarket.com',
          client_nom: nom || 'Prestataire',
          reference: reference_interne
        });
      } catch (e) {
        fedapay = { error: 'FedaPay indisponible', detail: e.message };
      }
    }

    return res.status(200).json({ ok: true, paiement, fedapay });
  } catch (err) {
    console.error('[create-subscription]', err);
    return res.status(500).json({ error: err.message });
  }
}
