// ================================================================
// Helpers partagés pour les endpoints "widgets métier".
// Factorise la logique CRUD répétée à travers les composants.
// ================================================================
import { supabase } from './supabase.js';

/**
 * Sanitize un body en ne gardant que les clés autorisées.
 */
export function pick(obj, keys) {
  if (!obj) return {};
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

/**
 * GET-list générique : renvoie tous les enregistrements d'une table
 * pour un pro donné, triés par created_at desc.
 *
 * @param {string} table  Nom Supabase
 * @param {string} proCol Colonne FK vers le pro (ex: 'pro_user_id')
 * @param {object} req    Vercel/Next req
 * @param {object} res    Vercel/Next res
 * @param {object} opts   { extraFilter?: (query) => query, orderBy?: string }
 */
export async function listByPro(table, proCol, req, res, opts = {}) {
  const proUserId = req.query?.pro_user_id || req.body?.pro_user_id;
  if (!proUserId) return res.status(400).json({ error: 'pro_user_id requis' });
  let q = supabase.from(table).select('*').eq(proCol, proUserId);
  if (opts.extraFilter) q = opts.extraFilter(q);
  q = q.order(opts.orderBy || 'created_at', { ascending: false }).limit(500);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return data || [];
}

/**
 * Insert + return single record. Vérifie que le pro authentifié == pro_user_id.
 */
export async function insertSelf(table, proCol, userId, payload, res) {
  if (!userId) { res.status(401).json({ error: 'Auth requis' }); return null; }
  const row = { ...payload, [proCol]: userId };
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) { res.status(500).json({ error: error.message }); return null; }
  return data;
}

/**
 * Insert public (le pro n'est pas l'utilisateur courant — c'est un client
 * qui dépose une demande). Le pro_user_id est dans le payload.
 */
export async function insertPublic(table, payload, res) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) { res.status(500).json({ error: error.message }); return null; }
  return data;
}

/**
 * Update record en vérifiant que l'utilisateur courant est bien le pro
 * propriétaire (proCol = userId).
 */
export async function updateOwned(table, proCol, id, userId, patch, res) {
  if (!userId) { res.status(401).json({ error: 'Auth requis' }); return null; }
  const { data: existing, error: e1 } = await supabase
    .from(table).select(proCol).eq('id', id).maybeSingle();
  if (e1) { res.status(500).json({ error: e1.message }); return null; }
  if (!existing) { res.status(404).json({ error: 'Introuvable' }); return null; }
  if (existing[proCol] !== userId) { res.status(403).json({ error: 'Pas autorisé' }); return null; }
  const { data, error } = await supabase
    .from(table).update(patch).eq('id', id).select().single();
  if (error) { res.status(500).json({ error: error.message }); return null; }
  return data;
}

export async function deleteOwned(table, proCol, id, userId, res) {
  if (!userId) { res.status(401).json({ error: 'Auth requis' }); return false; }
  const { data: existing } = await supabase
    .from(table).select(proCol).eq('id', id).maybeSingle();
  if (!existing) { res.status(404).json({ error: 'Introuvable' }); return false; }
  if (existing[proCol] !== userId) { res.status(403).json({ error: 'Pas autorisé' }); return false; }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { res.status(500).json({ error: error.message }); return false; }
  return true;
}
