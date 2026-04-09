// POST /api/wolo-pay/process-public-pay
// { merchant_id, montant, operateur, telephone, token? (si lien), client_email? }
import { supabase } from '../../_lib/supabase.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';
import { crediterCreditWolo, envoyerNotification } from '../../_utils/credit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { merchant_id, montant, operateur, telephone, token, client_email } = body;
    if (!merchant_id || !montant || montant < 100)
      return res.status(400).json({ error: 'Champs requis manquants' });

    await ensureUserProvisioned({ user_id: merchant_id });

    // Frais 1.5% à la charge du payeur
    const frais = Math.ceil(montant * 0.015);
    const total_paye = montant + frais;

    // Vérifier lien si fourni
    if (token) {
      const { data: link } = await supabase
        .from('wolo_payment_links').select('*').eq('token', token).single();
      if (!link) return res.status(404).json({ error: 'Lien introuvable' });
      if (link.statut !== 'PENDING') return res.status(400).json({ error: 'Lien déjà utilisé ou expiré' });
      if (new Date(link.expires_at) < new Date()) return res.status(400).json({ error: 'Lien expiré' });
    }

    const reference_interne = `WP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    const { data: tx, error } = await supabase.from('wolo_transactions').insert({
      merchant_id,
      montant,
      montant_avec_frais: total_paye,
      frais_traitement: frais,
      taux_frais: 0.015,
      operateur: operateur || 'credit_wolo',
      mode_paiement: token ? 'lien' : 'qr',
      statut: 'PAID',
      reference_interne,
      pays_client: (operateur||'').endsWith('_tg') ? 'TG' : 'BJ'
    }).select().single();
    if (error) throw error;

    // Créditer le commerçant
    await crediterCreditWolo({
      user_id: merchant_id,
      montant,
      type: 'credit_paiement',
      description: `Paiement ${token?'lien':'QR'} ${reference_interne}`
    });

    // Marquer le lien comme PAYÉ
    if (token) {
      await supabase.from('wolo_payment_links')
        .update({ statut: 'PAID', paid_at: new Date().toISOString(), transaction_id: tx.id })
        .eq('token', token);
    }

    await envoyerNotification({
      user_id: merchant_id,
      titre: 'Paiement reçu',
      corps: `Tu as reçu ${montant.toLocaleString('fr-FR')} FCFA sur ton Crédit WOLO`
    });

    return res.status(200).json({ ok: true, transaction: tx, reference: reference_interne });
  } catch (err) {
    console.error('[process-public-pay]', err);
    return res.status(500).json({ error: err.message });
  }
}
