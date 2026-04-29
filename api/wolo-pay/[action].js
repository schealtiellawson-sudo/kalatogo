// ================================================================
// WOLO Market — Router API unique (consolide tous les endpoints)
// Vercel route: /api/wolo-pay/<action>  →  req.query.action
// ================================================================
import { requireAuth, verifyAuth } from '../_lib/auth.js';
// Parrainage & Abonnement
import parrainageStats from './_impl/parrainage-stats.js';
import parrainageApply from './_impl/parrainage-apply.js';
import abonnementFedapay from './_impl/abonnement-fedapay.js';
// Récompenses
import recompensesStatus from './_impl/recompenses-status.js';
import awardsCandidats from './_impl/awards-candidats.js';
import awardsVote from './_impl/awards-vote.js';
import awardsCandidater from './_impl/awards-candidater.js';
// Admin
import adminVerify from './_impl/admin-verify.js';
import agentsTerrain from './_impl/agents-terrain.js';
// Business Suite
import invitationCreate from './_impl/invitation-create.js';
import invitationGet from './_impl/invitation-get.js';
import invitationAccept from './_impl/invitation-accept.js';
import paiePay from './_impl/paie-pay.js';
import paieBulletin from './_impl/paie-bulletin.js';
import annoncesBroadcast from './_impl/annonces-broadcast.js';
// Sprint 14 — Mur des Reines + King & Queen
import feedList from './_impl/feed-list.js';
import feedPost from './_impl/feed-post.js';
import feedLike from './_impl/feed-like.js';
import feedComment from './_impl/feed-comment.js';
import feedDiscover from './_impl/feed-discover.js';
import badgesList from './_impl/badges-list.js';
import leaderboard from './_impl/leaderboard.js';
import duelsList from './_impl/duels-list.js';
import themeMois from './_impl/theme-mois.js';
import voteShare from './_impl/vote-share.js';
import boostAcheter from './_impl/boost-acheter.js';
// IA Router (T1-T4 consolidés)
import aiQuery from './_impl/ai-query.js';
// Messagerie + entretiens + signalement (Sprint I)
import threadList from './_impl/thread-list.js';
import messageList from './_impl/message-list.js';
import messageSend from './_impl/message-send.js';
import entretienList from './_impl/entretien-list.js';
import entretienUpsert from './_impl/entretien-upsert.js';
import signalementCreate from './_impl/signalement-create.js';
import signalementList from './_impl/signalement-list.js';
// WhatsApp sequences (V1.1 — 2026-04-28)
import whatsappEnqueue from './_impl/whatsapp-enqueue.js';
import whatsappFlush from './_impl/whatsapp-flush.js';
// Mains les Plus Demandées — stats des pros taguées
import feedTagStats from './_impl/feed-tag-stats.js';
// Widgets métier (2026-04-27) — prestations / portfolio / résa table / devis chantier
import prestationList from './_impl/prestation-list.js';
import prestationUpsert from './_impl/prestation-upsert.js';
import prestationDelete from './_impl/prestation-delete.js';
import portfolioList from './_impl/portfolio-list.js';
import portfolioUpsert from './_impl/portfolio-upsert.js';
import portfolioDelete from './_impl/portfolio-delete.js';
import reservationTableCreate from './_impl/reservation-table-create.js';
import reservationTableList from './_impl/reservation-table-list.js';
import reservationTableUpdate from './_impl/reservation-table-update.js';
import devisChantierCreate from './_impl/devis-chantier-create.js';
import devisChantierList from './_impl/devis-chantier-list.js';
import devisChantierUpdate from './_impl/devis-chantier-update.js';
// Widgets métier (V1.1 — 5 widgets restants)
import commandeFaconCreate from './_impl/commande-facon-create.js';
import commandeFaconList from './_impl/commande-facon-list.js';
import commandeFaconUpdate from './_impl/commande-facon-update.js';
import rdvMecanoCreate from './_impl/rdv-mecano-create.js';
import rdvMecanoList from './_impl/rdv-mecano-list.js';
import rdvMecanoUpdate from './_impl/rdv-mecano-update.js';
import commandePatisserieCreate from './_impl/commande-patisserie-create.js';
import commandePatisserieList from './_impl/commande-patisserie-list.js';
import commandePatisserieUpdate from './_impl/commande-patisserie-update.js';
import reservationChambreCreate from './_impl/reservation-chambre-create.js';
import reservationChambreList from './_impl/reservation-chambre-list.js';
import reservationChambreUpdate from './_impl/reservation-chambre-update.js';
import coursOffresList from './_impl/cours-offres-list.js';
import coursOffresUpsert from './_impl/cours-offres-upsert.js';
import coursOffresDelete from './_impl/cours-offres-delete.js';

const PUBLIC_ACTIONS = new Set([
  'awards-candidats',
  'awards-vote',
  'recompenses-status',
  'admin-verify',
  'agents-terrain',
  'invitation-get',
  'invitation-accept',
  'paie-bulletin',
  'feed-list',
  'feed-discover',
  'badges-list',
  'leaderboard',
  'theme-mois',
  'whatsapp-flush',           // protégé par CRON_SECRET header
  'feed-tag-stats',           // public (visible sur profil pro)
  // Widgets métier — catalogues lisibles par tous + create de demandes ouvert
  'prestation-list',
  'portfolio-list',
  'reservation-table-create',
  'devis-chantier-create',
  'commande-facon-create',
  'rdv-mecano-create',
  'commande-patisserie-create',
  'reservation-chambre-create',
  'cours-offres-list',
]);

// Public mais on tente de récupérer le user authentifié si présent
// (ex: une demande de devis tag son client_user_id si connecté).
const OPTIONAL_AUTH_ACTIONS = new Set([
  'reservation-table-create',
  'devis-chantier-create',
  'commande-facon-create',
  'rdv-mecano-create',
  'commande-patisserie-create',
  'reservation-chambre-create',
]);

const handlers = {
  'parrainage-stats': parrainageStats,
  'parrainage-apply': parrainageApply,
  'abonnement-fedapay': abonnementFedapay,
  'recompenses-status': recompensesStatus,
  'awards-candidats': awardsCandidats,
  'awards-vote': awardsVote,
  'awards-candidater': awardsCandidater,
  'admin-verify': adminVerify,
  'agents-terrain': agentsTerrain,
  'invitation-create': invitationCreate,
  'invitation-get': invitationGet,
  'invitation-accept': invitationAccept,
  'paie-pay': paiePay,
  'paie-bulletin': paieBulletin,
  'annonces-broadcast': annoncesBroadcast,
  'feed-list': feedList,
  'feed-post': feedPost,
  'feed-like': feedLike,
  'feed-comment': feedComment,
  'feed-discover': feedDiscover,
  'badges-list': badgesList,
  'leaderboard': leaderboard,
  'duels-list': duelsList,
  'theme-mois': themeMois,
  'vote-share': voteShare,
  'boost-acheter': boostAcheter,
  'ai-query': aiQuery,
  'thread-list': threadList,
  'message-list': messageList,
  'message-send': messageSend,
  'entretien-list': entretienList,
  'entretien-upsert': entretienUpsert,
  'signalement-create': signalementCreate,
  'signalement-list': signalementList,
  'whatsapp-enqueue': whatsappEnqueue,
  'whatsapp-flush': whatsappFlush,
  'feed-tag-stats': feedTagStats,
  // Widgets métier
  'prestation-list': prestationList,
  'prestation-upsert': prestationUpsert,
  'prestation-delete': prestationDelete,
  'portfolio-list': portfolioList,
  'portfolio-upsert': portfolioUpsert,
  'portfolio-delete': portfolioDelete,
  'reservation-table-create': reservationTableCreate,
  'reservation-table-list': reservationTableList,
  'reservation-table-update': reservationTableUpdate,
  'devis-chantier-create': devisChantierCreate,
  'devis-chantier-list': devisChantierList,
  'devis-chantier-update': devisChantierUpdate,
  // Widgets métier (5 restants V1.1)
  'commande-facon-create': commandeFaconCreate,
  'commande-facon-list': commandeFaconList,
  'commande-facon-update': commandeFaconUpdate,
  'rdv-mecano-create': rdvMecanoCreate,
  'rdv-mecano-list': rdvMecanoList,
  'rdv-mecano-update': rdvMecanoUpdate,
  'commande-patisserie-create': commandePatisserieCreate,
  'commande-patisserie-list': commandePatisserieList,
  'commande-patisserie-update': commandePatisserieUpdate,
  'reservation-chambre-create': reservationChambreCreate,
  'reservation-chambre-list': reservationChambreList,
  'reservation-chambre-update': reservationChambreUpdate,
  'cours-offres-list': coursOffresList,
  'cours-offres-upsert': coursOffresUpsert,
  'cours-offres-delete': coursOffresDelete,
};

export default async function handler(req, res) {
  const action = req.query.action;
  const fn = handlers[action];
  if (!fn) return res.status(404).json({ error: 'Action inconnue' });

  if (!PUBLIC_ACTIONS.has(action)) {
    const user = await requireAuth(req, res);
    if (!user) return;
    req.authenticatedUser = user;
  } else if (OPTIONAL_AUTH_ACTIONS.has(action)) {
    // Auth optionnelle : si un Bearer valide est passé, on l'attache.
    try {
      const user = await verifyAuth(req);
      if (user) req.authenticatedUser = user;
    } catch (e) { /* silencieux */ }
  }

  return fn(req, res);
}
