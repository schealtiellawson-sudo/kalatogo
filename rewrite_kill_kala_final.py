#!/usr/bin/env python3
"""FINAL KALA KILL — replace every remaining KALA reference with WOLO equivalents."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    # ── LOGOS: KALA<sup>TOGO</sup> → WOLO <span>MARKET</span> ──
    ('KALA<sup style="font-size:11px;font-weight:700;letter-spacing:1px;color:#1B7A4A;">TOGO</sup>',
     'WOLO<sup style="font-size:11px;font-weight:700;letter-spacing:1px;color:#E8940A;">MARKET</sup>'),

    # Nav logo
    ('KALA<sup>TOGO</sup>',
     'WOLO<sup>MARKET</sup>'),

    # Splash screen logo
    ('KALA<sup style="font-size:11px;color:var(--noir);font-family:\'Cabinet Grotesk\',sans-serif;font-weight:700;">TOGO</sup>',
     'WOLO<sup style="font-size:11px;color:var(--noir);font-family:\'Cabinet Grotesk\',sans-serif;font-weight:700;">MARKET</sup>'),

    # Footer logos
    ('<div class="footer-logo">KALA<span>TOGO</span></div>',
     '<div class="footer-logo">WOLO<span>MARKET</span></div>'),

    # ── CSS animation name ──
    ('animation:kala-bar', 'animation:wolo-bar'),

    # ── CONTENT: standalone KALA → WOLO ──

    # Geoloc section
    ("Avec KALA, tu envoies un lien.", "Avec WOLO, tu envoies un lien."),

    # Note chauffeurs
    ("Note moyenne des chauffeurs sur KALA", "Note moyenne des chauffeurs sur WOLO"),

    # Parrainage
    ("le programme de parrainage KALA.", "le programme de parrainage WOLO."),
    ("Avec KALA, ton t\u00e9l\u00e9phone est une source de revenus.", "Avec WOLO, ton t\u00e9l\u00e9phone est une source de revenus."),
    ("Partage ton lien KALA dans ta bio", "Partage ton lien WOLO dans ta bio"),

    # Testimonials
    ("sans KALA. Je continue.", "sans WOLO. Je continue."),
    ("mon profil KALA parce que", "mon profil WOLO parce que"),
    ("via KALA \u2014 j'envoie", "via WOLO \u2014 j'envoie"),
    ("Commerciale KALA", "Commerciale WOLO"),

    # Tu parles de KALA
    ("Tu parles de KALA</h3>", "Tu parles de WOLO</h3>"),
    ("Tu parles de KALA \u00e0 un artisan", "Tu parles de WOLO \u00e0 un artisan"),

    # SECTION comment
    ("<!-- SECTION : KALA C'EST LE PONT -->", "<!-- SECTION : WOLO C'EST LE PONT -->"),

    # TikTok
    ("sur ton profil KALA.", "sur ton profil WOLO."),

    # Inscription
    ("Comment tu as trouv\u00e9 KALA ?", "Comment tu as trouv\u00e9 WOLO ?"),

    # CV nav
    ("Mon CV KALA", "Mon CV WOLO"),

    # RDV tooltip
    ("RDV pris via KALA ce mois", "RDV pris via WOLO ce mois"),

    # Note tooltip
    ('il a 4.9 sur KALA"', 'il a 4.9 sur WOLO"'),

    # SCORE KALA
    ("<!-- SCORE KALA", "<!-- SCORE WOLO"),

    # Dashboard prestations
    ("Prestations via KALA", "Prestations via WOLO"),

    # Plan pricing
    ("Pour d\u00e9marrer sur KALA", "Pour d\u00e9marrer sur WOLO"),
    ("Support KALA prioritaire", "Support WOLO prioritaire"),

    # Commercial
    ("Commercial KALA \u2014 Un vrai m\u00e9tier", "Commercial WOLO \u2014 Un vrai m\u00e9tier"),

    # Emploi CV
    ("<!-- EMPLOI : MON CV KALA -->", "<!-- EMPLOI : MON CV WOLO -->"),

    # Empty state
    ("Sois le premier \u00e0 rejoindre KALA !", "Sois le premier \u00e0 rejoindre WOLO !"),

    # Contact WhatsApp
    ("En contactant via KALA, tu b\u00e9n\u00e9ficies", "En contactant via WOLO, tu b\u00e9n\u00e9ficies"),

    # Admin WhatsApp message
    ("plan gratuit KALA.", "plan gratuit WOLO."),

    # Admin email subject
    ("subject=KALA Pro", "subject=WOLO Pro"),

    # Transaction ID prefix
    ("('KALA_' + Date.now())", "('WOLO_' + Date.now())"),

    # CV generation
    ("CV KALA \u2014 ${f['Nom complet']||''}", "CV WOLO \u2014 ${f['Nom complet']||''}"),

    # Comment ca marche - prestataires
    ("KALA r\u00e8gle \u00e7a.", "WOLO r\u00e8gle \u00e7a."),
    ("KALA ne prend rien", "WOLO ne prend rien"),
    ("KALA ne touche pas \u00e0 l'argent entre vous deux.", "WOLO ne touche pas \u00e0 l'argent entre vous deux."),
    ("gr\u00e2ce \u00e0 KALA =", "gr\u00e2ce \u00e0 WOLO ="),
    ("abonnement KALA directement", "abonnement WOLO directement"),
    ("La garantie KALA", "La garantie WOLO"),
    ("l'\u00e9quipe KALA. Son identit\u00e9", "l'\u00e9quipe WOLO. Son identit\u00e9"),
    ("L'\u00e9quipe KALA enqu\u00eate", "L'\u00e9quipe WOLO enqu\u00eate"),

    # Ce que KALA n'est pas
    ("<!-- Ce que KALA n'est pas", "<!-- Ce que WOLO n'est pas"),

    # FAQ
    ('KALA m\'apporte quoi en plus ?"', 'WOLO m\'apporte quoi en plus ?"'),
    ("Sur KALA, quelqu'un", "Sur WOLO, quelqu'un"),
    ("KALA c'est ton bouche-\u00e0-oreille permanent", "WOLO c'est ton bouche-\u00e0-oreille permanent"),
    ("KALA prend une commission", "WOLO prend une commission"),
    ("KALA ne touche pas \u00e0 cet argent.", "WOLO ne touche pas \u00e0 cet argent."),
    ("tu peux utiliser KALA.", "tu peux utiliser WOLO."),
    ("via KALA rembourse", "via WOLO rembourse"),
    ("RDV KALA et c'est rentabilis\u00e9.", "RDV WOLO et c'est rentabilis\u00e9."),
    ('KALA m\'apporte quoi en plus ?"',
     'WOLO m\'apporte quoi en plus ?"'),
    ("sur KALA, si.", "sur WOLO, si."),
    ("KALA c'est une plateforme de recherche", "WOLO c'est une plateforme de recherche"),
    ("te trouvent sur KALA, te contactent", "te trouvent sur WOLO, te contactent"),
    ("visible par tout le Togo.", "visible par tout le B\u00e9nin et le Togo."),

    # Remaining FAQ "KALA" references
    ("un seule prestation suppl\u00e9mentaire gr\u00e2ce \u00e0 KALA", "un seule prestation suppl\u00e9mentaire gr\u00e2ce \u00e0 WOLO"),
    ("trouv\u00e9 via KALA rembourse", "trouv\u00e9 via WOLO rembourse"),
    ("KALA et c'est rentabilis\u00e9", "WOLO et c'est rentabilis\u00e9"),
]

for old, new in replacements:
    count = html.count(old)
    if count > 0:
        html = html.replace(old, new)
        print(f"\u2705 [{count}x] {old[:70]}...")
    else:
        print(f"\u26a0\ufe0f  NOT FOUND: {old[:70]}...")

# ── Check for any remaining KALA (case-sensitive) ──
import re
remaining = [(m.start(), html[max(0,m.start()-30):m.end()+30]) for m in re.finditer(r'KALA', html)]
if remaining:
    print(f"\n\u26a0\ufe0f  {len(remaining)} remaining KALA references:")
    for pos, ctx in remaining:
        line_num = html[:pos].count('\n') + 1
        print(f"  Line {line_num}: ...{ctx.strip()}...")
else:
    print("\n\u2705 ZERO remaining KALA references!")

# Also check for lowercase kala (excluding CSS/JS identifiers already handled)
remaining_lower = [(m.start(), html[max(0,m.start()-30):m.end()+30]) for m in re.finditer(r'kala', html, re.IGNORECASE)]
kala_only = [r for r in remaining_lower if 'KALA' not in html[max(0,r[0]-5):r[0]+10] and 'wolo' not in html[max(0,r[0]-5):r[0]+10].lower()]

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n\u2705 FINAL KALA KILL COMPLETE.")
