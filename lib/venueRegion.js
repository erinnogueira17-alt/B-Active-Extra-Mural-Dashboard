// Classifies a Growth-board row's raw "School or Venue" text into one of
// the three business categories B-Active tracks separately: Johannesburg
// extramural, Cape Town extramural, or Football — even though all three
// share the same membership/enrolment forms. This is inherently a fuzzy
// match problem: the Current State roster names a school one way
// ("(BPM) Bryanston Parallel Med Pre & Primary (Register)") while the
// intake forms' venue dropdown names the same place another way
// ("Bryanston Parallel Medium Pre Primary (Wednesday) 08:30-09:30", with a
// day/time suffix appended, inconsistent spelling, etc). Never silently
// guesses past a low-confidence match — anything that doesn't clear the
// bar is reported as "unclassified" rather than assigned to the wrong
// region, consistent with this project's "don't fabricate data" rule.

// A venue named "Football" (e.g. "Maharsha Football") is NOT the separate
// Football department — it's one activity offered at a regular extramural
// school, same as that school's Netball or Cricket slot, so matching on
// the word "football"/"soccer" wherever it appears would misclassify it.
// The actual Football department only runs at its own dedicated venues:
// the Saturday-morning "Action Arena" venues (B-Active's "Soccer Saturday
// Classes (08:00-10:00)", referenced elsewhere in these same forms) plus
// whichever schools the Current State roster itself already tags as its
// "soccer" section (dedicated academies, matched further below).
const FOOTBALL_VENUE_HINTS = ["action arena"];

// Strips schedule/day noise so the "core" venue name can be token-matched
// against the roster. Only the parenthesis characters themselves are
// stripped, not their contents: the roster's own school names sometimes
// carry meaningful identity inside parens, not just day/time/admin noise
// — e.g. "Yleshiva Maharsha (Boys) Cricket (Register)" and "Maharsha
// Netball (Girls) Register 2025", where "(Boys)"/"(Girls)" is the only
// thing distinguishing these otherwise-identical "Maharsha" entries, or
// "(SOE) Creative Academy (Register)" / "(Hennie Baby Center) Creative
// Academy" / "(Jackson Baby Center) Creative Academy (Register)", where
// the parenthetical prefix is the school's real sub-campus identity.
// Discarding those tokens wholesale (as this used to do) meant venue text
// like "Maharsha Boys" only shared "maharsha" with the roster and fell
// short of the overlap bar. Letting the parenthetical words become normal
// tokens is safe: day names/time ranges inside parens are still stripped
// by the regexes below (they match on word boundaries, not bracket
// position), and pure admin noise like "(Register)" is still filtered by
// STOPWORDS same as unparenthesized "Register" already was.
function coreName(raw) {
  return String(raw || "")
    .replace(/[()]/g, " ")
    .replace(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/g, " ")
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*s?\b/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "Register"/"Register 2025" etc. are administrative bookkeeping suffixes
// some (not all) roster school names carry, inconsistently with the venue
// dropdown text — treated as noise rather than part of the school's name,
// since counting them as required tokens made short venue text (which
// never repeats "Register") fail to clear the overlap threshold.
const STOPWORDS = new Set(["register"]);

// Strips a trailing "s" (e.g. "Seedlings" / "Seedling") so ordinary plural
// drift between the roster's spelling and the form's spelling doesn't
// count as a token mismatch. Deliberately naive (real stemming isn't
// needed here) and safe: it only ever helps two spellings of the same
// word agree, since matching still requires several tokens to overlap.
function stem(token) {
  return token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;
}

// The roster spells one of its own JHB schools' activity as "Yeshiva
// Maharsha (Boys) SOCCER (Register)"; the same activity's venue text on
// the intake forms is "Maharsha Football". Same word, same activity, same
// school — canonicalizing them to one token lets that (and any similar
// case) match on its school name as normal. This is purely a school-NAME
// synonym for matching purposes; it has no bearing on the separate,
// deliberately narrow decision of what counts as the Football department
// (see FOOTBALL_VENUE_HINTS / the "soccer" roster section) below.
function canonicalize(token) {
  return token === "soccer" ? "football" : token;
}

function tokenSet(raw) {
  return new Set(
    coreName(raw)
      .split(" ")
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
      .map(stem)
      .map(canonicalize)
  );
}

// Builds the school -> region lookup from the Current State roster's own
// perSchool list (which already classifies every real school as jhb/cpt/
// soccer). Call once per sync and reuse across every row being classified.
export function buildSchoolRegionIndex(perSchool) {
  return (perSchool || [])
    .filter((s) => s.section === "jhb" || s.section === "cpt" || s.section === "soccer")
    .map((s) => ({
      school: s.school,
      section: s.section === "soccer" ? "football" : s.section,
      tokens: tokenSet(s.school),
    }))
    .filter((e) => e.tokens.size > 0);
}

function isFootballVenue(rawVenue) {
  const lower = rawVenue.toLowerCase();
  return FOOTBALL_VENUE_HINTS.some((k) => lower.includes(k));
}

// Best-effort match: a venue matches a roster school when a clear majority
// of the SHORTER side's distinctive tokens appear in the other — the
// roster often spells a school out in full ("Seedlings and Flowers Nursery
// School") while the form's venue text abbreviates it ("Seedling &
// Flowers"), so requiring most of the longer/roster name's tokens to
// reappear in a short venue string would almost never clear the bar.
// Basing the requirement on the smaller token set instead still needs
// every word of a short name to line up (a real bar), while letting a
// short venue string match a wordier roster entry.
function matchSchool(rawVenue, index) {
  const venueTokens = tokenSet(rawVenue);
  if (venueTokens.size === 0) return null;

  let best = null;
  for (const entry of index) {
    let overlap = 0;
    for (const t of entry.tokens) if (venueTokens.has(t)) overlap++;
    const basis = Math.min(venueTokens.size, entry.tokens.size);
    const required = basis <= 1 ? 1 : Math.max(2, Math.ceil(basis * 0.6));
    if (overlap < required) continue;
    if (!best || overlap > best.overlap) best = { school: entry.school, section: entry.section, overlap };
  }
  return best;
}

// Returns "jhb" | "cpt" | "football" | "unclassified".
export function classifyVenue(rawVenue, schoolRegionIndex) {
  if (!rawVenue) return "unclassified";
  if (isFootballVenue(rawVenue)) return "football";
  const match = matchSchool(rawVenue, schoolRegionIndex);
  return match ? match.section : "unclassified";
}
