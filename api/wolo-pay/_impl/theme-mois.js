// ================================================================
// Mur des Reines — Thème du mois courant
// GET /api/wolo-pay/theme-mois?mois=YYYY-MM
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const mois = req.query.mois || new Date().toISOString().slice(0, 7);

  try {
    const { data: theme } = await supabase
      .from('themes_mensuels')
      .select('*')
      .eq('mois', mois)
      .maybeSingle();

    // Fallback si pas de thème configuré
    const fallback = {
      mois,
      theme_coiffure: 'Ta plus belle coiffure du mois',
      theme_couture: 'Ta plus belle tenue du mois',
      hashtag: '#MurDesReines',
      description: null,
      partenaire_marque: null,
    };

    // Countdown fin du mois
    const now = new Date();
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const joursRestants = Math.ceil((finMois - now) / 86400000);

    return res.status(200).json({
      ok: true,
      theme: theme || fallback,
      countdown: {
        fin_mois: finMois.toISOString(),
        jours_restants: joursRestants,
      },
    });
  } catch (err) {
    console.error('[theme-mois]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
