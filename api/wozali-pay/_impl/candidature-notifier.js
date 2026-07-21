// ================================================================
// candidature-notifier - notifie le candidat d'un changement de statut
// POST /api/wozali-pay/candidature-notifier  (auth requise)
// Body : { candidature_id, statut }
//
// Avant cet endpoint, le front écrivait la notification dans la fiche du
// candidat DEPUIS LE NAVIGATEUR DU RECRUTEUR. Les règles RLS l'interdisent
// (wozali_prestataires.prest_update_self : WITH CHECK auth.uid() = user_id)
// donc l'update échouait en silence et le candidat n'était jamais informé - 
// y compris pour "Embauché", le statut le plus important de la plateforme.
//
// Ici, la vérification "l'appelant est bien le recruteur de cette
// candidature" se fait côté serveur avant toute écriture, puis l'écriture
// se fait avec les droits de service (bypass RLS, contrôlé).
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { pushNotification } from '../../_lib/notifications.js';

const MESSAGES = {
  'En attente': {
    titre: 'Candidature en attente',
    message: (offreTitre, recruteurNom) =>
      `Ta candidature pour « ${offreTitre} » est repassée en attente chez ${recruteurNom}.`,
  },
  'Vue': {
    titre: 'Ta candidature a été consultée',
    message: (offreTitre, recruteurNom) =>
      `${recruteurNom} a consulté ta candidature pour « ${offreTitre} ».`,
  },
  'Retenue': {
    titre: 'Ta candidature a été retenue !',
    message: (offreTitre, recruteurNom) =>
      `Bonne nouvelle ! ${recruteurNom} a retenu ta candidature pour « ${offreTitre} ». Il va te contacter bientôt.`,
  },
  'Refusée': {
    titre: 'Candidature non retenue',
    message: (offreTitre, recruteurNom) =>
      `${recruteurNom} n'a pas retenu ta candidature pour « ${offreTitre} ». Continue de postuler, ton profil est visible !`,
  },
  // Statut le plus important de la plateforme : avant ce fix, il sortait de
  // la fonction sans rien envoyer (default: return dans notifyCandidatStatut).
  'Embauché': {
    titre: 'Tu es embauché !',
    message: (offreTitre, recruteurNom) =>
      `${recruteurNom} t'a embauché pour « ${offreTitre} ». Direction ton espace équipe WOZALI pour la suite.`,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Authentification requise' });

  const { candidature_id, statut } = req.body || {};
  if (!candidature_id || !statut) {
    return res.status(400).json({ error: 'candidature_id et statut requis' });
  }
  const tpl = MESSAGES[statut];
  if (!tpl) {
    return res.status(400).json({ error: `Statut inconnu : ${statut}` });
  }

  const { data: candidature, error: errC } = await supabase
    .from('wozali_candidatures')
    .select('id, candidat_user_id, offre_titre, recruteur_user_id, recruteur_nom')
    .eq('id', candidature_id)
    .maybeSingle();

  if (errC) return res.status(500).json({ error: errC.message });
  if (!candidature) return res.status(404).json({ error: 'Candidature introuvable' });

  // Vérification serveur : seul le recruteur propriétaire de cette
  // candidature peut déclencher une notification vers le candidat.
  if (candidature.recruteur_user_id !== userId) {
    return res.status(403).json({ error: "Tu n'es pas le recruteur de cette candidature" });
  }

  if (!candidature.candidat_user_id) {
    // Candidature ancienne sans user_id lié (pré-migration) : rien à notifier.
    return res.status(200).json({ ok: true, notified: false, reason: 'candidat_user_id manquant' });
  }

  const offreTitre = candidature.offre_titre || 'une offre';
  const recruteurNom = candidature.recruteur_nom || 'Le recruteur';
  const titre = tpl.titre;
  const message = tpl.message(offreTitre, recruteurNom);

  // 1) Fondation notifications serveur (table wozali_notifications).
  //    "Embauché" pousse aussi un push web (le plus important à ne pas rater).
  await pushNotification(
    candidature.candidat_user_id,
    'candidature_statut',
    { titre, message, statut, candidature_id, offre_titre: offreTitre, lien: 'emploi-candidatures' },
    { push: true, pushTitle: titre, pushBody: message, pushUrl: '/#dashboard' }
  );

  // 2) Compat historique : champ Notifications JSON sur la fiche prestataire,
  //    lu par le dashboard candidat existant. Conservé le temps que le front
  //    migre entièrement vers wozali_notifications (notifications-list).
  try {
    const { data: prest } = await supabase
      .from('wozali_prestataires')
      .select('id, notifications')
      .eq('user_id', candidature.candidat_user_id)
      .maybeSingle();

    if (prest) {
      let notifs = [];
      try {
        if (prest.notifications) notifs = JSON.parse(prest.notifications);
      } catch (e) { /* champ corrompu, on repart d'une liste vide */ }
      notifs.unshift({
        id: 'notif_' + Date.now(),
        type: 'candidature_statut',
        titre,
        message,
        date: new Date().toISOString(),
        lu: false,
        lien: 'emploi-candidatures',
      });
      notifs = notifs.slice(0, 50);
      await supabase
        .from('wozali_prestataires')
        .update({ notifications: JSON.stringify(notifs) })
        .eq('id', prest.id);
    }
  } catch (e) {
    console.warn('[candidature-notifier] compat notifications prestataire a échoué', e?.message || e);
  }

  return res.status(200).json({ ok: true, notified: true });
}
