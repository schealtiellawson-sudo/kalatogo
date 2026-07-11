// ════════════════════════════════════════════════════════════════
// Bourse de Croissance — DÉPRÉCIÉ 2026-07-11
// ════════════════════════════════════════════════════════════════
// Ce fichier doublonnait api/cron/tirage-bourse.js avec un mécanisme
// différent (tirage aléatoire, split 300K par pays) devenu incohérent
// avec le modèle validé : classement au MÉRITE, 100 000 FCFA aux 3
// membres Pro les mieux classés (Togo + Bénin confondus).
//
// Neutralisé pour éviter tout double crédit si jamais appelé — la
// seule implémentation active est api/cron/tirage-bourse.js.
// ════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint déprécié',
    message: 'La Bourse de Croissance est désormais gérée par api/cron/tirage-bourse.js (classement au mérite, plus de tirage aléatoire).',
  });
}
