// ================================================================
// WOLO supaRdv — adaptateur Supabase pour les Rendez-vous
// Format de retour Airtable {id, fields, createdTime}
// ================================================================
(function () {
  const AT_TO_SUPA = {
    'Prestataire ID':      'prestataire_id',
    'Prestataire User ID': 'prestataire_user_id',
    'Client User ID':      'client_user_id',
    'Client Nom':          'client_nom',
    'Client Email':        'client_email',
    'Client Téléphone':    'client_telephone',
    'Date':                'date_rdv',
    'Date RDV':            'date_rdv',
    'Heure':               'heure_rdv',
    'Heure RDV':           'heure_rdv',
    'Service':             'service',
    'Durée minutes':       'duree_minutes',
    'Message':             'message',
    'Lieu':                'lieu',
    'Statut':              'statut',
  };

  function _supa() { return window.supabase || window.supa; }

  function _toAirtableRecord(row) {
    if (!row) return null;
    const fields = {};
    for (const [atName, supaCol] of Object.entries(AT_TO_SUPA)) {
      const v = row[supaCol];
      if (v != null) fields[atName] = v;
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

  async function list(options = {}) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    let q = supa.from('wolo_rdv').select('*');
    if (options.prestataire_id)      q = q.eq('prestataire_id', options.prestataire_id);
    if (options.prestataire_user_id) q = q.eq('prestataire_user_id', options.prestataire_user_id);
    if (options.client_user_id)      q = q.eq('client_user_id', options.client_user_id);
    if (options.statut)              q = q.eq('statut', options.statut);
    if (options.from_date)           q = q.gte('date_rdv', options.from_date);
    if (options.to_date)             q = q.lte('date_rdv', options.to_date);
    q = q.order('date_rdv', { ascending: options.upcoming === true });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_toAirtableRecord);
  }

  async function create(fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    if (!row.statut) row.statut = 'Demandé';
    if (!row.date_rdv) throw new Error('Date du RDV requise');
    if (!row.client_nom) throw new Error('Nom du client requis');
    const { data, error } = await supa.from('wolo_rdv').insert(row).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function update(id, fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    delete row.prestataire_user_id;
    delete row.client_user_id;
    const { data, error } = await supa.from('wolo_rdv').update(row).eq('id', id).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function updateStatut(id, statut) {
    return update(id, { Statut: statut });
  }

  window.supaRdv = { list, create, update, updateStatut };
})();
