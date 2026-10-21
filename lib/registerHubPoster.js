// Day poster: every school running on one lesson day, with its coach(es),
// rendered to a PNG for the coach group. Browser-only (uses canvas/Image).
import { dayKeyOf, dayLabel, parseDateKey } from "./registerHub.js";
import { canonicalizeCoachName } from "./scorecard.js";
import { formatDateLong } from "./registerHubReport.js";

const QUOTES = [
  "Every session is a chance to make someone's day.",
  "Show up early, stay late, and leave every child smiling.",
  "Small steps every lesson build champions.",
  "Effort is the one thing you can always give.",
  "Be the coach you wished you had.",
  "Great teams are built one good habit at a time.",
  "Progress, not perfection, wins the season.",
  "Believe in the kids, and they will believe in themselves.",
  "Play hard, play fair, play together.",
  "Today's work is tomorrow's proud moment.",
  "Every child deserves a coach who cares.",
  "Consistency turns good coaching into great results.",
  "Shine bright, and help others shine too.",
  "Little hands, big dreams, every single lesson.",
  "Lead with heart and the results will follow.",
  "A positive word can change a whole session.",
  "The best time to build good habits is now.",
  "Keep the energy high and the standards higher.",
  "Champions are made in ordinary lessons.",
  "Teach it, model it, celebrate it.",
  "Confidence grows when someone believes in you.",
  "Every register ticked is a promise kept to the parents.",
  "Be early, be prepared, be proud.",
  "Make every lesson the one they remember.",
  "Kindness is the first skill every child learns from us.",
  "Work as one team and every school feels the difference.",
  "Fill the day with purpose and the week takes care of itself.",
  "Coach with patience, lead with pride.",
  "Good things happen to coaches who keep showing up.",
  "Your energy sets the tone for the whole group.",
];

function dayIndex(dateKey) {
  const d = parseDateKey(dateKey);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

export function quoteFor(dateKey) {
  return QUOTES[dayIndex(dateKey) % QUOTES.length];
}

export function buildDayPoster(dateKey, schools) {
  const day = dayKeyOf(parseDateKey(dateKey));
  const bySchool = new Map();
  for (const s of schools) {
    if (s.active === false || !s.name || s.lessonDay !== day) continue;
    if (!bySchool.has(s.name)) bySchool.set(s.name, []);
    const coach = canonicalizeCoachName(s.coach || "");
    const coaches = bySchool.get(s.name);
    if (coach && !coaches.includes(coach)) coaches.push(coach);
  }
  const rows = [...bySchool.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([school, coaches]) => ({ school, coaches }));
  return { dateKey, dayName: day ? dayLabel(day) : null, rows, quote: quoteFor(dateKey) };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function fitOneLine(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

const WIDTH = 1080;
const PAD = 64;
const DPR = 2;
const RED = "#e83030";
const RED_INK = "#b3121a";
const GOLD = "#d2ae5e";
const CREAM = "#fbf4e4";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const WHITE = "#ffffff";
const HEADER_H = 240;
const ROW_H = 136;
const FOOTER_H = 60;
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

export async function renderDayPosterPng(poster, logoSrc = "/bactive-logo.png") {
  const logo = await loadImage(logoSrc);
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `italic 38px ${FONT}`;
  const quoteLines = wrapText(measure, `“${poster.quote}”`, WIDTH - PAD * 2 - 80);
  const quoteTop = HEADER_H + 36;
  const quoteBoxH = quoteLines.length * 50 + 44;
  const headingY = quoteTop + quoteBoxH + 50;
  const listTop = headingY + 34;

  const colGap = 40;
  const colW = (WIDTH - PAD * 2 - colGap) / 2;
  const rows = poster.rows;
  const perColumn = Math.max(1, Math.ceil(rows.length / 2));
  const listRows = rows.length ? perColumn : 1;
  const height = listTop + listRows * ROW_H + 40 + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * DPR;
  canvas.height = height * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, WIDTH, HEADER_H);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, HEADER_H, WIDTH, 8);

  let titleX = PAD;
  if (logo) {
    const logoH = 180;
    const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH;
    ctx.drawImage(logo, 28, 30, logoW, logoH);
    titleX = 28 + logoW + 30;
  }
  ctx.fillStyle = WHITE;
  ctx.font = `bold 76px ${FONT}`;
  ctx.fillText("Schools today", titleX, 112);
  ctx.fillStyle = GOLD;
  ctx.font = `34px ${FONT}`;
  ctx.fillText(formatDateLong(poster.dateKey), titleX, 170);

  ctx.fillStyle = CREAM;
  ctx.fillRect(PAD, quoteTop, WIDTH - PAD * 2, quoteBoxH);
  ctx.fillStyle = GOLD;
  ctx.fillRect(PAD, quoteTop, 10, quoteBoxH);
  ctx.fillStyle = RED_INK;
  ctx.font = `italic 38px ${FONT}`;
  quoteLines.forEach((line, i) => ctx.fillText(line, PAD + 40, quoteTop + 58 + i * 50));

  ctx.fillStyle = RED;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(
    rows.length ? `${rows.length} school${rows.length === 1 ? "" : "s"} today` : "No schools today",
    PAD,
    headingY
  );

  if (rows.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.font = `30px ${FONT}`;
    ctx.fillText(
      poster.dayName ? `No schools are scheduled for ${poster.dayName}.` : "No lessons fall on a weekend.",
      PAD,
      listTop + 40
    );
  }

  rows.forEach((row, i) => {
    const column = Math.floor(i / perColumn);
    const index = i % perColumn;
    const x = PAD + column * (colW + colGap);
    const y = listTop + index * ROW_H;

    ctx.fillStyle = INK;
    ctx.font = `bold 28px ${FONT}`;
    const nameLines = wrapText(ctx, row.school, colW - 8).slice(0, 2);
    if (nameLines.length === 2) nameLines[1] = fitOneLine(ctx, nameLines[1], colW - 8);
    nameLines.forEach((line, n) => ctx.fillText(line, x, y + 36 + n * 34));

    ctx.fillStyle = RED;
    ctx.font = `24px ${FONT}`;
    const coachText = row.coaches.length ? row.coaches.join(" & ") : "No coach set";
    const coachY = y + 36 + (nameLines.length - 1) * 34 + 42;
    ctx.fillText(fitOneLine(ctx, coachText, colW - 8), x, coachY);

    ctx.fillStyle = GOLD;
    ctx.fillRect(x, y + ROW_H - 12, colW, 2);
  });

  ctx.fillStyle = RED;
  ctx.fillRect(0, height - FOOTER_H, WIDTH, FOOTER_H);
  ctx.fillStyle = WHITE;
  ctx.font = `22px ${FONT}`;
  ctx.fillText("B-Active Extra Mural · Register Hub", PAD, height - 22);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}
