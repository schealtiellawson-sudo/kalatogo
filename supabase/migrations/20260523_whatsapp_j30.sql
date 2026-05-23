-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Ajout message J30 à la séquence onboarding WhatsApp
-- Complète la séquence A : J0 / J1 / J3 / J5 / J7 / J30
-- ════════════════════════════════════════════════════════════════

INSERT INTO wolo_whatsapp_templates (key, sequence, step, delay_hours, content) VALUES

-- J30 : rétention, un mois après inscription
('A6_j30_retention', 'A_onboarding', 6, 720,
'Ça fait un mois que tu es sur WOZALI, {prenom} 🎉

Un mois. C''est suffisant pour recevoir les premiers contacts sérieux — si ton profil est complet.

Checklist rapide :
✓ 3 photos de ton travail
✓ Ta disponibilité activée
✓ Ton quartier renseigné

Si les 3 sont faits → tu es visible. Sinon, clique ici et on t''aide :
→ {url_dashboard}

PS : Le tirage Bourse de Croissance arrive dans quelques jours. Tu es éligible si tu es Pro ce mois. → {url_recompenses}')

ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  delay_hours = EXCLUDED.delay_hours;

DO $$ BEGIN
  RAISE NOTICE '✅ Message J30 ajouté à la séquence A_onboarding';
END $$;
