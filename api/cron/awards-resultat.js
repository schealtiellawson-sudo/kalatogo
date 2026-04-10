// ================================================================
// CRON — Résultat WOLO Awards (dernier vendredi du mois 18h WAT)
// Vercel schedule : 0 17 * * 5  (vendredi 17h UTC = 18h WAT)
// Le handler vérifie si c'est le dernier vendredi du mois
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { crediterCreditWolo, envoyerNotification } from '../_utils/credit.js';

const MONTANT_AWARDS = 100000;

function isLastFridayOfMonth() {
  const now = new Date();
  if (now.getUTCDay() !== 5) return false;
  const nextFriday = new Date(now.getTime() + 7 * 86400000);
  return nextFriday.getUTCMonth() !== now.getUTCMonth();
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!isLastFridayOfMonth()) {
    return res.status(200).json({ ok: true, message: 'Pas le dernier vendredi du mois', skip: true });
  }

  try {
    const moisCourant = new Date().toISOString().slice(0, 7);

    // 1. Récupérer tous les candidats validés du mois, triés par votes
    const { data: candidats } = await supabase
      .from('wolo_awards')
      .select('id, user_id, pays, nb_votes')
      .eq('mois', moisCourant)
      .eq('video_validee', true)
      .order('nb_votes', { ascending: false });

    if (!candidats || candidats.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun candidat validé ce mois', mois: moisCourant });
    }

    // 2. Le gagnant = celui avec le plus de votes
    const gagnant = candidats[0];

    // 3. Créditer 100 000 FCFA
    await crediterCreditWolo({
      user_id: gagnant.user_id,
      montant: MONTANT_AWARDS,
      type: 'credit_awards',
      description: `WOLO Awards — Champion ${moisCourant}`
    });

    // 4. Marquer le gagnant
    await supabase
      .from('wolo_awards')
      .update({ gagnant: true, montant_gagne: MONTANT_AWARDS })
      .eq('id', gagnant.id);

    // 5. Enregistrer dans gains_recompenses
    await supabase.from('gains_recompenses').insert({
      user_id: gagnant.user_id,
      type: 'wolo_awards',
      montant: MONTANT_AWARDS,
      mois: moisCourant,
      statut: 'versé'
    });

    // 6. Notification gagnant
    await envoyerNotification({
      user_id: gagnant.user_id,
      titre: '🥇 Tu es le champion des WOLO Awards !',
      corps: `100 000 FCFA ont été crédités sur ton Crédit WOLO. La communauté t'a élu meilleur prestataire de ${moisCourant}.`
    });

    // 7. Vice-champion (2e)
    let viceChampion = null;
    if (candidats.length >= 2) {
      viceChampion = candidats[1];
      await supabase
        .from('wolo_awards')
        .update({ vice_champion: true })
        .eq('id', viceChampion.id);

      await envoyerNotification({
        user_id: viceChampion.user_id,
        titre: '🥈 Vice-champion des WOLO Awards !',
        corps: `Tu termines 2e des WOLO Awards de ${moisCourant}. Un badge spécial est affiché sur ton profil pendant 30 jours.`
      });
    }

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      gagnant_id: gagnant.user_id,
      gagnant_votes: gagnant.nb_votes,
      vice_champion_id: viceChampion?.user_id || null,
      nb_candidats: candidats.length,
      montant: MONTANT_AWARDS,
    });
  } catch (err) {
    console.error('[cron/awards-resultat]', err);
    return res.status(500).json({ error: err.message });
  }
}
