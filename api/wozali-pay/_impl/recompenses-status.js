// ================================================================
// WOZALI Pay, statut récompenses (Bourse + Awards) pour un user
// GET /api/wozali-pay/recompenses-status?user_id=xxx
// ================================================================
// Bourse de Croissance, modèle définitif (fondateur, 2026-07-19) :
// par pays (Togo/Bénin), 10 gagnants/pays/mois au mérite, gain = un
// salaire (le SMIG du pays du gagnant). Voir api/_lib/smig.js et
// api/cron/tirage-bourse.js pour le calcul des gagnants.
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { SMIG_PAR_PAYS, SEUIL_PRO_DEBLOCAGE, MIN_AVIS_30J, MIN_MOIS_PRO, MIN_SCORE_WOZALI, MIN_NOTE_MOYENNE } from '../../_lib/smig.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requis' });

  try {
    const now = new Date();
    const moisCourant = now.toISOString().slice(0, 7);
    const isPublic = user_id === 'public';

    // ── Bourse de Croissance ──
    const { data: bourse } = isPublic ? { data: null } : await supabase
      .from('bourse_croissance')
      .select('*')
      .eq('user_id', user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    // Pays du membre (pour son SMIG et pour ne comparer qu'à son propre pays)
    let userPays = null;
    if (!isPublic) {
      const { data: profilUser } = await supabase
        .from('wozali_prestataires')
        .select('pays')
        .eq('user_id', user_id)
        .maybeSingle();
      userPays = profilUser?.pays || null;
    }

    // État de déblocage du pays du membre (le front cesse d'afficher un
    // countdown vers un tirage qui n'aura pas lieu si le seuil n'est pas atteint).
    let nbProPays = 0;
    let paysDebloque = false;
    if (userPays) {
      const { count } = await supabase
        .from('wozali_prestataires')
        .select('*', { count: 'exact', head: true })
        .eq('abonnement', 'Pro')
        .eq('pays', userPays);
      nbProPays = count || 0;
      paysDebloque = nbProPays >= SEUIL_PRO_DEBLOCAGE;
    }

    // Tous les gagnants du mois courant, toutes pays confondus (jusqu'à
    // 10 par pays, classement au mérite, plus de tirage à 1 gagnant global)
    const { data: gagnantsBourseListeBrut } = await supabase
      .from('bourse_croissance')
      .select('user_id, score_wozali, montant_gagne')
      .eq('mois', moisCourant)
      .eq('gagnant', true);

    let profilsGagnantsMap = {};
    if (gagnantsBourseListeBrut && gagnantsBourseListeBrut.length > 0) {
      const { data: profilsGagnants } = await supabase
        .from('wozali_prestataires')
        .select('user_id, nom_complet, pays')
        .in('user_id', gagnantsBourseListeBrut.map(g => g.user_id));
      (profilsGagnants || []).forEach(p => { profilsGagnantsMap[p.user_id] = p; });
    }

    // On ne compare le membre qu'aux gagnants de SON pays (chaque pays a
    // son classement séparé). Pour l'affichage public sans pays connu, on
    // retombe sur le pays du premier gagnant trouvé, à défaut de mieux.
    const paysAffiche = userPays || profilsGagnantsMap[(gagnantsBourseListeBrut || [])[0]?.user_id]?.pays || null;
    const gagnantsBourseListe = (gagnantsBourseListeBrut || [])
      .filter(g => !paysAffiche || profilsGagnantsMap[g.user_id]?.pays === paysAffiche)
      .sort((a, b) => (b.score_wozali || 0) - (a.score_wozali || 0));

    const gagnantBourse = gagnantsBourseListe.length > 0 ? gagnantsBourseListe[0] : null;

    // Noms des gagnants du pays affiché, pour le widget
    let gagnantBourseNom = null;
    if (gagnantsBourseListe.length > 0) {
      gagnantBourseNom = gagnantsBourseListe
        .map(g => profilsGagnantsMap[g.user_id]?.nom_complet)
        .filter(Boolean)
        .join(', ') || null;
    }

    // Montant applicable au membre : ce qu'il a RÉELLEMENT gagné uniquement
    // s'il est gagnant (montant_gagne a un DEFAULT en base, ne jamais s'y fier
    // pour un non-gagnant) ; sinon le SMIG de son pays (le montant qu'il
    // gagnerait s'il était classé).
    const montantBourse = (bourse?.gagnant && bourse?.montant_gagne)
      ? bourse.montant_gagne
      : (SMIG_PAR_PAYS[userPays] || SMIG_PAR_PAYS[paysAffiche] || null);

    // Conditions détaillées pour le widget (clés alignées sur le front,
    // seuils désormais tirés de api/_lib/smig.js — source unique)
    let conditions = null;
    if (bourse) {
      conditions = {
        estPro: (bourse.pro_mois_consecutifs || 0) >= MIN_MOIS_PRO,
        score_80: (bourse.score_wozali || 0) >= MIN_SCORE_WOZALI,
        avis_4: (bourse.nb_avis || 0) >= MIN_AVIS_30J,
        note_42: (bourse.note_moyenne || 0) >= MIN_NOTE_MOYENNE,
        score_actuel: bourse.score_wozali || 0,
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

    // WOZALI Awards, bloc de réponse supprimé (purge 2026-07-21 — modèle
    // remplacé par la Bourse de Croissance seule). Le palmarès historique
    // (gains_recompenses type='wozali_awards') reste affiché ci-dessous.

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
      .eq('type', 'wozali_awards')
      .order('created_at', { ascending: false })
      .limit(6);

    // Enrichir avec les noms + le vrai pays (colonne wozali_prestataires.pays,
    // plus fiable qu'une déduction depuis le nom de ville)
    const allIds = new Set();
    for (const g of [...(palmaresBourse || []), ...(palmaresAwards || [])]) {
      allIds.add(g.user_id);
    }
    const { data: profilesGagnants } = allIds.size > 0
      ? await supabase.from('wozali_prestataires').select('user_id, nom_complet, ville, pays').in('user_id', [...allIds])
      : { data: [] };
    const nomMap = {};
    for (const p of (profilesGagnants || [])) nomMap[p.user_id] = p;

    const enrichir = (liste) => (liste || []).map(g => ({
      ...g,
      nom: nomMap[g.user_id]?.nom_complet || '',
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
        pays: paysAffiche,
        montant: montantBourse,
        nb_pro_pays: nbProPays,
        seuil_pro: SEUIL_PRO_DEBLOCAGE,
        pays_debloque: paysDebloque,
      },
      palmares: {
        bourse: enrichir(palmaresBourse),
        awards: enrichir(palmaresAwards),
      },
      tirage_date: tirageDate.toISOString(),
    });
  } catch (err) {
    console.error('[recompenses-status]', err);
    return res.status(500).json({ error: 'Erreur interne' });
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
