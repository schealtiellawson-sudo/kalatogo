// ================================================================
// Proxy Airtable — DÉSACTIVÉ le 2026-07-10 (audit sécurité)
// ================================================================
// L'app est 100% Supabase : plus aucun flux client ne passe par ce proxy.
// L'ancien handler exposait un IDOR ouvert (GET public sur n'importe quelle
// table Airtable avec le PAT serveur, PATCH/DELETE sans vérif de propriété
// sur Offres/Candidatures/Posts…). On le neutralise complètement : 410 Gone.
// La rewrite /api/airtable-proxy/:path* a aussi été retirée de vercel.json.
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({ error: 'Endpoint désactivé (migration 100% Supabase).' });
}
