// ================================================================
// CRON — Awards + Duels hebdo (vendredi 18h WAT)
// Vercel schedule : 0 17 * * 5  (vendredi 17h UTC = 18h WAT)
// 1. Chaque vendredi : clôturer anciens duels + créer nouveaux
// 2. Dernier vendredi du mois : résultat Mur des Reines (Awards)
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

function getSemaine() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = (now - start) / 86400000;
  const week = Math.ceil((diff + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}

async function genererDuelsHebdo() {
  const semaine = getSemaine();

  const { data: existing } = await supabase
    .from('duels_quartiers')
    .select('id')
    .eq('semaine', semaine)
    .limit(1);
  if (existing?.length > 0) return { skip: true, semaine };

  await supabase
    .from('duels_quartiers')
    .update({ statut: 'termine' })
    .eq('statut', 'actif');

  const { data: photos } = await supabase
    .from('feed_photos')
    .select('quartier, ville, pays')
    .eq('video_validee', true)
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

  const quartiers = {};
  const villes = {};
  for (const p of (photos || [])) {
    if (p.quartier) quartiers[p.quartier] = (quartiers[p.quartier] || 0) + 1;
    if (p.ville) villes[p.ville] = (villes[p.ville] || 0) + 1;
  }

  const duels = [];

  // Duel Togo vs Bénin (toujours)
  duels.push({ semaine, type: 'ville', nom_a: 'Lomé', nom_b: 'Cotonou', pays: 'BOTH' });

  // Duel Coiffure vs Couture (toujours)
  duels.push({ semaine, type: 'categorie', nom_a: 'Coiffure', nom_b: 'Couture', pays: 'BOTH' });

  // Duels quartiers — prendre les 4 quartiers les plus actifs, faire 2 duels
  const topQuartiers = Object.entries(quartiers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([q]) => q);

  if (topQuartiers.length >= 2) {
    duels.push({ semaine, type: 'quartier', nom_a: topQuartiers[0], nom_b: topQuartiers[1], pays: 'BOTH' });
  }
  if (topQuartiers.length >= 4) {
    duels.push({ semaine, type: 'quartier', nom_a: topQuartiers[2], nom_b: topQuartiers[3], pays: 'BOTH' });
  }

  if (duels.length > 0) {
    await supabase.from('duels_quartiers').insert(duels);
  }

  return { created: duels.length, semaine };
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Chaque vendredi : générer les duels de la semaine
  let duelsResult = {};
  try {
    duelsResult = await genererDuelsHebdo();
  } catch (err) {
    console.error('[cron/duels]', err);
    duelsResult = { error: err.message };
  }

  if (!isLastFridayOfMonth()) {
    return res.status(200).json({ ok: true, message: 'Pas le dernier vendredi du mois — duels seuls', duels: duelsResult });
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
      titre: '👑 Tu es la Reine du Mur des Reines !',
      corps: `100 000 FCFA ont été crédités sur ton Crédit WOLO. La communauté t'a élue Reine du mois de ${moisCourant}.`
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
        titre: '🥈 Vice-Reine du Mur des Reines !',
        corps: `Tu termines 2e du Mur des Reines de ${moisCourant}. Un badge spécial est affiché sur ton profil pendant 30 jours.`
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
      duels: duelsResult,
    });
  } catch (err) {
    console.error('[cron/awards-resultat]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
