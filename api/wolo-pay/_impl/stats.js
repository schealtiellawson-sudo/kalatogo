// GET /api/wolo-pay/stats?merchant_id=...
import { supabase } from '../../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { merchant_id } = req.query;
    if (!merchant_id) return res.status(400).json({ error: 'merchant_id requis' });
    const { data } = await supabase
      .from('wolo_transactions')
      .select('montant,created_at,mode_paiement,statut,reference_interne')
      .eq('merchant_id', merchant_id)
      .eq('statut', 'PAID')
      .order('created_at', { ascending: false });
    const now = new Date();
    const today = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const week = today - 6*86400000;
    const monthStart = new Date(now.getFullYear(),now.getMonth(),1).getTime();
    let todayS=0,todayN=0,weekS=0,weekN=0,monthS=0,monthN=0,totalS=0,totalN=0;
    const perDay = Array.from({length:7},(_,i)=>({day:i,amount:0}));
    (data||[]).forEach(t=>{
      const ts = new Date(t.created_at).getTime();
      totalS += t.montant; totalN++;
      if (ts>=today){ todayS+=t.montant; todayN++; }
      if (ts>=week){ weekS+=t.montant; weekN++; const idx=Math.floor((ts-week)/86400000); if(perDay[idx])perDay[idx].amount+=t.montant; }
      if (ts>=monthStart){ monthS+=t.montant; monthN++; }
    });
    return res.status(200).json({
      ok:true,
      stats: { today:{sum:todayS,count:todayN}, week:{sum:weekS,count:weekN}, month:{sum:monthS,count:monthN}, total:{sum:totalS,count:totalN} },
      perDay,
      recent: (data||[]).slice(0,15)
    });
  } catch (err) {
    console.error('[stats]', err);
    return res.status(500).json({ error: err.message });
  }
}
