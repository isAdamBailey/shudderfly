// Clock face presets. Each preset describes the palette of the clock:
// the face fill (solid color or radial gradient stops), rim, tick marks,
// numeral styling, and hand/second/cap colors. The hand *silhouette* comes
// from the hand presets; faces only provide colors so the two compose freely.

export const FACE_PRESETS = {
  theme: {
    id: "theme",
    label: "Theme",
    numerals: "arabic",
    // CSS variables defined in app.css; they track the active site theme and
    // dark mode, so this face matches the rest of the app.
    faceFill: "var(--wc-face)",
    rimColor: "var(--wc-rim)",
    rimWidth: 3,
    tickColor: "var(--wc-tick)",
    tickMinorColor: "var(--wc-tick-minor)",
    showMinorTicks: true,
    numeralColor: "var(--wc-numeral)",
    numeralFont: "Nunito, system-ui, sans-serif",
    handColor: "var(--wc-hand)",
    secondColor: "var(--wc-second)",
    capColor: "var(--wc-cap)"
  },
  classic: {
    id: "classic",
    label: "Classic",
    numerals: "arabic",
    faceFill: "#fdfcf7",
    rimColor: "#1f2937",
    rimWidth: 3,
    tickColor: "#1f2937",
    tickMinorColor: "#9ca3af",
    showMinorTicks: true,
    numeralColor: "#1f2937",
    numeralFont: "Georgia, 'Times New Roman', serif",
    handColor: "#111827",
    secondColor: "#dc2626",
    capColor: "#111827"
  },
  "roman-gold": {
    id: "roman-gold",
    label: "Roman Gold",
    numerals: "roman",
    gradient: ["#3b3326", "#1c1813"],
    rimColor: "#c9a227",
    rimWidth: 4,
    tickColor: "#c9a227",
    tickMinorColor: "#7c6a2e",
    showMinorTicks: false,
    numeralColor: "#e8c766",
    numeralFont: "Georgia, 'Times New Roman', serif",
    handColor: "#e8c766",
    secondColor: "#c9a227",
    capColor: "#c9a227"
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    numerals: "none",
    faceFill: "#e5e7eb",
    rimColor: "#9ca3af",
    rimWidth: 1,
    tickColor: "#6b7280",
    tickMinorColor: "#cbd5e1",
    showMinorTicks: false,
    numeralColor: "#6b7280",
    numeralFont: "system-ui, sans-serif",
    handColor: "#374151",
    secondColor: "#374151",
    capColor: "#374151"
  },
  night: {
    id: "night",
    label: "Night",
    numerals: "arabic",
    gradient: ["#1e293b", "#0f172a"],
    rimColor: "#475569",
    rimWidth: 2,
    tickColor: "#cbd5e1",
    tickMinorColor: "#64748b",
    showMinorTicks: true,
    numeralColor: "#e2e8f0",
    numeralFont: "system-ui, sans-serif",
    handColor: "#f1f5f9",
    secondColor: "#38bdf8",
    capColor: "#f1f5f9"
  }
};

export const FACE_OPTIONS = Object.values(FACE_PRESETS).map((f) => ({
  value: f.id,
  label: f.label
}));

export function getFacePreset(id) {
  return FACE_PRESETS[id] || FACE_PRESETS.classic;
}
