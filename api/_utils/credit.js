// ================================================================
// Crédit WOZALI + notifications — utilitaires partagés (Supabase)
// ================================================================
// Ce fichier était IMPORTÉ par 7 handlers (5 crons + webhook FedaPay +
// _lib/abonnement.js) mais n'existait pas → tous plantaient au cold-start
// (module introuvable). Créé le 2026-07-10 pour débloquer ces pipelines.
//
// Tables (migration 20260409_wolo_pay_infra.sql) :
//   wolo_credit             (solde par user)
//   wolo_credit_mouvements  (historique/ledger)
//   notifications           (in-app, même forme que cron/coup-du-jour)
// Toutes les fonctions sont défensives (try/catch) : elles n'interrompent
// JAMAIS l'appelant (un cron doit continuer même si une notif échoue).
// ================================================================
import { supabase } from '../_lib/supabase.js';

// ── Notification in-app ──────────────────────────────────────────
// Insère dans la table `notifications` (même schéma que cron/coup-du-jour.js).
export async function envoyerNotification({ user_id, titre, corps, type = 'systeme', url = null }) {
  if (!user_id) return { ok: false, error: 'user_id requis' };
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id,
      type,
      titre: titre || '',
      corps: corps || '',
      url,
      lu: false,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error('[credit] envoyerNotification:', e.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Assure une ligne wolo_credit pour l'utilisateur ──────────────
async function _ensureCredit(user_id) {
  const { data } = await supabase
    .from('wolo_credit')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from('wolo_credit')
    .insert({ user_id, solde_disponible: 0 })
    .select('*')
    .single();
  if (error) throw error;
  return created;
}

// ── Créditer le Crédit WOZALI (montant entier FCFA > 0) ──────────
export async function crediterCreditWozali(user_id, montant, type = 'credit_paiement', description = '') {
  montant = Math.round(Number(montant) || 0);
  if (!user_id || montant <= 0) return { ok: false, error: 'user_id + montant>0 requis' };
  try {
    const credit = await _ensureCredit(user_id);
    const solde_avant = credit.solde_disponible || 0;
    const solde_apres = solde_avant + montant;
    const { error: upErr } = await supabase
      .from('wolo_credit')
      .update({
        solde_disponible: solde_apres,
        total_recu: (credit.total_recu || 0) + montant,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);
    if (upErr) throw upErr;
    await supabase.from('wolo_credit_mouvements').insert({
      user_id, type, montant, solde_avant, solde_apres, description,
    });
    return { ok: true, solde: solde_apres };
  } catch (e) {
    console.error('[credit] crediterCreditWozali:', e.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Débiter le Crédit WOZALI (refuse si solde insuffisant) ───────
export async function debiterCreditWozali(user_id, montant, type = 'debit_abonnement', description = '') {
  montant = Math.round(Number(montant) || 0);
  if (!user_id || montant <= 0) return { ok: false, error: 'user_id + montant>0 requis' };
  try {
    const credit = await _ensureCredit(user_id);
    const solde_avant = credit.solde_disponible || 0;
    if (solde_avant < montant) return { ok: false, error: 'solde insuffisant', solde: solde_avant };
    const solde_apres = solde_avant - montant;
    const { error: upErr } = await supabase
      .from('wolo_credit')
      .update({
        solde_disponible: solde_apres,
        total_depense: (credit.total_depense || 0) + montant,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);
    if (upErr) throw upErr;
    await supabase.from('wolo_credit_mouvements').insert({
      user_id, type, montant, solde_avant, solde_apres, description,
    });
    return { ok: true, solde: solde_apres };
  } catch (e) {
    console.error('[credit] debiterCreditWozali:', e.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}
