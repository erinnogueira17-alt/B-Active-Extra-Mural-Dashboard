// Draws the daily concerns snapshot to a PNG in the browser, so it can be
// downloaded and sent to the coach group. Browser-only (uses canvas/Image).

const WIDTH = 960;
const PAD = 40;
const DPR = 2;
const RED = "#e83030";
const GOLD = "#d2ae5e";
const BG = "#111111";
const TEXT = "#f5f5f5";
const MUTED = "#b5b5b5";
const NEG = "#f0666e";

const HEADER_TITLE_FONT = "bold 34px system-ui, -apple-system, Segoe UI, sans-serif";
const HEADER_SUB_FONT = "20px system-ui, -apple-system, Segoe UI, sans-serif";
const COACH_FONT = "bold 24px system-ui, -apple-system, Segoe UI, sans-serif";
const SCHOOL_FONT = "bold 19px system-ui, -apple-system, Segoe UI, sans-serif";
const BODY_FONT = "17px system-ui, -apple-system, Segoe UI, sans-serif";
const NOTE_FONT = "italic 16px system-ui, -apple-system, Segoe UI, sans-serif";

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

function buildRows(ctx, snapshot, maxWidth) {
  if (snapshot.total === 0) {
    return [{ kind: "empty", height: 70 }];
  }
  const rows = [];
  for (const section of snapshot.sections) {
    rows.push({ kind: "school", school: section.school, coach: section.coach, height: 58 });
    for (const [index, item] of section.items.entries()) {
      const schoolLines = [];
      ctx.font = BODY_FONT;
      const urgent = item.urgency === "urgent";
      const typeText = `${index + 1}. ${item.type} · ${urgent ? "Urgent, resolve in 24h" : "Medium, resolve by next lesson"}`;
      const typeLines = wrapText(ctx, typeText, maxWidth);
      ctx.font = NOTE_FONT;
      const noteLines = item.note ? wrapText(ctx, `Note: ${item.note}`, maxWidth) : [];
      const lineCount = schoolLines.length + typeLines.length + noteLines.length;
      rows.push({ kind: "item", schoolLines, typeLines, noteLines, urgent, height: lineCount * 28 + 22 });
    }
  }
  return rows;
}

export async function renderSnapshotPng(snapshot, logoSrc = "/bactive-logo.png") {
  const logo = await loadImage(logoSrc);
  const contentWidth = WIDTH - PAD * 2;

  const measureCanvas = document.createElement("canvas").getContext("2d");
  const rows = buildRows(measureCanvas, snapshot, contentWidth - 16);
  const headerHeight = 150;
  const footerHeight = 52;
  const bodyHeight = rows.reduce((sum, r) => sum + r.height, 0) + 24;
  const height = headerHeight + bodyHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * DPR;
  canvas.height = height * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, WIDTH, headerHeight);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, headerHeight - 6, WIDTH, 6);

  let textX = PAD;
  if (logo) {
    const logoHeight = 100;
    const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
    ctx.drawImage(logo, PAD, (headerHeight - logoHeight) / 2 - 3, logoWidth, logoHeight);
    textX = PAD + logoWidth + 24;
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = HEADER_TITLE_FONT;
  ctx.fillText("Register concerns", textX, 66);
  ctx.fillStyle = GOLD;
  ctx.font = HEADER_SUB_FONT;
  ctx.fillText(snapshot.title, textX, 102);

  let y = headerHeight + 24;
  if (snapshot.total === 0) {
    ctx.fillStyle = TEXT;
    ctx.font = BODY_FONT;
    ctx.fillText("No register concerns logged. All coaches compliant.", PAD, y + 30);
  }

  for (const row of rows) {
    if (row.kind === "school") {
      ctx.fillStyle = GOLD;
      ctx.font = COACH_FONT;
      ctx.fillText(row.school, PAD, y + 32);
      const schoolWidth = ctx.measureText(row.school).width;
      ctx.fillStyle = MUTED;
      ctx.font = BODY_FONT;
      ctx.fillText(`Coach: ${row.coach}`, PAD + schoolWidth + 16, y + 32);
    } else if (row.kind === "item") {
      let lineY = y + 22;
      ctx.fillStyle = TEXT;
      ctx.font = SCHOOL_FONT;
      for (const line of row.schoolLines) {
        ctx.fillText(line, PAD + 16, lineY);
        lineY += 28;
      }
      ctx.fillStyle = row.urgent ? NEG : GOLD;
      ctx.font = BODY_FONT;
      for (const line of row.typeLines) {
        ctx.fillText(line, PAD + 16, lineY);
        lineY += 28;
      }
      ctx.fillStyle = MUTED;
      ctx.font = NOTE_FONT;
      for (const line of row.noteLines) {
        ctx.fillText(line, PAD + 16, lineY);
        lineY += 28;
      }
    }
    y += row.height;
  }

  ctx.fillStyle = MUTED;
  ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Shared from the B-Active Register Hub", PAD, height - 22);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}
