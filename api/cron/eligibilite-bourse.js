// ================================================================
// CRON — Éligibilité Bourse de Croissance (tous les jours 08h WAT)
// Vercel schedule : 0 7 * * *  (07h UTC = 08h WAT)
// Vérifie les 6 conditions d'éligibilité pour chaque membre Pro
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { envoyerNotification } from '../_utils/credit.js';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const now = new Date();
    const moisCourant = now.toISOString().slice(0, 7); // YYYY-MM
    const il30jours = new Date(now.getTime() - 30 * 86400000).toISOString();

    // 1. Récupérer tous les abonnements Pro actifs
    const { data: abos } = await supabase
      .from('abonnements')
      .select('user_id, created_at')
      .eq('plan', 'pro')
      .eq('statut', 'actif');

    if (!abos || abos.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun membre Pro actif', eligibles: 0 });
    }

    // 2. Récupérer les profils correspondants
    const userIds = abos.map(a => a.user_id);
    const { data: profiles } = await supabase
      .from('wozali_prestataires')
      .select('user_id, score_wozali')
      .in('user_id', userIds);

    const profileMap = {};
    for (const p of (profiles || [])) profileMap[p.user_id] = p;

    // 3. Récupérer les avis des 30 derniers jours depuis Supabase (validés)
    //    Pagination .range() car un scan complet peut dépasser 1000 lignes.
    let allAvis = [];
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: page, error: avisErr } = await supabase
          .from('wozali_avis')
          .select('prestataire_user_id, note_globale, date_avis, created_at')
          .eq('validated', true)
          .gte('date_avis', il30jours)
          .range(from, from + PAGE - 1);
        if (avisErr) throw avisErr;
        if (!page || page.length === 0) break;
        allAvis.push(...page);
        if (page.length < PAGE) break;
        from += PAGE;
      }
    }

    // Grouper les avis récents par user_id du prestataire
    const avisRecentsParPrest = {};
    for (const a of allAvis) {
      const dateAvis = a.date_avis || a.created_at;
      if (dateAvis < il30jours) continue;
      const pid = a.prestataire_user_id;
      if (!pid) continue;
      if (!avisRecentsParPrest[pid]) avisRecentsParPrest[pid] = [];
      avisRecentsParPrest[pid].push(a);
    }

    // 5. Vérifier les gagnants des 3 derniers mois
    const mois3 = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      mois3.push(d.toISOString().slice(0, 7));
    }
    const { data: gagnantsRecents } = await supabase
      .from('bourse_croissance')
      .select('user_id')
      .in('mois', mois3)
      .eq('gagnant', true);
    const gagnantsSet = new Set((gagnantsRecents || []).map(g => g.user_id));

    // 6. Vérifier éligibilité pour chaque membre Pro
    let eligibles = 0;
    let nouveauxEligibles = 0;
    const il14jours = new Date(now.getTime() - 14 * 86400000).toISOString();

    for (const abo of abos) {
      const userId = abo.user_id;
      const profile = profileMap[userId];
      if (!profile) continue;

      const scoreWozali = profile.score_wozali || 0;
      // pro_since n'existe pas dans wozali_prestataires → on utilise abo.created_at
      const moisPro = abo.created_at
        ? Math.floor((now.getTime() - new Date(abo.created_at).getTime()) / (30 * 86400000))
        : 0;

      // Avis récents pour ce prestataire (indexés par user_id)
      const avisRecents = avisRecentsParPrest[userId] || [];
      const nbAvisRecents = avisRecents.length;

      // Note moyenne sur 30 jours
      let noteMoyRecente = 0;
      if (nbAvisRecents > 0) {
        const sum = avisRecents.reduce((s, a) => s + (a.note_globale || 0), 0);
        noteMoyRecente = sum / nbAvisRecents;
      }

      // Condition 5 : aucun avis de moins de 14 jours (anti-manipulation)
      const avisRecentsOk = !avisRecents.some(a => {
        const d = a.date_avis || a.created_at;
        return d > il14jours;
      });

      // Les 6 conditions
      const conditions = {
        proDepuis2mois:    moisPro >= 2,
        scoreMin80:        scoreWozali >= 80,
        avisMin4:          nbAvisRecents >= 4,
        noteMin42:         noteMoyRecente >= 4.2,
        pasAvisRecent14j:  avisRecentsOk,
        nonGagnant3mois:   !gagnantsSet.has(userId),
      };

      const estEligible = Object.values(conditions).every(v => v);

      // Upsert dans bourse_croissance
      const { data: existing } = await supabase
        .from('bourse_croissance')
        .select('id, eligible')
        .eq('user_id', userId)
        .eq('mois', moisCourant)
        .maybeSingle();

      const row = {
        user_id: userId,
        mois: moisCourant,
        eligible: estEligible,
        score_wozali: scoreWozali,
        nb_avis: nbAvisRecents,
        note_moyenne: noteMoyRecente,
        pro_mois_consecutifs: moisPro,
      };

      if (existing) {
        await supabase.from('bourse_croissance').update(row).eq('id', existing.id);
        // Notification si devient éligible (était pas avant)
        if (estEligible && !existing.eligible) {
          await envoyerNotification({
            user_id: userId,
            titre: '🏆 Tu es éligible à la Bourse de Croissance !',
            corps: 'Tu remplis toutes les conditions ce mois. Bonne chance pour le tirage !'
          });
          nouveauxEligibles++;
        }
      } else {
        await supabase.from('bourse_croissance').insert(row);
        if (estEligible) {
          await envoyerNotification({
            user_id: userId,
            titre: '🏆 Tu es éligible à la Bourse de Croissance !',
            corps: 'Tu remplis toutes les conditions ce mois. Bonne chance pour le tirage !'
          });
          nouveauxEligibles++;
        }
      }

      if (estEligible) eligibles++;
    }

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      total_pro: abos.length,
      eligibles,
      nouveaux_eligibles: nouveauxEligibles,
    });
  } catch (err) {
    console.error('[cron/eligibilite-bourse]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
