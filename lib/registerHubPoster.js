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
const DPR = 2;
const PAD = 40;
const RED = "#e5302f";
const RED_DEEP = "#a8141b";
const RED_TEXT = "#c4161c";
const GOLD = "#d6b25a";
const GOLD_LIGHT = "#f7dfa0";
const CREAM = "#fffaf2";
const WHITE = "#ffffff";
const ROW_SHADE = "#f4eadb";
const INK = "#1f1a17";
const MAROON = "#4a0a10";
const FONT = "Barlow, Arial Narrow, system-ui, -apple-system, Segoe UI, sans-serif";

function fitFont(ctx, text, maxW, template, sizes) {
  for (const size of sizes) {
    ctx.font = template.replace("{s}", size);
    if (ctx.measureText(text).width <= maxW) return;
  }
  ctx.font = template.replace("{s}", sizes[sizes.length - 1]);
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderDayPosterPng(poster, logoSrc = "/bactive-logo.png") {
  const logo = await loadImage(logoSrc);
  const measure = document.createElement("canvas").getContext("2d");

  const panelX = 40;
  const panelW = WIDTH - 80;
  const panelPad = 26;
  const colGap = 24;
  const colW = (panelW - panelPad * 2 - colGap) / 2;
  const itemH = 84;
  const itemGap = 12;
  const rows = poster.rows;
  const perColumn = Math.max(1, Math.ceil(rows.length / 2));
  const listRowsH = rows.length ? perColumn * (itemH + itemGap) - itemGap : 90;

  const headerH = 330;
  const panelY = headerH;
  const panelH = listRowsH + panelPad * 2;
  const quoteY = panelY + panelH + 36;
  measure.font = `italic 600 34px ${FONT}`;
  const quoteLines = wrapText(measure, poster.quote, panelW - 220);
  const quoteH = 66 + (quoteLines.length - 1) * 46 + 56 + 36;
  const footerY = quoteY + quoteH + 50;
  const height = footerY + 70;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * DPR;
  canvas.height = height * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  const bg = ctx.createLinearGradient(0, 0, WIDTH, height);
  bg.addColorStop(0, RED);
  bg.addColorStop(1, RED_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 14;
  for (let x = -height; x < WIDTH; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }

  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, WIDTH, 10);
  ctx.fillRect(0, height - 10, WIDTH, 10);

  const logoCx = PAD + 105;
  const logoCy = 150;
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, 102, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 7;
  ctx.stroke();
  if (logo) {
    const logoH = 160;
    const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH;
    ctx.drawImage(logo, logoCx - logoW / 2, logoCy - logoH / 2, logoW, logoH);
  }

  const textX = PAD + 236;
  const titleMax = WIDTH - textX - PAD;
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = `bold 26px ${FONT}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("B-ACTIVE EXTRA MURALS", textX, 104);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = WHITE;
  fitFont(ctx, "TODAY'S COACHING LINEUP", titleMax, `italic 800 {s}px ${FONT}`, [76, 70, 64, 58, 52, 46]);
  ctx.fillText("TODAY'S COACHING LINEUP", textX, 186);

  const dateText = formatDateLong(poster.dateKey).toUpperCase();
  ctx.font = `bold 28px ${FONT}`;
  ctx.letterSpacing = "1px";
  const dateW = ctx.measureText(dateText).width;
  ctx.letterSpacing = "0px";
  const chipW = dateW + 60;
  ctx.fillStyle = MAROON;
  drawRoundRect(ctx, textX - 14, 212, chipW, 54, 4);
  ctx.fill();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.letterSpacing = "1px";
  ctx.fillText(dateText, textX + 16, 248);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = GOLD;
  ctx.fillRect(panelX, panelY - 14, panelW, 8);

  ctx.fillStyle = CREAM;
  drawRoundRect(ctx, panelX, panelY, panelW, panelH, 22);
  ctx.fill();

  if (rows.length === 0) {
    ctx.fillStyle = INK;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(
      poster.dayName ? `No schools are scheduled for ${poster.dayName}.` : "No lessons fall on a weekend.",
      panelX + panelPad,
      panelY + panelPad + 40
    );
  }

  rows.forEach((row, i) => {
    const column = Math.floor(i / perColumn);
    const index = i % perColumn;
    const x = panelX + panelPad + column * (colW + colGap);
    const y = panelY + panelPad + index * (itemH + itemGap);
    const number = i + 1;

    if (index % 2 === 0) {
      ctx.fillStyle = ROW_SHADE;
      drawRoundRect(ctx, x, y, colW, itemH, 12);
      ctx.fill();
    }

    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(x + 40, y + itemH / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(number), x + 40, y + itemH / 2 + 8);
    ctx.textAlign = "left";

    const textLeft = x + 76;
    const textMax = colW - 92;
    ctx.fillStyle = INK;
    ctx.font = `bold 20px ${FONT}`;
    const schoolText = fitOneLine(ctx, row.school, textMax);
    ctx.fillText(schoolText, textLeft, y + 36);

    ctx.fillStyle = RED_TEXT;
    ctx.font = `italic bold 22px ${FONT}`;
    const coachText = row.coaches.length ? row.coaches.join(" & ") : "No coach set";
    ctx.fillText(fitOneLine(ctx, coachText, textMax), textLeft, y + 66);
  });

  ctx.fillStyle = MAROON;
  drawRoundRect(ctx, panelX, quoteY, panelW, quoteH, 22);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  drawRoundRect(ctx, panelX + 1.5, quoteY + 1.5, panelW - 3, quoteH - 3, 21);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = `bold 110px ${FONT}`;
  ctx.fillText("“", panelX + 28, quoteY + 110);

  ctx.fillStyle = CREAM;
  ctx.font = `italic 600 34px ${FONT}`;
  quoteLines.forEach((line, n) => ctx.fillText(line, panelX + 150, quoteY + 66 + n * 46));

  ctx.fillStyle = GOLD;
  ctx.font = `bold 20px ${FONT}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("QUOTE OF THE DAY", panelX + 150, quoteY + 66 + (quoteLines.length - 1) * 46 + 56);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = WHITE;
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("B-Active Group · Have a great day on the field, coaches!", WIDTH / 2, footerY + 30);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}
