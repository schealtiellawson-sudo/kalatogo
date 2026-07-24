// ================================================================
// CRON — Éligibilité Bourse de Croissance (tous les jours 08h WAT)
// Vercel schedule : 0 7 * * *  (07h UTC = 08h WAT)
// Vérifie les 6 conditions d'éligibilité pour chaque membre Pro
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { envoyerNotification } from '../_utils/credit.js';
import { calculerScoreMerite } from '../_lib/score-merite.js';
import { MIN_AVIS_30J, MIN_MOIS_PRO, MIN_SCORE_WOZALI, MIN_NOTE_MOYENNE, PAYS_BOURSE } from '../_lib/smig.js';

// Top 50 — mécanique de visibilité INDÉPENDANTE de la Bourse de Croissance
// (décision fondateur 2026-07-22). Vit dès le lancement, même avant les
// 5 000 Pro/pays. Classement sur le même score_merite, Pro uniquement,
// par pays, recalculé chaque jour par ce cron. "Actif" = mis à jour son
// profil dans les 14 derniers jours (même proxy que ptsConstance dans
// score-merite.js — pas de colonne derniere_activite dédiée en base).
const TOP50_ACTIVITE_JOURS = 14;
const TOP50_TAILLE = 50;

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Recalcul quotidien des paliers Programme Créateur (best-effort, ne bloque rien)
    try { await supabase.rpc('wz_createur_recompute'); } catch (e) { console.warn('[cron] wz_createur_recompute:', e?.message); }

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
      .select('user_id, score_wozali, photo_profil, photo_realisation_1, photo_realisation_2, photo_realisation_3, albums, description_services, metier_principal, quartier, ville, numero_telephone, whatsapp, updated_at, pays, created_at, rang_top_50')
      .in('user_id', userIds);

    const profileMap = {};
    for (const p of (profiles || [])) profileMap[p.user_id] = p;

    // 3. Récupérer TOUS les avis validés (pagination .range()) : les 30
    //    derniers jours servent aux conditions, l'historique complet sert
    //    aux clients récurrents du Score Mérite.
    let allAvis = [];
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: page, error: avisErr } = await supabase
          .from('wozali_avis')
          .select('prestataire_user_id, note_globale, date_avis, created_at, auteur_user_id, auteur_whatsapp')
          .eq('validated', true)
          .range(from, from + PAGE - 1);
        if (avisErr) throw avisErr;
        if (!page || page.length === 0) break;
        allAvis.push(...page);
        if (page.length < PAGE) break;
        from += PAGE;
      }
    }

    // Grouper par user_id du prestataire : récents (30j) + historique complet
    const avisRecentsParPrest = {};
    const avisTousParPrest = {};
    for (const a of allAvis) {
      const pid = a.prestataire_user_id;
      if (!pid) continue;
      if (!avisTousParPrest[pid]) avisTousParPrest[pid] = [];
      avisTousParPrest[pid].push(a);
      const dateAvis = a.date_avis || a.created_at;
      if (dateAvis < il30jours) continue;
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

    // Entrées collectées pour le classement Top 50 (indépendant de la Bourse)
    const meriteEntries = [];

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

      // Condition 5 (remplace l'ancienne "pasAvisRecent14j" — c'était une
      // inversion de logique qui excluait un membre simplement parce qu'il
      // venait de recevoir un avis récent, ce qui aurait vidé le classement).
      // Nouvelle logique : détection d'afflux anormal. Si plus de la moitié
      // des avis du mois sont tombés le même jour, c'est un signal de
      // manipulation (avis groupés/achetés), pas de l'activité normale.
      const pasAffluxAnormal = (() => {
        if (nbAvisRecents === 0) return true;
        const parJour = {};
        for (const a of avisRecents) {
          const d = (a.date_avis || a.created_at || '').slice(0, 10);
          parJour[d] = (parJour[d] || 0) + 1;
        }
        const maxAvisMemeJour = Math.max(...Object.values(parJour));
        return maxAvisMemeJour <= nbAvisRecents / 2;
      })();

      // Les 6 conditions
      const conditions = {
        proDepuisNMois:    moisPro >= MIN_MOIS_PRO,
        scoreMinimum:      scoreWozali >= MIN_SCORE_WOZALI,
        avisMinimum:       nbAvisRecents >= MIN_AVIS_30J,
        noteMinimum:       noteMoyRecente >= MIN_NOTE_MOYENNE,
        pasAffluxAnormal,
        nonGagnant3mois:   !gagnantsSet.has(userId),
      };

      const estEligible = Object.values(conditions).every(v => v);

      // Score Mérite — le classement qui désigne les 10 gagnants par pays.
      // Zéro point pour les vues, les abonnés ou les partages.
      const merite = calculerScoreMerite({
        prestataire: profile,
        avis30j: avisRecents,
        avisTous: avisTousParPrest[userId] || [],
      });

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
        score_merite: merite.total,
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
            titre: '🏆 Tu es dans la course pour la Bourse de Croissance !',
            corps: "Tu remplis toutes les conditions ce mois. Les 10 meilleurs profils de ton pays sont désignés le dernier vendredi du mois, une fois 5 000 membres Pro atteints dans ton pays. Le classement regarde ton travail, pas ton audience."
          });
          nouveauxEligibles++;
        }
      } else {
        await supabase.from('bourse_croissance').insert(row);
        if (estEligible) {
          await envoyerNotification({
            user_id: userId,
            titre: '🏆 Tu es dans la course pour la Bourse de Croissance !',
            corps: "Tu remplis toutes les conditions ce mois. Les 10 meilleurs profils de ton pays sont désignés le dernier vendredi du mois, une fois 5 000 membres Pro atteints dans ton pays. Le classement regarde ton travail, pas ton audience."
          });
          nouveauxEligibles++;
        }
      }

      if (estEligible) eligibles++;

      // Collecte pour le classement Top 50 — Pro + pays connu + actif
      // (mis à jour son profil dans les TOP50_ACTIVITE_JOURS derniers jours)
      if (profile.pays) {
        const derniereMaj = profile.updated_at ? new Date(profile.updated_at) : null;
        const estActif = derniereMaj
          ? (now.getTime() - derniereMaj.getTime()) <= TOP50_ACTIVITE_JOURS * 86400000
          : false;
        if (estActif) {
          meriteEntries.push({
            userId,
            pays: profile.pays,
            merite: merite.total,
            nbAvisTotal: (avisTousParPrest[userId] || []).length,
            createdAt: profile.created_at || null,
            prevRang: profile.rang_top_50 || null,
          });
        }
      }
    }

    // 7. Classement Top 50 par pays — badge de visibilité indépendant de
    //    la Bourse. Écrit rang_top_50 (1..50) sur les entrants, remet à
    //    NULL les sortants (pour éteindre le badge côté front app.js:4767).
    let top50Ecritures = 0;
    let top50Entrees = 0;
    let top50Sorties = 0;

    for (const pays of PAYS_BOURSE) {
      const entriesPays = meriteEntries.filter(e => e.pays === pays);

      // Tri : score_merite DESC, puis nb avis DESC, puis ancienneté (created_at ASC)
      entriesPays.sort((a, b) => {
        if (b.merite !== a.merite) return b.merite - a.merite;
        if (b.nbAvisTotal !== a.nbAvisTotal) return b.nbAvisTotal - a.nbAvisTotal;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
        return ca - cb;
      });

      const top50 = entriesPays.slice(0, TOP50_TAILLE);
      const top50Ids = new Set(top50.map(e => e.userId));

      // Sortants du pays : avaient un rang, n'en ont plus
      const sortants = entriesPays.filter(e => e.prevRang && !top50Ids.has(e.userId));

      const rows = [];
      for (let i = 0; i < top50.length; i++) {
        const e = top50[i];
        const nouveauRang = i + 1;
        rows.push({ user_id: e.userId, rang_top_50: nouveauRang });
        // Notifier uniquement une vraie entrée (n'était pas classé avant)
        if (!e.prevRang) {
          top50Entrees++;
          await envoyerNotification({
            user_id: e.userId,
            titre: `🏆 Tu es Top ${nouveauRang} des profils les plus sérieux du ${pays} ce mois`,
            corps: 'Ton profil est mis en avant partout sur WOZALI.'
          });
        }
      }
      for (const e of sortants) {
        rows.push({ user_id: e.userId, rang_top_50: null });
        top50Sorties++;
        await envoyerNotification({
          user_id: e.userId,
          titre: "Tu n'es plus dans le Top 50 ce mois",
          corps: 'Reste actif, garde tes bons avis, tu peux y revenir.'
        });
      }

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('wozali_prestataires')
          .upsert(rows, { onConflict: 'user_id' });
        if (upsertErr) {
          console.error('[cron/eligibilite-bourse] upsert rang_top_50', pays, upsertErr.message || upsertErr);
        } else {
          top50Ecritures += rows.length;
        }
      }
    }

    console.log(`[cron/eligibilite-bourse] Top 50 : ${top50Ecritures} écritures, ${top50Entrees} entrées, ${top50Sorties} sorties`);

    return res.status(200).json({
      ok: true,
      mois: moisCourant,
      total_pro: abos.length,
      eligibles,
      nouveaux_eligibles: nouveauxEligibles,
      top50_ecritures: top50Ecritures,
      top50_entrees: top50Entrees,
      top50_sorties: top50Sorties,
    });
  } catch (err) {
    console.error('[cron/eligibilite-bourse]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
