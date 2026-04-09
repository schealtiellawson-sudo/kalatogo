// ================================================================
// WOLO Pay — Contacts favoris CRUD
// GET    /api/wolo-pay/contacts?user_id=xxx
// POST   /api/wolo-pay/contacts { user_id, contact_user_id, surnom }
// PATCH  /api/wolo-pay/contacts { id, surnom }
// DELETE /api/wolo-pay/contacts?id=xxx
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id requis' });
      const { data } = await supabase
        .from('wolo_contacts_favoris')
        .select('*, contact:contact_user_id(id, email)')
        .eq('user_id', user_id)
        .order('derniere_transaction', { ascending: false, nullsFirst: false })
        .order('ordre_affichage', { ascending: true });
      return res.status(200).json({ ok: true, contacts: data || [] });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'POST') {
      const { user_id, contact_user_id, surnom } = body;
      if (!user_id || !contact_user_id || !surnom) {
        return res.status(400).json({ error: 'user_id + contact_user_id + surnom requis' });
      }
      if (surnom.length > 12) return res.status(400).json({ error: 'Surnom max 12 caractères' });
      const { data, error } = await supabase
        .from('wolo_contacts_favoris')
        .upsert({ user_id, contact_user_id, surnom }, { onConflict: 'user_id,contact_user_id' })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, contact: data });
    }

    if (req.method === 'PATCH') {
      const { id, surnom } = body;
      if (!id || !surnom) return res.status(400).json({ error: 'id + surnom requis' });
      if (surnom.length > 12) return res.status(400).json({ error: 'Surnom max 12 caractères' });
      const { error } = await supabase
        .from('wolo_contacts_favoris')
        .update({ surnom })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id requis' });
      const { error } = await supabase.from('wolo_contacts_favoris').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[contacts]', err);
    return res.status(500).json({ error: err.message });
  }
}
