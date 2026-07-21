// ================================================================
// CRON Awards / Bourse des Mains d'Or — DÉPRÉCIÉ 2026-07-14
// ================================================================
// La Bourse des Mains d'Or est supprimée (décision fondateur 2026-07-14).
// Une seule récompense subsiste : la Bourse de Croissance, par pays
// (Togo/Bénin), 10 gagnants par pays et par mois, au mérite, gain =
// un salaire (le SMIG légal du pays du gagnant) — api/cron/tirage-bourse.js.
// Neutralisé pour éviter tout crédit fantôme.
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: "La Bourse des Mains d'Or est supprimée. Seule la Bourse de Croissance est active : 10 gagnants par pays, un salaire égal au SMIG du pays, classement au mérite — api/cron/tirage-bourse.js.",
  });
}
