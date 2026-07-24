// ================================================================
// CRON — Recalcul Score WOZALI (toutes les heures)
// Vercel schedule : 0 * * * *  (toutes les heures à minute 0)
// Remplace l'ancien cron maj-scores-inactivite.js
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { recalculerTousLesScores } from '../_lib/score-wozali.js';
import { envoyerNotification } from '../_utils/credit.js';
import { runCoachSandy } from '../_lib/coach-sandy.js';
import { runSequenceFondateur, runFondateurEvents, runFondateurRelance } from '../_lib/sequence-fondateur.js';

export default async function handler(req, res) {
  // Auth cron Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const resultats = await recalculerTousLesScores(supabase);

    // ── Étape 20 : badges comportementaux automatiques ──
    // repond_vite  : >= 2 RDV répondus sur 30j, temps de réponse médian <= 3h
    // tres_demande : >= 15 visiteurs distincts sur 7j OU >= 3 demandes RDV sur 7j
    // 100% automatique, zéro intervention humaine. +2 pts Score par badge.
    let badgesMaj = 0;
    const badgesParUser = {}; // user_id -> ['repond_vite', 'tres_demande']
    try {
      const { data: prests } = await supabase
        .from('wozali_prestataires')
        .select('id, user_id, badges_auto');
      const il7j = new Date(Date.now() - 7 * 86400000).toISOString();
      const il30j = new Date(Date.now() - 30 * 86400000).toISOString();

      const { data: rdvs } = await supabase
        .from('wozali_rdv')
        .select('prestataire_id, statut, created_at, updated_at')
        .gte('created_at', il30j);

      const { data: vues } = await supabase
        .from('wozali_profil_vues')
        .select('id, profil_id, viewer_id, viewer_prest_id')
        .gte('created_at', il7j);

      // Agrégats par prestataire
      const reponses = {};  // prest_id -> [heures de réponse]
      const rdv7j = {};     // prest_id -> nb demandes RDV sur 7j
      const seuil7j = Date.now() - 7 * 86400000;
      (rdvs || []).forEach(r => {
        if (!r.prestataire_id) return;
        if (new Date(r.created_at).getTime() >= seuil7j) {
          rdv7j[r.prestataire_id] = (rdv7j[r.prestataire_id] || 0) + 1;
        }
        // RDV répondu = statut sorti de "Demandé" ; temps de réponse = updated_at - created_at
        if (r.statut && r.statut !== 'Demandé' && r.updated_at && r.updated_at !== r.created_at) {
          const h = (new Date(r.updated_at) - new Date(r.created_at)) / 3600000;
          if (h >= 0) (reponses[r.prestataire_id] = reponses[r.prestataire_id] || []).push(h);
        }
      });
      const visiteurs = {}; // prest_id -> Set de visiteurs distincts
      (vues || []).forEach(v => {
        const key = v.viewer_prest_id || v.viewer_id || ('anon-' + v.id);
        (visiteurs[v.profil_id] = visiteurs[v.profil_id] || new Set()).add(key);
      });

      for (const p of (prests || [])) {
        const badges = [];
        const reps = (reponses[p.id] || []).sort((a, b) => a - b);
        if (reps.length >= 2 && reps[Math.floor(reps.length / 2)] <= 3) badges.push('repond_vite');
        if ((visiteurs[p.id]?.size || 0) >= 15 || (rdv7j[p.id] || 0) >= 3) badges.push('tres_demande');
        if (p.user_id) badgesParUser[p.user_id] = badges;
        const anciens = (p.badges_auto || []).slice().sort().join(',');
        if (anciens !== badges.slice().sort().join(',')) {
          await supabase
            .from('wozali_prestataires')
            .update({ badges_auto: badges })
            .eq('id', p.id);
          badgesMaj++;
        }
      }
    } catch (e) { console.warn('[score-wozali] badges auto', e); }

    let updates = 0;
    let alertes = 0;

    for (const r of resultats) {
      // Bonus badges : +2 pts par badge actif, plafonné à 100
      const bonusBadges = 2 * (badgesParUser[r.userId] || []).length;
      const scoreAvecBonus = Math.min(100, r.scoreFinal + bonusBadges);
      // Mettre à jour le score dans profiles si changement
      if (scoreAvecBonus !== r.ancienScore) {
        await supabase
          .from('wozali_prestataires')
          .update({ score_wozali: scoreAvecBonus })
          .eq('user_id', r.userId);
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
              titre: '⚠️ Ton Score WOZALI baisse',
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
        .from('wozali_posts')
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
              .from('wozali_posts')
              .update({ verifie_client: true })
              .eq('id', post.id);
            verifications++;
          }
        }
      }
    } catch(e) { console.warn('[score-wozali] verif posts', e); }

    // ── Coach Sandy : leçon du jour + messages résultat (séquenceur) ──
    let coach = { resultats: 0, lecons: 0, reduits: 0 };
    try {
      coach = await runCoachSandy(supabase);
    } catch (e) { console.warn('[score-wozali] coach sandy', e); }

    // ── Séquence fondateur J1-J5 : message du jour aux nouveaux inscrits ──
    let sequence = { envoyes: 0 };
    try {
      sequence = await runSequenceFondateur(supabase);
    } catch (e) { console.warn('[score-wozali] sequence fondateur', e); }

    // ── Messages fondateur événementiels (premier avis, Pro, Score 80, Bourse) ──
    let evenements = { evenements: 0 };
    try {
      evenements = await runFondateurEvents(supabase);
    } catch (e) { console.warn('[score-wozali] fondateur events', e); }

    // ── Relance douce sur inactivité (M6, 21-25 jours sans connexion) ──
    let relances = { relances: 0 };
    try {
      relances = await runFondateurRelance(supabase);
    } catch (e) { console.warn('[score-wozali] fondateur relance', e); }

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
      badgesMaj,
      coach,
      sequence,
      evenements,
      timestamp: now.toISOString()
    });
  } catch (err) {
    console.error('[cron/score-wozali]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
