// ================================================================
// Airtable backup sync — duplication Supabase → Airtable
// Fire-and-forget : n'échoue jamais le flux principal
// ================================================================
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

async function airtableRequest(method, table, body) {
  if (!AIRTABLE_KEY) return null;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Airtable ${method} ${table} → ${res.status}`);
  return res.json();
}

/**
 * Créer un record Airtable en backup (fire-and-forget)
 * @param {string} table - nom table Airtable (ex: "Paiements Abonnements")
 * @param {object} fields - champs à copier
 */
export function syncToAirtable(table, fields) {
  // Fire-and-forget — ne bloque pas l'appelant
  airtableRequest('POST', table, { fields, typecast: true })
    .catch(err => console.error(`[airtable-sync] ${table}:`, err.message));
}

/**
 * Update record par ID Airtable
 */
export function updateAirtable(table, recordId, fields) {
  airtableRequest('PATCH', `${table}/${recordId}`, { fields, typecast: true })
    .catch(err => console.error(`[airtable-sync] update ${table}:`, err.message));
}
