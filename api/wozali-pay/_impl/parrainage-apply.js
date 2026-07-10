// POST /api/wozali-pay/parrainage-apply  { user_id, code }
// Lie un filleul à un parrain via son code WOZALI-XXXXXX
import { supabase } from '../../_lib/supabase.js';
import { syncToAirtable } from '../../_lib/airtable-sync.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { code } = body;
    // Filleul dérivé du token vérifié, jamais du body (empêche de lier un tiers à un code)
    const user_id = req.authenticatedUser?.user_id;
    if (!user_id || !code) return res.status(400).json({ error: 'code requis' });

    const codeNorm = String(code).trim().toUpperCase();

    // 1) Parrain existe ?
    const { data: parrain } = await supabase
      .from('wozali_prestataires')
      .select('user_id, email, code_parrainage')
      .eq('code_parrainage', codeNorm)
      .maybeSingle();

    if (!parrain) return res.status(404).json({ error: 'Code de parrainage invalide' });
    if (parrain.user_id === user_id) return res.status(400).json({ error: 'Tu ne peux pas te parrainer toi-même' });

    // 2) Filleul n'a pas déjà un parrain ?
    const { data: existing } = await supabase
      .from('parrainages')
      .select('id')
      .eq('filleul_id', user_id)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Tu as déjà un parrain' });

    // 3) Créer le parrainage (taux par défaut 0.40 via migration Sprint 6)
    const { data: parrainage, error } = await supabase
      .from('parrainages')
      .insert({
        parrain_id: parrain.user_id,
        filleul_id: user_id,
        code_parrainage: codeNorm,
        taux_commission: 0.40,
        statut: 'actif'
      })
      .select()
      .single();
    if (error) throw error;

    // 4) Sync Airtable (backup)
    syncToAirtable('Parrainages', {
      'Parrain Email': parrain.email || '',
      'Filleul ID': user_id,
      'Code': codeNorm,
      'Date': new Date().toISOString(),
      'Statut': 'actif'
    });

    return res.status(200).json({
      ok: true,
      parrain_nom: parrain.email || 'Parrain',
      commission: 1000,
      parrainage
    });
  } catch (err) {
    console.error('[parrainage-apply]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
