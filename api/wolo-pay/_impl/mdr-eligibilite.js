// ════════════════════════════════════════════════════════════════
// Bourse des Mains d'Or — Éligibilité utilisatrice du mois
// ════════════════════════════════════════════════════════════════
// GET /api/wolo-pay/mdr-eligibilite (auth required)
// Retourne un objet { eligible, conditions, ratio, mois, categorie, pool_pays }
// Conditions (7) :
//   1. profil_complet (photo + métier + ville/quartier + numéro)
//   2. metier_ok (Coiffeuse mois impair OU Couturière mois pair)
//   3. photo_du_mois (≥ 1 photo de réalisation sur son profil ce mois)
//   4. avis_30j (≥ 1 avis sur 30 derniers jours)
//   5. activite_recente (connexion ≤ 14 jours)
//   6. tiktok_wolomarket (case déclarative cochée)
//   7. tiktok_schealtiel (case déclarative cochée)
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
    // Charger le profil prestataire
    const { data: prest, error: prestErr } = await supabase
      .from('wolo_prestataires')
      .select('*')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (prestErr) throw prestErr;
    if (!prest) {
      return res.status(200).json({
        eligible: false,
        raison: 'profil_introuvable',
        conditions: {},
        ratio: '0/7',
      });
    }

    // Mois actuel et catégorie (alternance)
    const now = new Date();
    const moisAA = now.getMonth() + 1; // 1-12
    const moisAAStr = now.toISOString().slice(0, 7); // "YYYY-MM"
    const categorie = (moisAA % 2 === 1) ? 'coiffure' : 'couture';

    // 1. Profil complet
    const profil_complet = Boolean(
      prest.photo_profil && prest.metier_principal && (prest.quartier || prest.ville) && (prest.numero || prest.whatsapp)
    );

    // 2. Métier compatible
    const metier = (prest.metier_principal || '').toLowerCase();
    const metier_ok = (categorie === 'coiffure')
      ? /coiff/i.test(metier)
      : /coutur/i.test(metier);

    // 3. ≥ 1 photo de réalisation sur son profil ce mois
    // On regarde feed_photos par user_id postée dans le mois en cours
    // OU les champs Photo Réalisation 1/2/3 mis à jour ce mois (date_modification du profil)
    let photo_du_mois = false;
    try {
      const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('feed_photos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .gte('created_at', moisDebut);
      photo_du_mois = (count || 0) >= 1;
      // Fallback : si au moins une Photo Réalisation présente, considéré OK
      if (!photo_du_mois) {
        photo_du_mois = Boolean(prest.photo_realisation_1 || prest.photo_realisation_2 || prest.photo_realisation_3);
      }
    } catch (e) {
      console.warn('[mdr-eligibilite] feed_photos count failed', e.message);
    }

    // 4. ≥ 1 avis sur 30 derniers jours
    let avis_30j = false;
    try {
      const il_y_a_30j = new Date(now - 30 * 86400000).toISOString();
      const { count: nbAvis } = await supabase
        .from('wolo_avis')
        .select('*', { count: 'exact', head: true })
        .eq('prestataire_user_id', user.user_id)
        .gte('created_at', il_y_a_30j);
      avis_30j = (nbAvis || 0) >= 1;
    } catch (e) {
      console.warn('[mdr-eligibilite] avis count failed', e.message);
    }

    // 5. Activité récente (≤ 14 jours)
    let activite_recente = false;
    if (prest.derniere_activite || prest.updated_at) {
      const lastActivity = new Date(prest.derniere_activite || prest.updated_at);
      activite_recente = (now - lastActivity) <= 14 * 86400000;
    } else {
      activite_recente = true; // par défaut : vient de se connecter
    }

    // 6, 7. TikTok déclarés
    const tiktok_wolomarket = Boolean(prest.tiktok_suivi_wolomarket);
    const tiktok_schealtiel = Boolean(prest.tiktok_suivi_schealtiel);

    const conditions = {
      profil_complet,
      metier_ok,
      photo_du_mois,
      avis_30j,
      activite_recente,
      tiktok_wolomarket,
      tiktok_schealtiel,
    };

    const okCount = Object.values(conditions).filter(Boolean).length;
    const eligible = okCount === 7;

    // Compteur pool éligibles du pays (pour afficher "1 chance sur N")
    let pool_pays = 0;
    try {
      // Pays inféré côté frontend, pas stocké directement → on compte tous les éligibles
      const { count } = await supabase
        .from('wolo_prestataires')
        .select('*', { count: 'exact', head: true })
        .eq('tiktok_suivi_wolomarket', true)
        .eq('tiktok_suivi_schealtiel', true);
      pool_pays = count || 0;
    } catch (e) {
      console.warn('[mdr-eligibilite] pool count failed', e.message);
    }

    return res.status(200).json({
      eligible,
      conditions,
      ratio: `${okCount}/7`,
      mois: moisAAStr,
      categorie,
      pool_estimation: pool_pays,
    });
  } catch (e) {
    console.error('[mdr-eligibilite] error', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
