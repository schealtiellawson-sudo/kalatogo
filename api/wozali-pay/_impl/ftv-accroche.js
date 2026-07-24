// ================================================================
// FTV Accroche — Sandy génère l'accroche "Fais-toi voir" du membre
// POST /api/wozali-pay/ftv-accroche  { description, metier }  (auth requise)
// Réutilise le router IA gratuit (Groq/Gemini). Fallback géré côté frontend.
// ================================================================
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';

const SYSTEM = `Tu es Sandy, la coach de WOZALI. Un membre te décrit son activité. Écris UNE accroche courte, tournée côté client, qui donne envie de le contacter.
Règles strictes : commence idéalement par "Je". Parle de la solution ou du bénéfice pour le client, pas du métier brut. Concret et précis. Une seule phrase de 6 à 14 mots. Français simple. Zéro tiret cadratin. Jamais de montant, jamais d'emoji, jamais de guillemets. Ne renvoie QUE la phrase, rien d'autre.
Exemple : métier "Couturière", description "je fais la couture" donne "Je couds ta tenue de cérémonie en 5 jours, essayage inclus". Exemple : métier "Électricien", description "installation et dépannage" donne "Je répare tes pannes électriques le jour même, chez toi".`;

export default async function ftvAccroche(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: 'Body invalide' }); }

  const description = String(body.description || '').trim().slice(0, 500);
  const metier = String(body.metier || '').trim().slice(0, 80);
  if (!description && !metier) return res.status(400).json({ ok: false, error: 'description ou metier requis' });

  const available = availableProviders();
  if (!available.length) return res.status(503).json({ ok: false, error: 'IA indisponible' });
  const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
  const user = `Métier : ${metier || 'non précisé'}.\nDescription du membre : ${description || 'non précisée'}.`;

  let out = null;
  for (const name of order) {
    try {
      const r = await PROVIDERS[name].fn({ system: SYSTEM, user, jsonMode: false, maxTokens: 60 });
      if (r && r.text) { out = r.text; break; }
    } catch (e) { /* provider suivant */ }
  }
  if (!out) return res.status(503).json({ ok: false, error: 'Accroche indisponible' });

  // Nettoyage : une seule ligne, sans guillemets ni tiret cadratin, plafonnée.
  let accroche = String(out).split('\n')[0].trim()
    .replace(/^["«»'`]+|["«»'`]+$/g, '')
    .replace(/—/g, '-')
    .trim()
    .slice(0, 140);
  if (!accroche) return res.status(503).json({ ok: false, error: 'Accroche vide' });
  return res.status(200).json({ ok: true, accroche });
}
