/**
 * The Games World's looks, by seasonal theme name (the `theme` Inertia prop,
 * see CLAUDE.md "Seasonal theme"): colours for the sky, ground, ridge and
 * street, the lights, and the emoji drifting across the sky. The WebGL scenes
 * read only this; the DOM fallback road (scenes/RoadScene.vue) keeps its own
 * `.road-scene.theme-*` rules for the sky and ridge.
 *
 * A theme lists only what it changes from DEFAULT (whole values: a theme
 * that sets `key` sets all of it). `hill`, when set, paints both ridges one
 * flat colour, as the DOM road does.
 */
const DEFAULT = {
    skyTop: "#7dd3fc",
    skyBottom: "#dff6ff",
    grass: "#4ade80",
    road: "#a8a29e",
    roadEdge: "#78716c",
    roadLine: "#fef9c3",
    pavement: "#e7e5e4",
    kerb: "#a8a29e",
    ridgeNear: "#3f9a68",
    ridgeFar: "#b3e3ca",
    hill: null,
    drifter: "☁️",
    // The street's buildings pick from these by position, so a building
    // keeps its colours from visit to visit.
    walls: ["#fca5a5", "#fcd34d", "#93c5fd", "#c4b5fd", "#86efac", "#fdba74"],
    roofs: ["#b45309", "#9f1239", "#475569", "#7c2d12"],
    trim: "#fffbeb",
    glass: "#bae6fd",
    // Windows glow this colour (at this strength) at night; null in
    // daylight.
    lit: null,
    litIntensity: 1,
    leaves: ["#22c55e", "#16a34a", "#15803d"],
    trunk: "#92400e",
    // One soft key light (the only one that casts shadows) over a sky/ground
    // ambient.
    key: { color: "#fff6e5", intensity: 2.4 },
    ambient: { sky: "#ffffff", ground: "#9fbf8f", intensity: 1.5 },
    // Fireworks over the street: the sky lights up in these colours now and
    // then. Null for none.
    flashes: null,
};

export const WORLD_THEMES = {
    // Snowlight: cold and bright, snow on the ground and the roofs, and the
    // windows lit warm.
    christmas: {
        skyTop: "#bfe6ff",
        hill: "#f8fbff",
        drifter: "❄️",
        grass: "#f1f7ff",
        roofs: ["#f8fbff"],
        leaves: ["#166534", "#14532d"],
        lit: "#ffd27a",
        litIntensity: 0.35, // in snowlight, a stronger glow reads as white
        key: { color: "#eaf2ff", intensity: 2 },
        ambient: { sky: "#e0f0ff", ground: "#ffffff", intensity: 1.6 },
    },
    // Dusk: a low orange sun under a purple sky, and the windows lit.
    halloween: {
        skyTop: "#4c1d6b",
        skyBottom: "#fb923c",
        hill: "#3a1854",
        grass: "#4d7c0f",
        walls: ["#a78bfa", "#fb923c", "#94a3b8", "#a3a3a3"],
        roofs: ["#1f2937", "#3b0764"],
        leaves: ["#c2410c", "#a16207", "#7c2d12"],
        lit: "#ffb347",
        key: { color: "#ff9b54", intensity: 1.3 },
        ambient: { sky: "#8b5cf6", ground: "#1f2937", intensity: 0.9 },
    },
    // Night, lit windows and fireworks flashing over the street.
    fireworks: {
        skyTop: "#0b1230",
        skyBottom: "#1e293b",
        hill: "#1c2b52",
        drifter: "✨",
        grass: "#166534",
        lit: "#fde68a",
        key: { color: "#a5b4fc", intensity: 0.7 },
        ambient: { sky: "#475569", ground: "#0f172a", intensity: 0.8 },
        flashes: ["#f87171", "#60a5fa", "#facc15", "#f472b6", "#4ade80"],
    },
};

/** The full look for a theme name; anything unknown (or '') is the default. */
export function worldTheme(name) {
    return {
        ...DEFAULT,
        ...(Object.prototype.hasOwnProperty.call(WORLD_THEMES, name ?? "")
            ? WORLD_THEMES[name]
            : {}),
    };
}
