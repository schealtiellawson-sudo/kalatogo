// ================================================================
// POST /api/wolo-pay/ai-query
// Body: { task: "score-candidat" | "kyc-employeur" | ..., input: <string>, plan?: "gratuit"|"pro" }
// Returns: { ok, result, provider, cached, quota }
// ================================================================
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';
import { anonymize, deanonymize } from '../../_lib/ai-anonymize.js';
import { cacheGet, cacheSet, checkRateLimit, logUsage, hashKey } from '../../_lib/ai-cache.js';
import { TASKS } from '../../_lib/ai-prompts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { task, input, plan = 'gratuit' } = req.body || {};
  const userId = req.authenticatedUser?.user_id || null;

  if (!task || !TASKS[task]) {
    return res.status(400).json({ error: 'Tâche inconnue', valid: Object.keys(TASKS) });
  }
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'input (string) requis' });
  }

  const spec = TASKS[task];

  // 1. Rate limit par plan
  const rl = await checkRateLimit(userId, plan);
  if (!rl.ok) {
    return res.status(429).json({
      error: 'Quota IA atteint',
      reason: rl.reason,
      used: rl.used,
      limit: rl.limit,
      plan,
    });
  }

  // 2. Anonymisation si activée pour la tâche
  let prompt = input;
  let anonMap = {};
  if (spec.anonymize) {
    const a = anonymize(input);
    prompt = a.text;
    anonMap = a.map;
  }

  // 3. Cache lookup
  const cacheKey = hashKey({ task, prompt });
  if (spec.ttlSec > 0) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      await logUsage({ userId, provider: 'cache', taskType: task, tokens: 0, cacheHit: true });
      return res.status(200).json({
        ok: true,
        result: spec.anonymize ? deanonymizeResult(cached, anonMap) : cached,
        provider: 'cache',
        cached: true,
        quota: { used: rl.used, limit: rl.limit },
      });
    }
  }

  // 4. Provider cascade
  const available = availableProviders();
  if (available.length === 0) {
    return res.status(503).json({
      error: 'Aucun provider IA configuré',
      hint: 'Définir au moins une variable : GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY',
    });
  }

  const order = spec.preferProviders.filter(p => available.includes(p));
  const errors = [];
  let response = null;

  for (const name of order) {
    try {
      const fn = PROVIDERS[name].fn;
      response = await fn({
        system: spec.system,
        user: prompt,
        jsonMode: spec.jsonMode,
        maxTokens: spec.maxTokens,
      });
      break;
    } catch (e) {
      errors.push({ provider: name, message: e.message, status: e.status });
      if (!e.retryable && e.status !== 401 && e.status !== 403) {
        // erreur non-retriable qui n'est pas auth : on passe au suivant
      }
    }
  }

  if (!response) {
    return res.status(502).json({
      error: 'Tous les providers IA ont échoué',
      attempts: errors,
    });
  }

  // 5. Parse JSON si jsonMode
  let parsed = response.text;
  if (spec.jsonMode) {
    try {
      parsed = JSON.parse(response.text);
    } catch (e) {
      // Fallback : extraire le premier bloc JSON trouvé
      const m = response.text.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }
  }

  // 6. Cache write
  if (spec.ttlSec > 0) {
    await cacheSet(cacheKey, parsed, spec.ttlSec);
  }

  // 7. Log usage
  await logUsage({
    userId,
    provider: response.provider,
    taskType: task,
    tokens: response.tokens,
    cacheHit: false,
  });

  return res.status(200).json({
    ok: true,
    result: spec.anonymize ? deanonymizeResult(parsed, anonMap) : parsed,
    provider: response.provider,
    cached: false,
    quota: { used: rl.used + 1, limit: rl.limit },
  });
}

function deanonymizeResult(result, map) {
  if (!map || Object.keys(map).length === 0) return result;
  if (typeof result === 'string') return deanonymize(result, map);
  if (Array.isArray(result)) return result.map(r => deanonymizeResult(r, map));
  if (result && typeof result === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(result)) out[k] = deanonymizeResult(v, map);
    return out;
  }
  return result;
}
