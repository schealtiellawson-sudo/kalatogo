// ================================================================
// WOLO Awards — Voter pour un candidat
// POST /api/wolo-pay/awards-vote
// Body: { votant_id, candidat_id }
// Un votant = un seul vote par mois (tous pays confondus)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { votant_id, candidat_id } = req.body || {};
  if (!votant_id || !candidat_id) {
    return res.status(400).json({ error: 'votant_id et candidat_id requis' });
  }

  try {
    const moisCourant = new Date().toISOString().slice(0, 7);

    // Vérifier que le candidat existe et est validé
    const { data: candidat } = await supabase
      .from('wolo_awards')
      .select('id, user_id, mois, video_validee')
      .eq('id', candidat_id)
      .single();

    if (!candidat) return res.status(404).json({ error: 'Candidat introuvable' });
    if (!candidat.video_validee) return res.status(400).json({ error: 'Vidéo pas encore validée' });
    if (candidat.mois !== moisCourant) return res.status(400).json({ error: 'Ce candidat n\'est pas dans le mois en cours' });

    // On ne peut pas voter pour soi-même
    if (candidat.user_id === votant_id) {
      return res.status(400).json({ error: 'Tu ne peux pas voter pour toi-même' });
    }

    // Insérer le vote (UNIQUE constraint empêche le doublon)
    const { error: insertErr } = await supabase
      .from('votes_awards')
      .insert({
        votant_id,
        candidat_id,
        mois: moisCourant,
      });

    if (insertErr) {
      if (insertErr.code === '23505') { // unique violation
        return res.status(409).json({ error: 'Tu as déjà voté ce mois', deja_vote: true });
      }
      throw insertErr;
    }

    // Incrémenter nb_votes sur le candidat
    await supabase
      .from('wolo_awards')
      .update({ nb_votes: (candidat.nb_votes || 0) + 1 })
      .eq('id', candidat_id);

    // Recompter pour être précis
    const { count } = await supabase
      .from('votes_awards')
      .select('id', { count: 'exact', head: true })
      .eq('candidat_id', candidat_id)
      .eq('mois', moisCourant);

    if (count !== null) {
      await supabase
        .from('wolo_awards')
        .update({ nb_votes: count })
        .eq('id', candidat_id);
    }

    return res.status(200).json({
      ok: true,
      message: 'Vote enregistré',
      candidat_id,
      nb_votes: count || (candidat.nb_votes || 0) + 1,
    });
  } catch (err) {
    console.error('[awards-vote]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
