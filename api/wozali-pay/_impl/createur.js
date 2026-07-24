// ================================================================
// Programme Créateur WOZALI — paliers, badges, classement, kill switch
// POST /api/wozali-pay/createur   { action, ... }
//   Membre (auth) :
//     'status'         → paliers réels du membre (recalcul de son propre compte)
//     'leaderboard'    → classement du mois de sa ville (ou p_ville)
//     'accept-charte'  → accepte la charte Créateur
//   Admin (ADMIN_EMAILS) :
//     'admin-list'     → liste des Créateurs (kill switch)
//     'admin-suspend'  → suspend/réactive un Créateur
//     'admin-program'  → interrupteur global du programme
//     'recompute'      → recalcul global (aussi appelable par cron via CRON_SECRET)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const PALIERS = [
  { seuil: 50, niveau: 'or' },
  { seuil: 25, niveau: 'createur' },
  { seuil: 3,  niveau: 'outils' },
];
const PAYS_OK = ['Togo', 'TG', 'Bénin', 'Benin', 'BJ'];

function niveauPour(proActifs, suspendu) {
  if (suspendu) return 'none';
  for (const p of PALIERS) if (proActifs >= p.seuil) return p.niveau;
  return 'none';
}

async function programmeActif() {
  const { data } = await supabase.from('wozali_flags').select('actif').eq('nom', 'createur_programme').maybeSingle();
  return !data || data.actif !== false; // par défaut actif
}

async function getMoi(userId) {
  const { data } = await supabase.from('wozali_prestataires')
    .select('id, nom_complet, ville, code_parrainage, createur_suspendu, createur_charte_ok')
    .eq('user_id', userId).maybeSingle();
  return data || null;
}

// Recalcule les compteurs d'UN créateur (lecture immédiate, sans attendre le cron)
async function recomputeMoi(moi) {
  if (!moi || !moi.code_parrainage) return { pro_actifs: 0, pro_mois: 0, niveau: 'none' };
  const since60 = new Date(Date.now() - 60 * 864e5).toISOString();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { data: filleuls } = await supabase.from('wozali_prestataires')
    .select('abonnement, derniere_connexion, pays, created_at')
    .eq('parrain_code', moi.code_parrainage);
  let proActifs = 0, proMois = 0;
  for (const f of (filleuls || [])) {
    const isPro = (f.abonnement || 'Base') !== 'Base';
    const actif = f.derniere_connexion && f.derniere_connexion >= since60;
    const paysOk = PAYS_OK.includes(f.pays);
    if (isPro && actif && paysOk) {
      proActifs++;
      if (f.created_at && f.created_at >= monthStart) proMois++;
    }
  }
  const niveau = niveauPour(proActifs, moi.createur_suspendu);
  await supabase.from('wozali_prestataires').update({
    createur_pro_actifs: proActifs, createur_pro_mois: proMois,
    createur_niveau: niveau, createur_maj: new Date().toISOString(),
  }).eq('id', moi.id);
  return { pro_actifs: proActifs, pro_mois: proMois, niveau };
}

async function requireAdmin(req) {
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const email = (req.authenticatedUser && req.authenticatedUser.email || '').toLowerCase();
  return emails.length > 0 && emails.includes(email);
}

export default async function createur(req, res) {
  const body = req.body || {};
  const action = body.action || 'status';

  try {
    // ── CRON : recalcul global sans auth via CRON_SECRET ──
    if (action === 'recompute') {
      const secret = req.headers['x-cron-secret'] || body.cron_secret;
      const isAdmin = await requireAdmin(req);
      if (!isAdmin && (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)) {
        return res.status(403).json({ ok: false, error: 'Accès refusé' });
      }
      const { error } = await supabase.rpc('wz_createur_recompute');
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    const user = req.authenticatedUser;
    if (!user) return res.status(401).json({ ok: false, error: 'Connexion requise' });

    // ── Actions admin (kill switch) ──
    if (action.startsWith('admin-')) {
      if (!(await requireAdmin(req))) return res.status(403).json({ ok: false, error: 'Accès refusé' });

      if (action === 'admin-program') {
        const actif = body.actif !== false;
        await supabase.from('wozali_flags').upsert({ nom: 'createur_programme', actif, maj: new Date().toISOString() }, { onConflict: 'nom' });
        return res.status(200).json({ ok: true, actif });
      }
      if (action === 'admin-suspend') {
        const targetId = body.id;
        const suspendu = body.suspendu === true;
        if (!targetId) return res.status(400).json({ ok: false, error: 'id manquant' });
        await supabase.from('wozali_prestataires').update({ createur_suspendu: suspendu }).eq('id', targetId);
        // recalcul du niveau de la cible
        const { data: t } = await supabase.from('wozali_prestataires')
          .select('id, code_parrainage, createur_suspendu, createur_pro_actifs').eq('id', targetId).maybeSingle();
        if (t) {
          await supabase.from('wozali_prestataires').update({
            createur_niveau: niveauPour(t.createur_pro_actifs || 0, t.createur_suspendu),
            createur_maj: new Date().toISOString(),
          }).eq('id', targetId);
        }
        return res.status(200).json({ ok: true, id: targetId, suspendu });
      }
      if (action === 'admin-list') {
        const { data } = await supabase.from('wozali_prestataires')
          .select('id, nom_complet, ville, pays, createur_niveau, createur_pro_actifs, createur_pro_mois, createur_suspendu')
          .gte('createur_pro_actifs', 3)
          .order('createur_pro_actifs', { ascending: false }).limit(200);
        const actif = await programmeActif();
        return res.status(200).json({ ok: true, programme_actif: actif, createurs: data || [] });
      }
      return res.status(400).json({ ok: false, error: 'Action admin inconnue' });
    }

    const moi = await getMoi(user.id);
    if (!moi) return res.status(404).json({ ok: false, error: 'Profil introuvable' });
    const progActif = await programmeActif();

    if (action === 'accept-charte') {
      await supabase.from('wozali_prestataires').update({
        createur_charte_ok: true, createur_charte_at: new Date().toISOString(),
      }).eq('id', moi.id);
      return res.status(200).json({ ok: true });
    }

    if (action === 'leaderboard') {
      const ville = body.ville || moi.ville || '';
      if (!ville) return res.status(200).json({ ok: true, ville: '', classement: [] });
      const { data, error } = await supabase.rpc('wz_createur_leaderboard', { p_ville: ville });
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, ville, moi_id: moi.id, classement: data || [] });
    }

    // action 'status' (défaut)
    const counts = await recomputeMoi(moi);
    return res.status(200).json({
      ok: true,
      programme_actif: progActif,
      suspendu: !!moi.createur_suspendu,
      charte_ok: !!moi.createur_charte_ok,
      niveau: moi.createur_suspendu ? 'none' : counts.niveau,
      pro_actifs: counts.pro_actifs,
      pro_mois: counts.pro_mois,
      ville: moi.ville || '',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Erreur serveur' });
  }
}
