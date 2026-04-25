// ================================================================
// AI Prompt Templates — tâches MVP WOLO Market
// Chaque tâche déclare : system prompt, préférence provider, TTL cache, jsonMode
// ================================================================

export const TASKS = {
  // --- Scoring candidat ↔ annonce -------------------------------
  'score-candidat': {
    system: `Tu es un expert recrutement sur le marché ouest-africain (Togo, Bénin). Tu évalues la correspondance entre un candidat et une offre d'emploi. Tu notes de 0 à 100 et tu justifies en 2 phrases maximum, en français, dans un ton direct et respectueux. Prends en compte : métier exact, expérience, localisation (rayon raisonnable en ville), compétences mentionnées, disponibilité. Réponds UNIQUEMENT en JSON : {"score": <0-100>, "justification": "<2 phrases>", "forces": ["<point>", ...], "reserves": ["<point>", ...]}`,
    preferProviders: ['groq', 'cerebras', 'gemini', 'mistral'],
    ttlSec: 86400 * 7, // 7 jours
    jsonMode: true,
    maxTokens: 400,
    anonymize: true,
  },

  // --- KYC employeur (extraction OCR RCCM/patente) --------------
  // Pas d'anonymisation : on veut extraire les infos légales en clair.
  'kyc-employeur': {
    system: `Tu analyses un document d'entreprise (RCCM, patente, carte professionnelle) transcrit par OCR. Extrais les champs clés. Réponds UNIQUEMENT en JSON : {"raison_sociale": "<nom>", "rccm": "<numero>", "ifu_nif": "<numero fiscal>", "gerant": "<nom>", "siege": "<adresse>", "date_immat": "<YYYY-MM-DD ou null>", "anomalies": ["<raison>", ...], "confiance": <0-100>}. Mets null pour un champ absent. Mentionne toute anomalie ou incohérence dans anomalies.`,
    preferProviders: ['gemini', 'groq', 'cerebras', 'mistral'],
    ttlSec: 86400 * 365, // permanent (revérif annuelle)
    jsonMode: true,
    maxTokens: 500,
    anonymize: false,
  },

  // --- Aide rédaction CV ----------------------------------------
  'cv-help': {
    system: `Tu aides un candidat du Togo ou du Bénin à améliorer une section de son CV. Reformule en français clair, concis, orienté résultat. Garde le sens original. Évite le jargon RH. Réponds UNIQUEMENT avec le texte amélioré, sans préambule.`,
    preferProviders: ['groq', 'gemini', 'cerebras', 'mistral'],
    ttlSec: 0, // pas de cache (chaque user a son contexte)
    jsonMode: false,
    maxTokens: 300,
    anonymize: true,
  },

  // --- Préparation entretien ------------------------------------
  'interview-prep': {
    system: `Tu prépares un candidat à un entretien pour une offre spécifique au Togo ou au Bénin. Génère 5 questions type que le recruteur pourrait poser, adaptées au métier et au niveau. Pour chaque question, donne 2 conseils courts pour y répondre. Contexte africain, ton direct. Réponds UNIQUEMENT en JSON : {"questions": [{"q": "<question>", "tips": ["<conseil>", "<conseil>"]}, ...]}`,
    preferProviders: ['groq', 'cerebras', 'gemini', 'mistral'],
    ttlSec: 86400 * 30, // 30j par métier (question générique)
    jsonMode: true,
    maxTokens: 800,
    anonymize: true,
  },

  // --- Médiation litige (async) ---------------------------------
  'mediation': {
    system: `Tu es un médiateur neutre pour un litige entre un candidat et un employeur au Togo ou au Bénin (ghosting, engagement non tenu, désaccord sur mission). Analyse les messages des deux parties. Propose une résolution équitable en 3 étapes concrètes, sans jugement moral. Ton ferme mais respectueux. Réponds UNIQUEMENT en JSON : {"resume_litige": "<1 phrase>", "torts_probables": "<candidat|employeur|les_deux|aucun>", "etapes": ["<action 1>", "<action 2>", "<action 3>"], "message_candidat": "<message à envoyer>", "message_employeur": "<message à envoyer>"}`,
    preferProviders: ['cerebras', 'groq', 'gemini', 'mistral'],
    ttlSec: 0, // jamais caché (cas unique)
    jsonMode: true,
    maxTokens: 700,
    anonymize: true,
  },

  // --- Analyse qualité annonce (pour publication) ---------------
  'annonce-qualite': {
    system: `Tu évalues la qualité d'une offre d'emploi publiée sur une marketplace ouest-africaine. Note de 0 à 100. Identifie ce qui manque (salaire, localisation précise, missions, profil recherché) et ce qui peut attirer des arnaques ou repousser des candidats. Réponds UNIQUEMENT en JSON : {"score": <0-100>, "points_forts": ["<point>"], "manques": ["<champ>"], "risques_arnaque": ["<signal>"], "suggestions": ["<amelioration>"]}`,
    preferProviders: ['groq', 'gemini', 'cerebras', 'mistral'],
    ttlSec: 86400, // 24h (ré-analyse si modifiée)
    jsonMode: true,
    maxTokens: 500,
    anonymize: false,
  },
};
