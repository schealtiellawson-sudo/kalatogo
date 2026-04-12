// ================================================================
// CRON — Tirage Bourse de Croissance (dernier vendredi du mois 18h WAT)
// Vercel schedule : 0 17 * * 5  (vendredi 17h UTC = 18h WAT)
// Le handler vérifie si c'est le dernier vendredi du mois
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWolo, envoyerNotification } from '../_utils/credit.js';

const MONTANT_BOURSE = 300000;

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

    // 1. Récupérer tous les éligibles du mois
    const { data: eligibles } = await supabase
      .from('bourse_croissance')
      .select('id, user_id, score_wolo')
      .eq('mois', moisCourant)
      .eq('eligible', true)
      .eq('gagnant', false);

    if (!eligibles || eligibles.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun éligible ce mois', mois: moisCourant });
    }

    // 2. Tirage pondéré par Score WOLO
    const gagnant = tirageAleatoirePondere(eligibles);

    // 3. Créditer 300 000 FCFA en Crédit WOLO
    await crediterCreditWolo({
      user_id: gagnant.user_id,
      montant: MONTANT_BOURSE,
      type: 'credit_bourse',
      description: `Bourse de Croissance WOLO — ${moisCourant}`
    });

    // 4. Marquer le gagnant
    await supabase
      .from('bourse_croissance')
      .update({ gagnant: true, montant_gagne: MONTANT_BOURSE })
      .eq('id', gagnant.id);

    // 5. Enregistrer dans gains_recompenses
    await supabase.from('gains_recompenses').insert({
      user_id: gagnant.user_id,
      type: 'bourse_croissance',
      montant: MONTANT_BOURSE,
      mois: moisCourant,
      statut: 'versé'
    });

    // 6. Notification
    await envoyerNotification({
      user_id: gagnant.user_id,
      titre: '🏆 Félicitations ! Tu as gagné la Bourse de Croissance !',
      corps: `300 000 FCFA ont été crédités sur ton Crédit WOLO. Tu es le membre Pro le plus méritant de ${moisCourant}.`
    });

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      gagnant_id: gagnant.user_id,
      score: gagnant.score_wolo,
      montant: MONTANT_BOURSE,
      nb_eligibles: eligibles.length,
    });
  } catch (err) {
    console.error('[cron/tirage-bourse]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}

// Tirage aléatoire pondéré par score_wolo
// Plus le score est élevé, plus la probabilité est grande
function tirageAleatoirePondere(eligibles) {
  const totalPoids = eligibles.reduce((s, e) => s + (e.score_wolo || 1), 0);
  let rand = Math.random() * totalPoids;

  for (const e of eligibles) {
    rand -= (e.score_wolo || 1);
    if (rand <= 0) return e;
  }
  return eligibles[eligibles.length - 1]; // fallback
}
