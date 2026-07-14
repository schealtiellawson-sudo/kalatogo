// ================================================================
// CRON — Classement Bourse de Croissance (dernier vendredi du mois 18h WAT)
// Vercel schedule : 0 17 * * 5  (vendredi 17h UTC = 18h WAT)
// Le handler vérifie si c'est le dernier vendredi du mois
//
// Mécanisme : classement au MÉRITE, zéro hasard. Les 5 membres Pro
// éligibles avec le meilleur Score WOZALI (départage : note moyenne
// puis nombre d'avis) reçoivent chacun 100 000 FCFA.
// (Avant 2026-07-11 : tirage aléatoire pondéré par score — remplacé
// suite à l'analyse juridique : un gain dû même partiellement au
// hasard tombe sous le régime des loteries, monopole d'État au
// Togo/Bénin. Un classement au mérite, sans aucun hasard, en sort.)
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWozali, envoyerNotification } from '../_utils/credit.js';

const MONTANT_PAR_GAGNANT = 100000;
const NB_GAGNANTS = 5;

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

    // Déjà classé ce mois ? (idempotence — évite un double crédit si le cron est rejoué)
    const { data: dejaClasses } = await supabase
      .from('bourse_croissance')
      .select('id')
      .eq('mois', moisCourant)
      .eq('gagnant', true);

    if (dejaClasses && dejaClasses.length >= NB_GAGNANTS) {
      return res.status(200).json({ ok: true, message: 'Classement déjà effectué ce mois', mois: moisCourant });
    }

    // 1. Récupérer tous les éligibles du mois, enrichis avec note moyenne + nb avis pour le départage
    const { data: eligibles } = await supabase
      .from('bourse_croissance')
      .select('id, user_id, score_wozali, nb_avis, note_moyenne')
      .eq('mois', moisCourant)
      .eq('eligible', true)
      .eq('gagnant', false);

    if (!eligibles || eligibles.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun éligible ce mois', mois: moisCourant });
    }

    // 2. Classement au mérite : Score WOZALI DESC, puis note moyenne DESC, puis nb avis DESC
    const classes = classerParMerite(eligibles);
    const gagnants = classes.slice(0, NB_GAGNANTS);

    for (const gagnant of gagnants) {
      // 3. Créditer 100 000 FCFA en Crédit WOZALI
      await crediterCreditWozali({
        user_id: gagnant.user_id,
        montant: MONTANT_PAR_GAGNANT,
        type: 'credit_bourse',
        description: `Bourse de Croissance WOZALI — ${moisCourant} (classement mérite)`
      });

      // 4. Marquer le gagnant
      await supabase
        .from('bourse_croissance')
        .update({ gagnant: true, montant_gagne: MONTANT_PAR_GAGNANT })
        .eq('id', gagnant.id);

      // 5. Enregistrer dans gains_recompenses
      await supabase.from('gains_recompenses').insert({
        user_id: gagnant.user_id,
        type: 'bourse_croissance',
        montant: MONTANT_PAR_GAGNANT,
        mois: moisCourant,
        statut: 'versé'
      });

      // 6. Notification
      await envoyerNotification({
        user_id: gagnant.user_id,
        titre: '🏆 Félicitations ! Tu fais partie des 5 meilleurs profils de la Bourse de Croissance !',
        corps: `100 000 FCFA ont été crédités sur ton Crédit WOZALI. Tu es l'un des 5 membres Pro les plus méritants de ${moisCourant}.`
      });
    }

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      gagnants: gagnants.map(g => ({ user_id: g.user_id, score: g.score_wozali })),
      montant_par_gagnant: MONTANT_PAR_GAGNANT,
      nb_eligibles: eligibles.length,
    });
  } catch (err) {
    console.error('[cron/tirage-bourse]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}

// Classement au mérite — aucun hasard. Départage par note moyenne puis nombre d'avis.
function classerParMerite(eligibles) {
  return [...eligibles].sort((a, b) => {
    const scoreA = a.score_wozali || 0, scoreB = b.score_wozali || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const noteA = a.note_moyenne || 0, noteB = b.note_moyenne || 0;
    if (noteB !== noteA) return noteB - noteA;
    return (b.nb_avis || 0) - (a.nb_avis || 0);
  });
}
