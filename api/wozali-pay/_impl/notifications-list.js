// ================================================================
// notifications-list - GET /api/wozali-pay/notifications-list (auth requise)
// Query : ?limit=30 &unread=1
// Renvoie les notifications de l'utilisateur connecté (RLS self-only), plus
// le compteur non-lues.
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Authentification requise' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';

  let q = supabase.from('wozali_notifications').select('*').eq('user_id', userId);
  if (onlyUnread) q = q.eq('lu', false);
  q = q.order('created_at', { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const { count: unreadCount, error: errCount } = await supabase
    .from('wozali_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('lu', false);

  return res.status(200).json({
    ok: true,
    notifications: data || [],
    unread_count: errCount ? 0 : (unreadCount || 0),
  });
}
