// GET /api/wolo-pay/thread-list
// Liste les fils de conversation de l'utilisateur (côté candidat ou recruteur).
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { role } = req.query; // 'candidat' | 'recruteur' | undefined (les deux)
  let q = supabase
    .from('wolo_threads')
    .select('id, candidature_airtable_id, offre_titre, candidat_user_id, recruteur_user_id, candidat_nom, recruteur_nom, last_message_at, last_message_preview, unread_candidat, unread_recruteur')
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (role === 'candidat') q = q.eq('candidat_user_id', userId);
  else if (role === 'recruteur') q = q.eq('recruteur_user_id', userId);
  else q = q.or(`candidat_user_id.eq.${userId},recruteur_user_id.eq.${userId}`);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const threads = (data || []).map(t => ({
    ...t,
    role: t.candidat_user_id === userId ? 'candidat' : 'recruteur',
    unread: t.candidat_user_id === userId ? t.unread_candidat : t.unread_recruteur,
  }));

  return res.status(200).json({ ok: true, threads });
}
