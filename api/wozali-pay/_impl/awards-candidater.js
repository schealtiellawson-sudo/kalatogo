// ================================================================
// WOZALI Awards — DÉPRÉCIÉ 2026-07-21
// ================================================================
// Supprimé par décision fondateur : une seule récompense subsiste,
// la Bourse de Croissance (par pays, 10 gagnants/pays/mois au mérite,
// gain = un salaire, le SMIG du pays). Voir bourse-eligibilite.js et
// api/cron/tirage-bourse.js. Désinscrit du routeur
// (api/wozali-pay/[action].js) — ce stub reste sur disque en cas
// d'appel direct oublié quelque part.
// ================================================================

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: 'WOZALI Awards est supprimé. Seule la Bourse de Croissance (par pays, au mérite) est active — voir bourse-eligibilite / api/cron/tirage-bourse.js.',
  });
}
