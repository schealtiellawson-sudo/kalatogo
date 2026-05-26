// ================================================================
// PII Anonymization — scrub names/phones/emails before IA providers
// ON par défaut (décision produit 2026-04-23). Mapping inverse pour
// restauration côté serveur avant retour au client si nécessaire.
// ================================================================

const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\d{2,4}([\s.-]?\d{2,4}){2,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Noms propres : suite de 2+ mots capitalisés (heuristique simple, imparfait mais suffisant)
const NAME_RE = /\b[A-ZÀ-Ý][a-zà-ÿ]{2,}(?:\s+[A-ZÀ-Ý][a-zà-ÿ]{2,}){1,3}\b/g;

/**
 * Anonymise un texte en remplaçant PII par des placeholders.
 * Retourne { text, map } où map permet de restaurer l'original.
 * @param {string} input
 * @param {object} options
 * @param {string[]} options.whitelist - mots à ne jamais masquer (ex: métiers)
 * @returns {{ text: string, map: Record<string,string> }}
 */
export function anonymize(input, { whitelist = [] } = {}) {
  if (!input || typeof input !== 'string') return { text: input, map: {} };

  const map = {};
  let counter = 0;
  const nextToken = (prefix) => {
    counter++;
    return `[${prefix}_${counter}]`;
  };

  let out = input;

  out = out.replace(EMAIL_RE, (m) => {
    const t = nextToken('EMAIL');
    map[t] = m;
    return t;
  });

  out = out.replace(PHONE_RE, (m) => {
    if (m.replace(/\D/g, '').length < 7) return m;
    const t = nextToken('PHONE');
    map[t] = m;
    return t;
  });

  out = out.replace(NAME_RE, (m) => {
    if (whitelist.some(w => m.toLowerCase().includes(w.toLowerCase()))) return m;
    const t = nextToken('NAME');
    map[t] = m;
    return t;
  });

  return { text: out, map };
}

/**
 * Restaure les PII dans un texte anonymisé à partir du mapping.
 */
export function deanonymize(text, map) {
  if (!text || !map) return text;
  let out = text;
  for (const [token, original] of Object.entries(map)) {
    out = out.split(token).join(original);
  }
  return out;
}
