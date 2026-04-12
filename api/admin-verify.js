// ================================================================
// Vérification admin — remplace le secret hardcodé dans le frontend
// POST /api/admin-verify { token: "supabase_jwt" }
// Vérifie que l'utilisateur connecté est dans la liste ADMIN_EMAILS
// ================================================================
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (ADMIN_EMAILS.length === 0) {
    console.error('[admin-verify] ADMIN_EMAILS env var non configuré');
    return res.status(500).json({ error: 'Configuration admin manquante' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const token = body?.token;

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Token requis' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Token invalide' });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'Accès refusé' });
    }

    return res.status(200).json({ ok: true, email: user.email });
  } catch (err) {
    console.error('[admin-verify]', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}
