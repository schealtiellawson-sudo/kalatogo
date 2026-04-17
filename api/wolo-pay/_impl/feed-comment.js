// ================================================================
// Mur des Reines — Commentaires
// GET /api/wolo-pay/feed-comment?photo_id=&limit=20
// POST /api/wolo-pay/feed-comment  Body: { user_id, photo_id, contenu }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { photo_id, limit = 20 } = req.query;
    if (!photo_id) return res.status(400).json({ error: 'photo_id requis' });

    try {
      const { data: comments } = await supabase
        .from('commentaires_photos')
        .select('id, user_id, contenu, created_at')
        .eq('photo_id', photo_id)
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      const userIds = [...new Set((comments || []).map(c => c.user_id))];
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nom_complet, avatar_url')
          .in('id', userIds);
        for (const p of (profiles || [])) profilesMap[p.id] = p;
      }

      const enrichis = (comments || []).map(c => ({
        ...c,
        user_nom: profilesMap[c.user_id]?.nom_complet || '—',
        user_avatar: profilesMap[c.user_id]?.avatar_url || '',
      }));

      return res.status(200).json({ ok: true, comments: enrichis });
    } catch (err) {
      console.error('[feed-comment GET]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  if (req.method === 'POST') {
    const { user_id, photo_id, contenu } = req.body || {};
    if (!user_id || !photo_id || !contenu) {
      return res.status(400).json({ error: 'user_id, photo_id, contenu requis' });
    }
    const txt = String(contenu).trim();
    if (txt.length === 0) return res.status(400).json({ error: 'Commentaire vide' });
    if (txt.length > 500) return res.status(400).json({ error: 'Max 500 caractères' });

    try {
      const { data: comment, error } = await supabase
        .from('commentaires_photos')
        .insert({ user_id, photo_id, contenu: txt })
        .select()
        .single();
      if (error) throw error;

      return res.status(201).json({ ok: true, comment });
    } catch (err) {
      console.error('[feed-comment POST]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  return res.status(405).json({ error: 'GET/POST only' });
}
