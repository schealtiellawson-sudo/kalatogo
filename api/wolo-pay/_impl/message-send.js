// POST /api/wolo-pay/message-send
// Body: { thread_id?, candidature_airtable_id?, content, template?, ...meta }
// Si thread_id absent, crée le thread à partir de candidature_airtable_id + meta.
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const {
    thread_id,
    candidature_airtable_id,
    offre_airtable_id,
    candidat_user_id,
    recruteur_user_id,
    candidat_nom,
    recruteur_nom,
    offre_titre,
    content,
    template,
  } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content requis' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ error: 'content trop long (max 5000)' });
  }

  let tid = thread_id;

  // Auto-create thread si absent
  if (!tid) {
    if (!candidature_airtable_id) return res.status(400).json({ error: 'thread_id ou candidature_airtable_id requis' });
    const { data: existing } = await supabase
      .from('wolo_threads')
      .select('id, candidat_user_id, recruteur_user_id')
      .eq('candidature_airtable_id', candidature_airtable_id)
      .maybeSingle();

    if (existing) {
      if (existing.candidat_user_id !== userId && existing.recruteur_user_id !== userId) {
        return res.status(403).json({ error: 'Pas autorisé sur ce thread' });
      }
      tid = existing.id;
    } else {
      if (!candidat_user_id || !recruteur_user_id) {
        return res.status(400).json({ error: 'candidat_user_id et recruteur_user_id requis pour créer le thread' });
      }
      if (userId !== candidat_user_id && userId !== recruteur_user_id) {
        return res.status(403).json({ error: 'Tu n\'es pas partie du fil' });
      }
      const { data: created, error: errC } = await supabase
        .from('wolo_threads')
        .insert({
          candidature_airtable_id,
          offre_airtable_id,
          candidat_user_id,
          recruteur_user_id,
          candidat_nom,
          recruteur_nom,
          offre_titre,
        })
        .select('id')
        .single();
      if (errC) return res.status(500).json({ error: errC.message });
      tid = created.id;
    }
  } else {
    // Vérifier participation
    const { data: t } = await supabase
      .from('wolo_threads')
      .select('candidat_user_id, recruteur_user_id')
      .eq('id', tid)
      .maybeSingle();
    if (!t) return res.status(404).json({ error: 'Thread introuvable' });
    if (t.candidat_user_id !== userId && t.recruteur_user_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
  }

  // Déterminer le rôle de l'envoyeur
  const { data: th } = await supabase
    .from('wolo_threads')
    .select('candidat_user_id, recruteur_user_id')
    .eq('id', tid)
    .single();
  const sender_role = th.candidat_user_id === userId ? 'candidat' : 'recruteur';

  const { data: msg, error } = await supabase
    .from('wolo_messages')
    .insert({
      thread_id: tid,
      sender_user_id: userId,
      sender_role,
      content: content.trim(),
      template: template || null,
    })
    .select('id, sender_user_id, sender_role, content, template, created_at, read_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, thread_id: tid, message: msg });
}
