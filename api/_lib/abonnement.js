// ================================================================
// WOLO Pay — Traitement central des paiements d'abonnement
// ================================================================
// Appelée par :
//   1. Webhook FedaPay (paiement mobile money)
//   2. Déduction Crédit WOLO interne
// Garantit le traitement du parrainage dans tous les cas.
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWolo, envoyerNotification } from '../_utils/credit.js';

export async function traiterPaiementAbonnement({ user_id, paiement_id, montant, methode = 'fedapay' }) {
  // 0. Idempotence : si déjà PAYÉ et parrainage_traite, ne rien faire
  const { data: existing } = await supabase
    .from('paiements_abonnements')
    .select('statut, parrainage_traite')
    .eq('id', paiement_id)
    .single();

  if (existing?.statut === 'PAYÉ' && existing?.parrainage_traite) {
    return { alreadyProcessed: true };
  }

  // 1. Marquer PAYÉ
  await supabase
    .from('paiements_abonnements')
    .update({ statut: 'PAYÉ', paid_at: new Date().toISOString() })
    .eq('id', paiement_id);

  // 2. Activer/renouveler l'abonnement Pro (+1 mois)
  const date_fin = new Date();
  date_fin.setMonth(date_fin.getMonth() + 1);

  await supabase
    .from('abonnements')
    .update({
      plan: 'pro',
      statut: 'actif',
      date_debut: new Date().toISOString(),
      date_fin: date_fin.toISOString(),
      methode_paiement: methode,
      montant
    })
    .eq('user_id', user_id);

  // 3. Parrain actif ?
  const { data: parrainage } = await supabase
    .from('parrainages')
    .select('*')
    .eq('filleul_id', user_id)
    .eq('statut', 'actif')
    .maybeSingle();

  // 4. Si parrain : commission
  if (parrainage) {
    // Sprint 6 : taux 40% (1 000 FCFA sur 2 500 FCFA)
    const commission = Math.floor(montant * Number(parrainage.taux_commission || 0.40));

    if (commission > 0) {
      await crediterCreditWolo({
        user_id: parrainage.parrain_id,
        montant: commission,
        type: 'credit_parrainage',
        description: 'Commission parrainage — abonnement Pro filleul'
      });

      await supabase.from('commissions_parrainage').insert({
        parrainage_id: parrainage.id,
        paiement_id,
        parrain_id: parrainage.parrain_id,
        filleul_id: user_id,
        montant: commission,
        statut: 'versée'
      });

      await supabase
        .from('parrainages')
        .update({
          total_commissions_versees: (parrainage.total_commissions_versees || 0) + commission
        })
        .eq('id', parrainage.id);

      await envoyerNotification({
        user_id: parrainage.parrain_id,
        titre: 'Commission reçue',
        corps: `Tu as reçu ${commission.toLocaleString('fr-FR')} FCFA · ton filleul vient de renouveler son Plan Pro`
      });
    }
  }

  // 5. Marquer parrainage traité
  await supabase
    .from('paiements_abonnements')
    .update({ parrainage_traite: true })
    .eq('id', paiement_id);

  return { ok: true, parrain: parrainage ? parrainage.parrain_id : null };
}
