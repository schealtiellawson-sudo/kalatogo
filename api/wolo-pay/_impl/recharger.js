// ================================================================
// WOLO Pay — Recharger Crédit WOLO depuis mobile money
// POST /api/wolo-pay/recharger { user_id, montant, operateur, telephone }
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { creerTransactionFedaPay } from '../../_lib/fedapay.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

const PLAFOND_MAX = 200000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, montant, operateur, telephone, email } = body;
    if (!user_id || !montant || !operateur || !telephone) {
      return res.status(400).json({ error: 'user_id, montant, operateur, telephone requis' });
    }
    if (montant < 500) return res.status(400).json({ error: 'Montant minimum 500 FCFA' });

    await ensureUserProvisioned({ user_id, email });

    // Vérifier plafond
    const { data: credit } = await supabase
      .from('wolo_credit').select('solde_disponible').eq('user_id', user_id).single();
    const solde = credit?.solde_disponible || 0;
    if (solde + montant > PLAFOND_MAX) {
      return res.status(400).json({
        error: `Plafond dépassé. Tu peux recharger ${PLAFOND_MAX - solde} FCFA maximum.`,
        code: 'PLAFOND'
      });
    }

    // Créer une wolo_transactions de type rechargement
    const reference_interne = `RCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const { data: tx, error } = await supabase
      .from('wolo_transactions')
      .insert({
        merchant_id: user_id,
        montant,
        montant_avec_frais: montant,
        frais_traitement: 0,
        taux_frais: 0,
        operateur,
        mode_paiement: 'identifiant',
        statut: 'PENDING',
        reference_interne,
        pays_client: operateur.endsWith('_tg') ? 'TG' : 'BJ'
      })
      .select().single();
    if (error) throw error;

    // Appeler FedaPay (fail gracieux tant que clé = placeholder)
    let fedapay = null;
    try {
      fedapay = await creerTransactionFedaPay({
        montant,
        description: 'Rechargement Crédit WOLO',
        client_email: email || 'user@wolomarket.com',
        client_nom: 'Membre WOLO',
        reference: reference_interne
      });
    } catch (e) { fedapay = { error: 'FedaPay indisponible', detail: e.message }; }

    return res.status(200).json({ ok: true, transaction: tx, fedapay });
  } catch (err) {
    console.error('[recharger]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
