// ================================================================
// notify-pro — pousse un message dans la Boîte du Fondateur du pro
// (champ JSONB `notifications` de wolo_prestataires).
//
// Utilisé par les endpoints *-create.js (réservation table, devis
// chantier, commande façon, RDV mécano, commande pâtisserie,
// réservation chambre) après une insertion réussie.
//
// Usage :
//   import { notifyPro } from '../../_lib/notify-pro.js';
//   await notifyPro(supabase, proUserId, 'reservation_table', {
//     client_nom, client_telephone, ...payload
//   });
//
// Le message est ajouté en tête de la liste `notifications` (JSONB).
// La lecture côté client est faite par renderFondateurInbox() dans
// index.html, qui filtre déjà par `type === 'message_fondateur'`.
// On ajoute ici un type frère `demande_client` que la boîte sait afficher.
// ================================================================
import { supabase as defaultSupabase } from './supabase.js';

const SUB_TYPE_MAP = {
  reservation_table: {
    title: '🔔 Nouvelle réservation table',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const parts = [];
      if (p.nb_personnes) parts.push(`${p.nb_personnes} personne(s)`);
      if (p.date_reservation) parts.push(`le ${p.date_reservation}`);
      if (p.heure) parts.push(p.heure);
      if (p.occasion) parts.push(`(${p.occasion})`);
      return `Réservation ${parts.join(' ')}.`;
    },
  },
  devis_chantier: {
    title: '🔔 Nouvelle demande de devis chantier',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const parts = [];
      if (p.type_travaux) parts.push(p.type_travaux);
      if (p.surface_m2) parts.push(`${p.surface_m2} m²`);
      if (p.budget_estime_fcfa) parts.push(`budget ${Number(p.budget_estime_fcfa).toLocaleString('fr-FR')} FCFA`);
      if (p.delai_souhaite) parts.push(`délai : ${p.delai_souhaite}`);
      const head = parts.length ? parts.join(' · ') : 'Nouvelle demande';
      return `${head}. ${p.description ? '— "' + String(p.description).slice(0, 140) + '"' : ''}`.trim();
    },
  },
  commande_facon: {
    title: '🔔 Nouvelle commande façon',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const parts = [];
      if (p.type_article) parts.push(p.type_article);
      if (p.date_voulue) parts.push(`pour le ${p.date_voulue}`);
      if (p.budget_fcfa) parts.push(`budget ${Number(p.budget_fcfa).toLocaleString('fr-FR')} FCFA`);
      const head = parts.length ? parts.join(' · ') : 'Nouvelle commande';
      return `${head}. ${p.description ? '— "' + String(p.description).slice(0, 140) + '"' : ''}`.trim();
    },
  },
  rdv_mecano: {
    title: '🔔 Nouveau RDV mécano',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const veh = [p.marque, p.modele, p.annee].filter(Boolean).join(' ');
      const when = [p.date_souhaitee, p.heure_souhaitee].filter(Boolean).join(' ');
      const parts = [];
      if (veh) parts.push(veh);
      if (p.type_intervention) parts.push(p.type_intervention);
      if (when) parts.push(when);
      return parts.length ? parts.join(' · ') + '.' : 'Nouvelle demande de RDV.';
    },
  },
  commande_patisserie: {
    title: '🔔 Nouvelle commande pâtisserie',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const parts = [];
      if (p.type_produit) parts.push(p.type_produit);
      if (p.nb_personnes) parts.push(`${p.nb_personnes} personne(s)`);
      if (p.date_evenement) parts.push(`pour le ${p.date_evenement}`);
      if (p.livraison) parts.push('livraison');
      return parts.length ? parts.join(' · ') + '.' : 'Nouvelle commande.';
    },
  },
  reservation_chambre: {
    title: '🔔 Nouvelle réservation chambre',
    section: 'widgets-metier',
    bodyFn: (p) => {
      const parts = [];
      if (p.type_chambre) parts.push(p.type_chambre);
      if (p.nb_chambres) parts.push(`${p.nb_chambres} chambre(s)`);
      const occ = [];
      if (p.nb_adultes) occ.push(`${p.nb_adultes} adulte(s)`);
      if (p.nb_enfants) occ.push(`${p.nb_enfants} enfant(s)`);
      if (occ.length) parts.push(occ.join(' + '));
      if (p.arrivee && p.depart) parts.push(`du ${p.arrivee} au ${p.depart}`);
      return parts.length ? parts.join(' · ') + '.' : 'Nouvelle réservation.';
    },
  },
};

function _genId() {
  return 'np_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Insère une notif "demande_client" dans wolo_prestataires.notifications
 * du pro destinataire.
 *
 * @param {object} supabase  Client Supabase service-role (optionnel — fallback sur le client par défaut).
 * @param {string} proUserId UUID auth.users du pro destinataire.
 * @param {string} subType   reservation_table | devis_chantier | commande_facon | rdv_mecano | commande_patisserie | reservation_chambre
 * @param {object} payload   Données de la demande (utilisé pour générer title/body).
 * @returns {Promise<{ok:boolean, message?:object, error?:string}>}
 */
export async function notifyPro(supabase, proUserId, subType, payload = {}) {
  const sb = supabase || defaultSupabase;
  if (!proUserId) return { ok: false, error: 'proUserId requis' };
  const meta = SUB_TYPE_MAP[subType] || { title: '🔔 Nouvelle demande client', section: 'widgets-metier', bodyFn: () => 'Nouvelle demande déposée par un client.' };
  const clientNom = payload.client_nom || 'Un client';
  const title = meta.title.replace('demande', `demande de ${clientNom}`).replace('réservation', `réservation de ${clientNom}`).replace('commande', `commande de ${clientNom}`).replace('RDV', `RDV de ${clientNom}`);
  const body = meta.bodyFn(payload || {});
  const message = {
    id: _genId(),
    type: 'demande_client',
    sub_type: subType,
    title,
    body,
    from: 'WOLO Market',
    created_at: new Date().toISOString(),
    read: false,
    action_url: `#dashboard?section=${meta.section}`,
  };

  try {
    // Récupérer la liste actuelle (JSONB) puis prepend.
    const { data: pro, error: e1 } = await sb
      .from('wolo_prestataires')
      .select('id, notifications')
      .eq('user_id', proUserId)
      .maybeSingle();
    if (e1) return { ok: false, error: e1.message };
    if (!pro) return { ok: false, error: 'Pro introuvable' };

    let notifs = [];
    if (Array.isArray(pro.notifications)) notifs = pro.notifications;
    else if (typeof pro.notifications === 'string') {
      try { notifs = JSON.parse(pro.notifications); if (!Array.isArray(notifs)) notifs = []; } catch { notifs = []; }
    }
    // Cap à 200 notifs pour ne pas exploser le JSONB
    const updated = [message, ...notifs].slice(0, 200);

    const { error: e2 } = await sb
      .from('wolo_prestataires')
      .update({ notifications: updated })
      .eq('id', pro.id);
    if (e2) return { ok: false, error: e2.message };
    return { ok: true, message };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

export default notifyPro;
