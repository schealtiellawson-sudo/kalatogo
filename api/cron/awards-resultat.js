// ================================================================
// CRON Awards / Bourse des Mains d'Or — DÉPRÉCIÉ 2026-07-14
// ================================================================
// La Bourse des Mains d'Or est supprimée (décision fondateur 2026-07-14).
// Une seule récompense subsiste : la Bourse de Croissance, 100 000 FCFA
// chacun pour les 5 meilleurs profils du mois, au mérite
// (api/cron/tirage-bourse.js). Neutralisé pour éviter tout crédit fantôme.
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: "La Bourse des Mains d'Or est supprimée. Seule la Bourse de Croissance (5 × 100 000 FCFA au mérite) est active — api/cron/tirage-bourse.js.",
  });
}
