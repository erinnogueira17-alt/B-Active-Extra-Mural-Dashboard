# Generation Schools Taroko — Feeder-School Partnership Proposal

Print artwork source for the four-page A4 leave-behind given to principals,
owners and admissions leads at crèches, pre-schools and primary schools.

**Content is locked.** Every word, number, condition, name, address and URL is
approved copy carried over from the signed-off booklet. This repository holds a
redesign of that booklet, not a rewrite of it. Change layout, typography, crops,
colour balance and pacing freely — never the text.

## Build

```bash
cd proposal
npm install
npm run build          # trim-size PDF + page previews  ->  dist/
node tools/build.mjs --bleed   # also writes the 3 mm bleed edition
```

Output in `dist/`:

| File | Use |
|---|---|
| `…-PRINT-A4.pdf` | 210 × 297 mm trim. Digital sharing, office printing, proofing. |
| `…-PRINT-A4-3mm-bleed.pdf` | 216 × 303 mm. Give this one to a commercial printer. |
| `preview-p1…p4.png` | Screen previews of each page. |

`tools/build.mjs` serves the folder over a local port and renders it with
Chromium, so fonts, the SVG logo and the photography resolve exactly as a
browser would load them. Playwright is pinned to 1.56.1 to match the Chromium
build available in this environment.

## Preflight

```bash
pip install pymupdf pillow zxing-cpp
python3 tools/preflight.py dist/GenerationSchoolsTaroko-FeederSchoolPartnership-PRINT-A4.pdf
```

Checks page count and trim size, that every approved string is present and
unaltered, that no excluded wording (academy, trials, RMF, B-Active, Open Day,
time-limited language) has crept in, that the QR is at least 55 mm and still
decodes to the approved interest form, that all fonts are embedded, and what
effective resolution each photograph lands at once placed.

## Assets

All artwork was recovered from the approved reference PDF, so the booklet uses
the same originals rather than substitutes.

| File | Page | Role |
|---|---|---|
| `cover-football-action.jpg` | 1 | Full-bleed cover photograph |
| `learner-support.jpg` | 1, 3 | Early-years teaching — cover inset and page 3 tile |
| `sporting-grounds-aerial.jpg` | 2 | The Taroko sporting grounds (the correct grounds image) |
| `campus-building.jpg` | 3 | Campus under the Generation blue |
| `campus-overview-aerial.jpg` | 4 | Campus overview |
| `qr-interest-form.png` | 4 | Supplied QR, unaltered — decodes to the approved interest form |
| `generation-schools-logo.svg` | 1, 4 | Official horizontal logo, extracted as vector; proportions untouched |

### Resolution advisory

Three of the supplied photographs are below print resolution once placed
full-bleed on A4. They are the best available files and match what the original
booklet used, but the printed result will be soft:

| Image | Native | Placed | Effective |
|---|---|---|---|
| `cover-football-action.jpg` | 1920 × 1080 | page 1 full bleed | ~92 dpi |
| `campus-building.jpg` | 1360 × 908 | page 3 full bleed | ~78 dpi |
| `campus-overview-aerial.jpg` | 2048 × 1536 | page 4 full bleed | ~131 dpi |
| `sporting-grounds-aerial.jpg` | 2048 × 1536 | page 2 image band | ~219 dpi |

The drone frames were almost certainly shot at 4000 × 3000 or larger, and the
cover photograph looks like a social-media export. **If the camera originals can
be found, drop them into `assets/` under the same filenames and rebuild** —
nothing else needs to change and the print quality goes up immediately.

## Design system

- **Palette** — ink `#102B3A`, Generation blue `#0076AE`, deep blue `#005C86`,
  orange `#EE7023`, pale `#DCE8ED`, slate `#58717C`, off-white `#F7F9FA`.
  Orange is reserved for metrics, one emphasis phrase per headline, step
  numbers and the scan action.
- **Type** — Poppins for display and metrics, Inter for body, IBM Plex Mono for
  page labels and kickers. All SIL OFL; see `fonts/OFL-NOTICE.md`.
- **Geometry** — 16 mm safe area, 3.6 mm corner radius on panels. The rounding
  and the pill-shaped labels are what keep the piece warm enough for an
  early-years audience without tipping into a children's brochure.
- **Imagery** — overlays are tuned so each facility stays legible as a
  photograph. Page 2 gives the aerial the top 60 % of the sheet at close to its
  native aspect so the fields, courts, greens and clubhouse survive the portrait
  crop; page 4 keeps the campus visible right down to the contact block.
