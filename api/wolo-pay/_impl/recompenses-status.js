// ================================================================
// WOLO Pay — Statut récompenses (Bourse + Awards) pour un user
// GET /api/wolo-pay/recompenses-status?user_id=xxx
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requis' });

  try {
    const now = new Date();
    const moisCourant = now.toISOString().slice(0, 7);

    // ── Bourse de Croissance ──
    const { data: bourse } = await supabase
      .from('bourse_croissance')
      .select('*')
      .eq('user_id', user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    // Gagnant du mois courant ?
    const { data: gagnantBourse } = await supabase
      .from('bourse_croissance')
      .select('user_id, score_wolo')
      .eq('mois', moisCourant)
      .eq('gagnant', true)
      .maybeSingle();

    // Nom du gagnant pour affichage
    let gagnantBourseNom = null;
    if (gagnantBourse) {
      const { data: pGagnant } = await supabase
        .from('profiles')
        .select('nom_complet')
        .eq('id', gagnantBourse.user_id)
        .single();
      gagnantBourseNom = pGagnant?.nom_complet || null;
    }

    // Conditions détaillées pour le widget
    let conditions = null;
    if (bourse) {
      conditions = {
        pro_2_mois: (bourse.pro_mois_consecutifs || 0) >= 2,
        score_80: (bourse.score_wolo || 0) >= 80,
        avis_4: (bourse.nb_avis || 0) >= 4,
        note_42: (bourse.note_moyenne || 0) >= 4.2,
        score_actuel: bourse.score_wolo || 0,
        nb_avis_actuel: bourse.nb_avis || 0,
        note_actuelle: bourse.note_moyenne || 0,
        pro_mois: bourse.pro_mois_consecutifs || 0,
      };
    }

    // État bourse : 'non_eligible' | 'eligible' | 'perdu' | 'gagnant'
    let etatBourse = 'non_eligible';
    if (bourse?.gagnant) {
      etatBourse = 'gagnant';
    } else if (gagnantBourse && !bourse?.gagnant) {
      etatBourse = bourse?.eligible ? 'perdu' : 'non_eligible';
    } else if (bourse?.eligible) {
      etatBourse = 'eligible';
    }

    // ── WOLO Awards ──
    const { data: candidature } = await supabase
      .from('wolo_awards')
      .select('*')
      .eq('user_id', user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    // Gagnant Awards du mois ?
    const { data: gagnantAwards } = await supabase
      .from('wolo_awards')
      .select('user_id, nb_votes')
      .eq('mois', moisCourant)
      .eq('gagnant', true)
      .maybeSingle();

    let gagnantAwardsNom = null;
    if (gagnantAwards) {
      const { data: pGA } = await supabase
        .from('profiles')
        .select('nom_complet')
        .eq('id', gagnantAwards.user_id)
        .single();
      gagnantAwardsNom = pGA?.nom_complet || null;
    }

    // Vote de l'utilisateur ce mois
    const { data: monVote } = await supabase
      .from('votes_awards')
      .select('candidat_id')
      .eq('votant_id', user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    let etatAwards = 'non_candidat';
    if (candidature?.gagnant) {
      etatAwards = 'gagnant';
    } else if (candidature?.vice_champion) {
      etatAwards = 'vice_champion';
    } else if (gagnantAwards) {
      etatAwards = candidature ? 'perdu' : 'non_candidat';
    } else if (candidature?.video_validee) {
      etatAwards = 'candidat_actif';
    } else if (candidature) {
      etatAwards = 'en_attente_validation';
    }

    // ── Palmarès (6 derniers gagnants) ──
    const { data: palmaresBourse } = await supabase
      .from('gains_recompenses')
      .select('user_id, mois, montant, created_at')
      .eq('type', 'bourse_croissance')
      .order('created_at', { ascending: false })
      .limit(6);

    const { data: palmaresAwards } = await supabase
      .from('gains_recompenses')
      .select('user_id, mois, montant, created_at')
      .eq('type', 'wolo_awards')
      .order('created_at', { ascending: false })
      .limit(6);

    // Enrichir avec les noms
    const allIds = new Set();
    for (const g of [...(palmaresBourse || []), ...(palmaresAwards || [])]) {
      allIds.add(g.user_id);
    }
    const { data: profilesGagnants } = allIds.size > 0
      ? await supabase.from('profiles').select('id, nom_complet, pays').in('id', [...allIds])
      : { data: [] };
    const nomMap = {};
    for (const p of (profilesGagnants || [])) nomMap[p.id] = p;

    const enrichir = (liste) => (liste || []).map(g => ({
      ...g,
      nom: nomMap[g.user_id]?.nom_complet || '—',
      pays: nomMap[g.user_id]?.pays || '',
    }));

    // ── Countdown tirage (dernier vendredi du mois 18h WAT = 17h UTC) ──
    const tirageDate = getLastFridayOfMonth(now);
    tirageDate.setUTCHours(17, 0, 0, 0);

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      bourse: {
        etat: etatBourse,
        conditions,
        gagnant_nom: gagnantBourseNom,
        gagnant_user_id: gagnantBourse?.user_id || null,
        montant: 300000,
      },
      awards: {
        etat: etatAwards,
        candidature: candidature || null,
        gagnant_nom: gagnantAwardsNom,
        gagnant_user_id: gagnantAwards?.user_id || null,
        a_vote: !!monVote,
        vote_candidat: monVote?.candidat_id || null,
        montant: 100000,
      },
      palmares: {
        bourse: enrichir(palmaresBourse),
        awards: enrichir(palmaresAwards),
      },
      tirage_date: tirageDate.toISOString(),
    });
  } catch (err) {
    console.error('[recompenses-status]', err);
    return res.status(500).json({ error: err.message });
  }
}

function getLastFridayOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Dernier jour du mois
  const lastDay = new Date(year, month + 1, 0);
  // Reculer jusqu'au vendredi
  const dayOfWeek = lastDay.getDay();
  const diff = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
  lastDay.setDate(lastDay.getDate() - diff);
  return lastDay;
}
