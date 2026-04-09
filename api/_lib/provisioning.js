// ================================================================
// WOLO Pay — Auto-provisioning profiles + wolo_credit + abonnements
// ================================================================
// Garantit qu'un user_id a toujours : profiles row, wolo_credit row,
// abonnement row. Appelé avant toute opération wolo_pay.
// ================================================================
import { supabase } from './supabase.js';

export async function ensureUserProvisioned({ user_id, email = null }) {
  if (!user_id) throw new Error('user_id requis');

  // 1. profiles (upsert)
  await supabase
    .from('profiles')
    .upsert({ id: user_id, email }, { onConflict: 'id', ignoreDuplicates: true });

  // 2. wolo_credit (upsert)
  await supabase
    .from('wolo_credit')
    .upsert({ user_id }, { onConflict: 'user_id', ignoreDuplicates: true });

  // 3. abonnements (upsert)
  await supabase
    .from('abonnements')
    .upsert({ user_id, plan: 'gratuit', statut: 'actif' }, { onConflict: 'user_id', ignoreDuplicates: true });

  return true;
}
