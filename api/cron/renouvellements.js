// ================================================================
// CRON — Renouvellements automatiques des abonnements Pro
// Vercel schedule : 0 8 * * *  (08h00 UTC tous les jours)
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { debiterCreditWozali, envoyerNotification } from '../_utils/credit.js';
import { traiterPaiementAbonnement } from '../_lib/abonnement.js';

const MONTANT_PRO = 2500;

export default async function handler(req, res) {
  // Sécurité : vérifier le secret CRON de Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 86400000);

    // 1) Notifications J-3 aux abonnements qui expirent bientôt
    const { data: expBientot = [] } = await supabase
      .from('abonnements')
      .select('id, user_id, date_fin')
      .eq('plan', 'pro')
      .eq('statut', 'actif')
      .eq('renouvellement_auto', true)
      .gte('date_fin', now.toISOString())
      .lte('date_fin', in3days.toISOString());

    for (const abo of expBientot) {
      await envoyerNotification({
        user_id: abo.user_id,
        titre: 'Ton Plan Pro expire dans 3 jours',
        corps: 'Renouvelle maintenant pour ne pas perdre ton QR code et l\'accès aux paiements clients.'
      });
    }

    // 2) Jour J : tentative de débit Crédit WOZALI
    const { data: echus = [] } = await supabase
      .from('abonnements')
      .select('id, user_id, date_fin')
      .eq('plan', 'pro')
      .eq('statut', 'actif')
      .eq('renouvellement_auto', true)
      .lte('date_fin', now.toISOString());

    const results = { notifies: expBientot.length, renouveles: 0, echecs: 0, expires: 0 };

    for (const abo of echus) {
      // Vérifie solde Crédit WOZALI
      const { data: credit } = await supabase
        .from('wozali_credit')
        .select('solde_disponible')
        .eq('user_id', abo.user_id)
        .single();

      if (credit && credit.solde_disponible >= MONTANT_PRO) {
        try {
          // Créer paiement + débiter + activer Pro via le flux central
          const { data: paiement } = await supabase
            .from('paiements_abonnements')
            .insert({
              abonnement_id: abo.id,
              user_id: abo.user_id,
              montant: MONTANT_PRO,
              statut: 'EN_ATTENTE',
              methode: 'credit_wozali',
              parrainage_traite: false
            })
            .select()
            .single();

          await debiterCreditWozali({
            user_id: abo.user_id,
            montant: MONTANT_PRO,
            type: 'debit_abonnement',
            description: 'Renouvellement auto Plan Pro'
          });

          await traiterPaiementAbonnement({
            user_id: abo.user_id,
            paiement_id: paiement.id,
            montant: MONTANT_PRO,
            methode: 'credit_wozali'
          });

          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Plan Pro renouvelé ✅',
            corps: `2 500 FCFA débités de ton Crédit WOZALI · Valide encore 1 mois`
          });

          results.renouveles++;
        } catch (e) {
          results.echecs++;
          console.error('[renouvellement]', abo.user_id, e.message);
        }
      } else {
        // Solde insuffisant : 48h de grâce puis expiration
        const dateGrace = new Date(abo.date_fin);
        dateGrace.setHours(dateGrace.getHours() + 48);

        if (now > dateGrace) {
          await supabase
            .from('abonnements')
            .update({ statut: 'expiré', plan: 'gratuit' })
            .eq('id', abo.id);
          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Plan Pro expiré',
            corps: 'Ton QR code est désactivé. Recharge ton Crédit WOZALI et réactive ton Plan Pro.'
          });
          results.expires++;
        } else {
          await envoyerNotification({
            user_id: abo.user_id,
            titre: 'Crédit WOZALI insuffisant',
            corps: 'Ton Crédit WOZALI est insuffisant pour renouveler. Recharge maintenant pour éviter l\'expiration dans 48h.'
          });
          results.echecs++;
        }
      }
    }

    // 3) Séquence J+30 — message de check-in fondateur (messagerie interne WOZALI)
    const j30Start = new Date(now.getTime() - 31 * 86400000).toISOString();
    const j30End   = new Date(now.getTime() - 29 * 86400000).toISOString();

    const { data: j30Users = [] } = await supabase
      .from('wozali_prestataires')
      .select('id, notifications, nom_complet, metier_principal, ville')
      .gte('created_at', j30Start)
      .lte('created_at', j30End);

    let j30Sent = 0;
    for (const p of j30Users) {
      const notifs = Array.isArray(p.notifications) ? p.notifications : [];
      if (notifs.some(n => typeof n?.id === 'string' && n.id.startsWith('j30_'))) continue;

      const metier = p.metier_principal ? ` ${p.metier_principal}` : '';
      const newMsg = {
        id: `j30_${p.id.slice(0, 8)}_${Date.now()}`,
        type: 'message_fondateur',
        title: 'Un mois sur WOZALI. Et maintenant ?',
        body: `Ca fait 30 jours que tu es sur la plateforme.\n\nUn conseil concret : si tu n'as pas encore ajouté de photos de ton travail${metier}, fais-le aujourd'hui. Les profils avec photos reçoivent 5 fois plus de contacts que les profils sans.\n\nTon profil est ta vitrine. Des clients de ${p.ville || 'ta ville'} cherchent ce soir.\n\nSi tu as des questions, réponds directement ici.`,
        from: 'Schealtiel Lawson, fondateur WOZALI',
        created_at: new Date().toISOString(),
        read: false,
        action_url: '?section=photos',
      };

      const { error: upErr } = await supabase
        .from('wozali_prestataires')
        .update({ notifications: [...notifs, newMsg] })
        .eq('id', p.id);

      if (!upErr) j30Sent++;
      else console.error('[j30] update error', p.id, upErr.message);
    }
    results.j30_sent = j30Sent;

    return res.status(200).json({ ok: true, ...results });
  } catch (err) {
    console.error('[cron/renouvellements]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
