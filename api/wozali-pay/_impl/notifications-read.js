// ================================================================
// notifications-read - POST /api/wozali-pay/notifications-read (auth requise)
// Body : { ids: [uuid, ...] } pour marquer des notifications précises,
//     ou { all: true } pour tout marquer comme lu.
// Le WHERE user_id = userId (+ RLS self-only) garantit qu'on ne peut jamais
// marquer les notifications de quelqu'un d'autre.
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Authentification requise' });

  const { ids, all } = req.body || {};

  let q = supabase.from('wozali_notifications').update({ lu: true }).eq('user_id', userId);
  if (!all) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids requis (tableau non vide) ou all: true' });
    }
    q = q.in('id', ids);
  }

  const { error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
