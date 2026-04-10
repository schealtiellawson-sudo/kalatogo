// ================================================================
// CRON — Recalcul Score WOLO (toutes les heures)
// Vercel schedule : 0 * * * *  (toutes les heures à minute 0)
// Remplace l'ancien cron maj-scores-inactivite.js
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { recalculerTousLesScores } from '../_lib/score-wolo.js';
import { envoyerNotification } from '../_utils/credit.js';

export default async function handler(req, res) {
  // Auth cron Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const resultats = await recalculerTousLesScores(supabase);

    let updates = 0;
    let alertes = 0;

    for (const r of resultats) {
      // Mettre à jour le score dans profiles si changement
      if (r.scoreFinal !== r.ancienScore) {
        await supabase
          .from('profiles')
          .update({ score_wolo: r.scoreFinal })
          .eq('id', r.userId);
        updates++;
      }

      // Alerte inactivité J+10
      if (r.derniereActivite) {
        const jours = (Date.now() - new Date(r.derniereActivite).getTime()) / 86400000;
        if (jours >= 10 && jours < 11) {
          // Vérifier qu'on n'a pas déjà alerté ce mois
          const moisCourant = new Date().toISOString().slice(0, 7);
          const { data: dejaEnvoyee } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', r.userId)
            .eq('type', 'inactivite_alerte')
            .like('created_at', `${moisCourant}%`)
            .maybeSingle();

          if (!dejaEnvoyee) {
            await envoyerNotification({
              user_id: r.userId,
              titre: '⚠️ Ton Score WOLO baisse',
              corps: 'Connecte-toi pour maintenir ton score. Après 14 jours sans connexion, tu perds 1 point par jour.'
            });
            alertes++;
          }
        }
      }
    }

    // ── Réalisations Vérifiées auto-tag ──
    // Un post est vérifié si l'auteur a reçu un avis >= 4 étoiles dans les 48h
    let verifications = 0;
    try {
      const il_y_a_48h = new Date(Date.now() - 48 * 3600000).toISOString();
      // Posts des 48 dernières heures non encore vérifiés
      const { data: postsRecents } = await supabase
        .from('wolo_posts')
        .select('id, auteur_id, created_at')
        .eq('actif', true)
        .eq('verifie_client', false)
        .gte('created_at', il_y_a_48h);

      if (postsRecents && postsRecents.length > 0) {
        for (const post of postsRecents) {
          // Chercher un avis >= 4 étoiles pour cet auteur dans les 48h autour du post
          const postDate = new Date(post.created_at);
          const avant48h = new Date(postDate.getTime() - 48 * 3600000).toISOString();
          const apres48h = new Date(postDate.getTime() + 48 * 3600000).toISOString();

          const { data: avisVerif } = await supabase
            .from('avis')
            .select('id')
            .eq('prestataire_id', post.auteur_id)
            .gte('note', 4)
            .gte('created_at', avant48h)
            .lte('created_at', apres48h)
            .limit(1);

          if (avisVerif && avisVerif.length > 0) {
            await supabase
              .from('wolo_posts')
              .update({ verifie_client: true })
              .eq('id', post.id);
            verifications++;
          }
        }
      }
    } catch(e) { console.warn('[score-wolo] verif posts', e); }

    // Reset vues_mois au 1er du mois
    const now = new Date();
    if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
      await supabase.rpc('reset_vues_mois');
    }

    return res.status(200).json({
      ok: true,
      total: resultats.length,
      updates,
      alertes,
      verifications,
      timestamp: now.toISOString()
    });
  } catch (err) {
    console.error('[cron/score-wolo]', err);
    return res.status(500).json({ error: err.message });
  }
}
