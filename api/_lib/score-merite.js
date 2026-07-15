// ================================================================
// Score Mérite — classement Bourse de Croissance (sur 100 points)
// Décision fondateur 2026-07-14 : le classement valorise le TRAVAIL
// et la QUALITÉ, jamais l'audience. Zéro point pour les vues, les
// abonnés ou les partages. Un profil avec 10 avis excellents bat un
// profil avec 200 avis moyens.
//
// Composantes :
//   Note ajustée (bayésienne)          max 40 pts
//   Avis vérifiés (échelle log)        max 15 pts
//   Clients récurrents                 max 10 pts
//   Photos de réalisations             max 10 pts
//   Profil complet                     max 15 pts
//   Constance (activité récente)       max 10 pts
//   Vues / abonnés / partages          0 pt — exclu par design
// ================================================================

// Moyenne bayésienne (formule IMDB) : lisse la note vers la moyenne
// plateforme (C=4.2) tant qu'il y a peu d'avis (m=5). Résultat :
// la qualité confirmée pèse plus que le volume brut.
const BAYES_M = 5;      // avis de lissage
const BAYES_C = 4.2;    // note moyenne plateforme de référence

export function noteAjustee(noteMoyenne, nbAvis) {
  if (!nbAvis || nbAvis <= 0) return 0;
  return (nbAvis / (nbAvis + BAYES_M)) * noteMoyenne + (BAYES_M / (nbAvis + BAYES_M)) * BAYES_C;
}

// ── Note ajustée → max 40 pts (0 pt à 3.0★, 40 pts à 5.0★) ──
function ptsNote(noteMoyenne, nbAvis) {
  const ajustee = noteAjustee(noteMoyenne, nbAvis);
  const ratio = Math.max(0, Math.min(1, (ajustee - 3) / 2));
  return Math.round(ratio * 40);
}

// ── Avis vérifiés → max 15 pts, rendement décroissant (log2) ──
// Passer de 2 à 8 avis rapporte beaucoup, de 50 à 500 presque rien.
// Impossible de "farmer" du volume avec une grosse audience.
function ptsAvisVerifies(nbAvisVerifies) {
  if (!nbAvisVerifies || nbAvisVerifies <= 0) return 0;
  return Math.min(15, Math.round(5 * Math.log2(1 + nbAvisVerifies)));
}

// ── Clients récurrents → max 10 pts (2.5 pts par client qui revient) ──
// Le même client qui note sur des mois différents = le signal de
// qualité le plus difficile à truquer.
function ptsRecurrents(nbClientsRecurrents) {
  return Math.min(10, Math.round((nbClientsRecurrents || 0) * 2.5));
}

// ── Photos de réalisations → max 10 pts ──
function ptsRealisations(nbPhotos) {
  if (nbPhotos >= 6) return 10;
  if (nbPhotos >= 3) return 6;
  if (nbPhotos >= 1) return 3;
  return 0;
}

// ── Profil complet → max 15 pts ──
function ptsProfil(p) {
  let pts = 0;
  if (p.photo_profil) pts += 4;
  if ((p.description_services || '').trim().length > 10) pts += 4;
  if (p.metier_principal) pts += 3;
  if (p.quartier || p.ville) pts += 2;
  if (p.numero_telephone || p.whatsapp) pts += 2;
  return pts;
}

// ── Constance → max 10 pts ──
function ptsConstance(derniereActivite) {
  if (!derniereActivite) return 0;
  const jours = (Date.now() - new Date(derniereActivite).getTime()) / 86400000;
  if (jours <= 3) return 10;
  if (jours <= 7) return 7;
  if (jours <= 14) return 4;
  return 0;
}

// Compte les photos de réalisations (slots + albums JSONB)
export function compterPhotos(p) {
  let nb = 0;
  if (p.photo_realisation_1) nb++;
  if (p.photo_realisation_2) nb++;
  if (p.photo_realisation_3) nb++;
  try {
    const albums = typeof p.albums === 'string' ? JSON.parse(p.albums || '[]') : (p.albums || []);
    for (const a of albums) nb += (a.photos || []).length;
  } catch { /* albums illisibles → ignorés */ }
  return nb;
}

// Compte les clients récurrents : même auteur (user_id ou numéro
// WhatsApp) ayant laissé des avis sur au moins 2 mois différents.
export function compterClientsRecurrents(avisTous) {
  const moisParClient = {};
  for (const a of (avisTous || [])) {
    const cle = a.auteur_user_id || (a.auteur_whatsapp || '').replace(/\D/g, '');
    if (!cle) continue;
    const mois = String(a.date_avis || a.created_at || '').slice(0, 7);
    if (!mois) continue;
    if (!moisParClient[cle]) moisParClient[cle] = new Set();
    moisParClient[cle].add(mois);
  }
  return Object.values(moisParClient).filter(set => set.size >= 2).length;
}

// ── Calcul total ──
// prestataire : ligne wozali_prestataires
// avis30j     : avis validés des 30 derniers jours [{note_globale, auteur_user_id, auteur_whatsapp}]
// avisTous    : tous les avis validés du prestataire (pour les récurrents)
export function calculerScoreMerite({ prestataire, avis30j, avisTous }) {
  const p = prestataire || {};
  const recents = avis30j || [];

  // Avis vérifié = rattaché à un compte WOZALI ou à un numéro WhatsApp
  const verifies = recents.filter(a => a.auteur_user_id || (a.auteur_whatsapp || '').replace(/\D/g, '').length >= 8);
  const nbVerifies = verifies.length;

  let noteMoy = 0;
  if (nbVerifies > 0) {
    noteMoy = verifies.reduce((s, a) => s + (a.note_globale || 0), 0) / nbVerifies;
  }

  const composantes = {
    note:        ptsNote(noteMoy, nbVerifies),                        // max 40
    avis:        ptsAvisVerifies(nbVerifies),                         // max 15
    recurrents:  ptsRecurrents(compterClientsRecurrents(avisTous)),   // max 10
    realisations: ptsRealisations(compterPhotos(p)),                  // max 10
    profil:      ptsProfil(p),                                        // max 15
    constance:   ptsConstance(p.updated_at),                          // max 10
  };
  composantes.total = Math.min(100,
    composantes.note + composantes.avis + composantes.recurrents +
    composantes.realisations + composantes.profil + composantes.constance
  );
  return composantes;
}
