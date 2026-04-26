// ================================================================
// WOLO supaPrest — adaptateur Supabase pour la table Prestataires
// Remplace les appels Airtable AT_URL('Prestataires') par Supabase.
// Expose des objets au format Airtable {id, fields, createdTime} pour
// que le code existant (~25 fonctions) continue de marcher avec un
// minimum de refactoring.
// ================================================================
(function () {
  // Mapping bidirectionnel champs Airtable ↔ colonnes Supabase
  const AT_TO_SUPA = {
    'Email': 'email',
    'Nom complet': 'nom_complet',
    'Numéro de téléphone': 'numero_telephone',
    'WhatsApp': 'whatsapp',
    'Métier principal': 'metier_principal',
    'Description des services': 'description_services',
    'Diplomes': 'diplomes',
    "Années d'expérience": 'annees_experience',
    'Langues parlées': 'langues_parlees',
    'Quartier': 'quartier',
    'Ville': 'ville',
    'Latitude': 'latitude',
    'Longitude': 'longitude',
    'Tarif minimum FCFA': 'tarif_min_fcfa',
    'Tarif maximum FCFA': 'tarif_max_fcfa',
    'Lien TikTok': 'lien_tiktok',
    'Lien Instagram': 'lien_instagram',
    'Photo de profil': 'photo_profil',
    'Photo Réalisation 1': 'photo_realisation_1',
    'Photo Réalisation 2': 'photo_realisation_2',
    'Photo Réalisation 3': 'photo_realisation_3',
    'Albums': 'albums',
    'Abonnement': 'abonnement',
    'Code Paiement': 'code_paiement',
    'Plan Demande': 'plan_demande',
    'Code Parrainage': 'code_parrainage',
    'Parrain Code': 'parrain_code',
    'Disponible maintenant': 'disponible_maintenant',
    'Disponibilités Hebdo': 'disponibilites_hebdo',
    'Note moyenne': 'note_moyenne',
    "Nombre d'avis reçus": 'nb_avis_recus',
    'Nombre de vues profil': 'nb_vues_profil',
    'Vues 7j': 'vues_7j',
    'Vues 30j': 'vues_30j',
    'Nombre de transactions': 'nb_transactions',
    'Score WOLO': 'score_wolo',
    'Résumé Profil IA': 'resume_profil_ia',
    'Badge vérifié': 'badge_verifie',
    'Recruteur vérifié': 'recruteur_verifie',
    'Notifications': 'notifications',
    'Genre': 'genre',
    'Âge': 'age',
    'Date de naissance': 'date_naissance',
    'User ID': 'user_id',
    'Tags': 'tags',
  };

  function _supa() { return window.supabase || window.supa; }

  // Convertit une row Supabase → format Airtable {id, fields, createdTime}
  function _toAirtableRecord(row) {
    if (!row) return null;
    const fields = {};
    for (const [atName, supaCol] of Object.entries(AT_TO_SUPA)) {
      const v = row[supaCol];
      if (v != null) {
        // Photo de profil Airtable était parfois un attachment array; on garde une URL string
        // Albums + Notifications + Disponibilités Hebdo : Supabase JSONB → renvoyer la valeur directe (objets)
        // Le code existant fait souvent JSON.parse(record.fields['Albums']) — on stringify pour compat
        if (['albums', 'notifications', 'disponibilites_hebdo'].includes(supaCol) && typeof v === 'object') {
          fields[atName] = JSON.stringify(v);
        } else {
          fields[atName] = v;
        }
      }
    }
    return {
      id: row.id,
      fields,
      createdTime: row.created_at,
    };
  }

  // Convertit un objet de fields (clés Airtable) → row Supabase (clés snake_case)
  function _toSupaRow(fields) {
    const row = {};
    for (const [atName, value] of Object.entries(fields || {})) {
      const supaCol = AT_TO_SUPA[atName];
      if (!supaCol) continue;
      // Parser les JSON strings vers objets pour les colonnes JSONB
      if (['albums', 'notifications', 'disponibilites_hebdo'].includes(supaCol) && typeof value === 'string') {
        try { row[supaCol] = JSON.parse(value); } catch { row[supaCol] = null; }
      } else {
        row[supaCol] = value;
      }
    }
    return row;
  }

  async function findByEmail(email) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { data, error } = await supa
      .from('wolo_prestataires')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function findById(id) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { data, error } = await supa
      .from('wolo_prestataires')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function findByUserId(userId) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { data, error } = await supa
      .from('wolo_prestataires')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function create(fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    if (!row.user_id && window.currentUser?.id) row.user_id = window.currentUser.id;
    const { data, error } = await supa
      .from('wolo_prestataires')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function update(id, fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    delete row.user_id; // protégé par RLS, ne jamais réécrire
    const { data, error } = await supa
      .from('wolo_prestataires')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  // ============================================================
  // List / search avec filtres optionnels (utilisé par recherche)
  // ============================================================
  // Options : { metier, quartier, ville, abonnement, disponible, ids[], orderBy, orderDir, limit, search }
  async function list(options = {}) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    let q = supa.from('wolo_prestataires').select('*');

    if (options.metier)    q = q.eq('metier_principal', options.metier);
    if (options.quartier)  q = q.eq('quartier', options.quartier);
    if (options.ville)     q = q.eq('ville', options.ville);
    if (options.abonnement) q = q.eq('abonnement', options.abonnement);
    if (options.disponible === true) q = q.eq('disponible_maintenant', true);
    if (Array.isArray(options.ids) && options.ids.length > 0) q = q.in('id', options.ids);

    if (options.search) {
      // Recherche sur nom/métier/description
      const s = options.search.replace(/[%_]/g, '');
      q = q.or(`nom_complet.ilike.%${s}%,metier_principal.ilike.%${s}%,description_services.ilike.%${s}%`);
    }

    const orderBy = options.orderBy || 'note_moyenne';
    const orderDir = options.orderDir || 'desc';
    q = q.order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false });

    if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_toAirtableRecord);
  }

  // ============================================================
  // Update atomic d'un seul champ (utilisé pour notif, score, vues…)
  // ============================================================
  async function updateField(id, atFieldName, value) {
    return update(id, { [atFieldName]: value });
  }

  window.supaPrest = {
    findByEmail, findById, findByUserId,
    create, update, updateField,
    list,
    _toAirtableRecord, _toSupaRow, AT_TO_SUPA, // exposés pour debug/avancé
  };
})();
