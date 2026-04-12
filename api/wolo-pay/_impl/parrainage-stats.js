// GET /api/wolo-pay/parrainage-stats?user_id=...
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('code_parrainage')
      .eq('id', user_id)
      .single();

    // Filleuls actifs (parrainages où je suis parrain)
    const { data: filleuls = [] } = await supabase
      .from('parrainages')
      .select('id, filleul_id, created_at, statut')
      .eq('parrain_id', user_id);

    // Commissions
    const { data: commissions = [] } = await supabase
      .from('commissions_parrainage')
      .select('id, montant, filleul_id, created_at')
      .eq('parrain_id', user_id)
      .order('created_at', { ascending: false });

    // Enrichissement nom filleul
    const filleulIds = [...new Set(commissions.map(c => c.filleul_id))];
    let nomsById = {};
    if (filleulIds.length) {
      const { data: profs = [] } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', filleulIds);
      nomsById = Object.fromEntries(profs.map(p => [p.id, p.email]));
    }

    const total = commissions.reduce((s, c) => s + (c.montant || 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const moisMs = monthStart.getTime();
    const ceMois = commissions
      .filter(c => new Date(c.created_at).getTime() >= moisMs)
      .reduce((s, c) => s + (c.montant || 0), 0);

    return res.status(200).json({
      ok: true,
      code_parrainage: profile?.code_parrainage || null,
      filleuls_count: filleuls.length,
      filleuls_actifs: filleuls.filter(f => f.statut === 'actif').length,
      total_commissions: total,
      ce_mois: ceMois,
      historique: commissions.slice(0, 50).map(c => ({
        id: c.id,
        montant: c.montant,
        date: c.created_at,
        filleul: nomsById[c.filleul_id] || '—'
      }))
    });
  } catch (err) {
    console.error('[parrainage-stats]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
