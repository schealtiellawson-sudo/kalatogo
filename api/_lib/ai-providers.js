// ================================================================
// AI Providers — wrappers Gemini Flash / Groq / Cerebras / Mistral
// Stack 100% gratuite, fallback cascade géré par ai-router.js
// ================================================================

const TIMEOUT_MS = 20000;

async function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ----------------------------------------------------------------
// Gemini 2.0 Flash — Google AI Studio (1 500 req/jour free)
// ----------------------------------------------------------------
export async function callGemini({ system, user, jsonMode = false, maxTokens = 1024 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, provider: 'gemini', tokens: json?.usageMetadata?.totalTokenCount || 0 };
}

// ----------------------------------------------------------------
// Groq — Llama 3.3 70B (14 400 req/jour free)
// ----------------------------------------------------------------
export async function callGroq({ system, user, jsonMode = false, maxTokens = 1024 }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || '';
  return { text, provider: 'groq', tokens: json?.usage?.total_tokens || 0 };
}

// ----------------------------------------------------------------
// Cerebras Inference — Llama 3.1 (1M tokens/jour free)
// ----------------------------------------------------------------
export async function callCerebras({ system, user, jsonMode = false, maxTokens = 1024 }) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('CEREBRAS_API_KEY missing');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const res = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Cerebras ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || '';
  return { text, provider: 'cerebras', tokens: json?.usage?.total_tokens || 0 };
}

// ----------------------------------------------------------------
// Mistral Small — api.mistral.ai (free tier 1 req/s, backup)
// ----------------------------------------------------------------
export async function callMistral({ system, user, jsonMode = false, maxTokens = 1024 }) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('MISTRAL_API_KEY missing');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const res = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Mistral ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || '';
  return { text, provider: 'mistral', tokens: json?.usage?.total_tokens || 0 };
}

// ----------------------------------------------------------------
// Provider registry + available detection
// ----------------------------------------------------------------
export const PROVIDERS = {
  gemini: { fn: callGemini, envKey: 'GEMINI_API_KEY', dailyLimit: 1500 },
  groq: { fn: callGroq, envKey: 'GROQ_API_KEY', dailyLimit: 14400 },
  cerebras: { fn: callCerebras, envKey: 'CEREBRAS_API_KEY', dailyLimit: 5000 },
  mistral: { fn: callMistral, envKey: 'MISTRAL_API_KEY', dailyLimit: 86400 },
};

export function availableProviders() {
  return Object.keys(PROVIDERS).filter(p => !!process.env[PROVIDERS[p].envKey]);
}
