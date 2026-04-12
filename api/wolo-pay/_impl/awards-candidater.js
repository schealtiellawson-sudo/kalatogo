// ================================================================
// WOLO Awards — Soumettre sa candidature (upload vidéo)
// POST /api/wolo-pay/awards-candidater
// Body: { user_id, video_url, pays }
// Nécessite Plan Pro actif depuis 2+ mois
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { user_id, video_url, pays } = req.body || {};
  if (!user_id || !video_url) {
    return res.status(400).json({ error: 'user_id et video_url requis' });
  }

  if (pays && !['BJ', 'TG'].includes(pays)) {
    return res.status(400).json({ error: 'pays doit être BJ ou TG' });
  }

  try {
    const moisCourant = new Date().toISOString().slice(0, 7);

    // Vérifier Plan Pro actif
    const { data: abo } = await supabase
      .from('abonnements')
      .select('id, created_at')
      .eq('user_id', user_id)
      .eq('plan', 'pro')
      .eq('statut', 'actif')
      .maybeSingle();

    if (!abo) {
      return res.status(403).json({ error: 'Plan Pro requis pour candidater aux WOLO Awards' });
    }

    // Vérifier Pro depuis 2+ mois
    const { data: profile } = await supabase
      .from('profiles')
      .select('pro_since, pays')
      .eq('id', user_id)
      .single();

    const proSince = profile?.pro_since || abo.created_at;
    const moisPro = Math.floor((Date.now() - new Date(proSince).getTime()) / (30 * 86400000));

    if (moisPro < 2) {
      return res.status(403).json({
        error: 'Tu dois être Pro depuis au moins 2 mois pour candidater',
        mois_pro: moisPro,
      });
    }

    // Upsert candidature (1 par mois par user)
    const { data: existing } = await supabase
      .from('wolo_awards')
      .select('id')
      .eq('user_id', user_id)
      .eq('mois', moisCourant)
      .maybeSingle();

    const paysCandidat = pays || profile?.pays || 'TG';

    if (existing) {
      // Mise à jour vidéo (resoumission)
      await supabase
        .from('wolo_awards')
        .update({ video_url, pays: paysCandidat, video_validee: false })
        .eq('id', existing.id);

      return res.status(200).json({
        ok: true,
        message: 'Vidéo mise à jour · En attente de validation',
        candidature_id: existing.id,
      });
    }

    // Nouvelle candidature
    const { data: nouvelle, error } = await supabase
      .from('wolo_awards')
      .insert({
        user_id,
        mois: moisCourant,
        pays: paysCandidat,
        video_url,
        video_validee: false, // L'admin valide manuellement
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ok: true,
      message: 'Candidature soumise · En attente de validation par l\'équipe WOLO',
      candidature_id: nouvelle.id,
    });
  } catch (err) {
    console.error('[awards-candidater]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
