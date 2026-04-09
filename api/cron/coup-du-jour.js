export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const aujourd_hui = new Date().toISOString().slice(0, 10);
  const { data: candidats } = await supabase
    .from('wolo_posts')
    .select('*, profiles!auteur_id(score_wolo)')
    .eq('actif', true)
    .gte('created_at', `${hier}T00:00:00`)
    .lt('created_at', `${aujourd_hui}T00:00:00`)
    .not('media_url', 'is', null)
    .order('nb_likes', { ascending: false });
  if (!candidats || candidats.length === 0) return res.status(200).json({ ok: true, message: 'no candidates' });
  const gagnant = candidats.reduce((best, post) => {
    const score = (post.nb_likes * 2) + post.nb_commentaires + ((post.profiles?.score_wolo || 0) / 10);
    return score > (best.score || 0) ? { ...post, score } : best;
  }, {});
  await supabase.from('wolo_posts').update({ coup_du_jour: true, coup_du_jour_date: aujourd_hui }).eq('id', gagnant.id);
  await supabase.from('notifications').insert({
    user_id: gagnant.auteur_id,
    type: 'coup_du_jour',
    titre: '⭐ Ton post est le Coup du Jour sur WOLO Market !',
    corps: 'Ta réalisation est mise en avant dans le feed de toute la communauté aujourd\'hui.',
    url: `#feed`,
    lu: false
  });
  return res.status(200).json({ ok: true, gagnant: gagnant.id });
}
