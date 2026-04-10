// ================================================================
// CRON — Coup du Jour (08h00 WAT = 07h00 UTC)
// Vercel schedule : 0 8 * * *
// Sélection automatique du meilleur post du jour
// Critères : Pro actif, Score >= 70, pas coup du jour dans les 30 derniers jours
// ================================================================
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const aujourd_hui = new Date().toISOString().slice(0, 10);
  const il_y_a_7j = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const il_y_a_30j = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  try {
    // 1. Vérifier qu'il n'y a pas déjà un coup du jour aujourd'hui
    const { data: existant } = await supabase
      .from('wolo_posts')
      .select('id')
      .eq('coup_du_jour', true)
      .eq('coup_du_jour_date', aujourd_hui)
      .limit(1);

    if (existant && existant.length > 0) {
      return res.status(200).json({ ok: true, message: 'Coup du jour déjà sélectionné', skip: true });
    }

    // 2. Récupérer les posts des 7 derniers jours avec média
    const { data: candidats } = await supabase
      .from('wolo_posts')
      .select('*, profiles!auteur_id(id, score_wolo, abonnement, nom)')
      .eq('actif', true)
      .gte('created_at', `${il_y_a_7j}T00:00:00`)
      .not('media_url', 'is', null)
      .order('nb_likes', { ascending: false });

    if (!candidats || candidats.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun candidat éligible' });
    }

    // 3. Filtrer : Pro actif + Score >= 70
    let eligibles = candidats.filter(post => {
      const profil = post.profiles;
      if (!profil) return false;
      if (profil.abonnement !== 'Pro') return false;
      if ((profil.score_wolo || 0) < 70) return false;
      return true;
    });

    // 4. Exclure ceux qui ont déjà été coup du jour dans les 30 derniers jours
    if (eligibles.length > 0) {
      const auteurIds = [...new Set(eligibles.map(p => p.auteur_id))];
      const { data: recents } = await supabase
        .from('wolo_posts')
        .select('auteur_id')
        .eq('coup_du_jour', true)
        .gte('coup_du_jour_date', il_y_a_30j)
        .in('auteur_id', auteurIds);

      const auteursRecents = new Set((recents || []).map(r => r.auteur_id));
      eligibles = eligibles.filter(p => !auteursRecents.has(p.auteur_id));
    }

    if (eligibles.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun candidat éligible après filtrage' });
    }

    // 5. Calculer le score et sélectionner le meilleur
    const gagnant = eligibles.reduce((best, post) => {
      const score = (post.nb_likes * 2) + (post.nb_commentaires || 0) + ((post.profiles?.score_wolo || 0) / 10);
      return score > (best._score || 0) ? { ...post, _score: score } : best;
    }, { _score: 0 });

    // 6. Marquer le post comme coup du jour
    await supabase
      .from('wolo_posts')
      .update({ coup_du_jour: true, coup_du_jour_date: aujourd_hui })
      .eq('id', gagnant.id);

    // 7. Notification in-app
    await supabase.from('notifications').insert({
      user_id: gagnant.auteur_id,
      type: 'coup_du_jour',
      titre: '⭐ Ton post est le Coup du Jour !',
      corps: 'Ta réalisation est mise en avant sur WOLO Market aujourd\'hui. Partage la nouvelle !',
      url: '#feed',
      lu: false
    });

    // 8. Message WhatsApp pré-rédigé (stocké dans la notification pour le frontend)
    const nomAuteur = gagnant.profiles?.nom || 'Prestataire';
    const whatsappMessage = encodeURIComponent(
      `🌟 Mon post est le Coup du Jour sur WOLO Market !\n` +
      `Découvre mon profil 👉 https://wolomarket.vercel.app/#profil-${gagnant.auteur_id}\n` +
      `${nomAuteur} sur WOLO Market`
    );

    return res.status(200).json({
      ok: true,
      gagnant_id: gagnant.id,
      auteur: nomAuteur,
      auteur_id: gagnant.auteur_id,
      score: gagnant._score,
      nb_eligibles: eligibles.length,
      whatsapp_link: `https://wa.me/?text=${whatsappMessage}`
    });
  } catch (err) {
    console.error('[cron/coup-du-jour]', err);
    return res.status(500).json({ error: err.message });
  }
}
