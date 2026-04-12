// ================================================================
// WOLO Pay — Fonctions utilitaires Crédit WOLO
// ================================================================
import { supabase } from '../_lib/supabase.js';

// Créditer le Crédit WOLO d'un utilisateur + enregistrer le mouvement
export async function crediterCreditWolo({
  user_id,
  montant,
  type,
  description,
  transaction_id = null,
  destinataire_id = null
}) {
  if (!user_id || !montant || montant <= 0) {
    throw new Error('crediterCreditWolo: user_id et montant > 0 requis');
  }

  // 1. Solde actuel
  const { data: credit, error: errGet } = await supabase
    .from('wolo_credit')
    .select('solde_disponible, plafond_max, total_recu, total_commissions')
    .eq('user_id', user_id)
    .single();

  if (errGet || !credit) {
    throw new Error(`Compte Credit WOLO introuvable pour ${user_id}`);
  }

  const solde_avant = credit.solde_disponible;
  const solde_apres = Math.min(solde_avant + montant, credit.plafond_max);
  const montantEffectif = solde_apres - solde_avant;

  // 2. Mise à jour solde atomique — on ajoute .eq('solde_disponible', solde_avant)
  // pour détecter les modifications concurrentes (optimistic locking)
  const patch = {
    solde_disponible: solde_apres,
    total_recu: (credit.total_recu || 0) + montantEffectif,
    updated_at: new Date().toISOString()
  };
  if (type === 'credit_parrainage') {
    patch.total_commissions = (credit.total_commissions || 0) + montantEffectif;
  }

  const { data: updated, error: errUpd } = await supabase
    .from('wolo_credit')
    .update(patch)
    .eq('user_id', user_id)
    .eq('solde_disponible', solde_avant)
    .select()
    .single();

  if (errUpd || !updated) {
    throw new Error('CONFLIT_CONCURRENT — réessayez');
  }

  // 3. Enregistrer le mouvement
  const { error: errMvt } = await supabase
    .from('wolo_credit_mouvements')
    .insert({
      user_id,
      type,
      montant: montantEffectif,
      solde_avant,
      solde_apres,
      description,
      transaction_id,
      destinataire_id
    });

  if (errMvt) throw errMvt;

  return { solde_avant, solde_apres, montant: montantEffectif };
}

// Débiter le Crédit WOLO (abonnement, transfert, retrait)
export async function debiterCreditWolo({
  user_id,
  montant,
  type,
  description,
  transaction_id = null,
  destinataire_id = null
}) {
  if (!user_id || !montant || montant <= 0) {
    throw new Error('debiterCreditWolo: user_id et montant > 0 requis');
  }

  const { data: credit, error: errGet } = await supabase
    .from('wolo_credit')
    .select('solde_disponible, total_depense, total_retire')
    .eq('user_id', user_id)
    .single();

  if (errGet || !credit) throw new Error(`Compte Credit WOLO introuvable pour ${user_id}`);
  if (credit.solde_disponible < montant) {
    throw new Error('SOLDE_INSUFFISANT');
  }

  const solde_avant = credit.solde_disponible;
  const solde_apres = solde_avant - montant;

  const patch = {
    solde_disponible: solde_apres,
    updated_at: new Date().toISOString()
  };
  if (type === 'debit_retrait') {
    patch.total_retire = (credit.total_retire || 0) + montant;
  } else {
    patch.total_depense = (credit.total_depense || 0) + montant;
  }

  // Optimistic locking : on vérifie que le solde n'a pas changé
  const { data: updated, error: errUpd } = await supabase
    .from('wolo_credit')
    .update(patch)
    .eq('user_id', user_id)
    .eq('solde_disponible', solde_avant)
    .select()
    .single();

  if (errUpd || !updated) {
    throw new Error('CONFLIT_CONCURRENT — réessayez');
  }

  const { error: errMvt } = await supabase
    .from('wolo_credit_mouvements')
    .insert({
      user_id, type, montant,
      solde_avant, solde_apres,
      description, transaction_id, destinataire_id
    });
  if (errMvt) throw errMvt;

  return { solde_avant, solde_apres };
}

// Notification utilisateur (stub — à brancher sur le système existant)
export async function envoyerNotification({ user_id, titre, corps }) {
  try {
    await supabase.from('notifications').insert({
      user_id, titre, corps, lu: false, created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[notif] échec envoi:', e.message);
  }
}
