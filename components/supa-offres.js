// ================================================================
// WOZALI supaOffres — adaptateur Supabase pour les Offres d'Emploi
// Pattern : objets retournés au format Airtable {id, fields, createdTime}
// pour minimiser le refactor des fonctions JS existantes (loadOffresEmploi,
// publierOffre, loadMesOffres, showOffreDetail, etc.)
// ================================================================
(function () {
  const AT_TO_SUPA = {
    'Titre': 'titre',
    'Métier': 'metier',
    'Description': 'description',
    'Type de contrat': 'type_contrat',
    'Expérience requise': 'experience_requise',
    'Ville': 'ville',
    'Quartier': 'quartier',
    'Pays': 'pays',
    'Télétravail': 'teletravail',
    'Télétravail possible': 'teletravail', // alias écrit par le formulaire de publication
    'Créée le': 'created_at', // manquant auparavant : cassait le filtre "moins de 48h", les alertes et l'affichage des dates
    'Salaire min FCFA': 'salaire_min_fcfa',
    'Salaire max FCFA': 'salaire_max_fcfa',
    'Salaire minimum FCFA': 'salaire_min_fcfa',
    'Salaire maximum FCFA': 'salaire_max_fcfa',
    'Salaire affiché': 'salaire_affiche',
    'Photo 1': 'photo_1',
    'Photo 2': 'photo_2',
    'Photo 3': 'photo_3',
    'Active': 'active',
    'Urgente': 'urgente',
    'Date expiration': 'date_expiration',
    'Vues': 'nb_vues',
    'Nb candidatures': 'nb_candidatures',
    'Recruteur ID': 'recruteur_prestataire_id',
    'Recruteur Nom': 'recruteur_nom',
    'Recruteur WhatsApp': 'recruteur_whatsapp',
    'Recruteur User ID': 'recruteur_user_id',
    'Recruteur vérifié': 'recruteur_verifie',
    'airtable_record_id': 'airtable_record_id',
    // Boost offres
    'Boost Until': 'boost_until',
    'Boost Type': 'boost_type',
    'Boost Ref': 'boost_ref',
    'Boost Statut': 'boost_statut',
  };

  function _supa() { return window.supabase || window.supa; }

  function _toAirtableRecord(row) {
    if (!row) return null;
    const fields = {};
    for (const [atName, supaCol] of Object.entries(AT_TO_SUPA)) {
      const v = row[supaCol];
      if (v != null) fields[atName] = v;
    }
    // Dérivé : si salaire_affiche absent en DB, l'inférer depuis salaire_min_fcfa
    if (fields['Salaire affiché'] == null && row.salaire_min_fcfa != null) {
      fields['Salaire affiché'] = true;
    }
    return { id: row.id, fields, createdTime: row.created_at };
  }

  function _toSupaRow(fields) {
    const row = {};
    for (const [atName, value] of Object.entries(fields || {})) {
      const supaCol = AT_TO_SUPA[atName];
      if (supaCol) row[supaCol] = value;
    }
    return row;
  }

  // ============================================================
  // List avec filtres optionnels
  // Options : { active, recruteur_user_id, metier, ville, quartier, urgente, ids[], limit, orderBy, orderDir }
  // ============================================================
  async function list(options = {}) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    let q = supa.from('wozali_offres_emploi').select('*');
    if (options.active !== undefined) q = q.eq('active', options.active);
    if (options.recruteur_user_id) q = q.eq('recruteur_user_id', options.recruteur_user_id);
    if (options.recruteur_prestataire_id) q = q.eq('recruteur_prestataire_id', options.recruteur_prestataire_id);
    if (options.metier)   q = q.eq('metier', options.metier);
    if (options.ville)    q = q.eq('ville', options.ville);
    if (options.quartier) q = q.eq('quartier', options.quartier);
    if (options.urgente === true) q = q.eq('urgente', true);
    if (Array.isArray(options.ids) && options.ids.length > 0) q = q.in('id', options.ids);
    if (options.search) {
      const s = options.search.replace(/[%_]/g, '');
      q = q.or(`titre.ilike.%${s}%,metier.ilike.%${s}%,description.ilike.%${s}%`);
    }
    const orderBy = options.orderBy || 'created_at';
    const orderDir = options.orderDir || 'desc';
    // Offres boostées actives remontent en premier (boost_until > now)
    // withBoostSort: true requis — seulement si la migration boost est appliquée
    if (options.withBoostSort) {
      q = q.order('boost_until', { ascending: false, nullsFirst: false });
    }
    q = q.order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    const now = new Date();
    const rows = (data || []).map(r => {
      const rec = _toAirtableRecord(r);
      // Dériver isBoosted pour le frontend
      rec._isBoosted = !!(r.boost_until && new Date(r.boost_until) > now && r.boost_statut === 'actif');
      return rec;
    });
    return rows;
  }

  async function findById(id) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { data, error } = await supa.from('wozali_offres_emploi').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function create(fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    if (!row.recruteur_user_id && window.currentUser?.id) row.recruteur_user_id = window.currentUser.id;
    if (row.active === undefined) row.active = true;
    const { data, error } = await supa.from('wozali_offres_emploi').insert(row).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function update(id, fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    delete row.recruteur_user_id;
    const { data, error } = await supa.from('wozali_offres_emploi').update(row).eq('id', id).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function deleteById(id) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { error } = await supa.from('wozali_offres_emploi').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Incrémenter nb_vues atomiquement (best-effort).
  // Passe par la fonction SQL increment_vues_offre() en SECURITY DEFINER :
  // un non-propriétaire ne peut pas faire d'UPDATE direct sur l'offre
  // (RLS "offres_update_own" réservée au recruteur), donc l'ancienne version
  // de cette fonction échouait silencieusement pour tout visiteur/candidat.
  // Voir supabase/migrations/20260721_candidatures_notifications.sql
  async function incrementVues(id) {
    const supa = _supa();
    if (!supa || !id) return null;
    try {
      const { data, error } = await supa.rpc('increment_vues_offre', { p_offre_id: id });
      if (error) throw error;
      return typeof data === 'number' ? data : null;
    } catch (e) { return null; }
  }

  window.supaOffres = { list, findById, create, update, deleteById, incrementVues };
})();
