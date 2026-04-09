// POST /api/wolo-pay/abonnement-fedapay  — STUB (FedaPay non encore intégré)
// Sprint 6 : garde la structure complète, retourne "bientôt disponible"
// Quand les clés FEDAPAY_* seront dispo, décommenter la partie active.
import { supabase } from '../../_lib/supabase.js';

const MONTANT_PRO = 2500;
const FRAIS_TAUX = 0.015;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, operateur, numero } = body;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    const frais = Math.round(MONTANT_PRO * FRAIS_TAUX);
    const total = MONTANT_PRO + frais;

    // FedaPay pas encore dispo → renvoie breakdown + message placeholder
    if (!process.env.FEDAPAY_SECRET_KEY) {
      return res.status(503).json({
        ok: false,
        disponible: false,
        message: 'Paiement Mobile Money bientôt disponible. Utilise le Crédit WOLO pour activer ton Plan Pro.',
        breakdown: {
          abonnement: MONTANT_PRO,
          frais,
          total,
          merchant_recoit: MONTANT_PRO
        }
      });
    }

    // --- Intégration FedaPay réelle (à brancher quand clés dispo) ---
    // const { data: abo } = await supabase.from('abonnements').select('id').eq('user_id', user_id).single();
    // const { data: paiement } = await supabase.from('paiements_abonnements').insert({...}).select().single();
    // const tx = await fedapayCreate({ amount: total, pass_fee: false, customer: { ... } });
    // return res.status(200).json({ ok:true, payment_url: tx.url, paiement_id: paiement.id });

    return res.status(503).json({ error: 'FedaPay non implémenté' });
  } catch (err) {
    console.error('[abonnement-fedapay]', err);
    return res.status(500).json({ error: err.message });
  }
}
