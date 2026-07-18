// POST /api/wozali-pay/signalement-create
// Body: { motif, target_user_id?, target_offre_airtable_id?, target_candidature_airtable_id?, description?, conversation? }
// Sprint Polish — anti-arnaque + médiation
// Chantier 8 Dignité (2026-07-18) : motif 'malaise' + analyse IA de la
// conversation SIGNALÉE (jamais de scan global), gel automatique si
// gravité haute, suspension à la récidive. La victime reçoit toujours
// un message de soutien immédiat, jamais de silence.
import { supabase } from '../../_lib/supabase.js';
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';

const VALID_MOTIFS = ['arnaque', 'ghosting', 'fake_offre', 'harcelement', 'contenu_inapproprie', 'malaise', 'autre'];

const SYSTEM_ANALYSE = `Tu analyses une conversation signalée par un membre d'une plateforme de mise en relation professionnelle au Togo/Bénin, qui s'est senti mal à l'aise. Contexte : des femmes se voient parfois demander des faveurs en échange d'un emploi ou d'un contrat. Ta mission : protéger la personne qui signale, sans condamner à tort.
Classe la conversation. Réponds UNIQUEMENT en JSON :
{"classification": "sollicitation_sexuelle" | "chantage_emploi" | "insistance_deplacee" | "injures" | "rien_detecte", "gravite": <0-100>, "justification": "<1-2 phrases factuelles en français>"}
Barème gravité : sollicitation sexuelle explicite ou chantage emploi contre faveurs = 85-100. Insistance déplacée répétée, propos à connotation sexuelle = 60-84. Injures, mépris = 40-59. Ambigu = 20-39. Rien de problématique = 0-19. En cas de doute réel, choisis la gravité BASSE : un humain revoit tous les signalements.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { motif, target_user_id, target_offre_airtable_id, target_candidature_airtable_id, description, conversation } = req.body || {};

  if (!motif || !VALID_MOTIFS.includes(motif)) {
    return res.status(400).json({ error: 'motif invalide', valid: VALID_MOTIFS });
  }
  if (!target_user_id && !target_offre_airtable_id && !target_candidature_airtable_id) {
    return res.status(400).json({ error: 'au moins une cible requise' });
  }

  // Conversation signalée (max 20 messages, 300 caractères chacun)
  let convTexte = '';
  if (Array.isArray(conversation) && conversation.length) {
    convTexte = conversation.slice(-20)
      .map(m => `${m.de === 'moi' ? 'Signaleur' : 'Autre'}: ${String(m.texte || '').slice(0, 300)}`)
      .join('\n');
  }

  const { data, error } = await supabase
    .from('wozali_signalements')
    .insert({
      reporter_user_id: userId,
      target_user_id: target_user_id || null,
      target_offre_airtable_id: target_offre_airtable_id || null,
      target_candidature_airtable_id: target_candidature_airtable_id || null,
      motif,
      description: [description, convTexte ? '--- Conversation signalée ---\n' + convTexte : ''].filter(Boolean).join('\n').slice(0, 4000),
    })
    .select('id, statut, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ── Analyse IA (motifs sensibles uniquement, sur la conversation signalée) ──
  let analyse = null;
  if (['malaise', 'harcelement'].includes(motif) && (convTexte || description)) {
    try {
      const available = availableProviders();
      const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
      for (const name of order) {
        try {
          const r = await PROVIDERS[name].fn({
            system: SYSTEM_ANALYSE,
            user: (convTexte || description || '').slice(0, 4000),
            jsonMode: true, maxTokens: 250,
          });
          try { analyse = JSON.parse(r.text); } catch (e) {
            const m = String(r.text || '').match(/\{[\s\S]*\}/);
            if (m) analyse = JSON.parse(m[0]);
          }
          if (analyse) break;
        } catch (e) { /* provider suivant */ }
      }
    } catch (e) { console.warn('[signalement] analyse ia', e); }

    if (analyse && typeof analyse.gravite === 'number') {
      const gravite = Math.max(0, Math.min(100, Math.round(analyse.gravite)));
      await supabase.from('wozali_signalements').update({
        ia_classification: String(analyse.classification || '').slice(0, 60),
        ia_gravite: gravite,
        ia_justification: String(analyse.justification || '').slice(0, 500),
        ...(gravite >= 60 ? { statut: 'urgent' } : {}),
      }).eq('id', data.id);

      if (target_user_id) {
        // Gel automatique : gravité très haute, OU récidive (2 signalements
        // graves venant de personnes DIFFÉRENTES sur la même cible).
        let geler = gravite >= 85;
        if (!geler && gravite >= 60) {
          const { data: anciens } = await supabase.from('wozali_signalements')
            .select('id, reporter_user_id, ia_gravite')
            .eq('target_user_id', target_user_id)
            .gte('ia_gravite', 60);
          const reporters = new Set((anciens || []).map(a => a.reporter_user_id));
          if (reporters.size >= 2) geler = true;
        }
        if (geler) {
          try {
            await supabase.from('wolo_statut_compte')
              .upsert({ user_id: target_user_id, statut: 'suspendu_abus' });
          } catch (e) { console.warn('[signalement] gel', e); }
        }
      }
    }
  }

  // Message de soutien immédiat : la victime n'est jamais laissée dans le silence.
  const soutien = ['malaise', 'harcelement'].includes(motif)
    ? "On t'a lue. Tu as bien fait de le dire : personne n'a à accepter ça pour travailler. La conversation est analysée dès maintenant, et les abus signalés ne restent jamais sans conséquences sur WOZALI. Tu peux bloquer cette personne et continuer ta route, on s'occupe du reste."
    : 'Signalement bien reçu. Notre équipe va vérifier.';

  return res.status(200).json({ ok: true, signalement: data, soutien });
}
