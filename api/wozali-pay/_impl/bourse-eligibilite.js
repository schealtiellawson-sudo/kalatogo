// ════════════════════════════════════════════════════════════════
// Bourse de Croissance — Éligibilité Pro du mois
// ════════════════════════════════════════════════════════════════
// GET /api/wozali-pay/bourse-eligibilite (auth required)
//
// Alignement 2026-07-21 (audit fondateur) : cet endpoint recalculait
// l'éligibilité de son côté avec des seuils différents de ceux du
// cron quotidien (api/cron/eligibilite-bourse.js) — deux moteurs qui
// se contredisaient. Il LIT désormais la ligne déjà écrite par le
// cron dans bourse_croissance (source unique de vérité pour le
// booléen `eligible` et pour les seuils avis/mois/score/note). La
// checklist ci-dessous n'est qu'un affichage dérivé de cette ligne
// (+ deux vérifications live que le cron ne persiste pas encore :
// profil complet et dernière activité, qui ne pèsent pas dans le
// calcul du cron, uniquement dans l'affichage pédagogique).
//
// Rappel modèle : Bourse par pays, débloquée à 5 000 membres Pro dans
// ce pays, 10 gagnants/pays/mois au mérite, gain = un salaire (le
// SMIG du pays du gagnant). Voir api/cron/tirage-bourse.js,
// api/cron/eligibilite-bourse.js et api/_lib/smig.js.
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import { MIN_AVIS_30J, MIN_MOIS_PRO, MIN_SCORE_WOZALI, MIN_NOTE_MOYENNE, SEUIL_PRO_DEBLOCAGE } from '../../_lib/smig.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Auth required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: prest, error: prestErr } = await supabase
      .from('wozali_prestataires')
      .select('photo_profil, metier_principal, quartier, ville, numero, whatsapp, derniere_activite, updated_at, pays')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (prestErr) throw prestErr;
    if (!prest) {
      return res.status(200).json({
        eligible: false,
        raison: 'profil_introuvable',
        conditions: {},
        ratio: '0/9',
      });
    }

    const now = new Date();
    const moisCourant = now.toISOString().slice(0, 7);

    // Profil complet + activité récente : vérifications live, non persistées
    // par le cron, purement pédagogiques pour le membre (ne changent jamais
    // le booléen `eligible`, qui vient exclusivement de la ligne du cron).
    const profil_complet = Boolean(
      prest.photo_profil && prest.metier_principal && (prest.quartier || prest.ville) && (prest.numero || prest.whatsapp)
    );
    let activite_recente = true;
    if (prest.derniere_activite || prest.updated_at) {
      const lastActivity = new Date(prest.derniere_activite || prest.updated_at);
      activite_recente = (now - lastActivity) <= 14 * 86400000;
    }

    // État de déblocage du pays (le front n'affiche plus un countdown pour
    // un tirage qui n'aura pas lieu si le pays n'a pas atteint le seuil).
    let nbProPays = 0;
    let paysDebloque = false;
    if (prest.pays) {
      const { count } = await supabase
        .from('wozali_prestataires')
        .select('*', { count: 'exact', head: true })
        .eq('abonnement', 'Pro')
        .eq('pays', prest.pays);
      nbProPays = count || 0;
      paysDebloque = nbProPays >= SEUIL_PRO_DEBLOCAGE;
    }

    // ── Source unique de vérité : la ligne déjà calculée par le cron ──
    const { data: bourse } = await supabase
      .from('bourse_croissance')
      .select('*')
      .eq('user_id', user.user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    if (!bourse) {
      // Le cron n'a pas encore tourné pour ce membre ce mois-ci (pas Pro,
      // ou pas encore de passage du cron). Rien à recalculer côté serveur.
      const conditions = {
        plan_pro_actif: false,
        profil_complet,
        score_wozali_80: false,
        avis_3_sur_30j: false,
        note_42: false,
        activite_recente,
        pas_gagne_recent: true,
      };
      return res.status(200).json({
        eligible: false,
        conditions,
        ratio: `${Object.values(conditions).filter(Boolean).length}/7`,
        mois: moisCourant,
        score_actuel: 0,
        note_moyenne_30j: 0,
        pays: prest.pays || null,
        nb_pro_pays: nbProPays,
        seuil_pro: SEUIL_PRO_DEBLOCAGE,
        pays_debloque: paysDebloque,
      });
    }

    const conditions = {
      plan_pro_actif: (bourse.pro_mois_consecutifs || 0) >= MIN_MOIS_PRO,
      profil_complet,
      score_wozali_80: (bourse.score_wozali || 0) >= MIN_SCORE_WOZALI,
      avis_3_sur_30j: (bourse.nb_avis || 0) >= MIN_AVIS_30J,
      note_42: (bourse.note_moyenne || 0) >= MIN_NOTE_MOYENNE,
      activite_recente,
      pas_gagne_recent: !bourse.gagnant,
    };

    const okCount = Object.values(conditions).filter(Boolean).length;
    // Le booléen final vient de la ligne écrite par le cron (source unique),
    // jamais d'un recalcul local qui pourrait diverger.
    const eligible = Boolean(bourse.eligible);

    return res.status(200).json({
      eligible,
      conditions,
      ratio: `${okCount}/7`,
      mois: moisCourant,
      score_actuel: bourse.score_wozali || 0,
      note_moyenne_30j: Math.round((bourse.note_moyenne || 0) * 10) / 10,
      pays: prest.pays || null,
      nb_pro_pays: nbProPays,
      seuil_pro: SEUIL_PRO_DEBLOCAGE,
      pays_debloque: paysDebloque,
    });
  } catch (e) {
    console.error('[bourse-eligibilite] error', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
