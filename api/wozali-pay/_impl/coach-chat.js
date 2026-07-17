// ================================================================
// POST /api/wozali-pay/coach-chat — conversation libre avec Coach Zali
// Réservé au Plan Pro (vérifié CÔTÉ SERVEUR, jamais depuis le body).
// Body : { message: string }
// Retour : { ok, reponse } — les deux messages sont aussi persistés
// dans wozali_coach_messages (le fil Activité reste la source).
//
// Charte Zali côté IA : langue simple, douleur argent, mécanismes
// prouvés par SES données, jamais de promesse chiffrée de gains,
// jamais de comparaison nominative avec un autre membre.
// ================================================================
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';
import { checkRateLimit, logUsage } from '../../_lib/ai-cache.js';
import { supabase } from '../../_lib/supabase.js';

const SYSTEM_ZALI = `Tu es Coach Zali, le conseiller business personnel des membres de WOZALI, la plateforme qui rend visibles les travailleurs du Togo et du Bénin. Tu parles à des artisans, commerçants et indépendants, souvent peu à l'aise avec la technologie et le jargon.

Règles absolues :
- Français simple, phrases courtes, ton grand frère bienveillant et direct. Tutoiement.
- Zéro jargon : jamais "KPI", "optimiser", "conversion", "visibilité", "engagement". Dis "les gens qui regardent ton profil", "ceux qui appellent", "l'argent qui rentre".
- Toute réponse s'appuie sur SES données (fournies dans le contexte) et se termine par UNE action concrète faisable sur WOZALI (photos, tarifs, statut du jour, publications, avis, disponibilité, carte de visite, parrainage).
- JAMAIS de promesse chiffrée de gains ("tu vas gagner X FCFA"). Tu expliques des mécanismes, prouvés par ses chiffres à lui.
- JAMAIS de comparaison avec un autre membre nommé.
- Si la question sort du business (santé, politique, religion, vie privée, demandes déplacées), réponds en une phrase polie que tu es là pour son business, et ramène à son activité.
- Maximum 120 mots. Pas de listes à puces, pas de markdown : du texte parlé.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const message = String(req.body?.message || '').trim().slice(0, 600);
  if (!message) return res.status(400).json({ error: 'message requis' });

  // 1. Profil + vérification Pro CÔTÉ SERVEUR
  const { data: p } = await supabase
    .from('wozali_prestataires')
    .select('id, abonnement, prenom, nom_complet, metier_principal, quartier, ville, tarif_min_fcfa, tarif_max_fcfa, score_wozali, nb_avis_recus, note_moyenne, badges_auto, statut_jour, photo_realisation_1, photo_realisation_2, description_services')
    .eq('user_id', userId)
    .maybeSingle();
  if (!p) return res.status(404).json({ error: 'Profil introuvable' });
  if (String(p.abonnement || '').trim().toLowerCase() !== 'pro') {
    return res.status(403).json({ error: 'pro_requis', message: 'La conversation libre avec Coach Zali est réservée au Plan Pro.' });
  }

  // 2. Quota IA (plan pro)
  const rate = await checkRateLimit(userId, 'pro');
  if (!rate.ok) {
    return res.status(429).json({ error: 'quota', message: "On a beaucoup discuté aujourd'hui. Je reviens demain, ton quota se recharge chaque jour." });
  }

  // 3. Contexte données : vues 7j, RDV 7j, profil coaching, derniers échanges
  const il7j = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: vues }, { data: rdvs }, { data: coachProfil }, { data: derniers }] = await Promise.all([
    supabase.from('wozali_profil_vues').select('id, viewer_id, viewer_prest_id').eq('profil_id', p.id).gte('created_at', il7j),
    supabase.from('wozali_rdv').select('id, statut').eq('prestataire_user_id', userId).gte('created_at', il7j),
    supabase.from('wozali_coach_profil').select('objectif, blocage, canal, note_libre').eq('user_id', userId).maybeSingle(),
    supabase.from('wozali_coach_messages').select('type, titre, corps').eq('user_id', userId)
      .in('type', ['reponse_membre', 'chat', 'lecon', 'resultat']).order('created_at', { ascending: false }).limit(8),
  ]);
  const visiteurs = new Set((vues || []).map(v => v.viewer_prest_id || v.viewer_id || ('a' + v.id))).size;

  const contexte = [
    `Membre : ${p.prenom || p.nom_complet || 'membre'}, ${p.metier_principal || 'métier non renseigné'} à ${[p.quartier, p.ville].filter(Boolean).join(', ') || 'ville non renseignée'}.`,
    `Profil : photos réalisations ${p.photo_realisation_1 || p.photo_realisation_2 ? 'oui' : 'NON'}, tarifs ${p.tarif_min_fcfa || p.tarif_max_fcfa ? 'affichés' : 'NON affichés'}, description ${(p.description_services || '').trim().length > 10 ? 'oui' : 'NON'}, statut du jour ${p.statut_jour ? 'actif' : 'non'}.`,
    `Chiffres : Score WOZALI ${p.score_wozali || 0}/100, ${p.nb_avis_recus || 0} avis (note ${p.note_moyenne || 'n/a'}), ${visiteurs} visiteurs sur 7 jours, ${(rdvs || []).length} demandes de RDV sur 7 jours, badges : ${(p.badges_auto || []).join(', ') || 'aucun'}.`,
    coachProfil ? `Coaching : objectif ${coachProfil.objectif || 'n/a'}, blocage ${coachProfil.blocage || 'n/a'}.` : '',
    (derniers || []).length ? `Derniers échanges (récents d'abord) : ${(derniers || []).map(m => `[${m.type}] ${(m.titre ? m.titre + ' : ' : '') + (m.corps || '').slice(0, 120)}`).join(' | ')}` : '',
    `Question du membre : ${message}`,
  ].filter(Boolean).join('\n');

  // 4. Appel IA (router multi-providers existant)
  const available = availableProviders();
  if (!available.length) return res.status(503).json({ error: 'Aucun provider IA configuré' });
  const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
  let response = null;
  const errors = [];
  for (const name of order) {
    try {
      response = await PROVIDERS[name].fn({ system: SYSTEM_ZALI, user: contexte, jsonMode: false, maxTokens: 320 });
      try { await logUsage({ userId, provider: name, taskType: 'coach-chat', cacheHit: false }); } catch (e) {}
      break;
    } catch (e) { errors.push({ provider: name, message: e.message }); }
  }
  if (!response) return res.status(502).json({ error: 'Tous les providers IA ont échoué', attempts: errors });

  const reponse = String(response.text || '').trim().slice(0, 1200);

  // 5. Persister l'échange dans la conversation Coach (service role)
  try {
    await supabase.from('wozali_coach_messages').insert([
      { user_id: userId, type: 'reponse_membre', corps: message, lu: true },
      { user_id: userId, type: 'chat', corps: reponse, lu: true },
    ]);
  } catch (e) { console.warn('[coach-chat] persist', e); }

  return res.status(200).json({ ok: true, reponse });
}
