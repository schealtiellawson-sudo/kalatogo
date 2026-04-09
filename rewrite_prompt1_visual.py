#!/usr/bin/env python3
"""PROMPT 1 — REFONTE GRAPHIQUE COMPLÈTE WOLO Market."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# ═══════════════════════════════════════════════
# 1. CSS VARIABLES — NEW WOLO PALETTE
# ═══════════════════════════════════════════════

old_root = """:root {
  --vert: #1B7A4A;
  --vert-dark: #114d2f;
  --vert-mid: #2a9d62;
  --vert-light: #e6f4ed;
  --or: #E8940A;
  --or-light: #fef3dc;
  --noir: #0f1410;
  --gris-fonce: #2d3430;
  --gris: #6b7a72;
  --gris-light: #f0f2f0;
  --blanc: #F8F6F1;
  --white: #ffffff;
  --r: 14px;
  --r-lg: 24px;
  --shadow: 0 2px 16px rgba(15,20,16,0.08);
  --shadow-lg: 0 8px 40px rgba(15,20,16,0.14);
}"""

new_root = """:root {
  /* WOLO Market Palette — Or + Noir + Crème — ZÉRO VERT */
  --vert: #E8940A;           /* ALIAS → or (compat anciennes classes) */
  --vert-dark: #C47A08;      /* ALIAS → or foncé */
  --vert-mid: #F5B82E;       /* ALIAS → or clair */
  --vert-light: #fef3dc;     /* ALIAS → or très clair */
  --or: #E8940A;
  --or-light: #fef3dc;
  --or-dark: #C47A08;
  --noir: #0f1410;
  --gris-fonce: #2d3430;
  --gris: #6b7a72;
  --gris-light: #f0f2f0;
  --blanc: #F8F6F1;
  --white: #ffffff;
  --r: 14px;
  --r-lg: 24px;
  --shadow: 0 2px 16px rgba(15,20,16,0.08);
  --shadow-lg: 0 8px 40px rgba(15,20,16,0.14);
  /* WOLO specific */
  --wolo-black: #0f1410;
  --wolo-cream: #F8F6F1;
  --wolo-gold: #E8940A;
  --wolo-gold-light: #F5B82E;
  --wolo-gold-dark: #C47A08;
  --wolo-white: #FFFFFF;
  --wolo-border: rgba(232, 148, 10, 0.15);
  --wolo-border-active: rgba(232, 148, 10, 0.5);
  --wolo-surface: rgba(255, 255, 255, 0.04);
  --wolo-surface-hover: rgba(232, 148, 10, 0.08);
}"""

count = html.count(old_root)
if count > 0:
    html = html.replace(old_root, new_root)
    print(f"✅ [{count}x] CSS :root variables replaced with WOLO palette")
else:
    print("⚠️  :root block not found exactly — trying partial")

# ═══════════════════════════════════════════════
# 2. HARDCODED GREEN HEX → GOLD/BLACK
# ═══════════════════════════════════════════════

hex_replacements = [
    # Primary green → gold
    ('#1B7A4A', '#E8940A'),
    ('#1b7a4a', '#E8940A'),
    # Dark green → dark gold
    ('#114d2f', '#C47A08'),
    # Mid green → gold
    ('#2a9d62', '#E8940A'),
    # Light green backgrounds → gold light
    ('#e6f4ed', '#fef3dc'),
    # Other greens used throughout
    ('#16a34a', '#E8940A'),
    ('#4ade80', '#F5B82E'),
    ('#1da851', '#C47A08'),
    # Green rgba backgrounds
    ('rgba(27,122,74,', 'rgba(232,148,10,'),
    # Green gradient stops
    ('#0a1a0f', '#1a1408'),
    ('#0f2019', '#1a1710'),
]

for old, new in hex_replacements:
    c = html.count(old)
    if c > 0:
        html = html.replace(old, new)
        print(f"✅ [{c}x] {old} → {new}")
    else:
        print(f"⚠️  NOT FOUND: {old}")

# ═══════════════════════════════════════════════
# 3. ACCENT COLOR in pont-manifeste
# ═══════════════════════════════════════════════

# pont-manifeste accent was green
old_pont = "color: #1B7A4A;"
new_pont = "color: #E8940A;"
# Already replaced above

# ═══════════════════════════════════════════════
# 4. FONT IMPORT — Add Space Mono
# ═══════════════════════════════════════════════

old_font = """<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap" rel="stylesheet">"""
new_font = """<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=Space+Mono&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap" rel="stylesheet">"""

c = html.count(old_font)
if c > 0:
    html = html.replace(old_font, new_font)
    print(f"✅ [{c}x] Space Mono font added")
else:
    print("⚠️  Font link not found")

# ═══════════════════════════════════════════════
# 5. META TAGS — Update for Bénin + Togo
# ═══════════════════════════════════════════════

meta_replacements = [
    # Description
    ('content="Artisans, prestataires et chercheurs d\'emploi à Lomé — crée ton profil gratuit en 2 minutes et sois trouvé par des clients de tout le Bénin et du Togo. Sans piston."',
     'content="Artisans, prestataires et chercheurs d\'emploi à Cotonou et Lomé — crée ton profil gratuit en 2 minutes. WOLO Market connecte le Bénin et le Togo. Sans piston."'),
    # Keywords
    ('content="emploi Lomé, trouver prestataire Togo, artisan Lomé, électricien Lomé, mécanicien Lomé, coiffeur Lomé, offre emploi Togo, freelance Togo, marketplace Togo"',
     'content="emploi Cotonou, emploi Lomé, prestataire Bénin, artisan Togo, marketplace Bénin, marketplace Togo, trouver prestataire Cotonou, trouver emploi Lomé, WOLO Market"'),
    # OG description
    ('content="Artisans, prestataires et chercheurs d\'emploi à Lomé — crée ton profil gratuit en 2 minutes et sois trouvé par des clients de tout le Bénin et du Togo. Sans piston."',
     'content="Prestataires, artisans, chercheurs d\'emploi — crée ton profil gratuit. Sans piston. WOLO Market couvre le Bénin et le Togo."'),
    # OG locale
    ('content="fr_TG"', 'content="fr_BJ"'),
]

for old, new in meta_replacements:
    c = html.count(old)
    if c > 0:
        html = html.replace(old, new)
        print(f"✅ [{c}x] Meta: {old[:50]}...")
    else:
        print(f"⚠️  Meta NOT FOUND: {old[:50]}...")

# ═══════════════════════════════════════════════
# 6. FAVICON — New W or on black
# ═══════════════════════════════════════════════

# Add favicon if not present
favicon_tag = """<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%230f1410'/><text y='65' x='50' font-family='Georgia' font-size='52' font-weight='700' fill='%23E8940A' text-anchor='middle'>W</text></svg>">"""

if 'rel="icon"' not in html:
    # Insert before </head>
    html = html.replace('</head>', favicon_tag + '\n</head>')
    print("✅ Favicon W or added")
else:
    print("⚠️  Favicon already exists")

# ═══════════════════════════════════════════════
# 7. OG locale alternate
# ═══════════════════════════════════════════════

if 'og:locale:alternate' not in html:
    html = html.replace(
        '<meta property="og:locale" content="fr_BJ">',
        '<meta property="og:locale" content="fr_BJ">\n<meta property="og:locale:alternate" content="fr_TG">'
    )
    print("✅ OG locale alternate fr_TG added")

# ═══════════════════════════════════════════════
# 8. "Commercial KALA" → "Agent WOLO"
# ═══════════════════════════════════════════════

c = html.count('Commercial WOLO')
if c > 0:
    html = html.replace('Commercial WOLO', 'Agent WOLO')
    print(f"✅ [{c}x] Commercial WOLO → Agent WOLO")

c = html.count('Commerciale WOLO')
if c > 0:
    html = html.replace('Commerciale WOLO', 'Agent WOLO')
    print(f"✅ [{c}x] Commerciale WOLO → Agent WOLO")

# ═══════════════════════════════════════════════
# 9. WhatsApp green stays for WhatsApp buttons ONLY
# Keep #25D366 for .btn-wa
# ═══════════════════════════════════════════════
# WhatsApp green is functional, not brand — keep it

# ═══════════════════════════════════════════════
# WRITE BACK
# ═══════════════════════════════════════════════
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ PROMPT 1 — Phase 1 (colors + meta) complete.")
