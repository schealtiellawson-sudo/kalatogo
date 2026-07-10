// ================================================================
// Score WOZALI — Calcul complet sur 100 points (6 composantes)
// Utilisé par le cron horaire + endpoint dashboard
// Source de données : Supabase (100% — Airtable retiré)
// ================================================================

// ── 1. Profil complet (max 30 pts) ──
// Photo 8, Bio 7, Métier 5, Ville+Quartier 5, Numéro 5
function scoreProfil(fields) {
  let pts = 0;
  if (fields['Photo Profil'])              pts += 8;
  if ((fields['Description des services'] || '').trim().length > 10) pts += 7;
  if (fields['Métier principal'])          pts += 5;
  if (fields['Quartier'] || fields['Ville']) pts += 5;
  if (fields['Numéro de téléphone'] || fields['WhatsApp']) pts += 5;
  return pts; // max 30
}

// ── 2. Note moyenne clients (max 25 pts) ──
function scoreNote(noteMoyenne) {
  if (noteMoyenne >= 4.5) return 25;
  if (noteMoyenne >= 4.0) return 20;
  if (noteMoyenne >= 3.0) return 12;
  return 0;
}

// ── 3. Nombre d'avis (max 15 pts) ──
function scoreAvis(nbAvis) {
  if (nbAvis >= 21) return 15;
  if (nbAvis >= 11) return 13;
  if (nbAvis >= 6)  return 11;
  if (nbAvis >= 3)  return 7;
  if (nbAvis >= 1)  return 3;
  return 0;
}

// ── 4. Photos publiées (max 10 pts) ──
function scorePhotos(fields) {
  let nb = 0;
  if (fields['Photo Réalisation 1']) nb++;
  if (fields['Photo Réalisation 2']) nb++;
  if (fields['Photo Réalisation 3']) nb++;
  // Albums JSON → photos supplémentaires
  try {
    const albums = JSON.parse(fields['Albums'] || '[]');
    for (const a of albums) nb += (a.photos || []).length;
  } catch {}
  if (nb >= 6) return 10;
  if (nb >= 3) return 6;
  if (nb >= 1) return 3;
  return 0;
}

// ── 5. Vues du profil (max 10 pts) ──
// Progressif : 0 vue = 0, 100+ = 10
function scoreVues(vuesMois) {
  if (vuesMois <= 0) return 0;
  if (vuesMois >= 100) return 10;
  return Math.round((vuesMois / 100) * 10);
}

// ── 6. Activité récente (max 10 pts) ──
function scoreActivite(derniereActivite) {
  if (!derniereActivite) return 0;
  const jours = (Date.now() - new Date(derniereActivite).getTime()) / 86400000;
  if (jours <= 3)  return 10;
  if (jours <= 7)  return 7;
  if (jours <= 14) return 4;
  return 0;
}

// ── Calcul total ──
export function calculerScoreWozali({ fields, noteMoyenne, nbAvis, vuesMois, derniereActivite }) {
  const composantes = {
    profil:   scoreProfil(fields),         // max 30
    note:     scoreNote(noteMoyenne),      // max 25
    avis:     scoreAvis(nbAvis),           // max 15
    photos:   scorePhotos(fields),         // max 10
    vues:     scoreVues(vuesMois),         // max 10
    activite: scoreActivite(derniereActivite), // max 10
  };
  composantes.total = Math.min(
    composantes.profil + composantes.note + composantes.avis +
    composantes.photos + composantes.vues + composantes.activite,
    100
  );
  return composantes;
}

// ── Pente douce : -1pt/jour après 14j inactivité ──
export function penteDouce(scoreActuel, derniereActivite) {
  if (!derniereActivite) return scoreActuel;
  const jours = (Date.now() - new Date(derniereActivite).getTime()) / 86400000;
  if (jours < 14) return scoreActuel;
  const malus = Math.floor(jours - 13); // -1 à J14, -2 à J15, etc.
  return Math.max(0, scoreActuel - malus);
}

// ── Fetch Supabase helpers ──
// Supabase plafonne une requête à 1000 lignes par défaut : on pagine
// avec .range() pour couvrir toutes les lignes (scan de table complet).
async function fetchAllSupabase(supabase, table, columns, applyFilters) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (typeof applyFilters === 'function') query = applyFilters(query);
    const { data, error } = await query;
    if (error) { console.error(`[supa] ${table}:`, error.message || error); break; }
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// ── Batch recalcul pour tous les membres ──
// Retourne un tableau [{ userId, email, scoreFinal, composantes, ancienScore, derniereActivite }]
export async function recalculerTousLesScores(supabase) {
  // 1. Charger TOUS les prestataires Supabase (source unique de vérité)
  //    On lit directement les colonnes nécessaires au scoring + vues + updated_at + score courant.
  const prestataires = await fetchAllSupabase(
    supabase,
    'wozali_prestataires',
    'id, user_id, email, photo_profil, photo_realisation_1, photo_realisation_2, photo_realisation_3, albums, description_services, metier_principal, quartier, ville, numero_telephone, whatsapp, score_wozali, vues_30j, nb_vues_profil, updated_at'
  );

  // 2. Charger TOUS les avis validés Supabase (pour note + nb)
  const avis = await fetchAllSupabase(
    supabase,
    'wozali_avis',
    'prestataire_id, note_globale, validated',
    (q) => q.eq('validated', true)
  );

  // 3. Grouper les avis par Prestataire ID (id du record wozali_prestataires)
  const avisParPrest = {};
  for (const a of avis) {
    const pid = a.prestataire_id;
    if (!pid) continue;
    if (!avisParPrest[pid]) avisParPrest[pid] = [];
    avisParPrest[pid].push(a);
  }

  // 4. Calculer pour chaque prestataire
  const resultats = [];

  for (const prest of prestataires) {
    // Reconstruit un objet `fields` au format attendu par les fonctions de scoring
    const f = {
      'Photo Profil':             prest.photo_profil,
      'Photo Réalisation 1':       prest.photo_realisation_1,
      'Photo Réalisation 2':       prest.photo_realisation_2,
      'Photo Réalisation 3':       prest.photo_realisation_3,
      // albums est du JSONB Supabase (objet/array) ; scorePhotos fait JSON.parse,
      // donc on le re-stringifie si nécessaire pour rester compatible.
      'Albums':                    typeof prest.albums === 'string' ? prest.albums : JSON.stringify(prest.albums || []),
      'Description des services':  prest.description_services,
      'Métier principal':          prest.metier_principal,
      'Quartier':                  prest.quartier,
      'Ville':                     prest.ville,
      'Numéro de téléphone':       prest.numero_telephone,
      'WhatsApp':                  prest.whatsapp,
    };

    // Avis pour ce prestataire
    const mesAvis = avisParPrest[prest.id] || [];
    const nbAvis = mesAvis.length;
    let noteMoyenne = 0;
    if (nbAvis > 0) {
      const sum = mesAvis.reduce((s, a) => s + (a.note_globale || 0), 0);
      noteMoyenne = sum / nbAvis;
    }

    // updated_at = meilleur proxy pour dernière activité
    const derniereActivite = prest.updated_at || null;
    const vuesMois = prest.vues_30j || prest.nb_vues_profil || 0;

    const composantes = calculerScoreWozali({
      fields: f,
      noteMoyenne,
      nbAvis,
      vuesMois,
      derniereActivite,
    });

    // Appliquer pente douce
    const scoreFinal = penteDouce(composantes.total, derniereActivite);

    resultats.push({
      userId:    prest.user_id,
      email:     (prest.email || '').toLowerCase(),
      scoreFinal,
      composantes,
      ancienScore: prest.score_wozali || 0,
      derniereActivite,
    });
  }

  return resultats;
}
