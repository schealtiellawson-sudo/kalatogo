// ================================================================
// employe-list — Liste les employés du recruteur connecté
// GET /api/wozali-pay/employe-list  (auth requise)
// Query : ?statut=actif|fin_contrat|suspendu|all
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const { statut } = req.query;

  let q = supa
    .from('wozali_employes')
    .select('*')
    .eq('recruteur_user_id', user.id)
    .order('date_embauche', { ascending: false });

  if (statut && statut !== 'all') {
    q = q.eq('statut', statut);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[employe-list]', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, employes: data || [] });
}
