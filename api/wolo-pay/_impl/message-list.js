// GET /api/wolo-pay/message-list?thread_id=...
// Retourne les messages d'un fil + reset le compteur unread du lecteur.
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  const { thread_id } = req.query;
  if (!thread_id) return res.status(400).json({ error: 'thread_id requis' });

  // Vérifier que l'user fait partie du thread
  const { data: thread } = await supabase
    .from('wolo_threads')
    .select('id, candidat_user_id, recruteur_user_id')
    .eq('id', thread_id)
    .maybeSingle();

  if (!thread) return res.status(404).json({ error: 'Thread introuvable' });
  if (thread.candidat_user_id !== userId && thread.recruteur_user_id !== userId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { data: messages, error } = await supabase
    .from('wolo_messages')
    .select('id, sender_user_id, sender_role, content, template, read_at, created_at')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  // Reset unread du lecteur + marquer messages reçus comme lus
  const isRecruteur = thread.recruteur_user_id === userId;
  const resetField = isRecruteur ? 'unread_recruteur' : 'unread_candidat';
  await supabase.from('wolo_threads').update({ [resetField]: 0 }).eq('id', thread_id);
  await supabase
    .from('wolo_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', thread_id)
    .neq('sender_user_id', userId)
    .is('read_at', null);

  return res.status(200).json({ ok: true, messages: messages || [] });
}
