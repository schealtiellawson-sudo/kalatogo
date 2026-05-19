// ════════════════════════════════════════════════════════════════
// Bourse de Croissance — Tirage mensuel
// ════════════════════════════════════════════════════════════════
// POST /api/wolo-pay/bourse-tirage-mensuel (protégé par CRON_SECRET)
// Tirage 100% aléatoire : 1 gagnant Togo + 1 gagnant Bénin parmi Pro éligibles
// (9 conditions complètes)
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
    const il_y_a_30j = new Date(now - 30 * 86400000).toISOString();
    const il_y_a_14j = new Date(now - 14 * 86400000).toISOString();
    const il_y_a_3mois = new Date(now);
    il_y_a_3mois.setMonth(il_y_a_3mois.getMonth() - 3);

    // Vérifier si déjà tiré ce mois
    const { data: existing } = await supabase
      .from('bourse_croissance')
      .select('id, user_id, pays')
      .eq('mois', moisStr)
      .eq('gagnant', true);

    if (existing && existing.length >= 2) {
      return res.status(200).json({
        ok: true,
        message: 'Tirage déjà effectué ce mois',
        existing,
      });
    }

    // 1) Charger les Pro avec TikTok + activité récente
    const { data: candidates } = await supabase
      .from('wolo_prestataires')
      .select('*')
      .eq('abonnement', 'Pro')
      .eq('tiktok_suivi_wolomarket', true)
      .eq('tiktok_suivi_schealtiel', true)
      .gte('updated_at', il_y_a_14j);

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun candidat Pro éligible', pool: 0 });
    }

    // 2) Filtrer par conditions complètes
    const eligibles = [];
    for (const c of candidates) {
      // Profil complet
      if (!c.photo_profil || !c.metier_principal || !(c.quartier || c.ville) || !(c.numero || c.whatsapp)) continue;
      // Score WOZALI ≥ 80
      if ((Number(c.score_wolo) || 0) < 80) continue;

      // Avis ≥ 3 sur 30j + note ≥ 4.2
      try {
        const { data: avis } = await supabase
          .from('wolo_avis')
          .select('note')
          .eq('prestataire_user_id', c.user_id)
          .gte('created_at', il_y_a_30j);
        if (!avis || avis.length < 3) continue;
        const note = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
        if (note < 4.2) continue;
      } catch { continue; }

      // Pas gagné dans les 3 derniers mois
      try {
        const { count: gagnesRecents } = await supabase
          .from('bourse_croissance')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', c.user_id)
          .eq('gagnant', true)
          .gte('date_tirage', il_y_a_3mois.toISOString());
        if ((gagnesRecents || 0) > 0) continue;
      } catch {}

      eligibles.push(c);
    }

    const eligiblesTG = eligibles.filter(c => inferPays(c) === 'TG');
    const eligiblesBJ = eligibles.filter(c => inferPays(c) === 'BJ');

    const pickRandom = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
    const gagnantTG = pickRandom(eligiblesTG);
    const gagnantBJ = pickRandom(eligiblesBJ);

    const inserts = [];
    if (gagnantTG) {
      inserts.push({
        user_id: gagnantTG.user_id,
        mois: moisStr,
        pays: 'TG',
        montant_fcfa: 300000,
        gagnant: true,
        date_tirage: now.toISOString(),
        eligible: true,
        score_wolo: gagnantTG.score_wolo,
      });
    }
    if (gagnantBJ) {
      inserts.push({
        user_id: gagnantBJ.user_id,
        mois: moisStr,
        pays: 'BJ',
        montant_fcfa: 300000,
        gagnant: true,
        date_tirage: now.toISOString(),
        eligible: true,
        score_wolo: gagnantBJ.score_wolo,
      });
    }

    if (inserts.length > 0) {
      const { error: insErr } = await supabase
        .from('bourse_croissance')
        .insert(inserts);
      if (insErr) throw insErr;
    }

    // Notif gagnants
    for (const g of [gagnantTG, gagnantBJ]) {
      if (!g) continue;
      try {
        const newNotif = {
          type: 'bourse_gagnant',
          titre: 'Tu remportes la Bourse de Croissance !',
          message: `${moisStr} : 300 000 FCFA. Pas le plus connu. Le plus sérieux. WOZALI te contacte sous 48h.`,
          date: now.toISOString(),
          lue: false,
        };
        const existingNotifs = Array.isArray(g.notifications) ? g.notifications : [];
        await supabase
          .from('wolo_prestataires')
          .update({ notifications: [...existingNotifs, newNotif] })
          .eq('user_id', g.user_id);
      } catch (e) {
        console.warn('[bourse-tirage] notif fail', e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      mois: moisStr,
      pool_tg: eligiblesTG.length,
      pool_bj: eligiblesBJ.length,
      gagnants: {
        togo: gagnantTG ? { user_id: gagnantTG.user_id, nom: gagnantTG.nom_complet } : null,
        benin: gagnantBJ ? { user_id: gagnantBJ.user_id, nom: gagnantBJ.nom_complet } : null,
      },
    });
  } catch (e) {
    console.error('[bourse-tirage-mensuel] error', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
