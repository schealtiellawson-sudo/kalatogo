// ================================================================
// pushNotification - fondation notifications serveur WOZALI
// ================================================================
// Avant ce fichier, la fonction de notification (ex: notifyCandidatStatut
// dans app.js) écrivait dans la mémoire locale/le champ Notifications JSON
// DEPUIS LE NAVIGATEUR de celui qui agit (le recruteur), pas du destinataire.
// Les règles RLS interdisent cette écriture (voir audit sécurité
// 20260710_security_audit_rls_fixes.sql, policy "prest_update_self" avec
// WITH CHECK auth.uid() = user_id) donc l'erreur était avalée en silence et
// le destinataire ne recevait jamais rien.
//
// Cette fonction tourne côté serveur avec les droits de service : elle peut
// écrire une notification pour N'IMPORTE QUEL utilisateur, sans jamais
// pouvoir être appelée directement par le navigateur (elle vit dans _lib/,
// non exposée par le routeur).
//
// Usage :
//   import { pushNotification } from '../../_lib/notifications.js';
//   await pushNotification(destinataireUserId, 'candidature_statut', {
//     titre, message, lien: 'emploi-candidatures',
//   }, { push: true, pushTitle: titre, pushBody: message });
// ================================================================
import { supabase } from './supabase.js';

const MAX_PUSH_PER_DAY = 5;

/**
 * Écrit une notification serveur pour un utilisateur, avec les droits de
 * service (bypass RLS). Optionnellement déclenche un push web (sendPushToUser),
 * plafonné à MAX_PUSH_PER_DAY envois par utilisateur et par jour.
 *
 * @param {string} userId - destinataire (auth.users.id)
 * @param {string} type - ex: 'candidature_statut', 'like', 'commentaire', 'avis', 'rdv'
 * @param {object} payload - contenu libre (titre, message, lien, etc.), stocké en JSON
 * @param {object} [opts]
 * @param {boolean} [opts.push] - déclenche une notification push web si le quota le permet
 * @param {string} [opts.pushTitle]
 * @param {string} [opts.pushBody]
 * @param {string} [opts.pushUrl]
 * @returns {Promise<object|null>} la ligne créée, ou null si l'écriture a échoué
 */
export async function pushNotification(userId, type, payload = {}, opts = {}) {
  if (!userId || !type) return null;

  const { data, error } = await supabase
    .from('wozali_notifications')
    .insert({ user_id: userId, type, payload })
    .select('*')
    .single();

  if (error) {
    console.error('[pushNotification] écriture échouée', error);
    return null;
  }

  if (opts.push) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: errCount } = await supabase
        .from('wozali_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('push_sent', true)
        .gte('created_at', since);

      const dejaEnvoyes = errCount ? 0 : (count || 0);
      if (dejaEnvoyes < MAX_PUSH_PER_DAY) {
        const { sendPushToUser } = await import('../wozali-pay/_impl/push-send.js');
        await sendPushToUser(userId, {
          title: opts.pushTitle || payload.titre || 'WOZALI',
          body: opts.pushBody || payload.message || '',
          url: opts.pushUrl || '/#dashboard',
        });
        await supabase.from('wozali_notifications').update({ push_sent: true }).eq('id', data.id);
      }
    } catch (e) {
      // Best-effort : le push ne doit jamais faire échouer la notification serveur.
      console.warn('[pushNotification] push web best-effort a échoué', e?.message || e);
    }
  }

  return data;
}
