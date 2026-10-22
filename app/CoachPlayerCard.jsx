"use client";

import { useState } from "react";

// Player card for each coach on the Register Hub scorecard. The markup and
// the .pc-* classes (app/globals.css) follow the Register Check artifact: the
// whole card spins slowly, and the back face shows the B-Active logo.

const WAVES = (() => {
  let paths = "";
  for (let i = 0; i < 22; i++) {
    const y = -40 + i * 26;
    paths += `<path d="M-40 ${y} C 60 ${y - 70}, 150 ${y + 90}, 260 ${y + 10} S 420 ${y + 60}, 520 ${y - 20}" fill="none" stroke="rgba(255,214,120,.22)" stroke-width="2.2"/>`;
  }
  return `url('data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 560" preserveAspectRatio="none">${paths}</svg>`
  )}')`;
})();

const FRONT_BG = "radial-gradient(circle at 50% 28%,#ff6a3d 0%,#e8302f 38%,#a3131a 78%,#6e0a10 100%)";
const BACK_BG = "radial-gradient(circle at 50% 45%,#ff6a3d 0%,#e8302f 38%,#a3131a 78%,#6e0a10 100%)";

const SILHOUETTE = (
  <svg viewBox="0 0 200 220" aria-hidden="true">
    <circle cx="100" cy="70" r="42" fill="rgba(60,4,8,.55)" />
    <path d="M18 220c4-62 40-96 82-96s78 34 82 96z" fill="rgba(60,4,8,.55)" />
  </svg>
);

const CAMERA = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4H9zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
    />
  </svg>
);

export default function CoachPlayerCard({
  coach,
  rank,
  total,
  stats,
  photoUrl,
  compliant,
  strikeCount,
  isTop,
  spinDelay,
  onPhotoSaved,
}) {
  const [status, setStatus] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("Uploading…");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coach", coach);
    try {
      const res = await fetch("/api/register-hub/coach-photo", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Upload failed");
      onPhotoSaved(coach, body.imageUrl);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Upload failed");
    }
  }

  const flag = strikeCount > 0 ? `${strikeCount} strike${strikeCount === 1 ? "" : "s"}` : !compliant ? "Needs support" : "";
  const statItems = [
    { value: stats.pas, label: "REG" },
    { value: stats.dri, label: "ROT" },
    { value: stats.def, label: "CON" },
    { value: stats.sho, label: "PHO" },
  ];

  return (
    <article className={`pcard${isTop ? " top" : ""}`} style={{ "--d": `${spinDelay}s` }}>
      <div className="pc-spin">
        <div className="pc-face pc-front">
          <div className="pc-in" style={{ backgroundImage: `${WAVES}, ${FRONT_BG}` }}>
            {isTop && <div className="pc-tag">TOP SCORE</div>}
            <div className="pc-ovr">
              <b>{Math.round(total)}</b>
              <span>OVR</span>
              <i>#{rank}</i>
            </div>
            <span className="pc-logo" role="img" aria-label="B-Active" />
            <div className="pc-photo">
              {photoUrl ? <img src={photoUrl} alt={coach} crossOrigin="anonymous" /> : SILHOUETTE}
            </div>
            {flag && <div className="pc-flag">{flag}</div>}
            <label className="pc-cam" title={status || (photoUrl ? "Change photo" : "Add photo")}>
              {CAMERA}
              <input type="file" accept="image/*" hidden onChange={handleFile} />
            </label>
            <div className="pc-plate">
              <div className="pc-name">{coach}</div>
              <div className="pc-stats">
                {statItems.map((st) => (
                  <div key={st.label} className="pc-st">
                    <b>{st.value}</b>
                    <span>{st.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="pc-face pc-back" aria-hidden="true">
          <div className="pc-in pc-bin" style={{ backgroundImage: `${WAVES}, ${BACK_BG}` }}>
            <span className="pc-blogo" />
            <div className="pc-bt">B-ACTIVE</div>
            <div className="pc-bs">EXTRA MURALS</div>
          </div>
        </div>
      </div>
    </article>
  );
}
