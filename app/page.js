"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/data");
    const data = await res.json();
    setEntries(data.entries || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addEntry(e) {
    e.preventDefault();
    if (!name || !school) return;
    setSaving(true);
    const updated = [
      ...entries,
      { name, school, addedAt: new Date().toISOString() },
    ];
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: updated }),
    });
    setEntries(updated);
    setName("");
    setSchool("");
    setSaving(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem" }}>
      <h1>B-Active Extra Mural Dashboard</h1>
      <p style={{ color: "#555" }}>
        Data persists via Vercel Blob — refresh or redeploy and it stays.
      </p>

      <form
        onSubmit={addEntry}
        style={{ display: "flex", gap: 8, margin: "1.5rem 0" }}
      >
        <input
          placeholder="Coach / player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <input
          placeholder="School"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={saving} style={{ padding: "8px 16px" }}>
          {saving ? "Saving..." : "Add"}
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Name</th>
              <th style={cellStyle}>School</th>
              <th style={cellStyle}>Added</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td style={cellStyle}>{entry.name}</td>
                <td style={cellStyle}>{entry.school}</td>
                <td style={cellStyle}>
                  {new Date(entry.addedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const cellStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "left",
};
