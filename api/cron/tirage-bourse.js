// ================================================================
// CRON, classement Bourse de Croissance (dernier vendredi du mois 18h WAT)
// Vercel schedule : 0 17 * * 5  (vendredi 17h UTC = 18h WAT)
// Le handler vérifie si c'est le dernier vendredi du mois
//
// Modèle définitif (fondateur, 2026-07-19) :
//   - Par PAYS. Togo et Bénin ont chacun leur classement, calculés
//     et crédités séparément, l'un peut débloquer sans l'autre.
//   - La Bourse d'un pays ne s'ouvre qu'à partir de SEUIL_PRO_DEBLOCAGE
//     membres Pro dans ce pays (compté sur wozali_prestataires). En
//     dessous, aucun tirage pour ce pays ce mois-ci.
//   - NB_GAGNANTS_PAR_PAYS gagnants par pays et par mois, les mieux
//     classés au mérite parmi les éligibles de ce pays.
//   - Le gain, c'est un salaire : le SMIG légal du pays du gagnant
//     (voir api/_lib/smig.js), pas un montant fixe unique.
//   - Classement au mérite, zéro hasard. Score Mérite d'abord (le
//     travail, aucun point d'audience), puis Score WOZALI, puis note
//     moyenne, puis nombre d'avis. Un gain dû même partiellement au
//     hasard tombe sous le régime des loteries, monopole d'État au
//     Togo/Bénin : un classement au mérite, sans aucun hasard, en sort.
//   - Condition anti-rente : pas gagné dans les 3 derniers mois
//     (déjà appliquée en amont par api/cron/eligibilite-bourse.js,
//     qui n'écrit "eligible: true" que si cette condition tient).
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWozali, envoyerNotification } from '../_utils/credit.js';
import { SMIG_PAR_PAYS, SEUIL_PRO_DEBLOCAGE, NB_GAGNANTS_PAR_PAYS, PAYS_BOURSE } from '../_lib/smig.js';

function isLastFridayOfMonth() {
  const now = new Date();
  // Le jour actuel est un vendredi (5) ?
  if (now.getUTCDay() !== 5) return false;
  // Le vendredi suivant serait dans un autre mois ?
  const nextFriday = new Date(now.getTime() + 7 * 86400000);
  return nextFriday.getUTCMonth() !== now.getUTCMonth();
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Vérifie que c'est le dernier vendredi du mois
  if (!isLastFridayOfMonth()) {
    return res.status(200).json({ ok: true, message: 'Pas le dernier vendredi du mois', skip: true });
  }

  try {
    const moisCourant = new Date().toISOString().slice(0, 7);

    const resultats = {};
    for (const pays of PAYS_BOURSE) {
      resultats[pays] = await traiterPays(pays, moisCourant);
    }

    return res.status(200).json({ ok: true, mois: moisCourant, resultats });
  } catch (err) {
    console.error('[cron/tirage-bourse]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}

// Traite le tirage d'un seul pays : seuil de déblocage, classement au
// mérite parmi les éligibles de ce pays, crédit + notification.
async function traiterPays(pays, moisCourant) {
  // 1. Seuil de déblocage : ce pays a-t-il atteint SEUIL_PRO_DEBLOCAGE membres Pro ?
  const { count: nbProPays } = await supabase
    .from('wozali_prestataires')
    .select('*', { count: 'exact', head: true })
    .eq('abonnement', 'Pro')
    .eq('pays', pays);

  if ((nbProPays || 0) < SEUIL_PRO_DEBLOCAGE) {
    console.log(`[cron/tirage-bourse] ${pays} : ${nbProPays || 0}/${SEUIL_PRO_DEBLOCAGE} Pro, Bourse pas encore débloquée, aucun tirage ce mois.`);
    return {
      ok: true,
      debloque: false,
      nb_pro: nbProPays || 0,
      seuil: SEUIL_PRO_DEBLOCAGE,
      message: `Bourse ${pays} pas encore débloquée (${nbProPays || 0}/${SEUIL_PRO_DEBLOCAGE} Pro)`,
      gagnants: [],
    };
  }

  // 2. Récupérer tous les éligibles du mois (table bourse_croissance n'a pas
  //    de colonne pays : on filtre par pays via une jointure côté application).
  const { data: eligiblesBrut } = await supabase
    .from('bourse_croissance')
    .select('id, user_id, score_wozali, score_merite, nb_avis, note_moyenne, gagnant')
    .eq('mois', moisCourant)
    .eq('eligible', true);

  if (!eligiblesBrut || eligiblesBrut.length === 0) {
    return { ok: true, debloque: true, nb_pro: nbProPays || 0, message: `Aucun éligible ce mois (${pays})`, gagnants: [] };
  }

  const userIds = eligiblesBrut.map(e => e.user_id);
  const { data: profils } = await supabase
    .from('wozali_prestataires')
    .select('user_id, pays')
    .in('user_id', userIds)
    .eq('pays', pays);
  const idsDuPays = new Set((profils || []).map(p => p.user_id));
  const eligiblesPays = eligiblesBrut.filter(e => idsDuPays.has(e.user_id));

  if (eligiblesPays.length === 0) {
    return { ok: true, debloque: true, nb_pro: nbProPays || 0, message: `Aucun éligible ce mois (${pays})`, gagnants: [] };
  }

  // 3. Idempotence : déjà classé ce mois pour ce pays ? (évite un double crédit si le cron est rejoué)
  const dejaGagnants = eligiblesPays.filter(e => e.gagnant === true);
  if (dejaGagnants.length >= NB_GAGNANTS_PAR_PAYS) {
    return {
      ok: true,
      debloque: true,
      nb_pro: nbProPays || 0,
      message: `Classement déjà effectué ce mois (${pays})`,
      gagnants: dejaGagnants.map(g => ({ user_id: g.user_id, score_merite: g.score_merite, score: g.score_wozali })),
    };
  }

  // 4. Classement au mérite parmi les non-encore-gagnants de ce pays
  const restants = eligiblesPays.filter(e => !e.gagnant);
  const classes = classerParMerite(restants);
  const nbAGagner = NB_GAGNANTS_PAR_PAYS - dejaGagnants.length;
  const gagnants = classes.slice(0, nbAGagner);

  const montant = SMIG_PAR_PAYS[pays];
  if (!montant) {
    console.error(`[cron/tirage-bourse] SMIG inconnu pour le pays "${pays}", tirage annulé pour ce pays.`);
    return { ok: false, debloque: true, nb_pro: nbProPays || 0, message: `SMIG inconnu pour ${pays}`, gagnants: [] };
  }

  for (const gagnant of gagnants) {
    // 5. Créditer un salaire (le SMIG du pays) en Crédit WOZALI
    await crediterCreditWozali(
      gagnant.user_id,
      montant,
      'credit_bourse',
      `Bourse de Croissance WOZALI, ${pays}, ${moisCourant} (classement au mérite)`
    );

    // 6. Marquer le gagnant
    await supabase
      .from('bourse_croissance')
      .update({ gagnant: true, montant_gagne: montant })
      .eq('id', gagnant.id);

    // 7. Enregistrer dans gains_recompenses
    await supabase.from('gains_recompenses').insert({
      user_id: gagnant.user_id,
      type: 'bourse_croissance',
      montant,
      mois: moisCourant,
      statut: 'versé',
    });

    // 8. Notification
    await envoyerNotification({
      user_id: gagnant.user_id,
      titre: `Félicitations, tu fais partie des ${NB_GAGNANTS_PAR_PAYS} meilleurs profils ${pays} de la Bourse de Croissance`,
      corps: `${montant.toLocaleString('fr-FR')} FCFA, un salaire (le SMIG ${pays}), ont été crédités sur ton Crédit WOZALI. Tu es l'un des membres Pro les plus méritants de ${pays} pour ${moisCourant}.`,
    });
  }

  return {
    ok: true,
    debloque: true,
    nb_pro: nbProPays || 0,
    mois: moisCourant,
    gagnants: gagnants.map(g => ({ user_id: g.user_id, score_merite: g.score_merite, score: g.score_wozali })),
    montant_par_gagnant: montant,
    nb_eligibles: eligiblesPays.length,
  };
}

// Classement au mérite, aucun hasard. Score Mérite d'abord (qualité du
// travail, zéro point d'audience), puis Score WOZALI, puis note, puis avis.
function classerParMerite(eligibles) {
  return [...eligibles].sort((a, b) => {
    const meriteA = a.score_merite || 0, meriteB = b.score_merite || 0;
    if (meriteB !== meriteA) return meriteB - meriteA;
    const scoreA = a.score_wozali || 0, scoreB = b.score_wozali || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const noteA = a.note_moyenne || 0, noteB = b.note_moyenne || 0;
    if (noteB !== noteA) return noteB - noteA;
    return (b.nb_avis || 0) - (a.nb_avis || 0);
  });
}
