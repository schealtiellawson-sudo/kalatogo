// ================================================================
// WOZALI — Router API unique (consolide tous les endpoints)
// Vercel route: /api/wozali-pay/<action>  →  req.query.action
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
// Business Suite Phases B→G désinscrites 2026-05-07 — report V1.2 (simplification MVP début juillet)
// Imports retirés : invitation-create / invitation-get / invitation-accept / paie-pay / paie-bulletin / annonces-broadcast
// Les fichiers _impl/ sont conservés pour réactivation future
// Sprint 14 — Bourse des Mains d'Or + King & Queen
import feedList from './_impl/feed-list.js';
import feedPost from './_impl/feed-post.js';
import feedLike from './_impl/feed-like.js';
import feedComment from './_impl/feed-comment.js';
import themeMois from './_impl/theme-mois.js';
// Refonte récompenses 2026-05-15
import mdrEligibilite from './_impl/mdr-eligibilite.js';
import mdrTirageMensuel from './_impl/mdr-tirage-mensuel.js';
import bourseEligibilite from './_impl/bourse-eligibilite.js';
import bourseTirageMensuel from './_impl/bourse-tirage-mensuel.js';
// Endpoints jeux désinscrits 2026-05-15 (refonte récompenses : tirage aléatoire simple) :
// feed-discover (mode duel), badges-list, leaderboard, duels-list, vote-share, boost-acheter
// Fichiers _impl/ conservés sur disque
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
// Top Mains les Plus Demandées (classement public mensuel)
import topMainsList from './_impl/top-mains-list.js';
// Battle Bénin vs Togo désinscrite 2026-05-15 (refonte récompenses : 1 gagnante par pays au tirage MdR)
// Fichier _impl/battle-score.js conservé sur disque pour historique
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
// Notifications push web (PWA — VAPID)
import pushSubscribe from './_impl/push-subscribe.js';
import pushSend from './_impl/push-send.js';
import pushVapidPublic from './_impl/push-vapid-public.js';
// Monitoring (2026-04-29)
import errorReport from './_impl/error-report.js';
import healthCheck from './_impl/health-check.js';
import healthMetrics from './_impl/health-metrics.js';
// Chat interne WOZALI — IA auto-reply + escalade fondateur (2026-05-20)
import chatWozali from './_impl/chat-wozali.js';
import coachChat from './_impl/coach-chat.js';
// RDV Supabase (2026-05-21 — migration hors Airtable)
import rdvCreate from './_impl/rdv-create.js';
import rdvList from './_impl/rdv-list.js';
import rdvUpdate from './_impl/rdv-update.js';
import rdvDelete from './_impl/rdv-delete.js';
import rdvSlots from './_impl/rdv-slots.js';
// Avis — suppression sécurisée (2026-05-21)
import avisDelete from './_impl/avis-delete.js';
// Équipe — Sprint J/K (2026-05-23)
import employeCreate from './_impl/employe-create.js';
import employeList   from './_impl/employe-list.js';
import employeUpdate from './_impl/employe-update.js';

const PUBLIC_ACTIONS = new Set([
  'awards-candidats',
  // 'awards-vote' retiré 2026-07-10 : doit être authentifié (le votant vient du token, anti-fraude)
  'recompenses-status',
  'admin-verify',
  'agents-terrain',
  'feed-list',
  'theme-mois',
  'whatsapp-flush',           // protégé par CRON_SECRET header
  'feed-tag-stats',           // public (visible sur profil pro)
  'top-mains-list',           // public (page Top Mains les Plus Demandées)
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
  // Notifications push : VAPID public key lisible par tous
  'push-vapid-public',
  // push-send protégé par CRON_SECRET (vérifié dans le handler lui-même)
  'push-send',
  // Monitoring : log d'erreur frontend (rate-limit IP) + health check public
  'error-report',
  'health-check',
  // RDV public (booking client sans compte + slots dispo)
  'rdv-create',
  'rdv-slots',
  // health-metrics protégé par CRON_SECRET (vérifié dans le handler)
  'health-metrics',
  // Chat admin : protégé par CRON_SECRET vérifié dans le handler lui-même
  'chat-wozali-admin-list',
  'chat-wozali-admin-reply',
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
  'rdv-create', // client peut être connecté ou non
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
  'feed-list': feedList,
  'feed-post': feedPost,
  'feed-like': feedLike,
  'feed-comment': feedComment,
  'theme-mois': themeMois,
  // Refonte récompenses 2026-05-15 — éligibilité + tirage mensuel
  'mdr-eligibilite': mdrEligibilite,
  'mdr-tirage-mensuel': mdrTirageMensuel,
  'bourse-eligibilite': bourseEligibilite,
  'bourse-tirage-mensuel': bourseTirageMensuel,
  // Endpoints jeux désinscrits 2026-05-15 : feed-discover, badges-list, leaderboard, duels-list, vote-share, boost-acheter
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
  'top-mains-list': topMainsList,
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
  // Notifications push (PWA — VAPID)
  'push-subscribe': pushSubscribe,
  'push-send': pushSend,
  'push-vapid-public': pushVapidPublic,
  // Monitoring (2026-04-29)
  'error-report':   errorReport,
  'health-check':   healthCheck,
  'health-metrics': healthMetrics,
  // Chat interne WOZALI — IA auto-reply + escalade fondateur (2026-05-20)
  // Un seul module gère les 4 actions, le router lui passe req.query.action
  // Coach Zali — conversation libre (Pro, vérifié serveur) (2026-07-17)
  'coach-chat': coachChat,
  'chat-wozali-send':         chatWozali,
  'chat-wozali-history':      chatWozali,
  'chat-wozali-admin-list':   chatWozali,
  'chat-wozali-admin-reply':  chatWozali,
  // RDV Supabase (2026-05-21)
  'rdv-create': rdvCreate,
  'rdv-list':   rdvList,
  'rdv-update': rdvUpdate,
  'rdv-delete': rdvDelete,
  'rdv-slots':  rdvSlots,
  // Avis delete (2026-05-21)
  'avis-delete': avisDelete,
  // Équipe (2026-05-23)
  'employe-create': employeCreate,
  'employe-list':   employeList,
  'employe-update': employeUpdate,
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

  try {
    return await fn(req, res);
  } catch (err) {
    console.error(`[wozali-pay/${action}] unhandled:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Erreur serveur inattendue' });
    }
  }
}
