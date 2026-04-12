// ================================================================
// CRON — Renouvellements automatiques des abonnements Pro
// Vercel schedule : 0 8 * * *  (08h00 UTC tous les jours)
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { debiterCreditWolo, envoyerNotification } from '../_utils/credit.js';
import { traiterPaiementAbonnement } from '../_lib/abonnement.js';

const MONTANT_PRO = 2500;

export default async function handler(req, res) {
  // Sécurité : vérifier le secret CRON de Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 86400000);

    // 1) Notifications J-3 aux abonnements qui expirent bientôt
    const { data: expBientot = [] } = await supabase
      .from('abonnements')
      .select('id, user_id, date_fin')
      .eq('plan', 'pro')
      .eq('statut', 'actif')
      .eq('renouvellement_auto', true)
      .gte('date_fin', now.toISOString())
      .lte('date_fin', in3days.toISOString());

    for (const abo of expBientot) {
      await envoyerNotification({
        user_id: abo.user_id,
        titre: 'Ton Plan Pro expire dans 3 jours',
        corps: 'Renouvelle maintenant pour ne pas perdre ton QR code et l\'accès aux paiements clients.'
      });
    }

    // 2) Jour J : tentative de débit Crédit WOLO
    const { data: echus = [] } = await supabase
      .from('abonnements')
      .select('id, user_id, date_fin')
      .eq('plan', 'pro')
      .eq('statut', 'actif')
      .eq('renouvellement_auto', true)
      .lte('date_fin', now.toISOString());

    const results = { notifies: expBientot.length, renouveles: 0, echecs: 0, expires: 0 };

    for (const abo of echus) {
      // Vérifie solde Crédit WOLO
      const { data: credit } = await supabase
        .from('wolo_credit')
        .select('solde_disponible')
        .eq('user_id', abo.user_id)
        .single();

      if (credit && credit.solde_disponible >= MONTANT_PRO) {
        try {
          // Créer paiement + débiter + activer Pro via le flux central
          const { data: paiement } = await supabase
            .from('paiements_abonnements')
            .insert({
              abonnement_id: abo.id,
              user_id: abo.user_id,
              montant: MONTANT_PRO,
              statut: 'EN_ATTENTE',
              methode: 'credit_wolo',
              parrainage_traite: false
            })
            .select()
            .single();

          await debiterCreditWolo({
            user_id: abo.user_id,
            montant: MONTANT_PRO,
            type: 'debit_abonnement',
            description: 'Renouvellement auto Plan Pro'
          });

          await traiterPaiementAbonnement({
            user_id: abo.user_id,
            paiement_id: paiement.id,
            montant: MONTANT_PRO,
            methode: 'credit_wolo'
          });

          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Plan Pro renouvelé ✅',
            corps: `2 500 FCFA débités de ton Crédit WOLO · Valide encore 1 mois`
          });

          results.renouveles++;
        } catch (e) {
          results.echecs++;
          console.error('[renouvellement]', abo.user_id, e.message);
        }
      } else {
        // Solde insuffisant : 48h de grâce puis expiration
        const dateGrace = new Date(abo.date_fin);
        dateGrace.setHours(dateGrace.getHours() + 48);

        if (now > dateGrace) {
          await supabase
            .from('abonnements')
            .update({ statut: 'expiré', plan: 'gratuit' })
            .eq('id', abo.id);
          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Plan Pro expiré',
            corps: 'Ton QR code est désactivé. Recharge ton Crédit WOLO et réactive ton Plan Pro.'
          });
          results.expires++;
        } else {
          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Crédit WOLO insuffisant',
            corps: 'Ton Crédit WOLO est insuffisant pour renouveler. Recharge maintenant pour éviter l\'expiration dans 48h.'
          });
          results.echecs++;
        }
      }
    }

    return res.status(200).json({ ok: true, ...results });
  } catch (err) {
    console.error('[cron/renouvellements]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
