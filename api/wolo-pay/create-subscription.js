// ================================================================
// WOLO Pay — Créer paiement abonnement Pro (ABO-)
// ================================================================
// POST /api/wolo-pay/create-subscription
// Body : { user_id, email?, nom?, montant?, methode? }
// methode : 'fedapay' (défaut) | 'credit_wolo'
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { creerTransactionFedaPay } from '../fedapay.js';
import { ensureUserProvisioned } from '../_lib/provisioning.js';

const MONTANT_PRO_DEFAULT = 2500;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, email = null, nom = null, montant = MONTANT_PRO_DEFAULT, methode = 'fedapay' } = body;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    await ensureUserProvisioned({ user_id, email });

    // Récupérer abonnement pour le lien FK
    const { data: abonnement } = await supabase
      .from('abonnements')
      .select('id')
      .eq('user_id', user_id)
      .single();

    const reference_interne = `ABO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const { data: paiement, error } = await supabase
      .from('paiements_abonnements')
      .insert({
        abonnement_id: abonnement?.id || null,
        user_id,
        montant,
        statut: 'EN_ATTENTE',
        methode,
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
