// ================================================================
// WOLO Pay — Retrait Crédit WOLO vers mobile money
// POST /api/wolo-pay/recuperer { user_id, montant, operateur, telephone }
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { debiterCreditWolo, envoyerNotification } from '../../_utils/credit.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

const MIN_WITHDRAWAL = 1000;
const FRAIS_GRATUIT = 0.02;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, montant, operateur, telephone, email } = body;

    if (!user_id || !montant || !operateur || !telephone) {
      return res.status(400).json({ error: 'user_id, montant, operateur, telephone requis' });
    }
    if (montant < MIN_WITHDRAWAL) {
      return res.status(400).json({ error: `Minimum ${MIN_WITHDRAWAL} FCFA` });
    }

    await ensureUserProvisioned({ user_id, email });

    // Plan du user
    const { data: abo } = await supabase
      .from('abonnements').select('plan').eq('user_id', user_id).single();
    const isPro = abo?.plan === 'pro';
    const frais = isPro ? 0 : Math.ceil(montant * FRAIS_GRATUIT);
    const montantRecu = montant - frais;

    // Débit
    await debiterCreditWolo({
      user_id,
      montant,
      type: 'debit_retrait',
      description: `Retrait ${operateur} · ${telephone}${frais ? ` (frais ${frais})` : ''}`
    });

    // Enregistrer la transaction
    const reference_interne = `RET-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    await supabase.from('wolo_transactions').insert({
      merchant_id: user_id,
      montant: montantRecu,
      montant_avec_frais: montant,
      frais_traitement: frais,
      taux_frais: isPro ? 0 : FRAIS_GRATUIT,
      operateur,
      mode_paiement: 'identifiant',
      statut: 'PENDING',
      reference_interne,
      pays_client: operateur.endsWith('_tg') ? 'TG' : 'BJ'
    });

    await envoyerNotification({
      user_id,
      titre: 'Retrait en cours',
      corps: `${montantRecu.toLocaleString('fr-FR')} FCFA vers ${telephone} · dispo sous 24h`
    });

    return res.status(200).json({
      ok: true,
      montant_debite: montant,
      frais,
      montant_recu: montantRecu,
      reference_interne,
      delai: '24h'
    });
  } catch (err) {
    console.error('[recuperer]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
