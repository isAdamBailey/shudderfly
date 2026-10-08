/**
 * The Games World's looks, by seasonal theme name (the `theme` Inertia prop,
 * see CLAUDE.md "Seasonal theme"): colours for the sky, ground and ridge, the
 * lights, and the emoji drifting across the sky. The WebGL scenes read only
 * this; the DOM fallback road (scenes/RoadScene.vue) keeps its own
 * `.road-scene.theme-*` rules with the same values.
 *
 * A theme lists only what it changes from DEFAULT. `hill`, when set, paints
 * both ridges one flat colour, as the DOM road does.
 */
const DEFAULT = {
    skyTop: "#7dd3fc",
    skyBottom: "#dff6ff",
    grass: "#4ade80",
    road: "#a8a29e",
    roadEdge: "#78716c",
    roadLine: "#fef9c3",
    ridgeNear: "#3f9a68",
    ridgeFar: "#b3e3ca",
    hill: null,
    drifter: "☁️",
    // One soft key light (the only one that casts shadows) over a sky/ground
    // ambient. Phase 3b of issue #130 gives the seasons their own lighting.
    key: { color: "#fff6e5", intensity: 2.4 },
    ambient: { sky: "#ffffff", ground: "#9fbf8f", intensity: 1.5 },
};

export const WORLD_THEMES = {
    christmas: { skyTop: "#bfe6ff", hill: "#f8fbff", drifter: "❄️" },
    halloween: { skyTop: "#4c1d6b", hill: "#3a1854" },
    fireworks: { skyTop: "#0b1230", hill: "#1c2b52", drifter: "✨" },
};

/** The full look for a theme name; anything unknown (or '') is the default. */
export function worldTheme(name) {
    return {
        ...DEFAULT,
        ...(Object.hasOwn(WORLD_THEMES, name ?? "") ? WORLD_THEMES[name] : {}),
    };
}
