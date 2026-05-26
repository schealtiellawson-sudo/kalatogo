// ════════════════════════════════════════════════════════════════
// Bourse des Mains d'Or — Tirage mensuel
// ════════════════════════════════════════════════════════════════
// POST /api/wozali-pay/mdr-tirage-mensuel (protégé par CRON_SECRET header)
// Effectue le tirage 100% aléatoire : 1 gagnante Togo + 1 gagnante Bénin
// parmi toutes les candidates qui remplissent les 7 conditions du mois en cours.
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const BENIN_KEYWORDS = ['cotonou','porto-novo','parakou','abomey','ouidah','calavi','bohicon','lokossa','natitingou','djougou','kandi','malanville','nikki','tchaourou','savè','sèmè','allada','comé'];

function inferPays(prestataire) {
  const loc = ((prestataire.ville || '') + ' ' + (prestataire.quartier || '')).toLowerCase();
  return BENIN_KEYWORDS.some(b => loc.includes(b)) ? 'BJ' : 'TG';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth via CRON_SECRET header
  const cronSecret = req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const now = new Date();
    const moisStr = now.toISOString().slice(0, 7);
    const moisAA = now.getMonth() + 1;
    const categorie = (moisAA % 2 === 1) ? 'coiffure' : 'couture';
    const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const il_y_a_30j = new Date(now - 30 * 86400000).toISOString();
    const metierPattern = (categorie === 'coiffure') ? /coiff/i : /coutur/i;

    // Vérifier si tirage déjà effectué ce mois
    const { data: existing } = await supabase
      .from('wozali_awards')
      .select('id, gagnant_user_id, pays')
      .eq('mois', moisStr)
      .eq('categorie_mdr', categorie);

    if (existing && existing.length >= 2) {
      return res.status(200).json({
        ok: true,
        message: 'Tirage déjà effectué ce mois',
        existing,
      });
    }

    // 1) Charger toutes les femmes coiffeuses/couturières avec TikTok cochés + activité récente
    const il_y_a_14j = new Date(now - 14 * 86400000).toISOString();
    const { data: candidates } = await supabase
      .from('wozali_prestataires')
      .select('*')
      .eq('tiktok_suivi_wolomarket', true)
      .eq('tiktok_suivi_schealtiel', true)
      .gte('updated_at', il_y_a_14j);

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucune candidate éligible', pool: 0 });
    }

    // 2) Filtrer par métier + autres conditions
    const eligibles = [];
    for (const c of candidates) {
      // Métier OK
      if (!metierPattern.test(c.metier_principal || '')) continue;
      // Profil complet
      if (!c.photo_profil || !c.metier_principal || !(c.quartier || c.ville) || !(c.numero || c.whatsapp)) continue;

      // Photo réalisation ce mois
      let hasPhotoDuMois = false;
      try {
        const { count } = await supabase
          .from('feed_photos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', c.user_id)
          .gte('created_at', moisDebut);
        hasPhotoDuMois = (count || 0) >= 1;
        if (!hasPhotoDuMois) {
          hasPhotoDuMois = Boolean(c.photo_realisation_1 || c.photo_realisation_2 || c.photo_realisation_3);
        }
      } catch {}
      if (!hasPhotoDuMois) continue;

      // Avis 30j
      try {
        const { count: nbAvis } = await supabase
          .from('wozali_avis')
          .select('*', { count: 'exact', head: true })
          .eq('prestataire_user_id', c.user_id)
          .gte('created_at', il_y_a_30j);
        if ((nbAvis || 0) < 1) continue;
      } catch { continue; }

      eligibles.push(c);
    }

    // 3) Séparer Togo / Bénin
    const eligiblesTG = eligibles.filter(c => inferPays(c) === 'TG');
    const eligiblesBJ = eligibles.filter(c => inferPays(c) === 'BJ');

    // 4) Tirage 100% aléatoire
    const pickRandom = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
    const gagnanteTG = pickRandom(eligiblesTG);
    const gagnanteBJ = pickRandom(eligiblesBJ);

    const inserts = [];
    if (gagnanteTG) {
      inserts.push({
        user_id: gagnanteTG.user_id,
        mois: moisStr,
        pays: 'TG',
        categorie_mdr: categorie,
        montant_fcfa: 100000,
        gagnant: true,
        date_tirage: now.toISOString(),
      });
    }
    if (gagnanteBJ) {
      inserts.push({
        user_id: gagnanteBJ.user_id,
        mois: moisStr,
        pays: 'BJ',
        categorie_mdr: categorie,
        montant_fcfa: 100000,
        gagnant: true,
        date_tirage: now.toISOString(),
      });
    }

    if (inserts.length > 0) {
      const { error: insErr } = await supabase
        .from('wozali_awards')
        .insert(inserts);
      if (insErr) throw insErr;
    }

    // 5) Notifier les gagnantes (push + Boîte WOZALI)
    for (const g of [gagnanteTG, gagnanteBJ]) {
      if (!g) continue;
      try {
        // Mettre à jour Notifications JSON du profil
        const newNotif = {
          type: 'mains_or_gagnante',
          titre: 'Tu es Reine des Mains d’Or !',
          message: `${categorie === 'coiffure' ? 'Coiffure' : 'Couture'} — ${moisStr} : tu remportes 100 000 FCFA. WOZALI te contacte sous 48h.`,
          date: now.toISOString(),
          lue: false,
        };
        const existing = Array.isArray(g.notifications) ? g.notifications : [];
        await supabase
          .from('wozali_prestataires')
          .update({ notifications: [...existing, newNotif] })
          .eq('user_id', g.user_id);
      } catch (e) {
        console.warn('[mdr-tirage] notif fail', e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      mois: moisStr,
      categorie,
      pool_tg: eligiblesTG.length,
      pool_bj: eligiblesBJ.length,
      gagnantes: {
        togo: gagnanteTG ? { user_id: gagnanteTG.user_id, nom: gagnanteTG.nom_complet } : null,
        benin: gagnanteBJ ? { user_id: gagnanteBJ.user_id, nom: gagnanteBJ.nom_complet } : null,
      },
    });
  } catch (e) {
    console.error('[mdr-tirage-mensuel] error', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
