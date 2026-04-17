// ================================================================
// Mur des Reines — Générer un lien de partage WhatsApp
// POST /api/wolo-pay/vote-share  Body: { user_id, photo_id?, candidature_id? }
// GET  /api/wolo-pay/vote-share?token=xxx  (tracker le clic)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { user_id, photo_id, candidature_id } = req.body || {};
    if (!user_id || (!photo_id && !candidature_id)) {
      return res.status(400).json({ error: 'user_id + (photo_id ou candidature_id) requis' });
    }

    try {
      const { data: partage, error } = await supabase
        .from('partages_whatsapp')
        .insert({
          shared_by: user_id,
          photo_id: photo_id || null,
          candidature_id: candidature_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // URL cible : https://wolomarket.com/?share=token → page Awards avec highlight
      const baseUrl = process.env.SITE_URL || 'https://wolomarket.com';
      const shareUrl = `${baseUrl}/?r=${partage.token}`;

      // Message WhatsApp pré-écrit
      const msg = `Salut 💛 J'ai posté ma plus belle photo sur WOLO Awards — Le Mur des Reines. Vote pour moi en 10 secondes ?\n\n${shareUrl}\n\n#MurDesReines #ReineWOLO`;

      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

      return res.status(201).json({
        ok: true,
        token: partage.token,
        share_url: shareUrl,
        whatsapp_url: waUrl,
        message: msg,
      });
    } catch (err) {
      console.error('[vote-share POST]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token requis' });

    try {
      const { data: partage } = await supabase
        .from('partages_whatsapp')
        .select('*')
        .eq('token', token)
        .single();

      if (!partage) return res.status(404).json({ error: 'Token invalide' });

      // Incrémenter clics
      await supabase
        .from('partages_whatsapp')
        .update({ clicks: (partage.clicks || 0) + 1 })
        .eq('id', partage.id);

      // Badge "virale_100" si 100+ clics
      if (partage.clicks >= 99 && partage.photo_id) {
        const { data: photo } = await supabase
          .from('feed_photos')
          .select('user_id')
          .eq('id', partage.photo_id)
          .single();
        if (photo) {
          await supabase.from('badges_wolo').insert({ user_id: photo.user_id, badge_type: 'virale_100' }).select();
        }
      }

      return res.status(200).json({
        ok: true,
        photo_id: partage.photo_id,
        candidature_id: partage.candidature_id,
        shared_by: partage.shared_by,
        clicks: partage.clicks + 1,
      });
    } catch (err) {
      console.error('[vote-share GET]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  return res.status(405).json({ error: 'GET/POST only' });
}
