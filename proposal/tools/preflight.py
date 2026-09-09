#!/usr/bin/env python3
"""
Print preflight for the four-page proposal.

Checks the things that actually cost money or credibility if they are wrong:
page count and trim size, that every line of approved copy is present and
unaltered, that the QR still resolves to the approved interest form and is
large enough to scan off paper, that fonts are embedded, and what effective
resolution each photograph lands at once it is placed.

    pip install pymupdf pillow zxing-cpp
    python3 tools/preflight.py dist/<file>.pdf
"""
import sys, re, pathlib
import pymupdf

APPROVED_URL = ("https://docs.google.com/forms/d/e/"
                "1FAIpQLSeOv8iLvjFjyawc570P_X8i-08RAYXpaJ1WujyHtfCiexFoFw/viewform")

# Every approved string, page by page. Whitespace is normalised before matching
# because layout line breaks are a design decision; the words are not.
COPY = {
1: ["FEEDER-SCHOOL PARTNERSHIP",
    "FOR PRE-SCHOOLS & PRIMARY SCHOOLS PREPARING LEARNERS FOR THEIR NEXT PHASE",
    "Give your families a trusted next move.",
    "Your families get a credible onward school option. Your staff and school receive "
    "meaningful benefits from the day the partnership begins.",
    "A relationship that keeps adding value",
    "20%", "STAFF-CHILD BURSARY",
    "R3 500", "PER QUALIFYING ENROLMENT",
    "0", "ADDITIONAL ADMIN"],
2: ["01 · BENEFITS FOR YOUR SCHOOL", "GENERATION SCHOOLS TAROKO",
    "PARTNER-SCHOOL COMMUNITY BENEFIT",
    "Use the Taroko sporting grounds.",
    "One use day per year once your school reaches more than five successful admissions "
    "in a calendar year, subject to availability.",
    "GOOD FOR FAMILIES. USEFUL FOR YOU.",
    "Practical value from the start.",
    "Everything is designed to add value to your community without placing another job on your team.",
    "20%", "Staff-child tuition bursary", "For the people who care for your learners every day.",
    "R3 500", "Per qualifying placement", "Clear recognition for every referred learner who enrols.",
    "READY", "Co-branded parent material",
    "Useful information, ready to share under your school’s name.",
    "FEEDER-SCHOOL PARTNERSHIP PROPOSAL · 01"],
3: ["02 · WHO IT IS FOR & HOW IT WORKS", "GENERATION SCHOOLS TAROKO",
    "PERFECT FOR PRE-SCHOOLS & PRIMARY SCHOOLS",
    "Support families beyond your final phase.",
    "For schools that want a credible onward option for graduating learners — without "
    "creating a new admissions burden.",
    "WHAT WE DO FOR YOU", "We make the transition simple.",
    "Parent-ready information, a clear referral route, one named contact and direct handling "
    "of every parent enquiry.",
    "01", "Agree the route", "Benefits and referral process confirmed in writing.",
    "02", "Share with confidence", "Use co-branded material only when it helps.",
    "03", "We do the rest", "We manage enquiries and track qualifying placements.",
    "YOUR SCHOOL REMAINS IN CONTROL",
    "No parent contact list. No exclusivity. No pressure to recommend Taroko to every family.",
    "FEEDER-SCHOOL PARTNERSHIP PROPOSAL · 02"],
4: ["03 · START THE PARTNERSHIP", "GENERATION SCHOOLS TAROKO",
    "THE NEXT STEP TAKES LESS THAN TWO MINUTES",
    "Ready to give your families more?",
    "Scan the QR code to register your school’s interest. We will contact you to understand "
    "your school, agree the right referral route and provide the material you need — with no obligation.",
    "SCAN TO START", "Register your school’s interest",
    "The interest form takes less than two minutes. We will then discuss the right referral route, "
    "co-branded material and the benefits for your school.",
    "Craig Riddle", "Marketing & Admissions",
    "craig.riddle@generationschools.co.za", "+27 (0)10 013 2031",
    "KEEP THIS PAGE · SCAN WHEN READY",
    "FEEDER-SCHOOL PARTNERSHIP PROPOSAL · 03"],
}

# Wording that must never appear in this booklet.
FORBIDDEN = ["academy", "trial", "try-out", "tryout", "real madrid", "rmf", "b-active",
             "open day", "apply now", "limited time", "deadline", "expires"]

PT_MM = 25.4 / 72
ok = True

def check(cond, msg):
    global ok
    print(("  PASS  " if cond else "  FAIL  ") + msg)
    if not cond:
        ok = False

path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1
                    else "dist/GenerationSchoolsTaroko-FeederSchoolPartnership-PRINT-A4.pdf")
doc = pymupdf.open(path)
print(f"\nPreflight — {path.name}\n" + "=" * 68)

print("\nFormat")
check(len(doc) == 4, f"exactly 4 pages (found {len(doc)})")
for i, page in enumerate(doc, 1):
    w, h = page.rect.width * PT_MM, page.rect.height * PT_MM
    trim = abs(w - 210) < .6 and abs(h - 297) < .6
    bleed = abs(w - 216) < .6 and abs(h - 303) < .6
    check(trim or bleed, f"page {i} is {w:.1f} x {h:.1f} mm "
                         f"({'A4 trim' if trim else 'A4 + 3 mm bleed' if bleed else 'UNEXPECTED'})")

print("\nApproved copy (whitespace-insensitive)")
# Letter-spaced type extracts with a space between every glyph, and layout line
# breaks are a design decision — so compare the character sequence only.
norm = lambda t: re.sub(r"\s+", "", t)
for i, page in enumerate(doc, 1):
    text = norm(page.get_text())
    missing = [s for s in COPY[i] if norm(s) not in text]
    check(not missing, f"page {i}: all {len(COPY[i])} approved strings present"
                       + ("" if not missing else f" — MISSING: {missing}"))

print("\nExcluded wording")
alltext = re.sub(r"\s+", " ", " ".join(p.get_text() for p in doc)).lower()
hits = [w for w in FORBIDDEN if w in alltext]
check(not hits, "no academy / trial / RMF / B-Active / Open Day / time-limited wording"
                + ("" if not hits else f" — FOUND: {hits}"))

print("\nQR code")
p4 = doc[3]
qr_rects = [p4.get_image_rects(x[0]) for x in p4.get_images(full=True)]
qr_rects = [r for group in qr_rects for r in group]
square = [r for r in qr_rects if abs(r.width - r.height) < 2 and r.width * PT_MM > 40]
if square:
    r = square[0]
    check(r.width * PT_MM >= 55, f"displayed at {r.width*PT_MM:.1f} x {r.height*PT_MM:.1f} mm (minimum 55)")
    m = doc[3].rect
    inset = min(r.x0, r.y0, m.width - r.x1, m.height - r.y1) * PT_MM
    check(inset >= 12, f"sits {inset:.1f} mm inside the page edge (safe area >= 12)")
else:
    check(False, "could not locate a square QR image on page 4")

try:
    import zxingcpp, PIL.Image as I, io
    pix = p4.get_pixmap(dpi=300)
    img = I.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    res = zxingcpp.read_barcodes(img)
    check(bool(res), "scans from a 300 dpi render of the printed page")
    if res:
        check(res[0].text == APPROVED_URL, f"resolves to the approved interest form")
        if res[0].text != APPROVED_URL:
            print("        got:", res[0].text)
except ImportError:
    print("  SKIP  zxing-cpp not installed — QR destination not re-verified")

print("\nFonts")
for i, page in enumerate(doc, 1):
    fonts = page.get_fonts(full=True)
    embedded = [f for f in fonts if f[3]]
    check(len(fonts) > 0 and len(embedded) == len(fonts),
          f"page {i}: {len(embedded)}/{len(fonts)} fonts embedded")

print("\nPlaced image resolution (300 dpi is the print ideal)")
for i, page in enumerate(doc, 1):
    for x in page.get_images(full=True):
        for r in page.get_image_rects(x[0]):
            wmm = r.width * PT_MM
            if wmm < 5:
                continue
            dpi = x[2] / (wmm / 25.4)
            flag = "ok " if dpi >= 300 else ("soft" if dpi >= 150 else "LOW ")
            print(f"  {flag}  p{i}  {x[2]}x{x[3]}px placed {wmm:6.1f} mm wide  ->  {dpi:5.0f} dpi")

print("\n" + "=" * 68)
print("PREFLIGHT PASSED" if ok else "PREFLIGHT FAILED")
sys.exit(0 if ok else 1)
