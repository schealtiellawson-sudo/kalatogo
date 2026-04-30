// ================================================================
// GET /api/wolo-pay/push-vapid-public
// Retourne la VAPID public key (publique par essence — c'est safe).
// Utilisée côté frontend pour s'abonner via PushManager.subscribe().
// ================================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({
      error: 'VAPID_PUBLIC_KEY non configurée',
      hint: 'Génère une paire VAPID avec `npx web-push generate-vapid-keys` puis ajoute-les dans Vercel env (VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY).',
    });
  }

  // Cache 5 min côté navigateur (la clé ne change quasi jamais)
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ publicKey });
}
