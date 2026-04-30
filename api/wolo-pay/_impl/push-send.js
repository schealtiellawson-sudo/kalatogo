// ================================================================
// Push Send — utilitaire interne (pas exposé via le router)
// Récupère les souscriptions d'un user et envoie une notif push via web-push.
//
// Usage interne :
//   import { sendPushToUser } from './push-send.js';
//   await sendPushToUser(userId, { title, body, url, icon });
//
// Variables d'env requises :
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT (optionnel, défaut mailto:contact@wolomarket.com)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

let _webpush = null;
let _vapidConfigured = false;

async function getWebPush() {
  if (_webpush) return _webpush;
  try {
    const mod = await import('web-push');
    _webpush = mod.default || mod;
  } catch (e) {
    console.warn('[push-send] module web-push indisponible :', e.message);
    return null;
  }
  return _webpush;
}

async function ensureVapid(webpush) {
  if (_vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@wolomarket.com';
  if (!pub || !priv) {
    console.warn('[push-send] VAPID keys absentes — push désactivé (fallback inbox seul).');
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  _vapidConfigured = true;
  return true;
}

/**
 * Envoie une notification push à toutes les souscriptions d'un user.
 * Best-effort : ne throw jamais, log uniquement.
 *
 * @param {string} userId — auth.users.id
 * @param {object} payload — { title, body, url?, icon?, badge?, tag?, data? }
 * @returns {Promise<{ sent: number, failed: number, removed: number }>}
 */
export async function sendPushToUser(userId, payload = {}) {
  if (!userId) return { sent: 0, failed: 0, removed: 0 };

  const webpush = await getWebPush();
  if (!webpush) return { sent: 0, failed: 0, removed: 0 };

  const ok = await ensureVapid(webpush);
  if (!ok) return { sent: 0, failed: 0, removed: 0 };

  // 1. Récupérer toutes les souscriptions du user
  const { data: subs, error } = await supabase
    .from('wolo_push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', userId);

  if (error) {
    console.error('[push-send] fetch subs error', error);
    return { sent: 0, failed: 0, removed: 0 };
  }
  if (!subs || subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  // 2. Construire le payload final (limité ~4 KB par spec)
  const notif = {
    title: String(payload.title || 'WOLO Market').slice(0, 100),
    body: String(payload.body || '').slice(0, 500),
    url: String(payload.url || '/#dashboard').slice(0, 500),
    icon: payload.icon || '/icons/wolo-192.svg',
    badge: payload.badge || '/icons/wolo-192.svg',
    tag: payload.tag || 'wolo-default',
    data: payload.data || {},
  };
  const json = JSON.stringify(notif);

  // 3. Envoyer en parallèle, nettoyer les souscriptions mortes (410/404)
  let sent = 0, failed = 0, removed = 0;
  const deadIds = [];

  await Promise.all(subs.map(async (s) => {
    const subscription = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh_key, auth: s.auth_key },
    };
    try {
      await webpush.sendNotification(subscription, json, { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) {
        // Souscription expirée → supprimer
        deadIds.push(s.id);
        removed++;
      } else {
        failed++;
        console.warn('[push-send] échec envoi', code, e?.body?.slice?.(0, 200) || e?.message);
      }
    }
  }));

  if (deadIds.length > 0) {
    await supabase.from('wolo_push_subscriptions').delete().in('id', deadIds);
  }

  return { sent, failed, removed };
}

/**
 * Handler HTTP : POST /api/wolo-pay/push-send
 * Body : { user_id, title, body, url?, icon?, tag? }
 * Réservé : nécessite header X-Cron-Secret (= CRON_SECRET) OU être appelé en interne.
 * Sert principalement aux tests manuels — la prod l'appelle via sendPushToUser().
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (process.env.CRON_SECRET && req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'cron secret invalide' });
  }

  const { user_id, title, body, url, icon, tag, data } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'user_id requis' });

  const result = await sendPushToUser(user_id, { title, body, url, icon, tag, data });
  return res.status(200).json({ ok: true, ...result });
}
