// GET /api/wolo-pay/paie-bulletin?id=xxx — HTML imprimable d'un bulletin
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return res.status(500).send('Config manquante');

  const id = req.query.id;
  if (!id) return res.status(400).send('ID requis');

  try {
    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Fiches_Paie/${id}`, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` }
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).send(data.error?.message || 'Erreur');
    const f = data.fields || {};
    const fmt = n => Number(n||0).toLocaleString('fr-FR') + ' FCFA';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Bulletin de paie — ${f['Employe Nom'] || ''} — ${f['Mois'] || ''}</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:30px;color:#0f1410;}
  .sheet{max-width:680px;margin:auto;background:#fff;padding:40px;border:1px solid #ddd;border-radius:8px;}
  h1{font-family:Georgia,serif;font-size:24px;border-bottom:3px solid #E8940A;padding-bottom:10px;margin:0 0 24px;}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;}
  .row.total{border-top:2px solid #E8940A;border-bottom:none;font-weight:700;font-size:18px;color:#E8940A;margin-top:14px;padding-top:14px;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;font-size:13px;color:#555;}
  .meta strong{color:#0f1410;display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;}
  .footer{text-align:center;color:#999;font-size:11px;margin-top:30px;}
  .print-btn{position:fixed;top:20px;right:20px;background:#E8940A;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;}
  @media print{.print-btn{display:none;}body{background:#fff;padding:0;}.sheet{border:none;}}
</style></head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
  <div class="sheet">
    <h1>Bulletin de paie — ${f['Mois'] || '—'}</h1>
    <div class="meta">
      <div><strong>Employé</strong>${f['Employe Nom'] || '—'}</div>
      <div><strong>Poste</strong>${f['Poste'] || '—'}</div>
      <div><strong>Période</strong>${f['Mois'] || '—'}</div>
      <div><strong>Émis le</strong>${f['Généré le'] ? new Date(f['Généré le']).toLocaleDateString('fr-FR') : '—'}</div>
    </div>
    <div class="row"><span>Salaire de base</span><span>${fmt(f['Salaire FCFA'])}</span></div>
    ${f['Primes FCFA'] ? `<div class="row"><span>Primes</span><span>${fmt(f['Primes FCFA'])}</span></div>` : ''}
    ${f['Retenues FCFA'] ? `<div class="row"><span>Retenues</span><span>- ${fmt(f['Retenues FCFA'])}</span></div>` : ''}
    <div class="row total"><span>Net à payer</span><span>${fmt(f['Net FCFA'] || f['Salaire FCFA'])}</span></div>
    <div class="footer">Bulletin généré par WOLO Market — wolomarket.com</div>
  </div>
</body></html>`);
  } catch (err) {
    console.error('[paie-bulletin]', err.message);
    return res.status(500).send('Erreur serveur');
  }
}
