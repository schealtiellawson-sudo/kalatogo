// ================================================================
// Mur des Reines — Acheter un boost pour remonter une photo
// POST /api/wolo-pay/boost-acheter
// Body: { user_id, photo_id, duree_h? (default 24), prix_fcfa? (default 500) }
// Utilise le solde WOLO Pay du user (débit)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { user_id, photo_id, duree_h = 24, prix_fcfa = 500 } = req.body || {};
  if (!user_id || !photo_id) return res.status(400).json({ error: 'user_id, photo_id requis' });

  try {
    // Vérifier que la photo appartient bien au user
    const { data: photo } = await supabase
      .from('feed_photos')
      .select('id, user_id, boost_until')
      .eq('id', photo_id)
      .single();

    if (!photo) return res.status(404).json({ error: 'Photo introuvable' });
    if (photo.user_id !== user_id) return res.status(403).json({ error: 'Cette photo ne t\'appartient pas' });

    // Vérifier qu'elle n'est pas déjà boostée
    if (photo.boost_until && new Date(photo.boost_until) > new Date()) {
      return res.status(409).json({ error: 'Cette photo est déjà boostée' });
    }

    // Débiter le compte WOLO Pay
    const { data: wallet } = await supabase
      .from('wolo_wallets')
      .select('balance')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!wallet || (wallet.balance || 0) < prix_fcfa) {
      return res.status(402).json({
        error: 'Solde insuffisant',
        solde: wallet?.balance || 0,
        requis: prix_fcfa,
      });
    }

    await supabase
      .from('wolo_wallets')
      .update({ balance: wallet.balance - prix_fcfa })
      .eq('user_id', user_id);

    // Créer le boost
    const endsAt = new Date(Date.now() + duree_h * 3600 * 1000);
    const { data: boost, error } = await supabase
      .from('boosts_photos')
      .insert({
        photo_id,
        user_id,
        duree_h,
        prix_fcfa,
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour boost_until sur la photo
    await supabase
      .from('feed_photos')
      .update({ boost_until: endsAt.toISOString() })
      .eq('id', photo_id);

    // Enregistrer la transaction
    await supabase
      .from('wolo_transactions')
      .insert({
        user_id,
        type: 'debit',
        montant: prix_fcfa,
        description: `Boost photo ${duree_h}h`,
        reference: boost.id,
      })
      .select();

    return res.status(201).json({
      ok: true,
      boost,
      ends_at: endsAt.toISOString(),
      message: `Ta photo brille en haut du mur pendant ${duree_h}h ✨`,
    });
  } catch (err) {
    console.error('[boost-acheter]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
