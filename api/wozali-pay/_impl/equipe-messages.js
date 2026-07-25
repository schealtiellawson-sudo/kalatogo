// ================================================================
// equipe-messages — Messagerie interne équipe (patron <-> employé + annonces)
// POST /api/wozali-pay/equipe-messages  { op, ... }   (auth requise)
//   op 'threads'                 → mes fils (recruteur OU employé, mode dual)
//   op 'messages' {employe_id?|thread_id?} → messages d'un fil + marque lu
//   op 'send'     {employe_id, content}    → patron ou employé écrit
//   op 'broadcast'{content}                → patron diffuse à toute l'équipe active
// Flux 100% interne WOZALI, jamais de sortie WhatsApp.
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { pushNotification } from '../../_lib/notifications.js';

async function ficheFor(employeId) {
  const { data } = await supabase.from('wozali_employes')
    .select('id, recruteur_user_id, employe_user_id, employe_nom, statut, offre_titre')
    .eq('id', employeId).maybeSingle();
  return data || null;
}

// Récupère ou crée le fil d'une fiche (employé doit avoir un compte)
async function getOrCreateThread(fiche) {
  if (!fiche.employe_user_id) return null;
  const { data: existing } = await supabase.from('wozali_equipe_threads')
    .select('*').eq('employe_id', fiche.id).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from('wozali_equipe_threads').insert({
    employe_id: fiche.id,
    recruteur_user_id: fiche.recruteur_user_id,
    employe_user_id: fiche.employe_user_id,
  }).select('*').single();
  if (error) return null;
  return data;
}

async function nomExpediteur(userId) {
  const { data } = await supabase.from('wozali_prestataires')
    .select('nom_complet, prenom').eq('user_id', userId).maybeSingle();
  return data?.prenom || data?.nom_complet || 'WOZALI';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const body = req.body || {};
  const op = body.op || 'threads';

  try {
    if (op === 'threads') {
      const { data: threads } = await supabase.from('wozali_equipe_threads')
        .select('*, wozali_employes!inner(employe_nom, employe_photo, employe_metier, offre_titre, statut, recruteur_user_id, employe_user_id)')
        .or(`recruteur_user_id.eq.${user.id},employe_user_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      const out = (threads || []).map(t => {
        const asRecruteur = t.recruteur_user_id === user.id;
        return {
          id: t.id, employe_id: t.employe_id, as_recruteur: asRecruteur,
          nom: t.wozali_employes?.employe_nom, photo: t.wozali_employes?.employe_photo,
          metier: t.wozali_employes?.employe_metier, offre_titre: t.wozali_employes?.offre_titre,
          statut: t.wozali_employes?.statut,
          preview: t.last_message_preview, last_message_at: t.last_message_at,
          unread: asRecruteur ? t.unread_recruteur : t.unread_employe,
        };
      });
      return res.status(200).json({ ok: true, threads: out });
    }

    if (op === 'messages') {
      let fiche = null;
      if (body.employe_id) fiche = await ficheFor(body.employe_id);
      else if (body.thread_id) {
        const { data: t } = await supabase.from('wozali_equipe_threads').select('employe_id').eq('id', body.thread_id).maybeSingle();
        if (t) fiche = await ficheFor(t.employe_id);
      }
      if (!fiche) return res.status(404).json({ error: 'Fil introuvable' });
      const asRecruteur = fiche.recruteur_user_id === user.id;
      const asEmploye = fiche.employe_user_id === user.id;
      if (!asRecruteur && !asEmploye) return res.status(403).json({ error: 'Accès refusé' });

      const thread = await getOrCreateThread(fiche);
      if (!thread) return res.status(200).json({ ok: true, messages: [], thread_id: null });

      const { data: msgs } = await supabase.from('wozali_equipe_messages')
        .select('*').eq('thread_id', thread.id).order('created_at', { ascending: true }).limit(300);

      // Marque lu + reset compteur de mon côté
      const now = new Date().toISOString();
      const col = asRecruteur ? 'unread_recruteur' : 'unread_employe';
      await supabase.from('wozali_equipe_threads').update({ [col]: 0 }).eq('id', thread.id);
      await supabase.from('wozali_equipe_messages').update({ read_at: now })
        .eq('thread_id', thread.id).is('read_at', null).neq('sender_user_id', user.id);

      return res.status(200).json({ ok: true, thread_id: thread.id, messages: msgs || [], as_recruteur: asRecruteur });
    }

    if (op === 'send') {
      const content = String(body.content || '').trim();
      if (!content) return res.status(400).json({ error: 'Message vide' });
      if (content.length > 2000) return res.status(400).json({ error: 'Message trop long' });
      const fiche = await ficheFor(body.employe_id);
      if (!fiche) return res.status(404).json({ error: 'Fiche introuvable' });
      const asRecruteur = fiche.recruteur_user_id === user.id;
      const asEmploye = fiche.employe_user_id === user.id;
      if (!asRecruteur && !asEmploye) return res.status(403).json({ error: 'Accès refusé' });
      if (!fiche.employe_user_id) return res.status(400).json({ error: 'Cet employé n\'a pas encore de compte WOZALI' });

      const thread = await getOrCreateThread(fiche);
      if (!thread) return res.status(500).json({ error: 'Fil indisponible' });

      // Rate limit simple : 20 msg / 60s
      const since = new Date(Date.now() - 60000).toISOString();
      const { count } = await supabase.from('wozali_equipe_messages')
        .select('id', { count: 'exact', head: true }).eq('sender_user_id', user.id).gte('created_at', since);
      if ((count || 0) >= 20) return res.status(429).json({ error: 'Doucement, trop de messages d\'un coup.' });

      const role = asRecruteur ? 'recruteur' : 'employe';
      const { data: msg, error } = await supabase.from('wozali_equipe_messages').insert({
        thread_id: thread.id, sender_user_id: user.id, sender_role: role, content,
      }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });

      // Incrémente le compteur de l'autre + preview
      const otherCol = asRecruteur ? 'unread_employe' : 'unread_recruteur';
      const otherUser = asRecruteur ? fiche.employe_user_id : fiche.recruteur_user_id;
      const curUnread = asRecruteur ? thread.unread_employe : thread.unread_recruteur;
      await supabase.from('wozali_equipe_threads').update({
        [otherCol]: (curUnread || 0) + 1,
        last_message_at: new Date().toISOString(),
        last_message_preview: content.slice(0, 80),
      }).eq('id', thread.id);

      const fromNom = await nomExpediteur(user.id);
      pushNotification(otherUser, 'message_equipe', {
        titre: `Message de ${fromNom}`, message: content.slice(0, 90), employe_id: fiche.id,
      }, { push: true, pushTitle: `WOZALI · ${fromNom}`, pushBody: content.slice(0, 90) });

      return res.status(201).json({ ok: true, message: msg });
    }

    if (op === 'broadcast') {
      const content = String(body.content || '').trim();
      if (!content) return res.status(400).json({ error: 'Annonce vide' });
      if (content.length > 1000) return res.status(400).json({ error: 'Annonce trop longue (max 1000)' });
      // Employés actifs du patron ayant un compte
      const { data: employes } = await supabase.from('wozali_employes')
        .select('id, employe_user_id').eq('recruteur_user_id', user.id).eq('statut', 'actif')
        .not('employe_user_id', 'is', null);
      if (!employes || !employes.length) return res.status(200).json({ ok: true, envoyes: 0 });

      const fromNom = await nomExpediteur(user.id);
      let envoyes = 0;
      for (const e of employes) {
        const thread = await getOrCreateThread({ id: e.id, recruteur_user_id: user.id, employe_user_id: e.employe_user_id });
        if (!thread) continue;
        await supabase.from('wozali_equipe_messages').insert({
          thread_id: thread.id, sender_user_id: user.id, sender_role: 'annonce', content,
        });
        await supabase.from('wozali_equipe_threads').update({
          unread_employe: (thread.unread_employe || 0) + 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: '📣 ' + content.slice(0, 78),
        }).eq('id', thread.id);
        pushNotification(e.employe_user_id, 'annonce_equipe', {
          titre: `Annonce de ${fromNom}`, message: content.slice(0, 120), employe_id: e.id,
        }, { push: true, pushTitle: `WOZALI · Annonce`, pushBody: content.slice(0, 90) });
        envoyes++;
      }
      return res.status(200).json({ ok: true, envoyes });
    }

    return res.status(400).json({ error: 'Opération inconnue' });
  } catch (e) {
    console.error('[equipe-messages]', e);
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
