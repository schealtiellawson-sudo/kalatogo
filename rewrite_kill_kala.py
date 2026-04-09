#!/usr/bin/env python3
"""KILL ALL KALA — replace every single Kala/kala/KALA reference with WOLO equivalents."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. VISION SECTION — rewrite completely ──
old_vision_h2 = 'WOLO Market aujourd\'hui.<br>KalaBenin, KalaCI, KalaSenegal demain.'
new_vision_h2 = 'WOLO Market aujourd\'hui — Bénin & Togo.<br>Demain, toute l\'Afrique de l\'Ouest.'

old_vision_cards = """        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🇧🇯</div>
          <div style="color:white;font-weight:700;font-size:13px;">KalaBenin</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2027</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🇨🇮</div>
          <div style="color:white;font-weight:700;font-size:13px;">KalaCI</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2027</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🇸🇳</div>
          <div style="color:white;font-weight:700;font-size:13px;">KalaSenegal</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2028</div>
        </div>"""

new_vision_cards = """        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🇨🇮</div>
          <div style="color:white;font-weight:700;font-size:13px;">Côte d'Ivoire</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2027</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🇸🇳</div>
          <div style="color:white;font-weight:700;font-size:13px;">Sénégal</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2027</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;opacity:0.7;">
          <div style="font-size:22px;margin-bottom:6px;">🌍</div>
          <div style="color:white;font-weight:700;font-size:13px;">Afrique de l'Ouest</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2028+</div>
        </div>"""

# Also update the first card from just Togo to Bénin & Togo
old_first_card = """          <div style="font-size:22px;margin-bottom:6px;">🇹🇬</div>
          <div style="color:white;font-weight:700;font-size:13px;">WOLO Market</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2026 · En cours</div>"""
new_first_card = """          <div style="font-size:22px;margin-bottom:6px;">🇧🇯🇹🇬</div>
          <div style="color:white;font-weight:700;font-size:13px;">Bénin & Togo</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;">2026 · En cours</div>"""

# Update vision paragraph
old_vision_p = "On commence à Lomé. On valide, on perfectionne, on prouve que ça marche dans nos rues, avec nos artisans, pour nos gens. Puis on porte ce modèle dans toute l'Afrique francophone. Parce que ce problème de visibilité, il est identique à Cotonou, à Abidjan, à Dakar. L'Afrique a les talents. Il lui manquait la plateforme."
new_vision_p = "On commence au Bénin et au Togo. On valide, on perfectionne, on prouve que ça marche dans nos rues, avec nos artisans, pour nos gens. Puis on porte ce modèle dans toute l'Afrique de l'Ouest — Côte d'Ivoire, Sénégal, Ghana, Nigeria. Parce que ce problème de visibilité, il est identique à Abidjan, à Dakar, à Accra. L'Afrique a les talents. Il lui manquait la plateforme."


# ── 2. SIMPLE STRING REPLACEMENTS ──
replacements = [
    # Vision section
    (old_vision_h2, new_vision_h2),
    (old_vision_cards, new_vision_cards),
    (old_first_card, new_first_card),
    (old_vision_p, new_vision_p),

    # CSS classes
    ('.kala-loc-grid', '.wolo-loc-grid'),
    ('.kala-loc-visual', '.wolo-loc-visual'),

    # DOM IDs
    ('id="kala-init-overlay"', 'id="wolo-init-overlay"'),
    ("getElementById('kala-init-overlay')", "getElementById('wolo-init-overlay')"),
    ('id="cv-kala-preview"', 'id="cv-wolo-preview"'),
    ("getElementById('kala-lightbox')", "getElementById('wolo-lightbox')"),
    ("lb.id = 'kala-lightbox'", "lb.id = 'wolo-lightbox'"),
    ("document.getElementById('kala-lightbox')", "document.getElementById('wolo-lightbox')"),

    # Form names
    ("name=\"kala-diplomes\"", "name=\"wolo-diplomes\""),
    ("'kala-' + (inp.id", "'wolo-' + (inp.id"),

    # localStorage keys — all kala_ → wolo_
    ("'kala_pending_page'", "'wolo_pending_page'"),
    ("`kala_daily_${key}_${prestId}`", "`wolo_daily_${key}_${prestId}`"),
    ("`kala_views_${prestId}`", "`wolo_views_${prestId}`"),
    ("'kala_liked'", "'wolo_liked'"),
    ("`kala_notifs_${recordId}`", "`wolo_notifs_${recordId}`"),
    ("'kala_last_profil_id'", "'wolo_last_profil_id'"),
    ("`kala_viewed_${recordId}`", "`wolo_viewed_${recordId}`"),
    ("`kala_views_${record.id}`", "`wolo_views_${record.id}`"),
    ("`kala_daily_views_${record.id}`", "`wolo_daily_views_${record.id}`"),
    ("'kala_prest_count'", "'wolo_prest_count'"),
    ("'kala_prest_count_ts'", "'wolo_prest_count_ts'"),
    ("`kala_paylinks_${currentPrestataire.id}`", "`wolo_paylinks_${currentPrestataire.id}`"),
    ("`kala_rdv_payments_${prestId}`", "`wolo_rdv_payments_${prestId}`"),
    ("`kala_rdv_payments_${currentPrestataire.id}`", "`wolo_rdv_payments_${currentPrestataire.id}`"),
    ("`kala_celebrated_first_avis_${prestId}`", "`wolo_celebrated_first_avis_${prestId}`"),
    ("'kala_extras_' + currentPrestataire.id", "'wolo_extras_' + currentPrestataire.id"),
    ("'kala_extras_' + (currentPrestataire?.id || 'anon')", "'wolo_extras_' + (currentPrestataire?.id || 'anon')"),
    ("`kala_locmode_${currentPrestataire.id}`", "`wolo_locmode_${currentPrestataire.id}`"),
    ("'kala_last_page'", "'wolo_last_page'"),

    # JS functions
    ("calculScoreKala", "calculScoreWolo"),
    ("loadCVKala", "loadCVWolo"),
    ("kalaLevels", "woloLevels"),

    # Supabase storage bucket
    ("kala-medias", "wolo-medias"),

    # Referral code prefix
    ("return 'KALA' + clean + rand;", "return 'WOLO' + clean + rand;"),

    # Admin secret
    ("const ADMIN_SECRET   = 'KALA2025';", "const ADMIN_SECRET   = 'WOLO2025';"),

    # Admin panel comment
    ("PANEL ADMIN KALATOGO (accès via ?admin=KALA2025)", "PANEL ADMIN WOLO MARKET (accès via ?admin=WOLO2025)"),

    # Airtable fallback field
    ("f['score_kala']", "f['score_kala'] || f['score_wolo']"),
]

for old, new in replacements:
    count = html.count(old)
    if count > 0:
        html = html.replace(old, new)
        print(f"✅ [{count}x] {old[:70]}...")
    else:
        print(f"⚠️  NOT FOUND: {old[:70]}...")

# ── 3. ADD LOCALSTORAGE MIGRATION CODE ──
# Insert migration code right after the init overlay removal
migration_code = """
// ── MIGRATION kala_ → wolo_ localStorage ──
(function migrateKalaToWolo() {
  if (localStorage.getItem('wolo_migrated')) return;
  const keys = Object.keys(localStorage);
  keys.forEach(k => {
    if (k.startsWith('kala_')) {
      const newKey = 'wolo_' + k.slice(5);
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, localStorage.getItem(k));
      }
      localStorage.removeItem(k);
    }
  });
  localStorage.setItem('wolo_migrated', '1');
})();
"""

# Insert after the overlay fade-out code
marker = "const overlay = document.getElementById('wolo-init-overlay');"
if marker in html:
    # Find the end of that block and insert migration
    idx = html.index(marker)
    # Find the next blank line after this section
    next_lines = html[idx:idx+500]
    # Insert migration just before the marker line
    html = html.replace(marker, migration_code + "\n" + marker)
    print("✅ Migration code kala_ → wolo_ inserted")
else:
    print("⚠️  Could not insert migration code — marker not found")

# ── 4. Write back ──
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ ALL KALA REFERENCES KILLED. WOLO EVERYWHERE.")
