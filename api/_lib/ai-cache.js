// ================================================================
// AI Cache + Quota — backed by Supabase (budget zéro, pas de Vercel KV)
// Tables : ai_cache, ai_quota_log (voir migration 20260424_ai_infrastructure.sql)
// ================================================================
import { supabase } from './supabase.js';
import crypto from 'node:crypto';

const TTL_DEFAULT_SEC = 86400 * 7; // 7 jours

export function hashKey(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 32);
}

export async function cacheGet(key) {
  const { data } = await supabase
    .from('ai_cache')
    .select('value, expires_at')
    .eq('key', key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.value;
}

export async function cacheSet(key, value, ttlSec = TTL_DEFAULT_SEC) {
  const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
  await supabase
    .from('ai_cache')
    .upsert({ key, value, expires_at }, { onConflict: 'key' });
}

// Rate limits par plan — décision produit 2026-04-23
const PLAN_LIMITS = {
  gratuit: { day: 10, month: 100 },
  pro: { day: 50, month: 500 },
};

export async function checkRateLimit(userId, plan = 'gratuit') {
  if (!userId) return { ok: false, reason: 'no_user' };
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.gratuit;
  const since = new Date(Date.now() - 86400 * 1000).toISOString();

  const { count } = await supabase
    .from('ai_quota_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('cache_hit', false)
    .gte('created_at', since);

  const used = count || 0;
  if (used >= limits.day) {
    return { ok: false, reason: 'daily_quota_exceeded', used, limit: limits.day };
  }
  return { ok: true, used, limit: limits.day };
}

export async function logUsage({ userId, provider, taskType, tokens, cacheHit }) {
  try {
    await supabase.from('ai_quota_log').insert({
      user_id: userId || null,
      provider: provider || 'cache',
      task_type: taskType,
      tokens_used: tokens || 0,
      cache_hit: !!cacheHit,
    });
  } catch (e) {
    // non-bloquant
  }
}
