// Turns a raw coach photo into the B-Active "Photo of the day" post layout:
// full-bleed photo, logo badge top right, red swoosh, dark band with the
// headline, and "Taken by" / school captions. Browser-only (canvas).

const W = 1000;
const H = 2000;
const RED = "#e0262c";
const RED_DEEP = "#8f0f15";
const GOLD = "#e8c25f";
const DARK = "#0b0b0b";
const HEAD = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const BODY = '"Barlow", Arial, sans-serif';

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 4000);
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

function fitFont(ctx, text, maxW, template, sizes) {
  for (const size of sizes) {
    ctx.font = template.replace("{s}", size);
    if (ctx.measureText(text).width <= maxW) return size;
  }
  const last = sizes[sizes.length - 1];
  ctx.font = template.replace("{s}", last);
  return last;
}

function coverSource(img, boxW, boxH) {
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const sw = boxW / scale;
  const sh = boxH / scale;
  return { sx: (img.naturalWidth - sw) / 2, sy: (img.naturalHeight - sh) / 2, sw, sh };
}

function drawCamera(ctx, cx, cy) {
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.roundRect(cx - 15, cy - 9, 30, 22, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 9);
  ctx.lineTo(cx - 3, cy - 15);
  ctx.lineTo(cx + 3, cy - 15);
  ctx.lineTo(cx + 6, cy - 9);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPin(ctx, cx, cy) {
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 2);
  ctx.lineTo(cx + 10, cy - 2);
  ctx.lineTo(cx, cy + 14);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderMarketingPhotoPng({ photoSrc, coach, school, logoSrc = "/bactive-logo.png" }) {
  try {
    await document.fonts.load(`italic 800 100px ${HEAD}`);
    await document.fonts.load(`italic 600 40px ${BODY}`);
  } catch {
    // Fonts are optional; the browser fallback still renders.
  }
  const photo = await loadImg(photoSrc);
  if (!photo) throw new Error("Could not read the photo");
  const logo = await loadImg(logoSrc);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, W, H);

  const photoTop = 150;
  const photoBottom = 1420;
  const { sx, sy, sw, sh } = coverSource(photo, W, photoBottom - photoTop);
  ctx.drawImage(photo, sx, sy, sw, sh, 0, photoTop, W, photoBottom - photoTop);

  const fade = ctx.createLinearGradient(0, 1080, 0, photoBottom + 20);
  fade.addColorStop(0, "rgba(11,11,11,0)");
  fade.addColorStop(1, "rgba(11,11,11,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 1080, W, photoBottom + 20 - 1080);

  ctx.fillStyle = DARK;
  ctx.fillRect(0, photoBottom, W, H - photoBottom);

  const glow = ctx.createLinearGradient(0, 0, W * 0.9, photoTop + 260);
  glow.addColorStop(0, RED);
  glow.addColorStop(1, RED_DEEP);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(-20, 430);
  ctx.quadraticCurveTo(260, 60, W + 20, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,194,95,0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20, 452);
  ctx.quadraticCurveTo(262, 92, W + 20, 18);
  ctx.stroke();

  const badgeX = W - 150;
  const badgeY = 215;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.stroke();
  if (logo) {
    const lh = 180;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, badgeX - lw / 2, badgeY - lh / 2, lw, lh);
  }

  const left = 48;
  const maxW = W - left * 2;
  ctx.font = `italic 800 130px ${HEAD}`;
  const firstWord = "B ACTIVE ";
  const secondWord = "MARKETING";
  const fullLine = firstWord + secondWord;
  const headSize = fitFont(ctx, fullLine, maxW, `italic 800 {s}px ${HEAD}`, [130, 120, 110, 100, 90]);
  ctx.font = `italic 800 ${headSize}px ${HEAD}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(firstWord, left, 1560);
  const firstW = ctx.measureText(firstWord).width;
  ctx.fillStyle = GOLD;
  ctx.fillText(secondWord, left + firstW, 1560);

  const bannerY = 1600;
  const bannerH = 128;
  const bannerText = "PHOTO OF THE DAY";
  const bannerSize = fitFont(ctx, bannerText, maxW - 90, `italic 800 {s}px ${HEAD}`, [112, 104, 96, 88, 80]);
  ctx.font = `italic 800 ${bannerSize}px ${HEAD}`;
  const textW = ctx.measureText(bannerText).width;
  const bannerW = Math.min(maxW - 20, textW + 90);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(left, bannerY);
  ctx.lineTo(left + bannerW, bannerY);
  ctx.lineTo(left + bannerW - 36, bannerY + bannerH);
  ctx.lineTo(left - 4, bannerY + bannerH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(bannerText, left + 30, bannerY + bannerH - 28);

  const captionFont = `italic 600 50px ${BODY}`;
  const captionMax = maxW - 110;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(left + 30, 1822, 34, 0, Math.PI * 2);
  ctx.fill();
  drawCamera(ctx, left + 30, 1822);
  ctx.font = captionFont;
  const takenBy = `Taken by ${coach || "—"}`;
  fitFont(ctx, takenBy, captionMax, `italic 600 {s}px ${BODY}`, [50, 46, 42, 38]);
  ctx.fillStyle = GOLD;
  ctx.fillText(takenBy, left + 90, 1842);

  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(left + 30, 1928, 34, 0, Math.PI * 2);
  ctx.fill();
  drawPin(ctx, left + 30, 1928);
  const place = school || "";
  fitFont(ctx, place, captionMax, `italic 600 {s}px ${BODY}`, [50, 46, 42, 38]);
  ctx.fillStyle = GOLD;
  ctx.fillText(place, left + 90, 1948);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}

export function photoFileToUrl(file) {
  return URL.createObjectURL(file);
}
