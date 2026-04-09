// ================================================================
// WOLO Pay — Webhook FedaPay
// ================================================================
// Reçoit les événements FedaPay (transaction.approved, etc.)
// Met à jour wolo_transactions OU paiements_abonnements selon le
// préfixe de reference_interne (WP- / ABO-).
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWolo, envoyerNotification } from '../utils/credit.js';
import { traiterPaiementAbonnement } from '../paiements/abonnement.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // On ne traite que les transactions approuvées
    if (body?.name !== 'transaction.approved') {
      return res.status(200).json({ received: true, ignored: body?.name });
    }

    const reference_fedapay = body.data?.reference;
    const reference_interne = body.data?.custom_metadata?.reference_interne;

    if (!reference_interne) {
      return res.status(200).json({ received: true, missing: 'reference_interne' });
    }

    // ---- Cas 1 : Paiement d'abonnement (ABO-) ----
    if (reference_interne.startsWith('ABO-')) {
      const { data: paiement } = await supabase
        .from('paiements_abonnements')
        .select('*')
        .eq('reference_interne', reference_interne)
        .single();

      if (!paiement) return res.status(200).json({ received: true, notfound: true });
      if (paiement.statut === 'PAYÉ' && paiement.parrainage_traite) {
        return res.status(200).json({ received: true, duplicate: true });
      }

      await supabase
        .from('paiements_abonnements')
        .update({ reference_fedapay })
        .eq('id', paiement.id);

      await traiterPaiementAbonnement({
        user_id: paiement.user_id,
        paiement_id: paiement.id,
        montant: paiement.montant,
        methode: 'fedapay'
      });

      await envoyerNotification({
        user_id: paiement.user_id,
        titre: 'Abonnement Pro activé',
        corps: 'Ton Plan Pro est activé pour 30 jours. Merci !'
      });

      return res.status(200).json({ received: true, type: 'abonnement' });
    }

    // ---- Cas 2 : Paiement marchand WOLO Pay (WP-) ----
    if (reference_interne.startsWith('WP-')) {
      const { data: tx } = await supabase
        .from('wolo_transactions')
        .select('*')
        .eq('reference_interne', reference_interne)
        .single();

      if (!tx) return res.status(200).json({ received: true, notfound: true });
      if (tx.statut === 'PAYÉ') {
        return res.status(200).json({ received: true, duplicate: true });
      }

      await supabase
        .from('wolo_transactions')
        .update({
          statut: 'PAYÉ',
          reference_fedapay,
          paid_at: new Date().toISOString()
        })
        .eq('id', tx.id);

      await crediterCreditWolo({
        user_id: tx.merchant_id,
        montant: tx.montant,
        type: 'credit_paiement',
        description: `Paiement reçu via ${tx.mode_paiement}`,
        transaction_id: tx.id
      });

      await envoyerNotification({
        user_id: tx.merchant_id,
        titre: 'Paiement reçu',
        corps: `Tu as reçu ${tx.montant.toLocaleString('fr-FR')} FCFA sur ton Crédit WOLO`
      });

      return res.status(200).json({ received: true, type: 'marchand' });
    }

    return res.status(200).json({ received: true, unknown_prefix: true });
  } catch (err) {
    console.error('[webhook fedapay] erreur:', err);
    return res.status(500).json({ error: err.message });
  }
}
