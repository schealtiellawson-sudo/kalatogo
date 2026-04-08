// Vercel Cron — pente douce Score WOLO
// Configurer dans vercel.json :
// { "crons": [{ "path": "/api/cron/maj-scores-inactivite", "schedule": "0 2 * * *" }] }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, score_wolo, derniere_activite, plan')
    .eq('actif', true);

  if (error) return res.status(500).json({ error: error.message });

  const maintenant = new Date();
  let notifies = 0, baisses = 0;

  for (const profil of profiles) {
    if (!profil.derniere_activite) continue;
    const joursInactif = (maintenant - new Date(profil.derniere_activite)) / 86400000;

    if (joursInactif >= 10 && joursInactif < 11) {
      await envoyerNotificationInactivite(profil.id);
      notifies++;
    }

    if (joursInactif >= 14) {
      const pointsAPerdre = Math.min(Math.floor(joursInactif - 13), 5);
      const nouveauScore = Math.max(0, (profil.score_wolo || 0) - pointsAPerdre);
      if (nouveauScore !== profil.score_wolo) {
        await supabase.from('profiles').update({ score_wolo: nouveauScore }).eq('id', profil.id);
        baisses++;
      }
    }
  }

  return res.status(200).json({ ok: true, notifies, baisses, total: profiles.length });
}

async function envoyerNotificationInactivite(userId) {
  const moisCourant = new Date().toISOString().slice(0, 7);
  const { data: dejaEnvoyee } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'inactivite_alerte')
    .like('created_at', `${moisCourant}%`)
    .maybeSingle();

  if (dejaEnvoyee) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'inactivite_alerte',
    titre: '⚠️ Ton Score WOLO va baisser dans 4 jours',
    corps: "Tu n'as pas eu d'activité depuis 10 jours. Publie une réalisation ou mets à jour ton profil pour maintenir ton Score WOLO.",
    url: '/dashboard',
    lu: false,
    created_at: new Date().toISOString()
  });
}
