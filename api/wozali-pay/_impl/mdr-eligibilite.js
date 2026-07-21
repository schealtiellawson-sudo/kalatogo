// ================================================================
// Bourse des Mains d'Or — DÉPRÉCIÉ 2026-07-14
// ================================================================
// Supprimée par décision fondateur : une seule récompense subsiste,
// la Bourse de Croissance (par pays, 10 gagnants/pays/mois au mérite,
// gain = un salaire, le SMIG du pays du gagnant).
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: "La Bourse des Mains d'Or est supprimée. Voir bourse-eligibilite / api/cron/tirage-bourse.js.",
  });
}
