// ================================================================
// Bourse des Mains d'Or — DÉPRÉCIÉ 2026-07-14
// ================================================================
// Supprimée par décision fondateur : une seule récompense subsiste,
// la Bourse de Croissance (5 × 100 000 FCFA/mois, classement au mérite).
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: "La Bourse des Mains d'Or est supprimée. Voir bourse-eligibilite / api/cron/tirage-bourse.js.",
  });
}
