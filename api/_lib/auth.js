// ================================================================
// Auth middleware — vérifie le JWT Supabase pour les endpoints WOLO Pay
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Extrait et vérifie le JWT Supabase depuis le header Authorization
 * @param {import('http').IncomingMessage} req
 * @returns {{ user_id: string, email: string } | null}
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    return { user_id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Middleware : retourne 401 si pas authentifié
 * Utilisation : const user = await requireAuth(req, res); if (!user) return;
 */
export async function requireAuth(req, res) {
  const user = await verifyAuth(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise' });
    return null;
  }
  return user;
}
