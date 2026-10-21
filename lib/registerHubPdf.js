// Builds the weekly Register Hub compliance report as a PDF and downloads it.
// Browser-only. jsPDF is imported lazily so it only loads when a report is
// exported.
import { formatWeekRange } from "./registerHubReport.js";

const RED = [232, 48, 48];
const GOLD = [210, 174, 94];
const INK = [20, 20, 20];
const MUTED = [110, 110, 110];
const GREEN = [46, 150, 74];
const ALERT = [200, 40, 48];
const PAGE_BOTTOM = 278;
const MARGIN = 8;

function loadLogoDataUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

const COLUMNS = [
  { label: "Coach", width: 42, value: (r) => r.coach },
  { label: "Lessons", width: 20, value: (r) => String(r.lessons) },
  { label: "Checked", width: 20, value: (r) => String(r.checked) },
  { label: "Evening admin", width: 28, value: (r) => (r.eveningPct == null ? "–" : `${r.eveningPct}%`) },
  { label: "Concerns", width: 20, value: (r) => String(r.loggedThisWeek) },
  { label: "Open", width: 16, value: (r) => String(r.openConcerns) },
  { label: "Strikes", width: 18, value: (r) => String(r.strikes) },
  { label: "Status", width: 30, value: (r) => (r.registerCompliant && r.strikes === 0 ? "Compliant" : "Needs support") },
];

export async function downloadWeeklyReportPdf(report, logoSrc = "/bactive-logo.png") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  const logo = await loadLogoDataUrl(logoSrc);

  doc.setFillColor(...RED);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, pageWidth, 1.6, "F");
  let textX = MARGIN;
  if (logo) {
    const logoHeight = 26;
    const logoWidth = logoHeight * logo.ratio;
    doc.addImage(logo.dataUrl, "PNG", MARGIN, 6, logoWidth, logoHeight);
    textX = MARGIN + logoWidth + 6;
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Weekly register compliance report", textX, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(formatWeekRange(report.weekStart), textX, 26);

  let y = 52;
  const ensureSpace = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Coach summary", MARGIN, y);
  y += 6;

  const drawRow = (cells, { header = false } = {}) => {
    let x = MARGIN;
    doc.setFont("helvetica", header ? "bold" : "normal");
    doc.setFontSize(header ? 9 : 10);
    cells.forEach((cell, i) => {
      const col = COLUMNS[i];
      const isStatus = i === COLUMNS.length - 1 && !header;
      if (isStatus) doc.setTextColor(...(cell.value === "Compliant" ? GREEN : ALERT));
      else doc.setTextColor(...(header ? MUTED : INK));
      doc.text(String(cell.text), x + 1.5, y);
      x += col.width;
    });
    y += 7;
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y - 5, contentWidth, 7, "F");
  drawRow(COLUMNS.map((c) => ({ text: c.label })), { header: true });

  if (report.rows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("No coaches with schools set up in Register Hub yet.", MARGIN + 1.5, y);
    y += 8;
  }
  for (const row of report.rows) {
    ensureSpace(8);
    drawRow(
      COLUMNS.map((c) => ({ text: c.value(row), value: c.value(row) })),
    );
    doc.setDrawColor(225, 225, 225);
    doc.line(MARGIN, y - 4.5, MARGIN + contentWidth, y - 4.5);
  }

  y += 8;
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Needs support", MARGIN, y);
  y += 7;

  if (report.needsSupport.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text("Every coach is register-compliant this week.", MARGIN, y);
    y += 7;
  }

  for (const row of report.needsSupport) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(row.coach, MARGIN, y);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    if (row.strikes > 0) {
      doc.setTextColor(...ALERT);
      ensureSpace(6);
      doc.text(`Strike issued this week: ${row.strikes}`, MARGIN + 2, y);
      y += 5;
    }
    for (const c of row.concerns) {
      const urgency = c.urgency === "urgent" ? "Urgent" : "Medium";
      const line = `${c.date}  ·  ${c.school}  —  ${c.type}  (${urgency}, ${c.status === "resolved" ? "resolved" : "open"})`;
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      ensureSpace(wrapped.length * 4.8 + 2);
      doc.setTextColor(...INK);
      doc.text(wrapped, MARGIN + 2, y);
      y += wrapped.length * 4.8;
    }
    y += 4;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("B-Active Register Hub", MARGIN, 290);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, 290, { align: "right" });
  }

  doc.save(`register-report-${report.weekStart}.pdf`);
}
