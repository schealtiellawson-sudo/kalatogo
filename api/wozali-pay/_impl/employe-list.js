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

  const { statut, role } = req.query;
  const asEmploye = role === 'employe';

  let q = supa
    .from('wozali_employes')
    .select('*')
    .order('date_embauche', { ascending: false });

  // Mode dual : côté employé, on liste MES contrats ; côté patron, MON équipe
  q = asEmploye ? q.eq('employe_user_id', user.id) : q.eq('recruteur_user_id', user.id);
  if (statut && statut !== 'all') q = q.eq('statut', statut);

  const { data, error } = await q;
  if (error) {
    console.error('[employe-list]', error);
    return res.status(500).json({ error: error.message });
  }
  let employes = data || [];

  // Profil frais : si l'employé a un compte, photo/nom d'affichage/slug à jour
  const userIds = [...new Set(employes.map(e => e.employe_user_id).filter(Boolean))];
  if (userIds.length) {
    const { data: prof } = await supa.from('wozali_prestataires')
      .select('user_id, photo_profil, nom_complet, slug').in('user_id', userIds);
    const byUid = Object.fromEntries((prof || []).map(p => [p.user_id, p]));
    employes = employes.map(e => {
      const p = e.employe_user_id && byUid[e.employe_user_id];
      return p ? { ...e, employe_photo: p.photo_profil || e.employe_photo, employe_profil_slug: p.slug || null, a_compte: true } : { ...e, a_compte: !!e.employe_user_id };
    });
  }

  // Compteurs non-lus de messagerie équipe (mon côté)
  const empIds = employes.map(e => e.id);
  if (empIds.length) {
    const { data: threads } = await supa.from('wozali_equipe_threads')
      .select('employe_id, unread_recruteur, unread_employe').in('employe_id', empIds);
    const byEmp = Object.fromEntries((threads || []).map(t => [t.employe_id, t]));
    employes = employes.map(e => {
      const t = byEmp[e.id];
      return { ...e, unread_messages: t ? (asEmploye ? t.unread_employe : t.unread_recruteur) : 0 };
    });
  }

  return res.status(200).json({ ok: true, employes });
}
