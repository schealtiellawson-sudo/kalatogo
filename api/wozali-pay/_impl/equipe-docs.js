// ================================================================
// equipe-docs — Documents joints par employé (bucket privé + signed URLs)
// POST /api/wozali-pay/equipe-docs  { op, ... }   (auth requise)
//   op 'create'  {employe_id, type_doc, titre, storage_path, mime_type, taille_octets, visible_employe}
//   op 'list'    {employe_id}                     (patron OU employé de la fiche)
//   op 'delete'  {doc_id}                         (patron uniquement)
// Upload direct client → Storage ; lecture via signed URLs serveur (10 min).
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { pushNotification } from '../../_lib/notifications.js';

const BUCKET = 'wozali-docs-equipe';
const MAX_DOCS = 15;

async function ficheFor(employeId) {
  const { data } = await supabase.from('wozali_employes')
    .select('id, recruteur_user_id, employe_user_id, employe_nom, recruteur_prestataire_id')
    .eq('id', employeId).maybeSingle();
  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const body = req.body || {};
  const op = body.op || 'list';

  try {
    if (op === 'list') {
      const fiche = await ficheFor(body.employe_id);
      if (!fiche) return res.status(404).json({ error: 'Fiche introuvable' });
      const isRecruteur = fiche.recruteur_user_id === user.id;
      const isEmploye   = fiche.employe_user_id === user.id;
      if (!isRecruteur && !isEmploye) return res.status(403).json({ error: 'Accès refusé' });

      let q = supabase.from('wozali_employe_docs').select('*')
        .eq('employe_id', body.employe_id).order('created_at', { ascending: false });
      if (!isRecruteur) q = q.eq('visible_employe', true); // l'employé ne voit que les docs partagés
      const { data: docs, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

      // Signed URLs (600s) pour chaque doc
      const out = [];
      for (const d of (docs || [])) {
        let url = null;
        try {
          const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(d.storage_path, 600);
          url = s?.signedUrl || null;
        } catch (e) {}
        out.push({ ...d, url });
      }
      return res.status(200).json({ ok: true, docs: out, is_recruteur: isRecruteur });
    }

    if (op === 'create') {
      const fiche = await ficheFor(body.employe_id);
      if (!fiche) return res.status(404).json({ error: 'Fiche introuvable' });
      if (fiche.recruteur_user_id !== user.id) return res.status(403).json({ error: 'Accès refusé' });
      if (!body.storage_path || !body.titre) return res.status(400).json({ error: 'Champs manquants' });
      // Le chemin doit être sous le préfixe du patron + la fiche (aligné avec la policy Storage)
      if (!String(body.storage_path).startsWith(`${user.id}/${body.employe_id}/`)) {
        return res.status(400).json({ error: 'Chemin de stockage invalide' });
      }
      // Quota
      const { count } = await supabase.from('wozali_employe_docs')
        .select('id', { count: 'exact', head: true }).eq('employe_id', body.employe_id);
      if ((count || 0) >= MAX_DOCS) return res.status(409).json({ error: `Limite de ${MAX_DOCS} documents atteinte` });

      const visible = body.visible_employe !== false;
      const { data, error } = await supabase.from('wozali_employe_docs').insert({
        employe_id: body.employe_id,
        uploader_user_id: user.id,
        type_doc: body.type_doc || 'autre',
        titre: String(body.titre).slice(0, 140),
        storage_path: body.storage_path,
        mime_type: body.mime_type || null,
        taille_octets: body.taille_octets ? parseInt(body.taille_octets) : null,
        visible_employe: visible,
      }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });

      // Notifier l'employé si le doc lui est visible et qu'il a un compte
      if (visible && fiche.employe_user_id) {
        pushNotification(fiche.employe_user_id, 'doc_equipe', {
          titre: 'Nouveau document partagé',
          message: `Ton employeur a ajouté "${data.titre}" dans ton espace.`,
          employe_id: body.employe_id,
        }, { push: true, pushTitle: 'WOZALI', pushBody: `Nouveau document : ${data.titre}` });
      }
      return res.status(201).json({ ok: true, doc: data });
    }

    if (op === 'delete') {
      const { data: doc } = await supabase.from('wozali_employe_docs')
        .select('id, storage_path, employe_id').eq('id', body.doc_id).maybeSingle();
      if (!doc) return res.status(404).json({ error: 'Document introuvable' });
      const fiche = await ficheFor(doc.employe_id);
      if (!fiche || fiche.recruteur_user_id !== user.id) return res.status(403).json({ error: 'Accès refusé' });
      try { await supabase.storage.from(BUCKET).remove([doc.storage_path]); } catch (e) {}
      const { error } = await supabase.from('wozali_employe_docs').delete().eq('id', body.doc_id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Opération inconnue' });
  } catch (e) {
    console.error('[equipe-docs]', e);
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
