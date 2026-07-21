// ================================================================
// Bourse de Croissance, constantes partagées (nouveau modèle 2026-07-19)
// ================================================================
// Source unique pour éviter des valeurs qui divergent entre le cron
// de tirage (api/cron/tirage-bourse.js) et l'affichage du statut au
// membre (api/wozali-pay/_impl/recompenses-status.js).
//
// Modèle : par pays (Togo / Bénin), chacun son classement. La Bourse
// d'un pays se débloque uniquement à partir de SEUIL_PRO_DEBLOCAGE
// membres Pro dans ce pays. Le gain d'un gagnant = un salaire, le
// SMIG légal de son pays. NB_GAGNANTS_PAR_PAYS gagnants par pays et
// par mois, désignés au mérite (Score WOZALI, avis, note, constance).
// ================================================================

export const SMIG_PAR_PAYS = {
  'Togo': 52500,
  'Bénin': 52000,
};

export const SEUIL_PRO_DEBLOCAGE = 5000;
export const NB_GAGNANTS_PAR_PAYS = 10;
export const PAYS_BOURSE = ['Togo', 'Bénin'];

// ================================================================
// Seuils d'éligibilité — source unique (alignement 2026-07-21).
// Avant cette date, le cron, bourse-eligibilite.js et
// recompenses-status.js codaient chacun leurs propres seuils en dur,
// parfois différents (4 avis ici, 3 là, 2 mois Pro ici, 1 là). Toute
// comparaison de seuil doit désormais importer ces constantes.
// ================================================================
export const MIN_AVIS_30J = 3;
export const MIN_MOIS_PRO = 1;
export const MIN_SCORE_WOZALI = 80;
export const MIN_NOTE_MOYENNE = 4.2;
