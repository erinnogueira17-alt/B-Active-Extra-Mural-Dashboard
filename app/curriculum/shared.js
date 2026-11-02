// Helpers shared by the Curriculum tabs.

// Reads a saved value from this browser. Storage can be blocked, so it never throws.
export function readSaved(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

export function writeSaved(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked. The page still works without it.
  }
}

// Saves a plain-text file to the viewer's downloads.
export function saveText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
