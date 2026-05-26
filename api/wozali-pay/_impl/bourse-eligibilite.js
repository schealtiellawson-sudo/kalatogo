// ════════════════════════════════════════════════════════════════
// Bourse de Croissance — Éligibilité Pro du mois
// ════════════════════════════════════════════════════════════════
// GET /api/wozali-pay/bourse-eligibilite (auth required)
// Conditions (9) :
//   1. plan_pro_actif (CE MOIS)
//   2. profil_complet
//   3. score_wozali_80 (Score WOZALI ≥ 80/100)
//   4. avis_3_sur_30j (≥ 3 avis sur 30 derniers jours)
//   5. note_42 (Note moyenne ≥ 4.2★ sur 30j)
//   6. activite_recente (connexion ≤ 14 jours)
//   7. pas_gagne_recent (anti-doublon : pas gagné dans les 3 derniers mois)
//   8. tiktok_wolomarket
//   9. tiktok_schealtiel
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

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
      .select('*')
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
    const moisAAStr = now.toISOString().slice(0, 7);

    // 1. Plan Pro actif CE MOIS
    const plan_pro_actif = (prest.abonnement === 'Pro');

    // 2. Profil complet
    const profil_complet = Boolean(
      prest.photo_profil && prest.metier_principal && (prest.quartier || prest.ville) && (prest.numero || prest.whatsapp)
    );

    // 3. Score WOZALI ≥ 80
    const scoreActuel = Number(prest.score_wozali || 0);
    const score_wozali_80 = scoreActuel >= 80;

    // 4. ≥ 3 avis sur 30 derniers jours
    let avis_3_sur_30j = false;
    let noteMoyenne30j = 0;
    try {
      const il_y_a_30j = new Date(now - 30 * 86400000).toISOString();
      const { data: avisRecents, count } = await supabase
        .from('wozali_avis')
        .select('note', { count: 'exact' })
        .eq('prestataire_user_id', user.user_id)
        .gte('created_at', il_y_a_30j);

      avis_3_sur_30j = (count || 0) >= 3;
      if (avisRecents && avisRecents.length > 0) {
        const sum = avisRecents.reduce((s, a) => s + (a.note || 0), 0);
        noteMoyenne30j = sum / avisRecents.length;
      }
    } catch (e) {
      console.warn('[bourse-eligibilite] avis count failed', e.message);
    }

    // 5. Note moyenne ≥ 4.2★ sur 30 jours
    const note_42 = noteMoyenne30j >= 4.2;

    // 6. Activité récente (≤ 14 jours)
    let activite_recente = false;
    if (prest.derniere_activite || prest.updated_at) {
      const lastActivity = new Date(prest.derniere_activite || prest.updated_at);
      activite_recente = (now - lastActivity) <= 14 * 86400000;
    } else {
      activite_recente = true;
    }

    // 7. Pas gagné dans les 3 derniers mois (anti-doublon)
    let pas_gagne_recent = true;
    try {
      const il_y_a_3mois = new Date(now);
      il_y_a_3mois.setMonth(il_y_a_3mois.getMonth() - 3);
      const { count: gagne } = await supabase
        .from('bourse_croissance')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('gagnant', true)
        .gte('date_tirage', il_y_a_3mois.toISOString());
      pas_gagne_recent = (gagne || 0) === 0;
    } catch (e) {
      // Si la table n'existe pas ou autre, on assume OK
      pas_gagne_recent = true;
    }

    // 8, 9. TikTok
    const tiktok_wolomarket = Boolean(prest.tiktok_suivi_wolomarket);
    const tiktok_schealtiel = Boolean(prest.tiktok_suivi_schealtiel);

    const conditions = {
      plan_pro_actif,
      profil_complet,
      score_wozali_80,
      avis_3_sur_30j,
      note_42,
      activite_recente,
      pas_gagne_recent,
      tiktok_wolomarket,
      tiktok_schealtiel,
    };

    const okCount = Object.values(conditions).filter(Boolean).length;
    const eligible = okCount === 9;

    return res.status(200).json({
      eligible,
      conditions,
      ratio: `${okCount}/9`,
      mois: moisAAStr,
      score_actuel: scoreActuel,
      note_moyenne_30j: Math.round(noteMoyenne30j * 10) / 10,
    });
  } catch (e) {
    console.error('[bourse-eligibilite] error', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
